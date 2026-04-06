/**
 * LoginHistorySection.jsx
 * BarangayConnect — Settings > Security > Login History
 *
 * Drop-in replacement / upgrade for the existing login history
 * section in UserSettings.jsx (SecuritySection).
 *
 * Props:
 *   user        — Supabase user object
 *   supabase    — Supabase client instance
 *   logAudit    — (action, section, detail) => Promise<void>
 *   isMobile    — boolean
 *
 * The component is fully self-contained:
 *   • Fetches its own data from login_history
 *   • Handles "All Logs" / "Failed Attempts" toggle
 *   • Handles IP/Device search
 *   • Shows the current-device "Active Now" status bar
 *   • "Remove Device" terminates a session row (sets logged_out_at)
 *   • Responsive table collapses to card-stack on mobile
 *
 * Supabase table expected columns (matches existing schema):
 *   id, user_id, email, status, auth_method, user_role,
 *   failure_reason, session_id, user_agent, ip_address,
 *   logged_in_at, logged_out_at
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── colour tokens (mirrors existing UserSettings palette) ────────────────
const NV  = '#1A2B4A'   // navy – sidebar / headings
const GR  = '#38A169'   // green – success / active badge
const CR  = '#E53E3E'   // red – failed badge
const AM  = '#D69E2E'   // amber – warning
const IF  = "'DM Sans', 'Inter', system-ui, sans-serif"

// ─── tiny helper functions (same logic as existing UserSettings helpers) ──
function parseUserAgent(ua = '') {
  let browser = 'Unknown', os = 'Unknown', type = 'desktop'
  if (/Edg\//.test(ua))        browser = 'Edge'
  else if (/OPR\//.test(ua))   browser = 'Opera'
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua))  browser = 'Safari'

  if (/iPhone|iPad/.test(ua)) {
    os = 'iOS'; type = 'mobile'
  } else if (/Android/.test(ua)) {
    os = `Android ${ua.match(/Android ([\d.]+)/)?.[1] || ''}`; type = 'mobile'
  } else if (/Windows NT/.test(ua)) {
    const v = { '10.0':'10','6.3':'8.1','6.2':'8','6.1':'7' }
    os = `Windows ${v[ua.match(/Windows NT ([\d.]+)/)?.[1]] || ''}`.trim()
  } else if (/Mac OS X/.test(ua)) {
    os = `macOS ${ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g,'.') || ''}`.trim()
  } else if (/Linux/.test(ua)) {
    os = 'Linux'
  }
  return { browser, os, type }
}

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

function fmtLocation(row) {
  // login_history may store city/country in a `location` column or we
  // derive a rough label from ip_address presence
  if (row.location) return row.location
  if (row.city && row.country) return `${row.city}, ${row.country}`
  if (row.city) return row.city
  return '—'
}

// ─── sub-components ───────────────────────────────────────────────────────

/** Green / red pill badge */
function StatusBadge({ ok, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: '.3px',
      background: ok ? '#C6F6D5' : '#FED7D7',
      color: ok ? '#22543D' : '#742A2A',
      fontFamily: IF,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? GR : CR,
        display: 'inline-block',
        boxShadow: ok ? `0 0 0 2px #9AE6B4` : `0 0 0 2px #FC8181`,
      }}/>
      {label}
    </span>
  )
}

