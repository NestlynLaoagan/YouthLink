/**
 * AdminLoginHistoryPage.jsx
 * BarangayConnect — /admin/login-history
 *
 * ┌─ Admin view ──────────────────────────────────────────────────────────────┐
 * │  • Sees login history for ALL users (with name + role column)             │
 * │  • Filter: All / Failed / Suspicious                                      │
 * │  • Search by name, email, device, location                                │
 * │  • No export, no delete (view-only for admin)                             │
 * └───────────────────────────────────────────────────────────────────────────┘
 * ┌─ Super Admin view (extends admin) ────────────────────────────────────────┐
 * │  • Everything above, PLUS:                                                │
 * │  • Summary stat cards (Total logins, Failed, Unique users, Suspicious)   │
 * │  • Mini bar chart: logins per day (last 7 days)                          │
 * │  • "Flag as suspicious" toggle per row                                    │
 * │  • Export to CSV                                                          │
 * │  • Delete a specific row                                                  │
 * │  • "Clear all failed" bulk action                                         │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Integration — add to App.jsx:
 *   import AdminLoginHistoryPage from './pages/admin/AdminLoginHistoryPage'
 *   <Route path="/admin/login-history" element={<AdminPage Component={AdminLoginHistoryPage}/>}/>
 *
 * Add to AdminLayout nav (superAdminOnly={false} so both roles can see it):
 *   { path:'/admin/login-history', label:'Login History', icon: History }
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw, Download, Trash2, Flag, Search,
  ShieldAlert, ShieldCheck, LogIn, Users, AlertTriangle,
  ChevronDown, ChevronUp, X, Eye,
} from 'lucide-react'
import { supabase }        from '../../lib/supabase'
import { useAdminTheme }   from '../../contexts/AdminThemeContext'
import { useAuth }         from '../../contexts/AuthContext'
import { useToast }        from '../../contexts/ToastContext'

// ─── shared style tokens (match AdminModules.jsx) ─────────────────────────
const MF = "'Montserrat','Inter',sans-serif"
const IF = "'Inter',sans-serif"

// ─── helpers ──────────────────────────────────────────────────────────────
function parseUA(ua = '') {
  let browser = 'Unknown', os = 'Unknown'
  if (/Edg\//.test(ua))         browser = 'Edge'
  else if (/OPR\//.test(ua))    browser = 'Opera'
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua))  browser = 'Safari'

  if (/iPhone|iPad/.test(ua))   os = 'iOS'
  else if (/Android/.test(ua))  os = `Android ${ua.match(/Android ([\d.]+)/)?.[1] || ''}`.trim()
  else if (/Windows NT/.test(ua)) {
    const v = { '10.0':'10','6.3':'8.1','6.2':'8','6.1':'7' }
    os = `Win ${v[ua.match(/Windows NT ([\d.]+)/)?.[1]] || ''}`.trim()
  } else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/Linux/.test(ua))      os = 'Linux'
  return { browser, os }
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

function fmtDateShort(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) }
  catch { return '—' }
}

function roleBadge(role) {
  const map = {
    super_admin: { bg: '#FEF3C7', color: '#92400E', label: 'Super Admin' },
    admin:       { bg: '#EDE9FE', color: '#5B21B6', label: 'Admin' },
    resident:    { bg: '#E0F2FE', color: '#075985', label: 'Resident' },
  }
  const s = map[role?.toLowerCase()] || { bg: '#F1F5F9', color: '#475569', label: role || '—' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, fontFamily: IF,
      background: s.bg, color: s.color,
      textTransform: 'capitalize',
    }}>
      {s.label}
    </span>
  )
}

// isSuspicious heuristic (used if no `is_suspicious` column exists)
function heuristicSuspicious(row) {
  if (row.is_suspicious) return true
  // multiple rapid failures would be caught upstream; we flag failed rows
  // where failure reason mentions brute / locked
  const r = (row.failure_reason || '').toLowerCase()
  return r.includes('brute') || r.includes('locked') || r.includes('blocked')
}

// ─── sub-components ────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent, T, dark }) {
  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.05)' : T.surface,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : T.border}`,
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: dark ? 'none' : '0 2px 8px rgba(26,54,93,0.06)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${accent}18`, border: `1.5px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} style={{ color: accent }}/>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, color: dark ? 'white' : T.navy, fontFamily: MF, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: T.textMuted, fontFamily: IF, marginTop: 3, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  )
}

function MiniBarChart({ data, T, dark }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{
      background: dark ? 'rgba(255,255,255,0.05)' : T.surface,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : T.border}`,
      borderRadius: 14, padding: '18px 20px',
      gridColumn: 'span 2',
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: dark ? 'white' : T.navy, fontFamily: MF, marginBottom: 14 }}>
        Logins — Last 7 Days
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              height: `${Math.round((d.count / max) * 52) + 4}px`,
              background: d.hasFailed
                ? `linear-gradient(180deg, #E53E3E, #FC8181)`
                : `linear-gradient(180deg, #2B6CB0, #63B3ED)`,
              minHeight: 4, transition: 'height .4s',
              position: 'relative',
            }}>
              {d.count > 0 && (
                <span style={{
                  position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 10, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.7)' : T.navy,
                  fontFamily: IF, whiteSpace: 'nowrap',
                }}>{d.count}</span>
              )}
            </div>
            <span style={{ fontSize: 9, color: T.textMuted, fontFamily: IF, whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
        {[
          { color: '#63B3ED', label: 'Successful' },
          { color: '#FC8181', label: 'Failed' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }}/>
            <span style={{ fontSize: 10, color: T.textMuted, fontFamily: IF }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterPill({ active, onClick, children, T, dark }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px', borderRadius: 20,
        border: `1.5px solid ${active ? '#1A365D' : (dark ? 'rgba(255,255,255,0.15)' : T.border)}`,
        background: active ? '#1A365D' : 'transparent',
        color: active ? 'white' : (dark ? 'rgba(255,255,255,0.65)' : T.text),
        fontSize: 12, fontWeight: 600, fontFamily: IF,
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      {children}
    </button>
  )
}

function SortIcon({ field, sortBy, sortDir }) {
  if (sortBy !== field) return <ChevronDown size={10} style={{ opacity: 0.3 }}/>
  return sortDir === 'asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>
}

// ─── main page ─────────────────────────────────────────────────────────────
export default function AdminLoginHistoryPage({ embedded = false }) {
  const { T, dark }         = useAdminTheme()
  const { logAudit, role, user }   = useAuth()
  const { toast }           = useToast()
  const isSA                = ['super_admin','superadmin','super admin'].includes(role?.toLowerCase())

  // data
  const [rows,    setRows]    = useState([])
  const [loading, setLoad]    = useState(false)

  // filters / search
  const [filter,  setFilter]  = useState('all')   // 'all' | 'failed' | 'suspicious'
  const [search,  setSearch]  = useState('')
  const [sortBy,  setSortBy]  = useState('logged_in_at')
  const [sortDir, setSortDir] = useState('desc')

  // SA actions
  const [delId,    setDelId]   = useState(null)   // confirm delete
  const [flagging, setFlagging] = useState(null)  // row id being flagged
  const [bulkClearOpen, setBCO]  = useState(false)
  const [removeAllOpen,  setRAO]  = useState(false)

  // expanded row detail (mobile)
  const [expandedId, setExpandedId] = useState(null)

  // ── fetch ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoad(true)
    try {
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .order('logged_in_at', { ascending: false })
        .limit(500)
      if (error) throw error

      // user_role is stored directly on the row — no join needed
      const flat = (data || []).map(r => ({
        ...r,
        _role: r.user_role || 'resident',
      }))
      setRows(flat)
    } catch (e) {
      toast('Could not load sign up activity: ' + e.message, 'error')
    } finally {
      setLoad(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── sort ─────────────────────────────────────────────────────────────
  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  // ── filter + search + sort ───────────────────────────────────────────
  const visible = rows
    .filter(r => {
      if (filter === 'failed' && r.status !== 'failed') return false
      if (filter === 'suspicious' && !heuristicSuspicious(r)) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hit = [
          r.email, r.user_agent, r.location, r.city, r.country,
          r._role, r.failure_reason, r.auth_method,
        ].some(v => (v || '').toLowerCase().includes(q))
        if (!hit) return false
      }
      return true
    })
    .sort((a, b) => {
      let av = a[sortBy] ?? '', bv = b[sortBy] ?? ''
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  // ── stats ─────────────────────────────────────────────────────────────
  const totalLogins    = rows.length
  const totalFailed    = rows.filter(r => r.status === 'failed').length
  const uniqueUsers    = new Set(rows.map(r => r.user_id).filter(Boolean)).size
  const suspicious     = rows.filter(heuristicSuspicious).length

  // ── chart data: last 7 days ────────────────────────────────────────────
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toDateString()
    const dayRows = rows.filter(r => r.logged_in_at && new Date(r.logged_in_at).toDateString() === ds)
    return {
      label: d.toLocaleDateString('en-PH', { weekday: 'short' }),
      count: dayRows.length,
      hasFailed: dayRows.some(r => r.status === 'failed'),
    }
  })

  // ── SA: flag / unflag ────────────────────────────────────────────────
  const handleFlag = async (row) => {
    setFlagging(row.id)
    const newVal = !row.is_suspicious
    try {
      const { error } = await supabase
        .from('login_history')
        .update({ is_suspicious: newVal })
        .eq('id', row.id)
      if (error) throw error
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_suspicious: newVal } : r))
      await logAudit('Flag', 'Sign Up Activity', `${newVal ? 'Flagged' : 'Unflagged'} login row ${row.id}`)
      toast(newVal ? 'Row flagged as suspicious.' : 'Flag removed.', 'success')
    } catch (e) {
      toast('Could not update flag: ' + e.message, 'error')
    } finally {
      setFlagging(null)
    }
  }

  // ── SA: delete row ───────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('login_history').delete().eq('id', id)
      if (error) throw error
      setRows(prev => prev.filter(r => r.id !== id))
      await logAudit('Delete', 'Sign Up Activity', `Deleted login row ${id}`)
      toast('Entry deleted.', 'success')
    } catch (e) {
      toast('Could not delete: ' + e.message, 'error')
    } finally {
      setDelId(null)
    }
  }

  // ── SA: bulk clear failed ────────────────────────────────────────────
  const handleClearFailed = async () => {
    try {
      const { error } = await supabase
        .from('login_history')
        .delete()
        .eq('status', 'failed')
      if (error) throw error
      setRows(prev => prev.filter(r => r.status !== 'failed'))
      await logAudit('Bulk Delete', 'Sign Up Activity', 'Cleared all failed sign-in attempts')
      toast('All failed login entries cleared.', 'success')
    } catch (e) {
      toast('Could not clear: ' + e.message, 'error')
    } finally {
      setBCO(false)
    }
  }

  // ── SA: remove ALL rows ──────────────────────────────────────────────────
  const handleRemoveAll = async () => {
    try {
      const { error } = await supabase
        .from('login_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      setRows([])
      await logAudit('Bulk Delete', 'Sign Up Activity', 'Cleared entire sign up activity')
      toast('All sign up activity permanently removed.', 'success')
    } catch (e) {
      toast('Could not remove all: ' + e.message, 'error')
    } finally {
      setRAO(false)
    }
  }

  // ── SA: export CSV ────────────────────────────────────────────────────
  const handleExport = () => {
    const cols = ['Email','Role','Status','Auth Method','Device','Location','Failure Reason','Logged In At','Logged Out At','Suspicious']
    const csvRows = visible.map(r => {
      const { browser, os } = parseUA(r.user_agent || '')
      return [
        r.email || '',
        r._role || '',
        r.status || '',
        r.auth_method || '',
        `${browser} on ${os}`,
        r.city ? `${r.city}, ${r.country || ''}` : (r.location || ''),
        r.failure_reason || '',
        r.logged_in_at || '',
        r.logged_out_at || '',
        heuristicSuspicious(r) ? 'Yes' : 'No',
      ]
    })
    const csv = [cols, ...csvRows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `signup-activity-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    logAudit('Export', 'Sign Up Activity', 'Exported sign up activity CSV')
    toast('CSV exported!', 'success')
  }

  // ── styles ─────────────────────────────────────────────────────────────
  const surface = {
    background: dark ? 'rgba(255,255,255,0.04)' : T.surface,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : T.border}`,
    borderRadius: 14,
  }

  const thStyle = {
    padding: '10px 14px',
    fontSize: 10, fontWeight: 700, fontFamily: IF,
    color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.7px',
    background: dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
    borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : T.border}`,
    whiteSpace: 'nowrap', textAlign: 'left', cursor: 'pointer',
    userSelect: 'none',
  }

  return (
    <div style={{ fontFamily: IF }}>

      {/* ── Page header — hidden when embedded inside Settings > Security ── */}
      {!embedded && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: dark ? 'white' : T.navy, margin: '0 0 4px', fontFamily: MF }}>
            Sign Up Activity
          </h1>
          <p style={{ fontSize: 13, color: T.textMuted, margin: 0, fontFamily: IF }}>
            {isSA
              ? 'Full sign-in audit for all users — flag, delete, and export records.'
              : 'View-only audit of all user sign-in activity.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!isSA && (
            <span style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, background: dark ? 'rgba(214,158,46,0.15)' : '#FFFBEB', color: '#7B4800', fontFamily: IF, fontWeight: 600 }}>
              👁 View Only
            </span>
          )}
          {isSA && totalFailed > 0 && (
            <button
              onClick={() => setBCO(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 9,
                border: '1.5px solid #FEB2B2', background: 'transparent',
                cursor: 'pointer', fontSize: 12, color: '#C53030', fontFamily: IF, fontWeight: 600,
              }}
            >
              <Trash2 size={13}/> Clear Failed ({totalFailed})
            </button>
          )}
          {isSA && rows.length > 0 && (
            <button
              onClick={() => setRAO(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 9,
                border: '1.5px solid #FC8181', background: '#FFF5F5',
                cursor: 'pointer', fontSize: 12, color: '#9B2335', fontFamily: IF, fontWeight: 700,
              }}
            >
              <Trash2 size={13}/> Remove All ({rows.length})
            </button>
          )}
          {isSA && (
            <button
              onClick={handleExport}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 9,
                border: `1px solid ${T.border}`, background: T.surface,
                cursor: 'pointer', fontSize: 12, color: T.text, fontFamily: IF,
              }}
            >
              <Download size={13}/> Export CSV
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 9,
              border: `1px solid ${T.border}`, background: T.surface,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 12, color: T.text, fontFamily: IF,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'lhspin .7s linear infinite' : 'none' }}/> Refresh
          </button>
        </div>
      </div>
      )} {/* end !embedded header */}

      {/* ── Super Admin stat cards + chart ── */}
      {isSA && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard icon={LogIn}       label="Total Logins"   value={totalLogins}   accent="#2B6CB0" T={T} dark={dark}/>
          <StatCard icon={AlertTriangle} label="Failed Logins" value={totalFailed}  accent="#C53030" T={T} dark={dark}/>
          <StatCard icon={Users}       label="Unique Users"   value={uniqueUsers}   accent="#276749" T={T} dark={dark}/>
          <StatCard icon={ShieldAlert} label="Suspicious"     value={suspicious}    accent="#D69E2E" T={T} dark={dark}/>
        </div>
      )}

      {/* ── Filters + Search bar ── */}
      <div style={{
        ...surface,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <FilterPill active={filter === 'all'}         onClick={() => setFilter('all')}         T={T} dark={dark}>All Logs</FilterPill>
          <FilterPill active={filter === 'failed'}      onClick={() => setFilter('failed')}      T={T} dark={dark}>Failed</FilterPill>
          <FilterPill active={filter === 'suspicious'}  onClick={() => setFilter('suspicious')}  T={T} dark={dark}>⚠ Suspicious</FilterPill>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            flex: '1 1 220px', maxWidth: 360,
            border: `1px solid ${T.border}`, borderRadius: 9,
            background: dark ? 'rgba(255,255,255,0.05)' : 'white',
            padding: '0 12px',
          }}>
            <Search size={12} style={{ color: T.textMuted, flexShrink: 0 }}/>
            <input
              type="text"
              placeholder="Search email, device, location, role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 12, color: dark ? 'rgba(255,255,255,0.85)' : T.text,
                fontFamily: IF, padding: '8px 0',
                background: 'transparent',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, display: 'flex', padding: 0 }}>
                <X size={12}/>
              </button>
            )}
          </div>

          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: IF, whiteSpace: 'nowrap' }}>
            {visible.length} result{visible.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ ...surface, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: T.textMuted, fontFamily: IF }}>
            <RefreshCw size={20} style={{ animation: 'lhspin .7s linear infinite', opacity: .5 }}/>
            <p style={{ marginTop: 10, fontSize: 13 }}>Loading sign up activity…</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>🔐</div>
            <p style={{ fontSize: 14, color: T.textMuted, fontFamily: IF, marginTop: 8 }}>
              {search || filter !== 'all' ? 'No matching entries.' : 'No sign up activity on record yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[
                    { label: 'Date & Time',    field: 'logged_in_at' },
                    { label: 'Email',          field: 'email' },
                    { label: 'Role',           field: '_role' },
                    { label: 'Status',         field: 'status' },
                    { label: 'Auth Method',    field: 'auth_method' },
                    { label: 'Device',         field: 'user_agent' },
                    { label: 'Location',       field: 'city' },
                    ...(isSA ? [{ label: 'Actions', field: null }] : []),
                  ].map(({ label, field }) => (
                    <th
                      key={label}
                      style={{ ...thStyle, cursor: field ? 'pointer' : 'default' }}
                      onClick={() => field && toggleSort(field)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {label}
                        {field && <SortIcon field={field} sortBy={sortBy} sortDir={sortDir}/>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <HistoryRow
                    key={row.id}
                    row={row}
                    even={i % 2 === 0}
                    isSA={isSA}
                    T={T}
                    dark={dark}
                    flagging={flagging}
                    onFlag={handleFlag}
                    onDelete={id => setDelId(id)}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                  />
                ))}
              </tbody>
            </table>
            <div style={{
              padding: '10px 16px',
              borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : T.border}`,
              fontSize: 11, color: T.textMuted, fontFamily: IF, textAlign: 'center',
            }}>
              Showing {visible.length} of {rows.length} total records
              {!isSA && ' · Admins can view but not modify sign up activity.'}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirm modal ── */}
      {delId && (
        <ConfirmOverlay
          title="Delete Sign Up Activity Entry"
          message="This will permanently remove this login record. This action cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(delId)}
          onCancel={() => setDelId(null)}
          T={T}
          dark={dark}
        />
      )}

      {/* ── Bulk clear failed confirm modal ── */}
      {bulkClearOpen && (
        <ConfirmOverlay
          title="Clear All Failed Sign-ins"
          message={`This will permanently delete all ${totalFailed} failed login records. This cannot be undone.`}
          confirmLabel={`Delete ${totalFailed} records`}
          danger
          onConfirm={handleClearFailed}
          onCancel={() => setBCO(false)}
          T={T}
          dark={dark}
        />
      )}

      {removeAllOpen && (
        <ConfirmOverlay
          title="Remove All Sign Up Activity"
          message={`This will permanently delete all ${rows.length} login records for all users. This cannot be undone.`}
          confirmLabel={`Yes, Remove All (${rows.length})`}
          danger
          onConfirm={handleRemoveAll}
          onCancel={() => setRAO(false)}
          T={T}
          dark={dark}
        />
      )}

      <style>{`@keyframes lhspin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── table row ──────────────────────────────────────────────────────────────
function HistoryRow({ row, even, isSA, T, dark, flagging, onFlag, onDelete, expandedId, setExpandedId }) {
  const [hover, setHover] = useState(false)
  const isSuccess    = row.status === 'success'
  const isSuspicious = heuristicSuspicious(row)
  const isExpanded   = expandedId === row.id
  const { browser, os } = parseUA(row.user_agent || '')
  const location = row.city
    ? `${row.city}${row.country ? ', ' + row.country : ''}`
    : (row.location || '—')

  const bg = hover
    ? (dark ? 'rgba(255,255,255,0.05)' : '#EBF8FF')
    : isSuspicious
      ? (dark ? 'rgba(214,158,46,0.08)' : '#FFFBEB')
      : even
        ? (dark ? 'transparent' : 'white')
        : (dark ? 'rgba(255,255,255,0.02)' : '#FAFBFC')

  const tdStyle = {
    padding: '11px 14px',
    fontSize: 12, fontFamily: "'Inter',sans-serif",
    color: dark ? 'rgba(255,255,255,0.8)' : '#2D3748',
    borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#EDF2F7'}`,
    verticalAlign: 'middle',
    background: bg,
    transition: 'background .1s',
  }

  return (
    <>
      <tr
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Date */}
        <td style={tdStyle}>
          <div style={{ fontWeight: 700, color: dark ? 'rgba(255,255,255,0.9)' : '#1A365D', whiteSpace: 'nowrap' }}>
            {fmtDate(row.logged_in_at)}
          </div>
          {row.logged_out_at && (
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
              out: {fmtDate(row.logged_out_at)}
            </div>
          )}
        </td>

        {/* Email */}
        <td style={tdStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isSuspicious && <ShieldAlert size={12} style={{ color: '#D69E2E', flexShrink: 0 }}/>}
            <span style={{ fontWeight: 500 }}>{row.email || '—'}</span>
          </div>
        </td>

        {/* Role */}
        <td style={tdStyle}>{roleBadge(row._role)}</td>

        {/* Status */}
        <td style={tdStyle}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20,
            fontSize: 11, fontWeight: 700,
            background: isSuccess ? '#C6F6D5' : '#FED7D7',
            color: isSuccess ? '#22543D' : '#742A2A',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSuccess ? '#38A169' : '#E53E3E', display: 'inline-block' }}/>
            {isSuccess ? 'Success' : 'Failed'}
          </span>
          {!isSuccess && row.failure_reason && (
            <div style={{ fontSize: 10, color: '#C53030', marginTop: 3, maxWidth: 130 }}>
              {row.failure_reason}
            </div>
          )}
        </td>

        {/* Auth Method */}
        <td style={{ ...tdStyle, textTransform: 'capitalize' }}>
          {row.auth_method || '—'}
        </td>

        {/* Device */}
        <td style={tdStyle}>
          <span>{browser} / {os}</span>
        </td>

        {/* Location */}
        <td style={tdStyle}>{location}</td>

        {/* SA Actions */}
        {isSA && (
          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              {/* Expand detail */}
              <ActionBtn
                onClick={() => setExpandedId(isExpanded ? null : row.id)}
                title="View detail"
                accent="#2B6CB0"
              >
                <Eye size={12}/>
              </ActionBtn>

              {/* Flag */}
              <ActionBtn
                onClick={() => onFlag(row)}
                title={row.is_suspicious ? 'Remove flag' : 'Flag as suspicious'}
                accent="#D69E2E"
                active={row.is_suspicious}
                loading={flagging === row.id}
              >
                <Flag size={12}/>
              </ActionBtn>

              {/* Delete */}
              <ActionBtn
                onClick={() => onDelete(row.id)}
                title="Delete entry"
                accent="#E53E3E"
                danger
              >
                <Trash2 size={12}/>
              </ActionBtn>
            </div>
          </td>
        )}
      </tr>

      {/* Expanded detail row */}
      {isExpanded && isSA && (
        <tr>
          <td colSpan={8} style={{
            padding: '14px 20px',
            background: dark ? 'rgba(43,108,176,0.08)' : '#EBF8FF',
            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#BEE3F8'}`,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { label: 'User ID',        val: row.user_id },
                { label: 'Session ID',     val: row.session_id },
                { label: 'Full User Agent',val: row.user_agent, mono: true },
                { label: 'IP Address',     val: row.ip_address },
                { label: 'Failure Reason', val: row.failure_reason },
                { label: 'Auth Method',    val: row.auth_method },
              ].map(({ label, val, mono }) => val ? (
                <div key={label}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: T.textMuted, marginBottom: 2, fontFamily: "'Inter',sans-serif" }}>{label}</div>
                  <div style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.8)' : '#2D3748', fontFamily: mono ? 'monospace' : "'Inter',sans-serif", wordBreak: 'break-all' }}>{val}</div>
                </div>
              ) : null)}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── tiny action button ──────────────────────────────────────────────────────
