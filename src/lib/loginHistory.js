/**
 * loginHistory.js
 * Records login events and logouts in the `login_history` Supabase table.
 * Includes UA parsing and free IP geolocation via ip-api.com.
 *
 * Duplicate-prevention strategy (3 layers):
 *  1. Module-level in-memory Map — blocks re-fires within 60s for same session+status
 *  2. DB existence check — before inserting, verify no row exists for this session_id
 *  3. Supabase upsert with onConflict:'session_id' — DB-level unique guard (requires
 *     a UNIQUE constraint on login_history.session_id in Supabase)
 */

import { supabase } from './supabase'

// ── In-memory dedup guard ─────────────────────────────────────────────────────
// Survives React StrictMode double-mounts because it lives at module scope.
const _recentlyRecorded = new Map() // key → timestamp
const DEDUP_WINDOW_MS   = 60_000    // 60 seconds

function _dedupKey(userId, sessionId, status) {
  return `${userId}|${sessionId}|${status}`
}

function _isDuplicate(key) {
  const last = _recentlyRecorded.get(key)
  if (last && Date.now() - last < DEDUP_WINDOW_MS) return true
  _recentlyRecorded.set(key, Date.now())
  // Prune old entries
  if (_recentlyRecorded.size > 100) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS
    for (const [k, ts] of _recentlyRecorded) {
      if (ts < cutoff) _recentlyRecorded.delete(k)
    }
  }
  return false
}

// ── UA parser ─────────────────────────────────────────────────────────────────
function parseUA(ua = '') {
  let browser = 'Unknown', os = 'Unknown', device_type = 'desktop'

  if (/Edg\//.test(ua))                                   browser = 'Edge'
  else if (/OPR\//.test(ua))                              browser = 'Opera'
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua))  browser = 'Chrome'
  else if (/Firefox\//.test(ua))                          browser = 'Firefox'
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua))    browser = 'Safari'

  if (/iPhone|iPad/.test(ua)) {
    os = 'iOS'; device_type = 'mobile'
  } else if (/Android/.test(ua)) {
    os = `Android ${ua.match(/Android ([\d.]+)/)?.[1] || ''}`.trim()
    device_type = 'mobile'
  } else if (/Windows NT/.test(ua)) {
    const v = { '10.0': '10', '6.3': '8.1', '6.2': '8', '6.1': '7' }
    os = `Windows ${v[ua.match(/Windows NT ([\d.]+)/)?.[1]] || ''}`.trim()
  } else if (/Mac OS X/.test(ua)) {
    os = `macOS ${ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || ''}`.trim()
  } else if (/CrOS/.test(ua)) {
    os = 'ChromeOS'
  } else if (/Linux/.test(ua)) {
    os = 'Linux'
  }

  return { browser, os, device_type }
}

// ── IP Geolocation via ip-api.com (free, no key needed) ──────────────────────
async function getGeoLocation() {
  try {
    const res = await fetch('http://ip-api.com/json/?fields=status,city,country,countryCode,query', {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return {}
    const data = await res.json()
    if (data.status !== 'success') return {}
    return {
      ip_address:   data.query       || null,
      city:         data.city        || null,
      country:      data.country     || null,
      country_code: data.countryCode || null,
      location:     data.city && data.country ? `${data.city}, ${data.country}` : null,
    }
  } catch {
    return {}
  }
}

/**
 * Build a stable session fingerprint.
 * Uses the last 20 chars of the access_token — stable for the lifetime of a
 * JWT (typically 1 hour) regardless of how many times SIGNED_IN fires.
 * Falls back to a hash of user_id + rounded-minute so failed logins still dedup.
 */
function _sessionId(session, userId) {
  if (session?.access_token) return session.access_token.slice(-20)
  // For failed logins (no session): bucket by user+minute so rapid retries still
  // produce one record per minute rather than flooding the table.
  const minute = Math.floor(Date.now() / 60_000)
  return `fail|${userId || 'anon'}|${minute}`
}

/**
 * Record a login attempt (success or failure) into login_history.
 * Safe to call multiple times — only one row per session will be inserted.
 */
export async function recordLoginEvent({ user, session, status, authMethod, userRole, failureReason }) {
  try {
    const sessionId = _sessionId(session, user?.id)
    const dedupKey  = _dedupKey(user?.id ?? 'anon', sessionId, status)

    // Layer 1 — in-memory guard (fastest, blocks React StrictMode double-fires)
    if (_isDuplicate(dedupKey)) return

    // Layer 2 — DB existence check (blocks cross-tab or SSR double-fires)
    if (sessionId && !sessionId.startsWith('fail|')) {
      const { data: existing } = await supabase
        .from('login_history')
        .select('id')
        .eq('session_id', sessionId)
        .eq('status', status)
        .maybeSingle()
      if (existing) return // already recorded for this exact session
    }

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const { browser, os, device_type } = parseUA(ua)
    const geo = await getGeoLocation()

    const row = {
      user_id:        user?.id          ?? null,
      email:          user?.email       ?? null,
      status,
      auth_method:    authMethod,
      user_role:      userRole          ?? null,
      failure_reason: failureReason     ?? null,
      session_id:     sessionId,
      user_agent:     ua                || null,
      browser,
      os,
      device_type,
      ip_address:     geo.ip_address    ?? null,
      city:           geo.city          ?? null,
      country:        geo.country       ?? null,
      country_code:   geo.country_code  ?? null,
      location:       geo.location      ?? null,
      logged_in_at:   new Date().toISOString(),
      logged_out_at:  null,
    }

    // Layer 3 — upsert on session_id so a DB UNIQUE constraint acts as final backstop.
    // If your DB does not yet have the constraint, this behaves as a regular insert
    // (layers 1 & 2 already prevent duplicates in that case).
    await supabase
      .from('login_history')
      .upsert(row, { onConflict: 'session_id', ignoreDuplicates: true })

  } catch {
    // Non-critical — never block the auth flow
  }
}

/**
 * Mark the current session's login_history row as ended.
 */
export async function recordLogout(session) {
  if (!session?.user?.id) return
  try {
    const sessionId = _sessionId(session, session.user.id)
    // Update by session_id if possible (precise), fall back to user_id + open row
    if (sessionId && !sessionId.startsWith('fail|')) {
      await supabase
        .from('login_history')
        .update({ logged_out_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .is('logged_out_at', null)
    } else {
      await supabase
        .from('login_history')
        .update({ logged_out_at: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .is('logged_out_at', null)
        .order('logged_in_at', { ascending: false })
        .limit(1)
    }
  } catch {
    // Non-critical
  }
}