/** Toggle: "All Logs" / "Failed Attempts" */
function ToggleGroup({ value, onChange }) {
  const opts = [
    { key: 'all',    label: 'All Logs' },
    { key: 'failed', label: 'Failed Attempts' },
  ]
  return (
    <div style={{
      display: 'inline-flex', borderRadius: 9,
      border: '1px solid #E2E8F0', overflow: 'hidden',
      flexShrink: 0,
    }}>
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          style={{
            padding: '7px 16px', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: IF,
            background: value === o.key ? NV : 'white',
            color: value === o.key ? 'white' : '#4A5568',
            transition: 'all .15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Remove-device confirmation popover */
function RemoveConfirm({ onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 99,
      background: 'white', borderRadius: 10,
      border: '1px solid #FEB2B2',
      boxShadow: '0 8px 24px rgba(0,0,0,.12)',
      padding: '12px 14px', width: 220,
    }}>
      <p style={{ fontSize: 12, color: '#742A2A', margin: '0 0 10px', fontFamily: IF, lineHeight: 1.5 }}>
        Remove this device from history?
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '6px 0', borderRadius: 7,
          border: '1px solid #E2E8F0', background: 'white',
          cursor: 'pointer', fontSize: 11, color: '#718096', fontFamily: IF,
        }}>Cancel</button>
        <button onClick={onConfirm} disabled={loading} style={{
          flex: 1, padding: '6px 0', borderRadius: 7,
          border: 'none', background: CR,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 11, color: 'white', fontWeight: 700, fontFamily: IF,
          opacity: loading ? .6 : 1,
        }}>
          {loading ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────

export default function LoginHistorySection({ user, supabase, logAudit, isMobile = false }) {
  const [rows,       setRows]      = useState([])
  const [loading,    setLoading]   = useState(false)
  const [filter,     setFilter]    = useState('all')   // 'all' | 'failed'
  const [search,     setSearch]    = useState('')
  const [currentUA,  setCurrentUA] = useState('')
  const [feedback,   setFeedback]  = useState(null)    // { type, msg }
  const [removing,   setRemoving]  = useState(null)    // row id being removed
  const [confirmId,  setConfirmId] = useState(null)    // row id showing confirm popover
  const [removingAll,  setRemovingAll]  = useState(false)  // bulk delete in progress
  const [confirmAll,   setConfirmAll]   = useState(false)  // show remove-all dialog
  const searchRef = useRef()

  const showFb = (type, msg) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  // ── detect current device UA ──────────────────────────────────────────
  useEffect(() => { setCurrentUA(navigator.userAgent) }, [])

  // ── load history ─────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id || !supabase) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_in_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      showFb('error', 'Could not load history: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => { load() }, [load])

  // ── remove a single session row (permanent) ──────────────────────────
  const handleRemove = async (row) => {
    setRemoving(row.id)
    try {
      await supabase
        .from('login_history')
        .delete()
        .eq('id', row.id)
      setRows(prev => prev.filter(r => r.id !== row.id))
      await logAudit?.('Remove', 'Security', `Permanently removed device: ${row.browser || row.user_agent || row.ip_address}`)
      showFb('success', 'Device permanently removed from history.')
    } catch (e) {
      showFb('error', 'Could not remove: ' + e.message)
    } finally {
      setRemoving(null)
      setConfirmId(null)
    }
  }

  // ── remove ALL history rows for this user (permanent) ─────────────────
  const handleRemoveAll = async () => {
    setRemovingAll(true)
    try {
      await supabase
        .from('login_history')
        .delete()
        .eq('user_id', user.id)
      setRows([])
      await logAudit?.('Remove', 'Security', 'Permanently cleared all sign up activity')
      showFb('success', 'All sign up activity permanently removed.')
    } catch (e) {
      showFb('error', 'Could not remove all: ' + e.message)
    } finally {
      setRemovingAll(false)
      setConfirmAll(false)
    }
  }

  // ── derive current-device info ────────────────────────────────────────
  const { browser: curBrowser, os: curOS } = parseUserAgent(currentUA)

  // ── derive most-recent successful session for "Active Now" bar ────────
  const activeRow = rows.find(r => r.status === 'success' && !r.logged_out_at)

  // ── filtered + searched rows ──────────────────────────────────────────
  const visible = rows.filter(r => {
    if (filter === 'failed' && r.status !== 'failed') return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const ua = (r.user_agent || '').toLowerCase()
      const loc = (r.location || r.city || '').toLowerCase()
      if (!ua.includes(q) && !loc.includes(q)) return false
    }
    return true
  })

  // ── styles ────────────────────────────────────────────────────────────
  const card = {
    background: 'white',
    borderRadius: 14,
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    overflow: 'hidden',
    marginBottom: 18,
  }

  const th = {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '.6px',
    fontFamily: IF,
    whiteSpace: 'nowrap',
    background: '#F7FAFC',
    borderBottom: '1px solid #E2E8F0',
    textAlign: 'left',
  }

  return (
    <div style={{ fontFamily: IF }}>

      {/* ── Feedback flash ── */}
      {feedback && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 16px', borderRadius: 10, marginBottom: 14,
          background: feedback.type === 'success' ? '#F0FFF4' : '#FFF5F5',
          border: `1px solid ${feedback.type === 'success' ? '#9AE6B4' : '#FC8181'}`,
          color: feedback.type === 'success' ? '#276749' : '#C53030',
          fontSize: 12, fontWeight: 600,
        }}>
          {feedback.type === 'success' ? '✅' : '❌'} {feedback.msg}
          <button onClick={() => setFeedback(null)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', color: 'inherit', fontSize: 14, lineHeight: 1,
          }}>×</button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SECTION CARD
      ══════════════════════════════════════════ */}
      <div style={card}>

        {/* ── Card header ── */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid #EDF2F7',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h3 style={{
                margin: '0 0 2px', fontSize: 16, fontWeight: 700,
                color: NV, fontFamily: IF,
              }}>
                Sign Up Activity
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#718096', fontFamily: IF }}>
                Recent sign-in activity for your account
              </p>
            </div>
            {/* Refresh button */}
            <button
              onClick={load}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 13px', borderRadius: 8,
                border: '1px solid #E2E8F0', background: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 11, color: '#718096', fontFamily: IF,
                flexShrink: 0, opacity: loading ? .5 : 1,
              }}
            >
              {/* Simple refresh icon via SVG inline */}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {/* ── "Active Now" status bar ── */}
          {activeRow && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, flexWrap: 'wrap',
              marginTop: 14, padding: '10px 14px', borderRadius: 10,
              background: '#F0FFF4', border: '1px solid #9AE6B4',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Monitor icon */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <span style={{ fontSize: 12, color: '#276749', fontFamily: IF, fontWeight: 500 }}>
                  You are currently logged in on this device
                  {' '}(<strong>{curBrowser} on {curOS}</strong>
                  {activeRow.city ? ` — ${activeRow.city}, ${activeRow.country || 'PH'}` : ''}
                  {' '}— Active now)
                </span>
              </div>
              <StatusBadge ok={true} label="Active" />
            </div>
          )}

          {/* ── Controls row: toggle + search ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 16, flexWrap: 'wrap',
          }}>
            <ToggleGroup value={filter} onChange={setFilter} />
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              flex: isMobile ? '1 1 100%' : '1 1 220px',
              maxWidth: isMobile ? '100%' : 280,
              border: '1px solid #E2E8F0', borderRadius: 9,
              background: 'white', padding: '0 12px',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by Device/Location…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: 12, color: '#2D3748', fontFamily: IF,
                  padding: '8px 0', background: 'transparent',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#A0AEC0', fontSize: 14, lineHeight: 1, padding: 0,
                }}>×</button>
              )}
            </div>
            {/* result count badge */}
            {!loading && (
              <span style={{
                fontSize: 11, color: '#A0AEC0', fontFamily: IF, whiteSpace: 'nowrap',
              }}>
                {visible.length} result{visible.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── Table / Cards ── */}
        {loading ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', width: 20, height: 20,
              border: `2px solid #E2E8F0`, borderTopColor: NV,
              borderRadius: '50%',
              animation: 'bc-spin 0.7s linear infinite',
            }}/>
            <p style={{ fontSize: 12, color: '#A0AEC0', margin: '10px 0 0', fontFamily: IF }}>
              Loading sign up activity…
            </p>
            <style>{`@keyframes bc-spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
            <p style={{ fontSize: 13, color: '#A0AEC0', fontFamily: IF, margin: 0 }}>
              {search || filter === 'failed'
                ? 'No matching entries found.'
                : 'No sign up activity on record yet.'}
            </p>
          </div>
        ) : isMobile ? (
          /* ════ MOBILE CARD STACK ════ */
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.map(row => <MobileHistoryCard
              key={row.id}
              row={row}
              confirmId={confirmId}
              setConfirmId={setConfirmId}
              removing={removing}
              onRemove={handleRemove}
            />)}
            <HistoryFooter count={visible.length} />
            {rows.length > 0 && (
              <button
                onClick={() => setConfirmAll(true)}
                style={{
                  width: '100%', padding: '10px 0', marginTop: 4,
                  background: 'none', border: '1px solid #FEB2B2',
                  borderRadius: 8, fontSize: 12, fontWeight: 600,
                  color: '#C53030', cursor: 'pointer', fontFamily: IF,
                }}
              >
                Remove All
              </button>
            )}
          </div>
        ) : (
          /* ════ DESKTOP TABLE ════ */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Date & Time</th>
                  <th style={th}>Location</th>
                  <th style={th}>Device</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => <HistoryTableRow
                  key={row.id}
                  row={row}
                  even={i % 2 === 0}
                  confirmId={confirmId}
                  setConfirmId={setConfirmId}
                  removing={removing}
                  onRemove={handleRemove}
                />)}
              </tbody>
            </table>
            <div style={{
              padding: '10px 16px', borderTop: '1px solid #EDF2F7',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <HistoryFooter count={visible.length} />
              {rows.length > 0 && (
                <button
                  onClick={() => setConfirmAll(true)}
                  style={{
                    background: 'none', border: '1px solid #FEB2B2',
                    borderRadius: 7, padding: '5px 13px',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    color: '#C53030', fontFamily: IF,
                    transition: 'all .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Remove All
                </button>
              )}
            </div>
          </div>
        )}

      {/* ── Remove All confirmation modal ── */}
      {confirmAll && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: 14,
            padding: '28px 28px 22px', maxWidth: 380, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,.18)',
            fontFamily: IF,
          }}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 10 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#1A202C', textAlign: 'center' }}>
              Remove all device from history?
            </h3>
            <p style={{ margin: '0 0 22px', fontSize: 12, color: '#718096', textAlign: 'center', lineHeight: 1.6 }}>
              This will permanently delete all {rows.length} login record{rows.length !== 1 ? 's' : ''} from your history. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmAll(false)}
                disabled={removingAll}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  border: '1px solid #E2E8F0', background: 'white',
                  fontSize: 13, fontWeight: 600, color: '#4A5568',
                  cursor: 'pointer', fontFamily: IF,
                }}
              >
                No
              </button>
              <button
                onClick={handleRemoveAll}
                disabled={removingAll}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  border: 'none', background: removingAll ? '#FC8181' : '#E53E3E',
                  fontSize: 13, fontWeight: 600, color: 'white',
                  cursor: removingAll ? 'not-allowed' : 'pointer',
                  fontFamily: IF, transition: 'background .12s',
                }}
              >
                {removingAll ? 'Removing…' : 'Yes, Remove All'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}

// ─── table row ────────────────────────────────────────────────────────────
function HistoryTableRow({ row, even, confirmId, setConfirmId, removing, onRemove }) {
  const { browser, os } = (row.browser && row.browser !== 'Unknown')
    ? { browser: row.browser, os: row.os || 'Unknown' }
    : parseUserAgent(row.user_agent || '')
  const isSuccess = row.status === 'success'
  const location  = fmtLocation(row)
  const isRemoving = removing === row.id
  const showConfirm = confirmId === row.id
  const [hover, setHover] = useState(false)

  const tdBase = {
    padding: '11px 14px',
    fontSize: 12,
    fontFamily: IF,
    color: '#2D3748',
    borderBottom: '1px solid #EDF2F7',
    verticalAlign: 'middle',
    background: hover
      ? '#EBF8FF'
      : even ? 'white' : '#FAFBFC',
    transition: 'background .12s',
  }

  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Date & Time */}
      <td style={tdBase}>
        <span style={{ fontWeight: 600, color: NV }}>{fmtDate(row.logged_in_at)}</span>
      </td>

      {/* Location */}
      <td style={tdBase}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {location !== '—' ? location : <span style={{ color: '#CBD5E0' }}>—</span>}
        </div>
      </td>

      {/* Device */}
      <td style={tdBase}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* device icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span>{browser} on {os}</span>
        </div>
      </td>

      {/* Status */}
      <td style={tdBase}>
        <StatusBadge ok={isSuccess} label={isSuccess ? 'Success' : 'Failed'} />
        {!isSuccess && row.failure_reason && (
          <div style={{ fontSize: 10, color: '#C53030', marginTop: 2, maxWidth: 140, fontFamily: IF }}>
            {row.failure_reason}
          </div>
        )}
      </td>

      {/* Action */}
      <td style={{ ...tdBase, textAlign: 'right', position: 'relative' }}>
        <button
          onClick={() => setConfirmId(showConfirm ? null : row.id)}
          disabled={isRemoving}
          style={{
            background: 'none', border: '1px solid #FEB2B2',
            borderRadius: 7, padding: '4px 11px',
            cursor: isRemoving ? 'not-allowed' : 'pointer',
            fontSize: 11, fontWeight: 600, color: CR, fontFamily: IF,
            opacity: isRemoving ? .5 : 1,
            transition: 'all .12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FFF5F5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          {isRemoving ? 'Removing…' : '[Remove Device]'}
        </button>
        {showConfirm && (
          <RemoveConfirm
            loading={isRemoving}
            onConfirm={() => onRemove(row)}
            onCancel={() => setConfirmId(null)}
          />
        )}
      </td>
    </tr>
  )
}

// ─── mobile card ─────────────────────────────────────────────────────────
function MobileHistoryCard({ row, confirmId, setConfirmId, removing, onRemove }) {
  const { browser, os } = (row.browser && row.browser !== 'Unknown')
    ? { browser: row.browser, os: row.os || 'Unknown' }
    : parseUserAgent(row.user_agent || '')
  const isSuccess = row.status === 'success'
  const location  = fmtLocation(row)
  const isRemoving = removing === row.id
  const showConfirm = confirmId === row.id

  return (
    <div style={{
      borderRadius: 11,
      border: `1px solid ${isSuccess ? '#C6F6D5' : '#FEB2B2'}`,
      background: isSuccess ? '#F0FFF4' : '#FFF5F5',
      overflow: 'visible', position: 'relative',
    }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 13px',
        borderBottom: `1px solid ${isSuccess ? '#C6F6D5' : '#FEB2B2'}`,
        flexWrap: 'wrap', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <StatusBadge ok={isSuccess} label={isSuccess ? 'Success' : 'Failed'} />
        </div>
        <span style={{ fontSize: 11, color: '#718096', fontFamily: IF }}>
          {fmtDate(row.logged_in_at)}
        </span>
      </div>

      {/* body grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 0,
      }}>
        {[
          { label: 'Location', val: location },
          { label: 'Device',   val: `${browser} on ${os}` },
          ...(!isSuccess && row.failure_reason
            ? [{ label: 'Reason', val: row.failure_reason, span: true }]
            : []),
        ].map(({ label, val, mono, span }, i) => (
          <div key={i} style={{
            padding: '8px 13px',
            borderRight: i % 2 === 0 && !span ? `1px solid ${isSuccess ? '#C6F6D5' : '#FEB2B2'}` : 'none',
            gridColumn: span ? '1 / -1' : 'auto',
            borderTop: i >= 2 ? `1px solid ${isSuccess ? '#C6F6D5' : '#FEB2B2'}` : 'none',
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#718096', margin: '0 0 2px', fontFamily: IF }}>
              {label}
            </p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#2D3748', margin: 0, fontFamily: mono ? 'monospace' : IF }}>
              {val || '—'}
            </p>
          </div>
        ))}
      </div>

      {/* action */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        padding: '8px 13px',
        borderTop: `1px solid ${isSuccess ? '#C6F6D5' : '#FEB2B2'}`,
        position: 'relative',
      }}>
        <button
          onClick={() => setConfirmId(showConfirm ? null : row.id)}
          disabled={isRemoving}
          style={{
            background: 'none', border: '1px solid #FEB2B2',
            borderRadius: 7, padding: '5px 13px',
            cursor: isRemoving ? 'not-allowed' : 'pointer',
            fontSize: 11, fontWeight: 600, color: CR, fontFamily: IF,
            opacity: isRemoving ? .5 : 1,
          }}
        >
          {isRemoving ? 'Removing…' : '[Remove Device]'}
        </button>
        {showConfirm && (
          <RemoveConfirm
            loading={isRemoving}
            onConfirm={() => onRemove(row)}
            onCancel={() => setConfirmId(null)}
          />
        )}
      </div>
    </div>
  )
}

// ─── footer note ─────────────────────────────────────────────────────────
function HistoryFooter({ count }) {
  return (
    <p style={{
      fontSize: 11, color: '#A0AEC0', textAlign: 'center',
      margin: '4px 0 0', fontFamily: IF, lineHeight: 1.6,
    }}>
      Showing last {count} sign-in event{count !== 1 ? 's' : ''} ·{' '}
      Review any unfamiliar activity and change your password immediately.
    </p>
  )
}

// ─── re-export RemoveConfirm for use outside if needed ────────────────────
export { RemoveConfirm }