function ActionBtn({ children, onClick, title, accent, active, loading, danger }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28, borderRadius: 7,
        border: `1px solid ${active || hover ? accent : danger ? '#FEB2B2' : '#E2E8F0'}`,
        background: active ? `${accent}20` : hover ? `${accent}10` : 'transparent',
        color: active || hover ? accent : danger ? '#E53E3E' : '#718096',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .12s', opacity: loading ? .5 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ─── confirm overlay ─────────────────────────────────────────────────────────
function ConfirmOverlay({ title, message, confirmLabel, danger, onConfirm, onCancel, T, dark }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: dark ? '#1A2744' : 'white',
          borderRadius: 16, padding: '28px 28px 24px',
          width: '100%', maxWidth: 400,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <ShieldAlert size={20} style={{ color: danger ? '#E53E3E' : '#D69E2E' }}/>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: dark ? 'white' : '#1A365D', fontFamily: "'Montserrat','Inter',sans-serif" }}>
            {title}
          </h3>
        </div>
        <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Inter',sans-serif", lineHeight: 1.6, margin: '0 0 20px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 9,
              border: `1px solid ${T.border}`, background: 'transparent',
              cursor: 'pointer', fontSize: 12, color: T.text,
              fontFamily: "'Inter',sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 9,
              border: 'none',
              background: danger ? '#E53E3E' : '#D69E2E',
              cursor: 'pointer', fontSize: 12, color: 'white',
              fontWeight: 700, fontFamily: "'Inter',sans-serif",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
