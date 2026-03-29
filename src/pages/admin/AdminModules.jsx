import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Download, MoreHorizontal, Send, Search, RefreshCw, Eye, EyeOff, Save, X, ChevronRight, Shield, Monitor, Bell, Settings, Home, Lock, Mail, Phone, User, Copy, CheckCircle, AlertCircle, Clock, LogOut, Smartphone, Activity, FileText, Key, Globe } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useSiteSettings } from '../../contexts/SiteSettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useAdminTheme } from '../../contexts/AdminThemeContext'
import { Modal, FormField, ConfirmDialog, EmptyState, ReadOnlyBanner } from '../../components/UI'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const MF = "'Montserrat','Inter',sans-serif"
const IF = "'Inter',sans-serif"
const CR = '#C53030'

/* ── Shared styled components ── */
function BtnPrimary({ children, onClick, disabled, style = {} }) {
  const { T, palette, setPalette, navbarVisible, setNavbarVisible, customColors, saveCustomColors, PALETTES, dark, setDark } = useAdminTheme()
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8,
        background: disabled ? '#9CA3AF' : T.navy, color: disabled ? 'white' : (T.navy === '#60A5FA' ? '#0F172A' : 'white'),
        border:'none', cursor: disabled ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:600,
        fontFamily:IF, transition:'background .15s', ...style }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = T.crimson }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = T.navy }}>
      {children}
    </button>
  )
}

function ThreeDotMenu({ items }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top:0, right:0 })
  const { T } = useAdminTheme()
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const toggle = e => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 4, right: window.innerWidth - r.right })
    setOpen(o => !o)
  }
  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button onClick={toggle}
        style={{ background:'none', border:'none', cursor:'pointer', color:T.textMuted, padding:'4px 8px', borderRadius:6, display:'flex', alignItems:'center', transition:'all .15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.text }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.textMuted }}>
        <MoreHorizontal size={18}/>
      </button>
      {open && (
        <div style={{ position:'fixed', right:pos.right, top:pos.top, width:195, background:'white', borderRadius:11, boxShadow:'0 12px 40px rgba(0,0,0,0.16)', border:'1px solid #E2E8F0', zIndex:9999, overflow:'hidden', fontFamily:IF }}>
          {items.map((item, i) => item === 'divider'
            ? <div key={i} style={{ height:1, background:'#F3F4F6', margin:'0 10px' }}/>
            : (
              <button key={i} onClick={e => { e.stopPropagation(); item.onClick(); setOpen(false) }}
                style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'10px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, color: item.danger ? '#C53030' : '#2D3748', fontFamily:IF, textAlign:'left' }}
                onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#FFF5F5' : '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                {item.icon && <span style={{ fontSize:14 }}>{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

const TH = ({ children }) => {
  const { T } = useAdminTheme()
  return <th style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:T.textMuted, borderBottom:`1px solid ${T.border}`, background:T.surface, textTransform:'uppercase', letterSpacing:'0.04em', fontFamily:IF }}>{children}</th>
}
const TD = ({ children, style = {} }) => {
  const { T } = useAdminTheme()
  return <td style={{ padding:'12px 16px', fontSize:13, color:T.text, borderBottom:`1px solid ${T.border}`, verticalAlign:'middle', fontFamily:IF, ...style }}>{children}</td>
}

/* ═══════════════════════════════
   PROJECTS PAGE
═══════════════════════════════ */
const PROJ_EMPTY = { project_name:'', description:'', status:'Planning', budget:'', start_date:'', end_date:'', images:[], fund_source:'SK ABYIP', prepared_by:'' }

export function ProjectsPage() {
  const { T } = useAdminTheme()
  const { logAudit, role } = useAuth()
  const { toast } = useToast()
  const isSuperAdmin = role === 'super_admin'

  /* ── Data ── */
  const [allProjects, setAllProjects] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)
  const mutating = useRef(false) // blocks load() from overwriting during in-flight mutations

  /* ── Filters ── */
  const [search,     setSearch]     = useState('')
  const [statusFilt, setStatusFilt] = useState('all')

  /* ── Modals ── */
  const [modal,      setModal]      = useState(false)
  const [viewModal,  setViewModal]  = useState(false)
  const [viewProj,   setViewProj]   = useState(null)
  const [galIdx,     setGalIdx]     = useState(0)
  const [edit,       setEdit]       = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [delItem,    setDel]        = useState(null)
  const [delLoad,    setDL]         = useState(false)
  const [complItem,  setComp]       = useState(null)
  const [compLoad,   setCL]         = useState(false)
  const [undoItem,   setUndo]       = useState(null)
  const [undoLoad,   setUndoL]      = useState(false)
  const [newImages,  setNewImages]  = useState([])

  /* ── Form ── */
  const EMPTY = { project_name:'', description:'', status:'Planning', budget:'', fund_source:'SK ABYIP', start_date:'', end_date:'', images:[], prepared_by:'' }
  const [form, setForm] = useState(EMPTY)

  useEffect(() => { load() }, [])

  const load = async (force = false) => {
    if (!force && mutating.current) return // don't overwrite optimistic state during mutations
    setLoading(true)
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending:false })
      if (error) throw error
      if (data) setAllProjects(data)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await load(true)
    setRefreshing(false)
  }

  /* ── Derived lists ── */
  const filtered = allProjects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.project_name?.toLowerCase().includes(q) ||
      (p.fund_source || 'SK ABYIP').toLowerCase().includes(q) ||
      (p.prepared_by || '').toLowerCase().includes(q)
    const matchStatus = statusFilt === 'all' || (p.status||'') === statusFilt
    return matchSearch && matchStatus
  })
  const isDone = p => { const s = (p.status||'').toLowerCase().trim(); return s==='completed'||s==='accomplished'||s==='done' } // handles both cases
  const upcoming = filtered.filter(p => !isDone(p))
  const done     = filtered.filter(p =>  isDone(p))

  /* ── CRUD helpers ── */
  const openAdd  = () => { setEdit(null); setForm(EMPTY); setNewImages([]); setModal(true) }
  const openEdit = p => {
    setEdit(p)
    setForm({
      project_name: p.project_name, description: p.description || '',
      status: p.status, budget: p.budget || '',
      fund_source: p.fund_source || 'SK ABYIP',
      start_date: p.start_date || '', end_date: p.end_date || '',
      images: p.images || [], prepared_by: p.prepared_by || '',
    })
    setNewImages([]); setModal(true)
  }
  const openView = p => { setViewProj(p); setGalIdx(0); setViewModal(true) }

  // Keep viewProj in sync when allProjects updates (e.g. after complete/undo)
  useEffect(() => {
    if (viewProj) {
      const updated = allProjects.find(p => p.id === viewProj.id)
      if (updated) setViewProj(updated)
    }
  }, [allProjects])

  const save = async () => {
    if (!form.project_name.trim()) { toast('Project name is required.', 'error'); return }
    setSaving(true)
    try {
      let imgUrls = [...(form.images || [])]
      for (const img of newImages.slice(0, Math.max(0, 4 - imgUrls.length))) {
        const ext  = img.name.split('.').pop()
        const path = `projects/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('project-images').upload(path, img, { upsert:true })
        if (!upErr) {
          const { data } = supabase.storage.from('project-images').getPublicUrl(path)
          imgUrls.push(data.publicUrl)
        }
      }
      const payload = {
        project_name: form.project_name, description: form.description,
        status: form.status, budget: parseFloat(form.budget) || null,
        fund_source: form.fund_source || 'SK ABYIP',
        start_date: form.start_date || null, end_date: form.end_date || null,
        images: imgUrls.slice(0, 4), prepared_by: form.prepared_by || null,
      }
      const { error } = edit
        ? await supabase.from('projects').update(payload).eq('id', edit.id)
        : await supabase.from('projects').insert({ ...payload, created_at: new Date().toISOString() })
      if (error) throw error
      await logAudit(edit ? 'Edit' : 'Create', 'Projects', `${edit ? 'Edited' : 'Created'}: ${form.project_name}`)
      toast(`Project ${edit ? 'updated' : 'created'}!`, 'success')
      setModal(false); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async () => {
    setDL(true)
    try {
      await supabase.from('projects').delete().eq('id', delItem.id)
      await logAudit('Delete', 'Projects', `Deleted: ${delItem.project_name}`)
      toast('Project deleted.', 'success'); setDel(null); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setDL(false) }
  }

  const complete = async () => {
    const savedItem = complItem
    setCL(true)
    setComp(null)
    const completedAt = new Date().toISOString()
    // Optimistic UI update
    setAllProjects(prev => prev.map(p =>
      p.id === savedItem.id
        ? { ...p, status:'Completed', previous_status:savedItem.status, completion_date:completedAt }
        : p
    ))
    try {
      // Build update payload - only include columns that exist in DB
      const completePayload = { status: 'Completed' }
      // These columns require migration — add them if available, skip silently if not
      try { completePayload.previous_status = savedItem.status } catch(_) {}
      try { completePayload.completion_date = completedAt } catch(_) {}
      const { error } = await supabase.from('projects').update(completePayload).eq('id', savedItem.id)
      if (error) throw error
      await logAudit('Complete', 'Projects', `Marked complete: ${savedItem.project_name}`)
      toast(`"${savedItem.project_name}" marked as completed!`, 'success')
    } catch (err) {
      // Roll back optimistic update on failure
      setAllProjects(prev => prev.map(p =>
        p.id === savedItem.id
          ? { ...p, status:savedItem.status, previous_status:null, completion_date:null }
          : p
      ))
      toast(err.message, 'error')
    } finally {
      setCL(false)
      mutating.current = false
      await load(true)
    }
  }

  const undoComplete = async () => {
    const savedUndo = undoItem
    setUndoL(true)
    setUndo(null)
    // prevStatus: use saved previous_status, fall back to 'planning' (always valid in DB)
    // Restore previous status; capitalize first letter to match DB constraint
    const rawPrev = (savedUndo.previous_status || '').trim()
    const prevStatus = rawPrev
      ? rawPrev.charAt(0).toUpperCase() + rawPrev.slice(1).toLowerCase()
      : 'Planning'
    // Optimistic UI update
    setAllProjects(prev => prev.map(p =>
      p.id === savedUndo.id
        ? { ...p, status:prevStatus, previous_status:null, completion_date:null }
        : p
    ))
    try {
      // Build undo payload - only send status; omit missing columns until migration runs
      const undoPayload = { status: prevStatus }
      try { undoPayload.previous_status = null } catch(_) {}
      try { undoPayload.completion_date = null } catch(_) {}
      const { error } = await supabase.from('projects').update(undoPayload).eq('id', savedUndo.id)
      if (error) throw error
      await logAudit('Undo', 'Projects', `Reverted "${savedUndo.project_name}" to ${prevStatus}`)
      toast(`"${savedUndo.project_name}" reverted to ${prevStatus}.`, 'success')
    } catch (err) {
      // Roll back optimistic update on failure
      setAllProjects(prev => prev.map(p =>
        p.id === savedUndo.id
          ? { ...p, status:'Completed', previous_status:prevStatus, completion_date:savedUndo.completion_date }
          : p
      ))
      toast(err.message, 'error')
    } finally {
      setUndoL(false)
      mutating.current = false
      await load(true)
    }
  }

  const downloadReport = async (p) => {
    const lines = [
      'PROJECT COMPLETION REPORT', '='.repeat(52), '',
      `Project Name:     ${p.project_name}`,
      `Description:      ${p.description || 'N/A'}`,
      `Budget:           ₱${p.budget?.toLocaleString() || 'N/A'}`,
      `Fund Source:      ${p.fund_source || 'SK ABYIP'}`,
      `Prepared By:      ${p.prepared_by || 'N/A'}`,
      `Start Date:       ${p.start_date ? format(new Date(p.start_date), 'MMMM dd, yyyy') : 'N/A'}`,
      `End Date:         ${p.end_date   ? format(new Date(p.end_date),   'MMMM dd, yyyy') : 'N/A'}`,
      `Completion Date:  ${p.completion_date ? format(new Date(p.completion_date), 'MMMM dd, yyyy') : 'N/A'}`,
      `Status:           Completed`, '',
      `Images: ${(p.images || []).join('\n         ') || 'None'}`, '',
      '─'.repeat(52),
      'Generated by BarangayConnect — Barangay Bakakeng Central SK',
      format(new Date(), 'MMMM dd, yyyy hh:mm a'),
    ]
    const a = document.createElement('a')
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(lines.join('\n'))
    a.download = `${p.project_name.replace(/\s+/g, '-')}-report.txt`
    a.click()
    await logAudit('Export', 'Projects', `Downloaded report: ${p.project_name}`)
    toast('Report downloaded.', 'success')
  }

  /* ── Sub-components ── */
  const sBadge = s => {
    const sl = (s || '').toLowerCase()
    const m = {
      planning:    { bg:'#EBF8FF', color:'#1A365D' },
      ongoing:     { bg:'#F0FFF4', color:'#276749' },
      'on hold':   { bg:'#FEF9E7', color:'#7B4800' },
      completed:   { bg:'#F0FFF4', color:'#276749', border:'1px solid #9AE6B4' },
      accomplished:{ bg:'#F0FFF4', color:'#276749', border:'1px solid #9AE6B4' },
      done:        { bg:'#F0FFF4', color:'#276749', border:'1px solid #9AE6B4' },
    }
    const st = m[sl] || { bg:'#F7FAFC', color:'#718096' }
    const showCheck = sl === 'completed' || sl === 'accomplished' || sl === 'done'
    return (
      <span style={{ padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:700, background:st.bg, color:st.color, textTransform:'capitalize', fontFamily:IF, border: st.border || 'none' }}>
        {showCheck ? '✅ ' : ''}{s}
      </span>
    )
  }

  const FundBadge = ({ src }) => (
    <span style={{ padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:`${T.gold}20`, color:T.gold, border:`1px solid ${T.gold}40`, fontFamily:IF }}>
      {src || 'SK ABYIP'}
    </span>
  )

  const card = { background:T.surface, borderRadius:14, border:`1px solid ${T.border}`, marginBottom:22, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.04)' }

  /* ── Shared detail panel (used in view modal) ── */
  const DetailRow = ({ label, value, accent }) => (
    <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.5px', width:120, flexShrink:0, fontFamily:IF, paddingTop:2 }}>{label}</span>
      <span style={{ fontSize:13, color: accent || T.text, fontFamily:IF, fontWeight: accent ? 700 : 400, flex:1 }}>{value || '—'}</span>
    </div>
  )

  return (
    <div>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:translateY(20px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes galFade { from { opacity:0; } to { opacity:1; } }
      `}</style>

      <h1 style={{ fontSize:26, fontWeight:800, color:T.navy, marginBottom:4, fontFamily:MF }}>Project Management</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:20, fontFamily:IF }}>Oversee all community projects, both upcoming and accomplished.</p>

      {/* ── Toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        {/* Search */}
        <div style={{ position:'relative', flex:'1 1 280px', maxWidth:360 }}>
          <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:T.textMuted }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, fund source, prepared by…"
            className="input-field" style={{ paddingLeft:32, fontSize:12, width:'100%', boxSizing:'border-box' }}/>
          {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.textMuted, display:'flex', padding:0 }}><X size={13}/></button>}
        </div>

        {/* Status filter dropdown */}
        <div style={{ position:'relative' }}>
          <select value={statusFilt} onChange={e => setStatusFilt(e.target.value)}
            style={{ appearance:'none', WebkitAppearance:'none',
              padding:'8px 36px 8px 14px', borderRadius:8, fontSize:12, fontWeight:600,
              border:`1.5px solid ${statusFilt !== 'all' ? T.navy : T.border}`,
              background: statusFilt !== 'all' ? T.navy : T.surface,
              color: statusFilt !== 'all' ? 'white' : T.textMuted,
              cursor:'pointer', fontFamily:IF, outline:'none', transition:'all .15s',
              boxShadow: statusFilt !== 'all' ? `0 2px 8px ${T.navy}30` : 'none',
            }}>
            <option value="all">All Status</option>
            <option value="Planning">Planning</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
          <div style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none',
            color: statusFilt !== 'all' ? 'white' : T.textMuted, fontSize:10 }}>▼</div>
        </div>

        {/* Refresh button */}
        <button onClick={handleRefresh} title="Refresh"
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8,
            border:`1px solid ${T.border}`, background:T.surface, cursor:'pointer',
            fontSize:12, fontWeight:600, color:T.text, fontFamily:IF, transition:'all .15s',
            boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
          onMouseEnter={e => { e.currentTarget.style.background=T.tableHover; e.currentTarget.style.borderColor=T.navy }}
          onMouseLeave={e => { e.currentTarget.style.background=T.surface; e.currentTarget.style.borderColor=T.border }}>
          <RefreshCw size={13} style={{ transition:'transform .4s', transform: refreshing ? 'rotate(360deg)' : 'rotate(0deg)',
            animation: refreshing ? 'spin .6s linear infinite' : 'none' }}/>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>

        <div style={{ marginLeft:'auto' }}>
          <BtnPrimary onClick={openAdd}><Plus size={14}/> Add Project</BtnPrimary>
        </div>
      </div>

      {/* ══ UPCOMING PROJECTS TABLE ══ */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 20px', borderBottom:`1px solid ${T.border}`, background: T.bg }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: T.navy }}/>
            <h2 style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:MF, margin:0 }}>Upcoming Projects</h2>
            <span style={{ fontSize:11, background:`${T.navy}15`, color:T.navy, padding:'2px 9px', borderRadius:20, fontWeight:700 }}>{upcoming.length}</span>
          </div>
        </div>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:T.textMuted }}>Loading…</div>
        ) : upcoming.length === 0 ? (
          <EmptyState icon="📁" title="No upcoming projects" subtitle={search ? 'Try a different search.' : 'Click Add Project to get started.'}/>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <TH>Project Name</TH><TH>Fund Source</TH><TH>Dates</TH><TH>Status</TH>
                <TH>Budget</TH><TH>Prepared By</TH>
              </tr>
            </thead>
            <tbody>
              {upcoming.map(p => (
                <tr key={p.id} style={{ transition:'background .12s', cursor:'pointer' }}
                  onClick={() => openView(p)}
                  onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <TD style={{ fontWeight:600 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt="" style={{ width:36, height:27, objectFit:'cover', borderRadius:5, flexShrink:0, border:`1px solid ${T.border}` }}/>
                        : <div style={{ width:36, height:27, borderRadius:5, background:`${T.navy}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>🏗️</div>
                      }
                      <span style={{ fontSize:13, color:T.text, fontFamily:IF }}>{p.project_name}</span>
                    </div>
                  </TD>
                  <TD><FundBadge src={p.fund_source}/></TD>
                  <TD style={{ fontSize:11, color:T.textMuted }}>
                    {p.start_date ? format(new Date(p.start_date), 'MMM d, yyyy') : '—'}<br/>
                    {p.end_date   ? '→ ' + format(new Date(p.end_date), 'MMM d, yyyy') : ''}
                  </TD>
                  <TD>{sBadge(p.status)}</TD>
                  <TD style={{ fontWeight:600, color:T.navy }}>{p.budget ? `₱${parseFloat(p.budget).toLocaleString()}` : '—'}</TD>
                  <TD style={{ fontSize:12, color:T.textMuted }}>{p.prepared_by || '—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ ACCOMPLISHED PROJECTS TABLE ══ */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 20px', borderBottom:`1px solid ${T.border}`, background:`${T.navy}06` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#38A169' }}/>
            <h2 style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:MF, margin:0 }}>Accomplished Projects</h2>
            <span style={{ fontSize:11, background:'#C6F6D5', color:'#276749', padding:'2px 9px', borderRadius:20, fontWeight:700 }}>{done.length}</span>
          </div>
        </div>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:T.textMuted }}>Loading…</div>
        ) : done.length === 0 ? (
          <EmptyState icon="✅" title="No completed projects yet" subtitle={search ? 'Try a different search.' : 'Mark a project as done to see it here.'}/>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <TH>Project Name</TH><TH>Date Completed</TH><TH>Fund Source</TH>
                <TH>Budget</TH><TH>Prepared By</TH><TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {done.map(p => (
                <tr key={p.id} style={{ transition:'background .12s', cursor:'pointer' }}
                  onClick={() => openView(p)}
                  onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <TD style={{ fontWeight:600 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt="" style={{ width:36, height:27, objectFit:'cover', borderRadius:5, flexShrink:0, border:`1px solid ${T.border}` }}/>
                        : <div style={{ width:36, height:27, borderRadius:5, background:'#C6F6D5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>✅</div>
                      }
                      <span style={{ fontSize:13, color:T.text, fontFamily:IF }}>{p.project_name}</span>
                    </div>
                  </TD>
                  <TD style={{ fontSize:12 }}>{p.completion_date ? format(new Date(p.completion_date), 'MMM dd, yyyy') : '—'}</TD>
                  <TD><FundBadge src={p.fund_source}/></TD>
                  <TD style={{ fontWeight:700, color:'#276749' }}>{p.budget ? `₱${parseFloat(p.budget).toLocaleString()}` : '—'}</TD>
                  <TD style={{ fontSize:12, color:T.textMuted }}>{p.prepared_by || '—'}</TD>
                  <TD>{sBadge(p.status)}</TD>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ VIEW DETAILS MODAL ══ */}
      {viewModal && viewProj && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) setViewModal(false) }}>
          <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:700, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', animation:'modalIn .28s ease' }}>

            {/* Header */}
            <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'flex-start', justifyContent:'space-between', background:`linear-gradient(135deg,#1A365D,#2A4A7F)`, flexShrink:0 }}>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'1px', margin:'0 0 4px', fontFamily:IF }}>Project Details</p>
                <h2 style={{ fontSize:20, fontWeight:800, color:'white', margin:0, fontFamily:MF, lineHeight:1.3 }}>{viewProj.project_name}</h2>
              </div>
              <button onClick={() => setViewModal(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><X size={16}/></button>
            </div>

            {/* Body */}
            <div style={{ overflowY:'auto', padding:'20px 24px', flex:1 }}>

              {/* Image gallery */}
              {(viewProj.images || []).filter(Boolean).length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ position:'relative', borderRadius:12, overflow:'hidden', background:'#1a1a1a', paddingBottom:'52%' }}>
                    <img key={galIdx} src={viewProj.images[galIdx]} alt={viewProj.project_name}
                      style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', animation:'galFade .3s ease' }}/>
                    {viewProj.images.length > 1 && (
                      <>
                        <button onClick={() => setGalIdx(i => (i - 1 + viewProj.images.length) % viewProj.images.length)}
                          style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
                        <button onClick={() => setGalIdx(i => (i + 1) % viewProj.images.length)}
                          style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
                        <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6 }}>
                          {viewProj.images.map((_, i) => (
                            <button key={i} onClick={() => setGalIdx(i)}
                              style={{ width: i===galIdx?20:7, height:7, borderRadius:4, border:'none', padding:0, background: i===galIdx?'white':'rgba(255,255,255,0.45)', cursor:'pointer', transition:'all .25s' }}/>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {viewProj.images.length > 1 && (
                    <div style={{ display:'flex', gap:8, marginTop:10 }}>
                      {viewProj.images.map((url, i) => (
                        <img key={i} src={url} alt="" onClick={() => setGalIdx(i)}
                          style={{ width:64, height:48, objectFit:'cover', borderRadius:7, cursor:'pointer', border: i===galIdx ? '2px solid #1A365D' : '2px solid transparent', opacity: i===galIdx?1:.7, transition:'all .2s' }}/>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Details grid */}
              <DetailRow label="Date Conducted" value={
                [viewProj.start_date && format(new Date(viewProj.start_date), 'MMMM d, yyyy'),
                 viewProj.end_date   && format(new Date(viewProj.end_date),   'MMMM d, yyyy')]
                .filter(Boolean).join(' — ') || '—'
              }/>
              <DetailRow label="Budget" value={viewProj.budget ? `₱${parseFloat(viewProj.budget).toLocaleString()}` : '—'} accent="#276749"/>
              <DetailRow label="Fund Source" value={viewProj.fund_source || 'SK ABYIP'}/>
              <DetailRow label="Prepared By" value={viewProj.prepared_by || '—'}/>
              <DetailRow label="Status" value={viewProj.status?.charAt(0).toUpperCase() + viewProj.status?.slice(1) || '—'}/>
              {viewProj.completion_date && <DetailRow label="Completed On" value={format(new Date(viewProj.completion_date), 'MMMM d, yyyy')}/>}

              {/* Description */}
              {viewProj.description && (
                <div style={{ marginTop:16 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8, fontFamily:IF }}>Description / Purpose</p>
                  <p style={{ fontSize:13, color:'#2D3748', lineHeight:1.8, fontFamily:IF, background:'#F7FAFC', padding:'12px 16px', borderRadius:10, border:'1px solid #E2E8F0', margin:0 }}>{viewProj.description}</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{ padding:'14px 24px', borderTop:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#FAFBFC', flexShrink:0 }}>
              {/* Left side — context-sensitive */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => downloadReport(viewProj)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'white', cursor:'pointer', fontSize:12, fontWeight:600, color:'#2D3748', fontFamily:IF }}>
                  <Download size={13}/> Download Report
                </button>
                {!isDone(viewProj) && isSuperAdmin && (
                  <button onClick={() => { setViewModal(false); setComp(viewProj) }}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1.5px solid #9AE6B4', background:'#F0FFF4', cursor:'pointer', fontSize:12, fontWeight:700, color:'#276749', fontFamily:IF }}>
                    ✅ Mark as Complete
                  </button>
                )}
                {!isDone(viewProj) && isSuperAdmin && (
                  <button onClick={() => { setViewModal(false); setDel(viewProj) }}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1.5px solid #FC8181', background:'#FFF5F5', cursor:'pointer', fontSize:12, fontWeight:700, color:'#C53030', fontFamily:IF }}>
                    🗑️ Delete
                  </button>
                )}
                {isDone(viewProj) && isSuperAdmin && (
                  <button onClick={() => { setViewModal(false); setUndo(viewProj) }}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1.5px solid #FCD34D', background:'#FEF9E7', cursor:'pointer', fontSize:12, fontWeight:700, color:'#92400E', fontFamily:IF }}>
                    ↩ Undo Completion
                  </button>
                )}
              </div>
              {/* Right: Edit + Close */}
              <div style={{ display:'flex', gap:8 }}>
                {isSuperAdmin && (
                  <button onClick={() => { setViewModal(false); openEdit(viewProj) }}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:T.navy, color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:IF }}>
                    ✏️ Edit
                  </button>
                )}
                <button onClick={() => setViewModal(false)}
                  style={{ padding:'8px 20px', borderRadius:8, background: isSuperAdmin ? 'white' : '#1A365D', color: isSuperAdmin ? '#2D3748' : 'white', border:'1.5px solid #E2E8F0', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:IF }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD / EDIT MODAL ══ */}
      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Project' : 'Add New Project'} size="md"
        footer={<><button onClick={() => setModal(false)} className="btn-ghost">Cancel</button><BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Project'}</BtnPrimary></>}>

        <FormField label="Project Name" required>
          <input className="input-field" value={form.project_name} onChange={e=>setForm(f=>({...f,project_name:e.target.value}))} placeholder="Enter project name"/>
        </FormField>
        <FormField label="Description / Purpose">
          <textarea className="input-field" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{ resize:'vertical' }} placeholder="Describe the project goals and purpose…"/>
        </FormField>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label="Status">
            <select className="input-field" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="Planning">Planning</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </FormField>
          <FormField label="Budget (₱)">
            <input type="number" className="input-field" value={form.budget} onChange={e=>setForm(f=>({...f,budget:e.target.value}))} placeholder="0.00" min="0"/>
          </FormField>
          <FormField label="Fund Source">
            <input className="input-field" value={form.fund_source} onChange={e=>setForm(f=>({...f,fund_source:e.target.value}))} placeholder="SK ABYIP"/>
          </FormField>
          <FormField label="Prepared By">
            <input className="input-field" value={form.prepared_by} onChange={e=>setForm(f=>({...f,prepared_by:e.target.value}))} placeholder="SK Kagawad: Name"/>
          </FormField>
          <FormField label="Start Date & Time">
            <input type="datetime-local" className="input-field" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/>
          </FormField>
          <FormField label="End Date & Time">
            <input type="datetime-local" className="input-field" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/>
          </FormField>
        </div>

        <FormField label={`Project Images (${(form.images||[]).length + newImages.length}/4 max)`}>
          {(form.images||[]).length > 0 && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
              {(form.images||[]).map((url,i) => (
                <div key={i} style={{ position:'relative', width:80, height:60 }}>
                  <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:6, border:'1px solid #E2E8F0' }}/>
                  <button type="button" onClick={() => setForm(f=>({...f,images:(f.images||[]).filter((_,idx)=>idx!==i)}))}
                    style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'#C53030', color:'white', border:'none', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>×</button>
                </div>
              ))}
            </div>
          )}
          {newImages.length > 0 && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
              {newImages.map((img,i) => (
                <div key={i} style={{ position:'relative', width:80, height:60 }}>
                  <img src={URL.createObjectURL(img)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:6, border:'2px dashed #D69E2E' }}/>
                  <button type="button" onClick={() => setNewImages(prev=>prev.filter((_,idx)=>idx!==i))}
                    style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'#C53030', color:'white', border:'none', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                </div>
              ))}
            </div>
          )}
          {((form.images||[]).length + newImages.length) < 4 && (
            <label style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:8, border:'1.5px dashed #CBD5E0', background:'#F7FAFC', cursor:'pointer', fontSize:12, color:'#718096', fontWeight:600, fontFamily:IF }}>
              + Add Image ({4-(form.images||[]).length-newImages.length} remaining)
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{
                const file=e.target.files[0]; if(!file) return
                if((form.images||[]).length+newImages.length>=4){toast('Max 4 images.','error');return}
                setNewImages(prev=>[...prev,file]); e.target.value=''
              }}/>
            </label>
          )}
        </FormField>
      </Modal>

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog open={!!delItem}   onClose={()=>setDel(null)}  onConfirm={del}          loading={delLoad}  danger title="Delete Project"        message={`Delete "${delItem?.project_name}"? This cannot be undone.`}/>
      <ConfirmDialog open={!!complItem} onClose={()=>setComp(null)} onConfirm={complete}     loading={compLoad}       title="Mark as Completed?"    message={`Mark "${complItem?.project_name}" as completed?`}/>
      <ConfirmDialog open={!!undoItem}  onClose={()=>setUndo(null)} onConfirm={undoComplete} loading={undoLoad}       title="↩ Undo Completion?"     message={`Revert "${undoItem?.project_name}" back to its previous status (${undoItem?.previous_status || 'upcoming'})?`}/>
    </div>
  )
}

/* ═══════════════════════════════
   EVENTS PAGE
═══════════════════════════════ */
/* ═══════════════════════════════
   EVENTS PAGE  (admin/super-admin)
═══════════════════════════════ */
const EVT_EMPTY = {
  title:'', description:'', location:'', handler:'',
  external_link:'', cancel_reason:'',
  start_date:'', end_date:'', status:'upcoming',
  event_id:'', session_id:'',
}

const genId  = (prefix, len=6) => prefix + Date.now().toString(36).toUpperCase().slice(-len)

export function EventsPage() {
  const { T } = useAdminTheme()
  const { logAudit, role } = useAuth()
  const { toast }    = useToast()
  const isSA         = role === 'super_admin'

  const [events,     setEvents]    = useState([])
  const [loading,    setLoading]   = useState(false)
  const [modal,      setModal]     = useState(false)
  const [viewItem,   setView]      = useState(null)
  const [edit,       setEdit]      = useState(null)
  const [form,       setForm]      = useState(EVT_EMPTY)
  const [saving,     setSave]      = useState(false)
  const [del,        setDel]       = useState(null)
  const [delLoad,    setDL]        = useState(false)
  const [search,     setSearch]    = useState('')
  const [statusFilt, setStatusFilt]= useState('all')
  const [now,        setNow]       = useState(new Date())
  const [page,       setPage]      = useState(0)
  const PAGE_SIZE = 8

  /* real-time clock */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('events').select('*').order('start_date', { ascending:true })
      if (error) throw error
      if (data) setEvents(data)
    } catch (err) { toast(err.message, 'error') }
    finally { setLoading(false) }
  }

  const safeDate = (val, fmt) => {
    try { const d = new Date(val); return isNaN(d.getTime()) ? '—' : format(d, fmt) } catch { return '—' }
  }

  /* countdown label */
  const countdown = (ev) => {
    const start = ev.start_date ? new Date(ev.start_date) : null
    const end   = ev.end_date   ? new Date(ev.end_date)   : null
    if (!start || isNaN(start)) return null
    const diffMs  = start - now
    const diffMin = Math.floor(diffMs / 60000)
    const diffH   = Math.floor(diffMs / 3600000)
    const diffD   = Math.floor(diffMs / 86400000)
    if (end && now >= end)   return { label:'Ended', color:'#718096' }
    if (diffMs < 0)          return { label:'Ongoing now', color:'#166534' }
    if (diffMin < 60)        return { label:`${diffMin}m remaining`, color:'#C53030' }
    if (diffH < 24)          return { label:`${diffH}h remaining`, color:'#D97706' }
    if (diffD === 0)         return { label:'Today!', color:'#C53030' }
    if (diffD === 1)         return { label:'Tomorrow', color:'#D97706' }
    return { label:`${diffD} days`, color:'#1A365D' }
  }

  /* reminders (events within 2 days or 1 hour) */
  const reminders = events.filter(ev => {
    if (!ev.start_date || ev.status?.toLowerCase() === 'cancelled') return false
    const diff = new Date(ev.start_date) - now
    return diff > 0 && diff <= 2 * 86400000
  })

  const openAdd  = () => {
    setEdit(null)
    setForm({ ...EVT_EMPTY, event_id: genId('EVT-'), session_id: genId('SES-') })
    setModal(true)
  }
  const openEdit = ev => {
    setEdit(ev)
    setForm({
      title:ev.title, description:ev.description||'', location:ev.location||'',
      handler:ev.handler||'', external_link:ev.external_link||'',
      cancel_reason:ev.cancel_reason||'',
      start_date:ev.start_date||'', end_date:ev.end_date||'',
      status:ev.status||'upcoming',
      event_id:ev.event_id||genId('EVT-'), session_id:ev.session_id||genId('SES-'),
    })
    setModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) { toast('Event title is required.','error'); return }
    if (form.status === 'cancelled' && !form.cancel_reason.trim()) { toast('Cancellation reason is required.','error'); return }
    setSave(true)
    try {
      const payload = {
        title:form.title, description:form.description,
        location:form.location||null, handler:form.handler||null,
        external_link:form.external_link||null,
        cancel_reason: form.status==='cancelled' ? form.cancel_reason : null,
        start_date:form.start_date||null, end_date:form.end_date||null,
        status:form.status,
        event_id:form.event_id, session_id:form.session_id,
      }
      const { error } = edit
        ? await supabase.from('events').update(payload).eq('id', edit.id)
        : await supabase.from('events').insert({ ...payload, created_at:new Date().toISOString() })
      if (error) throw error
      await logAudit(edit?'Edit':'Create','Events',`${edit?'Edited':'Created'}: ${form.title}`)
      toast(`Event ${edit?'updated':'created'}!`, 'success'); setModal(false); load()
    } catch (err) { toast(err.message,'error') }
    finally { setSave(false) }
  }

  const doDelete = async () => {
    setDL(true)
    try {
      await supabase.from('events').delete().eq('id', del.id)
      await logAudit('Delete','Events',`Deleted: ${del.title}`)
      toast('Event deleted.','success'); setDel(null); load()
    } catch (err) { toast(err.message,'error') }
    finally { setDL(false) }
  }

  const sBadge = (s) => {
    const map = {
      planning:  { bg:'#EBF8FF', color:'#1A365D' },
      upcoming:  { bg:'#DBEAFE', color:'#1D4ED8' },
      ongoing:   { bg:'#DCFCE7', color:'#166534' },
      completed: { bg:'#F0FFF4', color:'#276749' },
      cancelled: { bg:'#FEE2E2', color:'#DC2626' },
    }
    const st = map[(s||'').toLowerCase()] || { bg:'#F3F4F6', color:'#718096' }
    return (
      <span style={{ padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:700,
        background:st.bg, color:st.color, fontFamily:IF, textTransform:'capitalize', whiteSpace:'nowrap' }}>
        {s}
      </span>
    )
  }

  const filtered = events.filter(ev => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      ev.title?.toLowerCase().includes(q) ||
      (ev.description||'').toLowerCase().includes(q) ||
      (ev.event_id||'').toLowerCase().includes(q) ||
      (ev.session_id||'').toLowerCase().includes(q) ||
      (ev.handler||'').toLowerCase().includes(q)
    const matchStatus = statusFilt === 'all' || (ev.status||'').toLowerCase() === statusFilt
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged      = filtered.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE)

  const STATUSES = ['all','planning','upcoming','ongoing','completed','cancelled']

  return (
    <div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:T.navy, marginBottom:2, fontFamily:MF }}>Event Management</h1>
          <p style={{ fontSize:13, color:T.textMuted, margin:0, fontFamily:IF }}>
            {new Date().toLocaleDateString('en-PH',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            {' · '}{new Date().toLocaleTimeString('en-PH',{ hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </p>
        </div>
        <BtnPrimary onClick={openAdd}><Plus size={14}/> Add Event</BtnPrimary>
      </div>

      {/* Reminder strip */}
      {reminders.length > 0 && (
        <div style={{ background:`${T.gold}10`, border:`1px solid ${T.gold}40`, borderRadius:12, padding:'10px 16px', marginBottom:18 }}>
          {reminders.map(ev => {
            const cd = countdown(ev)
            return (
              <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:`1px solid ${T.gold}20` }}>
                <Bell size={14} style={{ color:T.gold, flexShrink:0 }}/>
                <span style={{ fontSize:13, color:T.text, fontFamily:IF }}>
                  <strong>Reminder:</strong> <em>{ev.title}</em> is in{' '}
                  <strong style={{ color:cd?.color }}>{cd?.label}</strong>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {/* Search */}
        <div style={{ position:'relative', flex:'1 1 260px', maxWidth:400 }}>
          <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:T.textMuted }}/>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search title, ID, session ID, handler…"
            className="input-field" style={{ paddingLeft:32, fontSize:12, width:'100%', boxSizing:'border-box' }}/>
          {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.textMuted, display:'flex', padding:0 }}><X size={13}/></button>}
        </div>
        {/* Status filter dropdown */}
        {(() => {
          const statusMap = {
            planning:  { bg:'#EBF8FF', color:'#1A365D', border:'#BEE3F8' },
            upcoming:  { bg:'#DBEAFE', color:'#1D4ED8', border:'#BFDBFE' },
            ongoing:   { bg:'#DCFCE7', color:'#166534', border:'#A7F3D0' },
            completed: { bg:'#F0FFF4', color:'#276749', border:'#9AE6B4' },
            cancelled: { bg:'#FEE2E2', color:'#DC2626', border:'#FECACA' },
          }
          const active = statusMap[statusFilt]
          return (
            <div style={{ position:'relative' }}>
              <select
                value={statusFilt}
                onChange={e => { setStatusFilt(e.target.value); setPage(0) }}
                style={{
                  appearance:'none', WebkitAppearance:'none',
                  padding:'7px 32px 7px 12px', borderRadius:8, cursor:'pointer',
                  border:`1.5px solid ${active ? active.border : T.border}`,
                  background: active ? active.bg : T.surface,
                  color: active ? active.color : T.text,
                  fontSize:12, fontWeight:600, fontFamily:IF, minWidth:140,
                }}>
                <option value="all">All Events</option>
                <option value="planning">Planning</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', fontSize:10, color: active ? active.color : T.textMuted }}>▼</span>
            </div>
          )
        })()}
        <button onClick={load} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:8, border:`1px solid ${T.border}`, background:T.surface, cursor:'pointer', fontSize:12, color:T.text, fontFamily:IF }}>
          <RefreshCw size={12}/> Refresh
        </button>
      </div>

      {/* Table card */}
      <div style={{ background:T.surface, borderRadius:14, border:`1px solid ${T.border}`, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.04)' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${T.border}`, background:T.bg, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:T.navy }}/>
          <h2 style={{ fontSize:15, fontWeight:700, color:T.text, margin:0, fontFamily:MF }}>Community Events</h2>
          <span style={{ fontSize:11, background:`${T.navy}15`, color:T.navy, padding:'2px 9px', borderRadius:20, fontWeight:700 }}>{filtered.length}</span>
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:T.textMuted, fontFamily:IF }}>Loading events…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📅" title={search ? 'No events match your search' : 'No events yet'}
            subtitle={search ? 'Try a different search.' : 'Click Add Event to create the first one.'}
            action={!search && <BtnPrimary onClick={openAdd}><Plus size={13}/> Add Event</BtnPrimary>}/>
        ) : (
          <>
          <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
            <thead>
              <tr>
                <TH>ID / Session</TH>
                <TH>Event Title</TH>
                <TH>Event Dates</TH>
                <TH>Status</TH>
                <TH>Countdown</TH>
                <TH>Handler</TH>
                <TH>Link</TH>
              </tr>
            </thead>
            <tbody>
              {paged.map(ev => {
                const cd = countdown(ev)
                const isCancelled = (ev.status||'').toLowerCase() === 'cancelled'
                return (
                  <tr key={ev.id} style={{ transition:'background .12s', cursor:'pointer' }}
                    onClick={() => setView(ev)}
                    onMouseEnter={e=>e.currentTarget.style.background=T.tableHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <TD>
                      <p style={{ fontSize:10, color:T.navy, fontWeight:700, margin:'0 0 2px', fontFamily:'monospace' }}>{ev.event_id||'—'}</p>
                      <p style={{ fontSize:9, color:T.textMuted, margin:0, fontFamily:'monospace' }}>{ev.session_id||'—'}</p>
                    </TD>
                    <TD>
                      <p style={{ fontSize:13, fontWeight:700, color:T.text, margin:'0 0 2px', fontFamily:IF }}>{ev.title}</p>
                      {ev.description && <p style={{ fontSize:11, color:T.textMuted, margin:0, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.description}</p>}
                      {isCancelled && ev.cancel_reason && (
                        <p style={{ fontSize:10, color:'#DC2626', margin:'3px 0 0', fontStyle:'italic' }}>❌ {ev.cancel_reason}</p>
                      )}
                    </TD>
                    <TD style={{ fontSize:11 }}>
                      <p style={{ margin:'0 0 2px', color:T.text }}>▶ {safeDate(ev.start_date,'MMM d, yyyy h:mm a')}</p>
                      <p style={{ margin:0, color:T.textMuted }}>■ {safeDate(ev.end_date,'MMM d, yyyy h:mm a')}</p>
                    </TD>
                    <TD>{sBadge(ev.status)}</TD>
                    <TD>
                      {cd && !isCancelled
                        ? <span style={{ fontSize:11, fontWeight:700, color:cd.color, whiteSpace:'nowrap' }}>{cd.label}</span>
                        : <span style={{ fontSize:11, color:T.textMuted }}>—</span>}
                    </TD>
                    <TD style={{ fontSize:12, color:T.textMuted, maxWidth:140 }}>
                      {ev.handler || '—'}
                    </TD>
                    <TD>
                      {ev.external_link
                        ? <a href={ev.external_link} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:6, background:`${T.navy}10`, color:T.navy, fontSize:11, fontWeight:600, textDecoration:'none', border:`1px solid ${T.navy}30` }}>
                            🔗 Open
                          </a>
                        : <span style={{ fontSize:11, color:T.textMuted }}>—</span>}
                    </TD>

                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderTop:`1px solid ${T.border}`, background:T.bg }}>
              <span style={{ fontSize:12, color:T.textMuted, fontFamily:IF }}>
                {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE, filtered.length)} of {filtered.length} events
              </span>
              <div style={{ display:'flex', gap:5 }}>
                <button disabled={page===0} onClick={() => setPage(p=>p-1)}
                  style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${T.border}`, background:T.surface, cursor:page===0?'not-allowed':'pointer', fontSize:12, color:page===0?T.textMuted:T.text, fontFamily:IF, opacity:page===0?.5:1 }}>← Prev</button>
                {Array.from({length:totalPages},(_,i)=>(
                  <button key={i} onClick={() => setPage(i)}
                    style={{ padding:'5px 10px', borderRadius:7, border:`1.5px solid ${i===page?T.navy:T.border}`, background:i===page?T.navy:T.surface, color:i===page?'white':T.text, fontSize:12, cursor:'pointer', fontFamily:IF, fontWeight:i===page?700:400 }}>{i+1}</button>
                ))}
                <button disabled={page===totalPages-1} onClick={() => setPage(p=>p+1)}
                  style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${T.border}`, background:T.surface, cursor:page===totalPages-1?'not-allowed':'pointer', fontSize:12, color:page===totalPages-1?T.textMuted:T.text, fontFamily:IF, opacity:page===totalPages-1?.5:1 }}>Next →</button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* View Details Modal */}
      {viewItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(3px)' }}
          onClick={e => { if (e.target===e.currentTarget) setView(null) }}>
          <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:580, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', animation:'modalIn .25s ease' }}>
            <div style={{ padding:'18px 24px', background:`linear-gradient(135deg,${T.navy},#2A4A7F)`, flexShrink:0, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 4px', fontFamily:IF }}>
                  {viewItem.event_id} · {viewItem.session_id}
                </p>
                <h2 style={{ fontSize:18, fontWeight:800, color:'white', margin:0, fontFamily:MF }}>{viewItem.title}</h2>
              </div>
              <button onClick={() => setView(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><X size={14}/></button>
            </div>
            <div style={{ overflowY:'auto', padding:'20px 24px', flex:1 }}>
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                {sBadge(viewItem.status)}
                {countdown(viewItem) && (viewItem.status||'').toLowerCase() !== 'cancelled' && (
                  <span style={{ padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:700, background:`${countdown(viewItem).color}18`, color:countdown(viewItem).color, fontFamily:IF }}>
                    ⏱ {countdown(viewItem).label}
                  </span>
                )}
              </div>
              {[
                ['📅 Start',      safeDate(viewItem.start_date, "MMMM d, yyyy 'at' h:mm a")],
                ['🏁 End',        safeDate(viewItem.end_date,   "MMMM d, yyyy 'at' h:mm a")],
                ['📍 Location',   viewItem.location   || '—'],
                ['👤 Handler',    viewItem.handler     || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:`1px solid #E2E8F0` }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'.5px', width:110, flexShrink:0, fontFamily:IF, paddingTop:2 }}>{label}</span>
                  <span style={{ fontSize:13, color:'#2D3748', fontFamily:IF }}>{value}</span>
                </div>
              ))}
              {viewItem.external_link && (
                <div style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid #E2E8F0' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'.5px', width:110, flexShrink:0, fontFamily:IF, paddingTop:2 }}>🔗 Link</span>
                  <a href={viewItem.external_link} target="_blank" rel="noreferrer"
                    style={{ fontSize:13, color:T.navy, fontFamily:IF, wordBreak:'break-all' }}>{viewItem.external_link}</a>
                </div>
              )}
              {(viewItem.status||'').toLowerCase() === 'cancelled' && viewItem.cancel_reason && (
                <div style={{ marginTop:14, padding:'12px 16px', background:'#FFF5F5', borderRadius:10, border:'1px solid #FC8181' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#C53030', textTransform:'uppercase', letterSpacing:'.5px', margin:'0 0 6px', fontFamily:IF }}>❌ Reason for Cancellation</p>
                  <p style={{ fontSize:13, color:'#7B1A1A', margin:0, fontFamily:IF, lineHeight:1.7 }}>{viewItem.cancel_reason}</p>
                </div>
              )}
              {viewItem.description && (
                <div style={{ marginTop:14 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'.5px', margin:'0 0 8px', fontFamily:IF }}>Description</p>
                  <p style={{ fontSize:13, color:'#2D3748', lineHeight:1.8, fontFamily:IF, background:'#F7FAFC', padding:'12px 16px', borderRadius:10, border:'1px solid #E2E8F0', margin:0 }}>{viewItem.description}</p>
                </div>
              )}
            </div>
            <div style={{ padding:'14px 24px', borderTop:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#FAFBFC', flexShrink:0 }}>
              {/* Left: Delete */}
              <button onClick={() => { setDel(viewItem); setView(null) }}
                style={{ padding:'8px 16px', borderRadius:8, background:'#FFF5F5', color:'#C53030', border:'1px solid #FC8181', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:IF, display:'flex', alignItems:'center', gap:6, transition:'all .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#FEE2E2'}
                onMouseLeave={e=>e.currentTarget.style.background='#FFF5F5'}>
                🗑️ Delete
              </button>
              {/* Right: Edit + Close */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { openEdit(viewItem); setView(null) }}
                  style={{ padding:'8px 16px', borderRadius:8, background:T.navy, color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:IF }}>✏️ Edit</button>
                <button onClick={() => setView(null)} className="btn-ghost" style={{ padding:'8px 16px', fontSize:12 }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Event' : 'Add New Event'}
        footer={<><button onClick={() => setModal(false)} className="btn-ghost">Cancel</button><BtnPrimary onClick={save} disabled={saving}>{saving?'Saving…':'Save Event'}</BtnPrimary></>}>

        {/* IDs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:4 }}>
          <FormField label="Event ID (auto)">
            <input className="input-field" value={form.event_id} readOnly
              style={{ fontSize:12, background:'#F7FAFC', color:'#718096', fontFamily:'monospace', cursor:'default' }}/>
          </FormField>
          <FormField label="Session ID (auto)">
            <input className="input-field" value={form.session_id} readOnly
              style={{ fontSize:12, background:'#F7FAFC', color:'#718096', fontFamily:'monospace', cursor:'default' }}/>
          </FormField>
        </div>

        <FormField label="Event Title" required>
          <input className="input-field" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Enter the event title"/>
        </FormField>
        <FormField label="Location">
          <input className="input-field" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Barangay Hall, Covered Court…"/>
        </FormField>
        <FormField label="Description">
          <textarea className="input-field" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{ resize:'vertical' }} placeholder="Brief description…"/>
        </FormField>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label="Start Date & Time">
            <input type="datetime-local" className="input-field" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/>
          </FormField>
          <FormField label="End Date & Time">
            <input type="datetime-local" className="input-field" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/>
          </FormField>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label="Event Handler">
            <input className="input-field" value={form.handler} onChange={e=>setForm(f=>({...f,handler:e.target.value}))} placeholder="e.g. SK Kagawad Bautista"/>
          </FormField>
          <FormField label="Status">
            <select className="input-field" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="planning">Planning</option><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select>
          </FormField>
        </div>

        {form.status === 'cancelled' && (
          <FormField label="Reason for Cancellation *">
            <textarea className="input-field" rows={2} value={form.cancel_reason}
              onChange={e=>setForm(f=>({...f,cancel_reason:e.target.value}))}
              style={{ resize:'vertical', borderColor:'#FC8181' }} placeholder="Required: explain why this event is cancelled…"/>
          </FormField>
        )}

        <FormField label="External Link (Facebook / Zoom / Meet)">
          <input className="input-field" value={form.external_link} onChange={e=>setForm(f=>({...f,external_link:e.target.value}))} placeholder="https://facebook.com/event/…"/>
        </FormField>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} loading={delLoad} danger title="Delete Event" message={`Delete "${del?.title}"? This cannot be undone.`}/>
    </div>
  )
}


/* ═══════════════════════════════
   FEEDBACK PAGE
═══════════════════════════════ */
export function FeedbackPage() {
  const { T } = useAdminTheme()
  const { role } = useAuth()
  const isSuperAdmin = role === 'super_admin'
  const [feedback, setFeedback] = useState([])
  const [filter,   setFilter]   = useState('Yearly')

  useEffect(() => {
    supabase.from('feedback').select('*').order('created_at',{ascending:false})
      .then(({ data }) => { if (data) setFeedback(data) })
  }, [])

  const good = feedback.filter(f=>f.rating==='good').length
  const avg  = feedback.filter(f=>f.rating==='average').length
  const bad  = feedback.filter(f=>f.rating==='bad').length

  const rBadge = r => {
    const m = { good:{bg:'#F0FFF4',color:'#276749',dot:'🟢',label:'GOOD'}, average:{bg:'#FEF9E7',color:'#7B4800',dot:'🟡',label:'AVERAGE'}, bad:{bg:'#FFF5F5',color:'#C53030',dot:'🔴',label:'BAD'} }
    const s = m[r]||{bg:'#F7FAFC',color:'#718096',dot:'⚪',label:r}
    return <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:s.bg, color:s.color, fontFamily:IF }}>{s.dot} {s.label}</span>
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:T.navy, marginBottom:4, fontFamily:MF }}>Feedback Management</h1>
          <p style={{ fontSize:13, color:T.textMuted, fontFamily:IF }}>Monitor resident feedback about barangay services.</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {!isSuperAdmin && <span style={{ fontSize:11, padding:'6px 12px', borderRadius:8, background:'rgba(214,158,46,0.1)', color:'#7B4800', fontFamily:IF }}>👁 View Only</span>}
          <select style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${T.border}`, background:T.surface, color:T.text, fontSize:13, fontFamily:IF, cursor:'pointer' }} value={filter} onChange={e=>setFilter(e.target.value)}>
            <option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option>
          </select>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, padding:22 }}>
          <p style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:18, fontFamily:MF }}>Feedback Statistics</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
            {[['Good',good,'#F0FFF4','#276749'],['Average',avg,'#FEF9E7','#7B4800'],['Bad',bad,'#FFF5F5','#C53030']].map(([l,v,bg,color])=>(
              <div key={l} style={{ background:bg, borderRadius:10, padding:'16px 10px', textAlign:'center' }}>
                <p style={{ fontSize:28, fontWeight:700, color, fontFamily:MF }}>{v}</p>
                <p style={{ fontSize:11, color, fontWeight:600, marginTop:4, fontFamily:IF }}>{l} Ratings</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', padding:'8px 0', borderTop:`1px solid ${T.border}` }}>
            <p style={{ fontSize:28, fontWeight:700, color:T.navy, fontFamily:MF }}>{feedback.length}</p>
            <p style={{ fontSize:12, color:T.textMuted, fontFamily:IF }}>Total Feedback ({filter.toLowerCase()})</p>
          </div>
        </div>
        <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, padding:22 }}>
          <p style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:14, fontFamily:MF }}>Rating Distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={[{n:'Good',v:good},{n:'Average',v:avg},{n:'Bad',v:bad}]} margin={{left:-20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="n" tick={{fontSize:11,fontFamily:IF}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/>
              <Bar dataKey="v" radius={[4,4,0,0]}>
                <Cell fill="#48BB78"/><Cell fill="#D69E2E"/><Cell fill="#C53030"/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}` }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${T.border}` }}>
          <p style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:MF }}>All Feedback</p>
        </div>
        {feedback.length === 0
          ? <EmptyState icon="💬" title="No feedback yet" subtitle="Resident feedback will appear here."/>
          : feedback.map(fb => (
            <div key={fb.id} style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:T.surface2, display:'flex', alignItems:'center', justifyContent:'center', color:T.textMuted, fontSize:14, flexShrink:0 }}>👤</div>
                <span style={{ fontWeight:700, color:T.text, fontSize:14, fontFamily:IF }}>{fb.resident_name||'Anonymous'}</span>
                {rBadge(fb.rating)}
                <span style={{ fontSize:11, color:T.textMuted, marginLeft:'auto', fontFamily:IF }}>{fb.created_at?format(new Date(fb.created_at),'yyyy-MM-dd'):''}</span>
              </div>
              {fb.subject && <p style={{ fontSize:13, color:T.textMuted, marginBottom:6, fontFamily:IF }}>Subject: <strong style={{ color:T.text }}>{fb.subject}</strong></p>}
              <div style={{ background:T.surface2, borderRadius:8, padding:'10px 14px' }}>
                <p style={{ fontSize:13, color:T.text, lineHeight:1.7, fontFamily:IF }}>{fb.message}</p>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

/* ═══════════════════════════════
   CHATBOT PAGE
═══════════════════════════════ */
export function ChatbotPage() {
  const { T } = useAdminTheme()
  const { logAudit, role } = useAuth()
  const { toast }   = useToast()
  const isSuperAdmin = role === 'super_admin'
  const [faqs,  setFaqs]  = useState([])
  const [chat,  setChat]  = useState([{ role:'bot', text:'Hello! I am ISKAI 🤖, your Barangay AI assistant. Ask me anything!' }])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState({})
  const chatRef = useRef()

  useEffect(() => {
    const loadFaqs = () => {
      supabase.from('faqs').select('*').order('created_at',{ascending:true})
        .then(({ data }) => { if (data) setFaqs(data) })
    }
    loadFaqs()
    // Realtime sync — reflects changes made by other admins instantly
    const channel = supabase
      .channel('admin-faqs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faqs' }, loadFaqs)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const addFaq = async () => {
    const { data, error } = await supabase.from('faqs').insert({ question:'New Question…', answer:'New Answer…', created_at:new Date().toISOString() }).select().single()
    if (!error && data) { setFaqs(f=>[...f,data]); await logAudit('Create','AI Chatbot','Added FAQ') }
  }

  const updateFaq = (id, field, val) => setFaqs(f => f.map(x => x.id===id ? {...x,[field]:val} : x))
  const saveFaq   = async faq => {
    if (!isSuperAdmin) return
    setSaving(s=>({...s,[faq.id]:true}))
    try { await supabase.from('faqs').update({ question:faq.question, answer:faq.answer }).eq('id',faq.id) }
    catch (err) { toast(err.message,'error') }
    finally { setSaving(s=>({...s,[faq.id]:false})) }
  }
  const delFaq = async id => {
    await supabase.from('faqs').delete().eq('id',id)
    setFaqs(f=>f.filter(x=>x.id!==id))
    await logAudit('Delete','AI Chatbot','Deleted FAQ')
    toast('FAQ deleted.','success')
  }

  const sendChat = () => {
    if (!input.trim()) return
    const q = input.toLowerCase().trim()
    // Score-based match: same logic as user chatbot
    let bestMatch = null, bestScore = 0
    for (const f of faqs) {
      if (!f.question || !f.answer) continue
      const words = q.split(' ').filter(w => w.length > 2)
      const score = words.filter(w => f.question.toLowerCase().includes(w)).length
      if (score > bestScore) { bestScore = score; bestMatch = f }
    }
    const reply = (bestMatch && bestScore > 0)
      ? bestMatch.answer
      : "I'm sorry, I don't have an answer for that. Please contact the barangay office directly."
    setChat(c=>[...c,{role:'user',text:input},{role:'bot',text:reply}])
    setInput('')
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, 100)
  }

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:700, color:T.navy, marginBottom:4, fontFamily:MF }}>ISKAI Chatbot Management</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, fontFamily:IF }}>Manage the questions and answers for the AI-powered FAQ chatbot.</p>
      {!isSuperAdmin && <ReadOnlyBanner/>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px', borderBottom:`1px solid ${T.border}` }}>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:MF }}>Manage FAQs</p>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:2, fontFamily:IF }}>
                {isSuperAdmin ? 'Add, edit, or delete FAQs. Changes save automatically.' : 'View current FAQ entries.'}
              </p>
            </div>
            {isSuperAdmin && <BtnPrimary onClick={addFaq} style={{ padding:'7px 14px', fontSize:12 }}><Plus size={13}/> Add FAQ</BtnPrimary>}
          </div>
          {faqs.length === 0 ? <EmptyState icon="🤖" title="No FAQs yet" subtitle="Click Add FAQ to add the first question."/> :
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><TH>Question</TH><TH>Answer</TH>{isSuperAdmin && <TH>Del</TH>}</tr></thead>
              <tbody>
                {faqs.map(faq => (
                  <tr key={faq.id}>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${T.border}`, verticalAlign:'top' }}>
                      <textarea className="input-field" rows={2} value={faq.question}
                        onChange={isSuperAdmin ? e=>updateFaq(faq.id,'question',e.target.value) : undefined}
                        onBlur={isSuperAdmin ? ()=>saveFaq(faq) : undefined}
                        readOnly={!isSuperAdmin}
                        style={{ fontSize:12, resize:'vertical', width:'100%', cursor:isSuperAdmin?'text':'default' }}/>
                      {saving[faq.id] && <span style={{ fontSize:10, color:T.navy, fontFamily:IF }}>Saving…</span>}
                    </td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${T.border}`, verticalAlign:'top' }}>
                      <textarea className="input-field" rows={2} value={faq.answer}
                        onChange={isSuperAdmin ? e=>updateFaq(faq.id,'answer',e.target.value) : undefined}
                        onBlur={isSuperAdmin ? ()=>saveFaq(faq) : undefined}
                        readOnly={!isSuperAdmin}
                        style={{ fontSize:12, resize:'vertical', width:'100%', cursor:isSuperAdmin?'text':'default' }}/>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ padding:'8px 12px', borderBottom:`1px solid ${T.border}`, verticalAlign:'top' }}>
                        <button onClick={() => delFaq(faq.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#CBD5E0', padding:4 }}
                          onMouseEnter={e=>e.currentTarget.style.color='#C53030'}
                          onMouseLeave={e=>e.currentTarget.style.color='#CBD5E0'}>
                          <Trash2 size={15}/>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
        <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'16px 18px', borderBottom:`1px solid ${T.border}` }}>
            <p style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:MF }}>🤖 Test ISKAI</p>
            <p style={{ fontSize:11, color:T.textMuted, marginTop:2, fontFamily:IF }}>Ask questions to test the chatbot with current FAQs.</p>
          </div>
          <div ref={chatRef} style={{ flex:1, padding:14, background:T.surface2, minHeight:260, maxHeight:360, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
            {chat.map((m,i) => (
              <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'80%', padding:'10px 14px', fontSize:13, lineHeight:1.6, fontFamily:IF,
                  background:m.role==='user'?'#1A365D':'white', color:m.role==='user'?'white':T.text,
                  borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',
                  border:m.role==='bot'?`1px solid ${T.border}`:'none' }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:12, borderTop:`1px solid ${T.border}`, display:'flex', gap:8 }}>
            <input className="input-field" style={{ flex:1, fontSize:12 }} value={input}
              onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
              placeholder="Ask a question…"/>
            <BtnPrimary onClick={sendChat} style={{ padding:'8px 14px' }}><Send size={14}/></BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════
   ROLES PAGE
═══════════════════════════════ */
export function RolesPage() {
  const { T } = useAdminTheme()
  const { logAudit, user:currentUser } = useAuth()
  const { toast }   = useToast()
  const [users,     setUsers]  = useState([])
  const [search,    setSearch] = useState('')
  const [loading,   setLoad]   = useState(false)
  const [localRoles,setLR]     = useState({})

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoad(true)
    try {
      const { data, error } = await supabase.from('user_roles').select('*').order('created_at',{ascending:false})
      if (error) throw error
      if (data) { setUsers(data); const m={}; data.forEach(u=>{ m[u.user_id]=u.role||'resident' }); setLR(m) }
    } catch (err) { toast(err.message,'error') }
    finally { setLoad(false) }
  }

  const saveRole = async u => {
    const newRole = localRoles[u.user_id] || 'resident'
    if (u.user_id === currentUser?.id && newRole !== 'super_admin') {
      toast("You cannot demote your own super admin account.", 'error'); return
    }
    try {
      const { error } = await supabase.from('user_roles').update({ role:newRole }).eq('user_id', u.user_id)
      if (error) throw error
      await logAudit('Edit','Role Management',`Changed ${u.email} to ${newRole}`)
      toast(`Role updated to ${newRole.replace('_',' ')}.`,'success')
      setUsers(prev=>prev.map(x=>x.user_id===u.user_id?{...x,role:newRole}:x))
    } catch (err) { toast(err.message,'error') }
  }

  const filtered = users.filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:700, color:T.navy, marginBottom:4, fontFamily:MF }}>Role Management</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, fontFamily:IF }}>Assign and manage user roles within the system.</p>
      <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}` }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
          <h2 style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:4, fontFamily:MF }}>Users</h2>
          <p style={{ fontSize:12, color:T.textMuted, marginBottom:12, fontFamily:IF }}>Change user roles from Member to Admin.</p>
          <div style={{ position:'relative', maxWidth:340 }}>
            <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:T.textMuted }}/>
            <input className="input-field" style={{ paddingLeft:34, fontSize:12 }}
              placeholder="Search users by name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        {loading
          ? <div style={{ padding:36, textAlign:'center', color:T.textMuted, fontFamily:IF }}>Loading users…</div>
          : filtered.length === 0
            ? <EmptyState icon="🔑" title="No users found" subtitle="Users appear here once they sign up."/>
            : <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr><TH>Full Name</TH><TH>Email</TH><TH>Current Role</TH><TH>Change Role</TH><TH>Save</TH></tr></thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}
                      onMouseEnter={e=>e.currentTarget.style.background=T.tableHover}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <TD style={{ fontWeight:500 }}>{u.name||'—'}</TD>
                      <TD style={{ color:T.textMuted }}>{u.email}</TD>
                      <TD>
                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, fontFamily:IF,
                          background: u.role==='super_admin'?'#FEF9E7':u.role==='admin'?'#EBF8FF':'#F7FAFC',
                          color: u.role==='super_admin'?'#7B4800':u.role==='admin'?'#1A365D':'#718096' }}>
                          {(u.role||'resident').replace('_',' ')}
                        </span>
                      </TD>
                      <TD>
                        <div style={{ position:'relative', display:'inline-block' }}>
                          <select style={{ padding:'6px 30px 6px 12px', borderRadius:8, border:`1px solid ${T.border}`, background:T.surface, color:T.text, fontSize:12, fontFamily:IF, cursor:'pointer', appearance:'none', minWidth:130 }}
                            value={localRoles[u.user_id]||'resident'}
                            onChange={e=>setLR(prev=>({...prev,[u.user_id]:e.target.value}))}>
                            <option value="resident">Resident</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          <span style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:T.textMuted, fontSize:10 }}>▼</span>
                        </div>
                      </TD>
                      <TD><BtnPrimary onClick={()=>saveRole(u)} style={{ padding:'6px 16px', fontSize:12 }}>Save</BtnPrimary></TD>
                    </tr>
                  ))}
                </tbody>
              </table>
        }
        <div style={{ display:'flex', justifyContent:'flex-end', padding:'12px 20px', borderTop:`1px solid ${T.border}` }}>
          <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:7, border:`1px solid ${T.border}`, background:T.surface, cursor:'pointer', fontSize:12, color:T.text, fontFamily:IF }}>
            <RefreshCw size={13}/> Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════
   LOGS PAGE
═══════════════════════════════ */
export function LogsPage() {
  const { T } = useAdminTheme()
  const { logAudit, role } = useAuth()
  const { toast }   = useToast()
  const isSuperAdmin = role === 'super_admin'
  const [logs,    setLogs]    = useState([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoad]    = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoad(true)
    try {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(500)
      if (error) throw error
      if (data) setLogs(data)
    } catch (err) { toast(err.message,'error') }
    finally { setLoad(false) }
  }

  const filtered = logs.filter(l => !search || [l.user_name,l.action,l.module,l.description].some(v=>v?.toLowerCase().includes(search.toLowerCase())))

  const exportLogs = () => {
    const cols = ['User','Role','Action','Module','Description','Date & Time','Status']
    const rows = filtered.map(l=>[l.user_name,l.user_role,l.action,l.module,l.description,l.created_at?format(new Date(l.created_at),'yyyy-MM-dd HH:mm'):'',l.status])
    const csv  = [cols,...rows].map(r=>r.map(v=>`"${v||''}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download=`audit-logs-${format(new Date(),'yyyy-MM-dd')}.csv`; a.click()
    logAudit('Export','Logs','Exported audit logs as CSV')
    toast('Logs exported!','success')
  }

  const sBadge = s => <span style={{ padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, fontFamily:IF, background:s==='Success'?'#F0FFF4':'#FFF5F5', color:s==='Success'?'#276749':'#C53030' }}>{s||'Success'}</span>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:T.navy, marginBottom:4, fontFamily:MF }}>Audit Trail / Logs</h1>
          <p style={{ fontSize:13, color:T.textMuted, fontFamily:IF }}>Track all system activities for accountability.</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {!isSuperAdmin && <span style={{ fontSize:11, padding:'6px 12px', borderRadius:8, background:'rgba(214,158,46,0.1)', color:'#7B4800', fontFamily:IF }}>👁 View Only</span>}
          <div style={{ position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:T.textMuted }}/>
            <input className="input-field" style={{ paddingLeft:30, fontSize:12, width:220 }} placeholder="Search logs…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <button onClick={load} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:8, border:`1px solid ${T.border}`, background:T.surface, cursor:'pointer', fontSize:12, color:T.text, fontFamily:IF }}>
            <RefreshCw size={13}/> Refresh
          </button>
          {isSuperAdmin && <BtnPrimary onClick={exportLogs} style={{ padding:'8px 16px', fontSize:12 }}><Download size={13}/> Export CSV</BtnPrimary>}
        </div>
      </div>
      <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
        {loading
          ? <div style={{ padding:36, textAlign:'center', color:T.textMuted, fontFamily:IF }}>Loading logs…</div>
          : filtered.length === 0
            ? <EmptyState icon="📋" title="No logs yet" subtitle="System activities will appear here automatically."/>
            : <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr><TH>User</TH><TH>Role</TH><TH>Action</TH><TH>Module</TH><TH>Description</TH><TH>Date & Time</TH><TH>Status</TH></tr></thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id}
                      onMouseEnter={e=>e.currentTarget.style.background=T.tableHover}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <TD style={{ fontWeight:600 }}>{l.user_name||'System'}</TD>
                      <TD style={{ color:T.textMuted, textTransform:'capitalize', fontSize:12 }}>{(l.user_role||'—').replace('_',' ')}</TD>
                      <TD><span style={{ padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:'#EBF8FF', color:'#1A365D', fontFamily:IF }}>{l.action}</span></TD>
                      <TD style={{ color:T.textMuted, fontSize:12 }}>{l.module}</TD>
                      <TD style={{ fontSize:12, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={l.description}>{l.description}</TD>
                      <TD style={{ fontSize:11, color:T.textMuted, whiteSpace:'nowrap' }}>{l.created_at?format(new Date(l.created_at),'MMM dd yyyy HH:mm'):''}</TD>
                      <TD>{sBadge(l.status)}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
        }
      </div>
    </div>
  )
}

/* ═══════════════════════════════
   ARCHIVES PAGE
═══════════════════════════════ */
export function ArchivesPage() {
  const { T } = useAdminTheme()
  const { role } = useAuth()
  const isSuperAdmin = role === 'super_admin'

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:700, color:T.navy, marginBottom:4, fontFamily:MF }}>Archives</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, fontFamily:IF }}>Store and manage archived inactive records for reference.</p>
      {!isSuperAdmin && <ReadOnlyBanner/>}
      <EmptyState icon="📦" title="No Archived Records" subtitle="Completed events, old profiles, and old feedback will appear here when archived from their respective modules."/>
    </div>
  )
}

/* ═══════════════════════════════
   BACKUP PAGE
═══════════════════════════════ */
export function BackupPage() {
  const { T } = useAdminTheme()
  const { logAudit, role } = useAuth()
  const { toast }    = useToast()
  const isSuperAdmin = role === 'super_admin'
  const [backups,  setBackups]  = useState([])
  const [confirm,  setConfirm]  = useState(false)
  const [creating, setCreating] = useState(false)

  const createBackup = async () => {
    setCreating(true)
    try {
      const tables = ['announcements','projects','events','feedback','faqs','audit_logs','user_roles','profiles']
      const counts = {}
      for (const t of tables) {
        const { count } = await supabase.from(t).select('*',{count:'exact',head:true})
        counts[t] = count || 0
      }
      const manifest = { backup_date:new Date().toISOString(), created_by:'Super Admin', tables:counts, total_records:Object.values(counts).reduce((a,b)=>a+b,0) }
      const a = document.createElement('a')
      a.href = 'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(manifest,null,2))
      a.download = `barangay-backup-${format(new Date(),'yyyy-MM-dd-HHmm')}.json`
      a.click()
      const backup = { name:`backup-${format(new Date(),'yyyy-MM-dd-HHmm')}.json`, type:'Manual', size:`${manifest.total_records} records`, created_at:new Date().toISOString(), status:'Complete' }
      setBackups(b=>[backup,...b])
      await logAudit('Backup','Backup & Restore','Created manual system backup')
      toast('Backup created and downloaded!','success')
    } catch (err) { toast('Backup failed: '+err.message,'error') }
    finally { setCreating(false); setConfirm(false) }
  }

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:700, color:T.navy, marginBottom:4, fontFamily:MF }}>Backup & Restore</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, fontFamily:IF }}>Protect system data by creating and managing secure backups.</p>
      {isSuperAdmin ? (
        <div style={{ marginBottom:20 }}>
          <BtnPrimary onClick={() => setConfirm(true)} style={{ padding:'10px 24px' }}><Download size={15}/> Create Backup</BtnPrimary>
        </div>
      ) : (
        <div style={{ marginBottom:20, padding:'12px 16px', background:'rgba(214,158,46,0.08)', borderRadius:10, border:'1px solid rgba(214,158,46,0.3)', fontSize:13, color:'#7B4800', fontFamily:IF }}>
          👁 <strong>View Only</strong> — Only the Super Admin can create or restore backups.
        </div>
      )}
      <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}` }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${T.border}` }}>
          <p style={{ fontSize:15, fontWeight:700, color:T.text, fontFamily:MF }}>Backup History</p>
        </div>
        {backups.length === 0
          ? <EmptyState icon="💾" title="No backups yet" subtitle="Click 'Create Backup' to generate the first backup."/>
          : <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><TH>File Name</TH><TH>Type</TH><TH>Records</TH><TH>Date Created</TH><TH>Status</TH></tr></thead>
              <tbody>
                {backups.map((b,i) => (
                  <tr key={i}>
                    <TD style={{ fontFamily:"'Courier New',monospace", fontSize:12 }}>{b.name}</TD>
                    <TD>{b.type}</TD>
                    <TD>{b.size}</TD>
                    <TD style={{ color:T.textMuted }}>{b.created_at?format(new Date(b.created_at),'MMM dd, yyyy HH:mm'):''}</TD>
                    <TD><span style={{ padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, fontFamily:IF, background:'#F0FFF4', color:'#276749' }}>{b.status}</span></TD>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={createBackup} loading={creating}
        title="Create System Backup?" message="This will generate and download a JSON file containing record counts and metadata for all database tables."/>
    </div>
  )
}

/* ═══════════════════════════════
   SETTINGS PAGE (super_admin only)
═══════════════════════════════ */
export function SettingsPage() {
  const { T, palette, setPalette, navbarVisible, setNavbarVisible, customColors, saveCustomColors, PALETTES, dark, setDark } = useAdminTheme()
  const { settings: siteSettings, updateSettings } = useSiteSettings()
  const { user, profile, refreshProfile, logAudit, role, signOut } = useAuth()
  const { toast } = useToast()
  const isSA   = role === 'super_admin'
  const isAny  = role === 'admin' || role === 'super_admin'
  const [sec, setSec] = useState('profile')  // SA default; admin default set after role check
  const [fb,  setFb]  = useState(null)
  const flash = (type, msg) => { setFb({type,msg}); setTimeout(()=>setFb(null),5000) }

  /* ── Credentials ── */
  const [pw,    setPw]    = useState({ cur:'', new_:'', conf:'', show:false })
  const [pwS,   setPwS]   = useState(false)
  const [eNew,  setENew]  = useState('')
  const [eStep, setEStep] = useState('idle')
  const [pNew,  setPNew]  = useState(profile?.contact_number?.replace('+639','')||'')
  const [pOTP,  setPOTP]  = useState('')
  const [pStep, setPStep] = useState('idle')
  const [pLoad, setPLoad] = useState(false)
  const [uname, setUname] = useState('')
  const [uS,    setUS]    = useState(false)
  const [nEdit, setNEdit] = useState(false)
  const [nNew,  setNNew]  = useState('')
  const [pos,   setPos]   = useState(profile?.position||'')
  const [posS,  setPosS]  = useState(false)

  /* ── Security ── */
  const [mfa,  setMfa]  = useState(false)
  const [mfaS, setMfaS] = useState('idle')
  const [fid,  setFid]  = useState(null)
  const [qr,   setQR]   = useState(null)
  const [msc,  setMSec] = useState(null)
  const [mc,   setMC]   = useState('')
  const [ml,   setML]   = useState(false)
  const [cp,   setCp]   = useState(false)
  const [otpS, setOtpS] = useState(false)
  const [otpC, setOtpC] = useState('')
  const [otpL, setOtpL] = useState(false)
  const [sess, setSess] = useState([
    { id:1, device:'Chrome / Windows PC', type:'desktop', loc:'Bakakeng Admin Office', time:'Active now',   current:true },
    { id:2, device:'Safari / MacBook Pro', type:'desktop', loc:'Bakakeng Central',      time:'2 hours ago', current:false },
  ])
  const [lcC,  setLCC]  = useState(false)
  const [lh,   setLH]   = useState([])
  const [lhL,  setLHL]  = useState(false)

  /* ── User Management (Admin+SA) ── */
  const [users,  setUsers]  = useState([])
  const [uLoad,  setULoad]  = useState(false)
  const [uSrch,  setUSrch]  = useState('')
  const [rmap,   setRmap]   = useState({})
  const [prOpen, setPrOpen] = useState(null)
  const [prVal,  setPrVal]  = useState({})

  /* ── Super Admin: Admins ── */
  const [admins, setAdmins] = useState([])
  const [admLoad,setAdmLoad]= useState(false)
  const [newAdm, setNewAdm] = useState({ name:'', email:'', role:'admin' })
  const [addAdmOpen, setAAO]= useState(false)

  /* ── Super Admin: System ── */
  const [sysName, setSysName]   = useState('YouthLink — Barangay Bakakeng Central SK')
  const [policies,setPolicies]  = useState({ minPw:8,upperReq:true,numReq:true,specReq:false,sessionTimeout:60,enforced2FA:false,otpEnabled:true,maxAttempts:5 })
  const [polS,setPolS]          = useState(false)
  const [mainMode,setMainMode]  = useState(false)

  /* ── Personalization ── */
  const [customPrimary,  setCustPrimary]  = useState(customColors?.primary  || '#1A365D')
  const [customAccent,   setCustAccent]   = useState(customColors?.accent   || '#D69E2E')
  const [customPrimaryLt,setCustPrimaryLt]= useState(customColors?.primaryLt|| '#2A4A7F')

  /* ── Notifications ── */
  const [notifSubject, setNotifSubject] = useState('')
  const [notifMsg,     setNotifMsg]     = useState('')
  const [notifType,    setNotifType]    = useState('General')
  const [notifLoad,    setNotifLoad]    = useState(false)
  const [recentAnns,   setRecentAnns]   = useState([])
  const [annsLoad,     setAnnsLoad]     = useState(false)

  /* ── Database Viewer ── */
  const [dbTable,    setDbTable]    = useState('user_roles')
  const [dbData,     setDbData]     = useState([])
  const [dbLoad,     setDbLoad]     = useState(false)
  const [dbTotal,    setDbTotal]    = useState(0)
  const [dbPage,     setDbPage]     = useState(0)
  const [tableCounts,setTableCounts]= useState({})
  const DB_TABLES = ['user_roles','profiles','announcements','events','projects','feedback','faqs','audit_logs']
  const DB_PAGE_SIZE = 15

  /* ── Backup ── */
  const [autoBackup,    setAutoBackup]   = useState(() => localStorage.getItem('auto_backup') === 'true')
  const [backupFreq,    setBackupFreq]   = useState(() => localStorage.getItem('backup_freq') || 'daily')
  const [restoreFile,   setRestoreFile]  = useState(null)
  const [restoring,     setRestoring]    = useState(false)
  const [backupHistory, setBkHistory]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('backup_history') || '[]') } catch { return [] }
  })
  const restoreRef = React.useRef()

  /* ── Reports ── */
  const [stats,setStats]=useState({ users:0,events:0,projects:0,feedback:0,announcements:0 })
  const [logs, setLogs] =useState([])
  const [logL, setLogL] =useState(false)
  const [logSrch,setLogSrch]=useState('')

  useEffect(()=>{
    supabase.auth.mfa.listFactors().then(({data})=>{ const t=data?.totp?.find(f=>f.status==='verified'); if(t){setMfa(true);setFid(t.id)} }).catch(()=>{})
    // Admin (non-SA) starts on credentials, not profile
    if(role&&role!=='super_admin') setSec('account')
  },[role])

  useEffect(()=>{
    if(sec==='users')   loadUsers()
    if(sec==='admins'&&isSA) loadAdmins()
    if(sec==='security') loadLH()
    if(sec==='logs')   loadLogs()
    if(sec==='db')     { loadTableCounts(); loadDbTable(dbTable, 0) }
  },[sec])

  const loadUsers=async()=>{
    setULoad(true)
    try{ const{data}=await supabase.from('user_roles').select('*').order('created_at',{ascending:false}); if(data){setUsers(data);const m={};data.forEach(u=>{m[u.user_id]=u.role||'resident'});setRmap(m)} }
    catch(err){toast(err.message,'error')} finally{setULoad(false)}
  }
  const loadAdmins=async()=>{
    setAdmLoad(true)
    try{ const{data}=await supabase.from('user_roles').select('*').in('role',['admin','super_admin']).order('created_at',{ascending:false}); if(data)setAdmins(data) }
    catch(err){toast(err.message,'error')} finally{setAdmLoad(false)}
  }
  const loadLH=async()=>{
    setLHL(true)
    try{ const{data}=await supabase.from('audit_logs').select('*').eq('user_id',user?.id).order('created_at',{ascending:false}).limit(20); if(data)setLH(data) }
    catch(_){} finally{setLHL(false)}
  }
  const loadStats=async()=>{
    const[u,e,p,f,a]=await Promise.all([
      supabase.from('user_roles').select('id',{count:'exact',head:true}),
      supabase.from('events').select('id',{count:'exact',head:true}),
      supabase.from('projects').select('id',{count:'exact',head:true}),
      supabase.from('feedback').select('id',{count:'exact',head:true}),
      supabase.from('announcements').select('id',{count:'exact',head:true}),
    ])
    setStats({users:u.count||0,events:e.count||0,projects:p.count||0,feedback:f.count||0,announcements:a.count||0})
  }
  const loadLogs=async()=>{
    setLogL(true)
    try{ const{data}=await supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(100); if(data)setLogs(data) }
    catch(_){} finally{setLogL(false)}
  }

  const loadRecentAnns=async()=>{
    setAnnsLoad(true)
    try{ const{data}=await supabase.from('announcements').select('*').order('created_at',{ascending:false}).limit(10); if(data)setRecentAnns(data) }
    catch(_){} finally{setAnnsLoad(false)}
  }
  const loadTableCounts=async()=>{
    try{
      const results=await Promise.all(DB_TABLES.map(t=>supabase.from(t).select('id',{count:'exact',head:true})))
      const counts={}; DB_TABLES.forEach((t,i)=>{ counts[t]=results[i].count||0 }); setTableCounts(counts)
    }catch(_){}
  }
  const loadDbTable=async(table,page)=>{
    setDbLoad(true); setDbData([])
    try{
      const from=page*DB_PAGE_SIZE, to=from+DB_PAGE_SIZE-1
      const{data,count}=await supabase.from(table).select('*',{count:'exact'}).range(from,to).order('created_at',{ascending:false}).limit(DB_PAGE_SIZE)
      if(data){setDbData(data);setDbTotal(count||0)}
    }catch(err){toast(err.message,'error')} finally{setDbLoad(false)}
  }

  /* Password */
  const handlePw=async e=>{
    e.preventDefault()
    if(pw.new_!==pw.conf){flash('error','Passwords do not match.');return}
    if(pw.new_.length<(policies.minPw||8)){flash('error',`Minimum ${policies.minPw||8} characters.`);return}
    if(policies.upperReq&&!/[A-Z]/.test(pw.new_)){flash('error','Must contain uppercase letter.');return}
    if(policies.numReq&&!/[0-9]/.test(pw.new_)){flash('error','Must contain a number.');return}
    setPwS(true)
    try{ const{error}=await supabase.auth.updateUser({password:pw.new_}); if(error)throw error; await logAudit('Edit','Settings','Changed password'); flash('success','Password updated! 🔐'); setPw({cur:'',new_:'',conf:'',show:false}) }
    catch(err){ flash('error',err.message) } finally{ setPwS(false) }
  }

  /* MFA */
  const startMFA=async()=>{setML(true);try{const{data,error}=await supabase.auth.mfa.enroll({factorType:'totp',issuer:'YouthLink Admin'});if(error)throw error;setFid(data.id);setQR(data.totp.qr_code);setMSec(data.totp.secret);setMfaS('enrolling')}catch(err){toast(err.message,'error')}finally{setML(false)}}
  const verifyMFA=async()=>{setML(true);try{const{data:c,error:ce}=await supabase.auth.mfa.challenge({factorId:fid});if(ce)throw ce;const{error:ve}=await supabase.auth.mfa.verify({factorId:fid,challengeId:c.id,code:mc});if(ve)throw ve;setMfa(true);setMfaS('idle');setQR(null);setMSec(null);setMC('');await logAudit('Enable','Security','Enabled 2FA');flash('success','2FA enabled! 🔒')}catch{toast('Invalid code.','error')}finally{setML(false)}}
  const disableMFA=async()=>{setML(true);try{const{error}=await supabase.auth.mfa.unenroll({factorId:fid});if(error)throw error;setMfa(false);setFid(null);setMfaS('idle');flash('success','2FA disabled.')}catch(err){toast(err.message,'error')}finally{setML(false)}}

  /* OTP */
  const sendOTP=async()=>{setOtpL(true);try{const{error}=await supabase.auth.signInWithOtp({email:user?.email,options:{shouldCreateUser:false}});if(error)throw error;setOtpS(true);toast('OTP sent!','success')}catch(err){toast(err.message,'error')}finally{setOtpL(false)}}
  const verifyOTP=async()=>{setOtpL(true);try{const{error}=await supabase.auth.verifyOtp({email:user?.email,token:otpC,type:'email'});if(error)throw error;flash('success','OTP verified ✅');setOtpS(false);setOtpC('')}catch{toast('Invalid OTP.','error')}finally{setOtpL(false)}}

  /* User management */
  const saveRole=async(u)=>{
    const nr=rmap[u.user_id]||'resident'
    if(u.user_id===user?.id&&nr!=='super_admin'){toast('Cannot demote your own super admin account.','error');return}
    if(!isSA&&(nr==='super_admin'||nr==='admin')){toast('Only Super Admin can assign admin roles.','error');return}
    try{await supabase.from('user_roles').update({role:nr}).eq('user_id',u.user_id);await logAudit('Edit','Users',`Changed ${u.email} to ${nr}`);toast('Role updated.','success');setUsers(p=>p.map(x=>x.user_id===u.user_id?{...x,role:nr}:x))}
    catch(err){toast(err.message,'error')}
  }
  const toggleStatus=async(u)=>{
    const isDeact=u.role==='deactivated'
    const nr=isDeact?(u.previous_role||'resident'):'deactivated'
    try{await supabase.from('user_roles').update({role:nr,previous_role:isDeact?null:u.role}).eq('user_id',u.user_id);await logAudit(isDeact?'Activate':'Deactivate','Users',`${u.email}`);toast(`${u.email} ${isDeact?'activated':'deactivated'}.`,'success');loadUsers()}
    catch(err){toast(err.message,'error')}
  }
  const deleteUser=async(u)=>{
    if(u.user_id===user?.id){toast('Cannot delete own account.','error');return}
    if(!window.confirm(`Permanently delete ${u.email}? This cannot be undone.`))return
    try{await supabase.from('user_roles').delete().eq('user_id',u.user_id);await supabase.from('profiles').delete().eq('user_id',u.user_id);await logAudit('Delete','Users',`Deleted ${u.email}`);toast('Account deleted.','success');loadUsers()}
    catch(err){toast(err.message,'error')}
  }
  const resetPw=async(uid,email)=>{
    const np=prVal[uid]; if(!np||np.length<8){toast('Min 8 chars.','error');return}
    try{
      await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`})
      await logAudit('Edit','Users',`Sent password reset to ${email}`)
      toast(`Password reset email sent to ${email}.`,'success'); setPrOpen(null)
    }catch(err){toast(err.message,'error')}
  }

  /* Helpers */
  const st=(v)=>{ const s=[v.length>=(policies.minPw||8),/[A-Z]/.test(v),/[a-z]/.test(v),/[0-9]/.test(v),/[^A-Za-z0-9]/.test(v)].filter(Boolean).length; return{s,col:['','#C53030','#D97706','#D69E2E','#38A169','#276749'][s],lbl:['','Weak','Fair','Good','Strong','Excellent'][s]} }
  const pws=st(pw.new_)
  const filtUsers=users.filter(u=>!uSrch||u.name?.toLowerCase().includes(uSrch.toLowerCase())||u.email?.toLowerCase().includes(uSrch.toLowerCase()))
  const filtLogs=logs.filter(l=>!logSrch||l.action?.includes(logSrch)||l.module?.includes(logSrch)||l.user_name?.includes(logSrch))

  const c=(e={})=>({ background:T.surface,borderRadius:13,border:`1px solid ${T.border}`,padding:'20px 22px',marginBottom:16,boxShadow:'0 2px 10px rgba(0,0,0,.04)',...e })
  const Fl=()=>fb?(<div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,marginBottom:16,background:fb.type==='success'?'#F0FFF4':'#FFF5F5',border:`1px solid ${fb.type==='success'?'#9AE6B4':'#FC8181'}` }}>
    {fb.type==='success'?<CheckCircle size={14} style={{ color:'#38A169',flexShrink:0 }}/>:<AlertCircle size={14} style={{ color:T.crimson,flexShrink:0 }}/>}
    <span style={{ fontSize:13,color:fb.type==='success'?'#276749':T.crimson,fontFamily:IF,flex:1 }}>{fb.msg}</span>
    <button onClick={()=>setFb(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'#A0AEC0',padding:0,display:'flex' }}><X size={13}/></button>
  </div>):null

  const RolePill=({r})=>{ const map={super_admin:['#FEF9E7','#7B4800'],admin:['#EBF8FF',T.navy],resident:['#F7FAFC','#718096'],deactivated:['#FFF5F5','#C53030']}; const[bg,col]=map[r||'resident']||map.resident; return <span style={{ fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:20,background:bg,color:col }}>{(r||'resident').replace('_',' ')}</span> }
  const Tog=({on,onChange,disabled})=><button onClick={()=>!disabled&&onChange(!on)} disabled={disabled} style={{ width:46,height:24,borderRadius:12,border:'none',cursor:disabled?'not-allowed':'pointer',background:on?T.navy:'#CBD5E0',position:'relative',transition:'background .2s',flexShrink:0,opacity:disabled?.5:1 }}><span style={{ display:'block',width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:on?25:3,transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.2)' }}/></button>

  /* ── NAV by role ── */
  /* Admin sees 4 sections only. SA gets full menu minus Notifications */
  const ADMIN_NAV=[
    { k:'profile',    l:'Profile',              e:'👤' },
    { k:'account',    l:'Account Settings',     e:'🔑' },
    { k:'security',   l:'Security',             e:'🔒' },
    { k:'users',      l:'User Management',      e:'👥' },
    { k:'logs',       l:'Audit Trail / Logs',   e:'📋' },
  ]
  const SA_NAV=[
    { k:'profile',    l:'Profile',              e:'👤' },
    { k:'account',    l:'Account Settings',     e:'🔑' },
    { k:'security',   l:'Security',             e:'🔒' },
    { k:'users',      l:'User Management',      e:'👥' },
    { k:'logs',       l:'Audit Trail / Logs',   e:'📋', viewOnly:true },
    { k:'admins',     l:'Admin Management',     e:'🛠️' },
    { k:'backup',     l:'Backup & Restore',     e:'💾' },
    { k:'maintenance',l:'Maintenance Mode',     e:'🚧' },
  ]
  const NAV = isSA ? SA_NAV : ADMIN_NAV

  return (
    <div style={{ display:'flex',height:'calc(100vh - 54px)',overflow:'hidden',margin:'-28px -32px',fontFamily:IF }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* Inner sidebar */}
      <div style={{ width:210,background:T.bg,borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto' }}>
        <div style={{ padding:'14px 12px 10px' }}>
          <div style={{ padding:'10px 12px',borderRadius:10,marginBottom:14,background:isSA?`${T.gold}18`:`${T.navy}10`,border:`1px solid ${isSA?T.gold:T.border}` }}>
            <p style={{ fontSize:11,fontWeight:700,color:isSA?T.gold:T.navy,margin:'0 0 1px',fontFamily:MF }}>{isSA?'👑 Super Admin':'🛠️ Admin'}</p>
            <p style={{ fontSize:9,color:T.textMuted,margin:0,fontFamily:IF }}>{isSA?'Full system access':'Limited — manage content'}</p>
          </div>
          {NAV.map(({k,l,e,viewOnly})=>{
            const active=sec===k
            return (
              <button key={k} onClick={()=>setSec(k)}
                style={{ display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 12px',borderRadius:9,border:'none',cursor:'pointer',background:active?T.navy:'transparent',color:active?'white':T.textMuted,fontSize:12,fontWeight:active?700:400,marginBottom:2,fontFamily:IF,textAlign:'left',transition:'all .15s' }}
                onMouseEnter={e2=>{if(!active){e2.currentTarget.style.background=T.surface2;e2.currentTarget.style.color=T.text}}}
                onMouseLeave={e2=>{if(!active){e2.currentTarget.style.background='transparent';e2.currentTarget.style.color=T.textMuted}}}>
                <span style={{ fontSize:13,flexShrink:0 }}>{e}</span>
                <span style={{ flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{l}</span>
                {viewOnly&&!active&&<span style={{ fontSize:8,background:T.border,color:T.textMuted,padding:'1px 5px',borderRadius:8,flexShrink:0,fontFamily:IF }}>view</span>}
                {active&&<span style={{ width:5,height:5,borderRadius:'50%',background:'white',opacity:.8,flexShrink:0 }}/>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1,overflowY:'auto',padding:'22px 28px',minWidth:0 }}>
        <Fl/>

        {/* ── 1. PROFILE ── */}
        {sec==='profile'&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>{isSA?'Super Admin':'Admin'} Profile</h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>Your name, position, contact info and profile picture.</p>
          <div style={{ display:'grid',gridTemplateColumns:'180px 1fr',gap:18,maxWidth:780 }}>
            <div style={{ ...c(),textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',padding:'22px 16px' }}>
              <div style={{ width:88,height:88,borderRadius:'50%',background:`linear-gradient(135deg,${T.navy},${T.navyLight||'#2A4A7F'})`,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:28,fontWeight:800,fontFamily:MF,marginBottom:12,border:`3px solid ${T.border}` }}>
                {(profile?.name||user?.email||'A')[0].toUpperCase()}
              </div>
              <p style={{ fontSize:13,fontWeight:700,color:T.navy,margin:'0 0 2px',fontFamily:MF }}>{profile?.name||'Admin'}</p>
              <p style={{ fontSize:11,color:T.textMuted,margin:'0 0 8px',fontFamily:IF }}>{user?.email}</p>
              <span style={{ fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:isSA?`${T.gold}20`:T.surface2,color:isSA?T.gold:T.navy }}>{role?.replace('_',' ').toUpperCase()}</span>
            </div>
            <div style={c()}>
              <p style={{ fontSize:11,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 14px',fontFamily:IF }}>Account Details</p>
              {/* Name */}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,color:'#4A5568',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,fontFamily:IF }}>Display Name</label>
                {nEdit?(
                  <div style={{ display:'flex',gap:8 }}>
                    <input className="input-field" style={{ flex:1,fontSize:13 }} value={nNew} onChange={e=>setNNew(e.target.value)} autoFocus/>
                    <BtnPrimary onClick={async()=>{await supabase.from('user_roles').update({name:nNew}).eq('user_id',user?.id);await supabase.from('profiles').update({name:nNew}).eq('user_id',user?.id);await refreshProfile();await logAudit('Edit','Profile','Updated name');flash('success','Name updated!');setNEdit(false)}} style={{ padding:'7px 14px',fontSize:12 }}><Save size={12}/></BtnPrimary>
                    <button onClick={()=>setNEdit(false)} className="btn-ghost" style={{ padding:'7px 11px' }}><X size={12}/></button>
                  </div>
                ):(
                  <div style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:T.surface2,borderRadius:8 }}>
                    <span style={{ fontSize:13,color:T.text,flex:1,fontFamily:IF }}>{profile?.name||'—'}</span>
                    <button onClick={()=>{setNNew(profile?.name||'');setNEdit(true)}} style={{ fontSize:11,color:T.navy,background:`${T.navy}12`,border:'none',borderRadius:6,padding:'4px 12px',cursor:'pointer',fontWeight:600,fontFamily:IF }}>Edit</button>
                  </div>
                )}
              </div>
              {/* Position */}
              <FormField label="Position / Title">
                <div style={{ display:'flex',gap:8 }}>
                  <select className="input-field" value={pos} onChange={e=>setPos(e.target.value)} style={{ flex:1,fontSize:13 }}>
                    <option value="">Select position</option>
                    {['SK Chairperson','SK Secretary','SK Treasurer'].map(p=><option key={p}>{p}</option>)}
                  </select>
                  <BtnPrimary onClick={async()=>{setPosS(true);try{await supabase.from('profiles').update({position:pos}).eq('user_id',user?.id);await logAudit('Edit','Profile','Updated position');flash('success','Position saved!')}catch(err){flash('error',err.message)}finally{setPosS(false)}}} disabled={posS} style={{ padding:'7px 14px',fontSize:12 }}>Save</BtnPrimary>
                </div>
              </FormField>
              {[['Email',user?.email],['Role',role?.replace('_',' ').toUpperCase()||'—']].map(([k,v])=>(
                <div key={k} style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:T.surface2,borderRadius:8,marginBottom:8 }}>
                  <span style={{ fontSize:11,color:T.textMuted,fontWeight:700,textTransform:'uppercase',width:80,flexShrink:0,fontFamily:IF }}>{k}</span>
                  <span style={{ fontSize:13,color:T.text,fontFamily:IF }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>}

        {/* ── 2. ACCOUNT SETTINGS ── */}
        {sec==='account'&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>{isSA?'Account Settings':'Admin Credentials'}</h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>{isSA?'Password, email, phone and username management.':'Manage your password, email, phone number and username.'}</p>
          <div style={{ maxWidth:800 }}>
            {/* Password */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,borderBottom:`2px solid ${T.gold}`,paddingBottom:8,marginBottom:14,fontFamily:MF }}>🔑 Change Password</h4>
              <form onSubmit={handlePw}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
                  {[{k:'cur',l:'Current',sh:'show'},{k:'new_',l:'New Password',sh:'show'},{k:'conf',l:'Confirm',sh:'show'}].map(({k,l,sh})=>(
                    <div key={k}>
                      <label style={{ display:'block',fontSize:11,fontWeight:700,color:'#4A5568',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,fontFamily:IF }}>{l} *</label>
                      <div style={{ position:'relative' }}>
                        <input type={pw[sh]?'text':'password'} value={pw[k]} onChange={e=>setPw(p=>({...p,[k]:e.target.value}))} placeholder="••••••••"
                          style={{ width:'100%',padding:'10px 38px 10px 13px',borderRadius:9,border:'1.5px solid #E2E8F0',background:'#FAFBFC',fontSize:14,fontFamily:IF,color:T.text,outline:'none',boxSizing:'border-box' }}
                          onFocus={e=>{e.target.style.borderColor=T.navy;e.target.style.boxShadow='0 0 0 3px rgba(26,54,93,.09)'}}
                          onBlur={e=>{e.target.style.borderColor='#E2E8F0';e.target.style.boxShadow='none'}}/>
                        <button type="button" onClick={()=>setPw(p=>({...p,[sh]:!p[sh]}))} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:T.textMuted,display:'flex',padding:0 }}>{pw[sh]?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                      </div>
                      {k==='new_'&&pw.new_&&<div style={{ marginTop:5 }}><div style={{ height:4,borderRadius:2,overflow:'hidden',display:'flex',gap:2 }}>{[...Array(5)].map((_,i)=><div key={i} style={{ flex:1,background:i<pws.s?pws.col:'#E2E8F0',borderRadius:2,transition:'background .3s' }}/>)}</div><p style={{ fontSize:11,color:pws.col,marginTop:3,fontWeight:600,fontFamily:IF }}>{pws.lbl}</p></div>}
                      {k==='conf'&&pw.conf&&pw.conf!==pw.new_&&<p style={{ fontSize:11,color:'#C53030',marginTop:3,fontFamily:IF }}>⚠ Do not match</p>}
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex',gap:10,marginTop:14 }}>
                  <BtnPrimary disabled={pwS}>{pwS?<><RefreshCw size={12} style={{ animation:'spin .8s linear infinite' }}/> Updating…</>:<><Save size={12}/> Update Password</>}</BtnPrimary>
                  <button type="button" onClick={()=>setPw({cur:'',new_:'',conf:'',show:false})} className="btn-ghost" style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 16px',fontSize:12 }}><X size={12}/> Clear</button>
                </div>
              </form>
            </div>
            {/* Email */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,borderBottom:`2px solid ${T.gold}`,paddingBottom:8,marginBottom:14,fontFamily:MF }}>✉️ Update Email</h4>
              <p style={{ fontSize:12,color:T.textMuted,margin:'0 0 12px',fontFamily:IF }}>Current: <strong>{user?.email}</strong></p>
              {eStep==='idle'?(
                <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'end' }}>
                  <FormField label="New Email Address"><input className="input-field" type="email" value={eNew} onChange={e=>setENew(e.target.value)} placeholder="new@email.com"/></FormField>
                  <div style={{ marginBottom:22 }}><BtnPrimary onClick={async()=>{if(!eNew)return;const{error}=await supabase.auth.updateUser({email:eNew});if(error)flash('error',error.message);else{setEStep('sent');flash('success','Verification emails sent to both addresses!')}}}><Mail size={12}/> Send Verification</BtnPrimary></div>
                </div>
              ):(
                <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#F0FFF4',borderRadius:9,border:'1px solid #9AE6B4' }}>
                  <CheckCircle size={13} style={{ color:'#38A169',flexShrink:0 }}/><span style={{ fontSize:12,color:'#276749',fontWeight:600,fontFamily:IF }}>Verification sent. Check both inboxes.</span>
                  <button onClick={()=>{setEStep('idle');setENew('')}} style={{ marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#A0AEC0' }}><X size={12}/></button>
                </div>
              )}
            </div>
            {/* Phone */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,borderBottom:`2px solid ${T.gold}`,paddingBottom:8,marginBottom:14,fontFamily:MF }}>📱 Update Phone</h4>
              <div style={{ display:'flex',gap:10,alignItems:'end' }}>
                <div style={{ flex:1 }}>
                  <FormField label="Phone Number">
                    <div style={{ display:'flex',alignItems:'center',border:'1.5px solid #E2E8F0',borderRadius:9,overflow:'hidden' }}>
                      <span style={{ padding:'0 12px',fontSize:13,color:'#718096',background:'#F7F8FA',borderRight:'1px solid #E2E8F0',alignSelf:'stretch',display:'flex',alignItems:'center' }}>+63 9</span>
                      <input type="text" value={pNew} onChange={e=>setPNew(e.target.value.replace(/\D/g,'').slice(0,9))} placeholder="XX XXX XXXX"
                        style={{ flex:1,padding:'10px 13px',border:'none',background:'transparent',fontSize:14,fontFamily:IF,color:T.text,outline:'none' }}/>
                    </div>
                  </FormField>
                </div>
                {pStep==='idle'&&<div style={{ marginBottom:22 }}><BtnPrimary onClick={()=>{setPStep('sent');flash('success','OTP sent to your phone!')}}>Verify & Save</BtnPrimary></div>}
              </div>
              {pStep==='sent'&&(
                <div style={{ display:'flex',gap:10 }}>
                  <input type="text" inputMode="numeric" maxLength={6} value={pOTP} onChange={e=>setPOTP(e.target.value.replace(/\D/g,''))} placeholder="000000"
                    style={{ width:130,padding:'10px',borderRadius:9,border:`2px solid ${T.border}`,fontSize:20,fontWeight:700,letterSpacing:'6px',textAlign:'center',fontFamily:'monospace',outline:'none',background:'white',color:'#2D3748' }}
                    onFocus={e=>e.target.style.borderColor=T.navy} onBlur={e=>e.target.style.borderColor=T.border}/>
                  <BtnPrimary disabled={pOTP.length!==6||pLoad} onClick={async()=>{setPLoad(true);try{await supabase.from('profiles').update({contact_number:`+639${pNew}`}).eq('user_id',user?.id);await logAudit('Edit','Account','Updated phone');flash('success','Phone updated!');setPStep('idle');setPOTP('')}catch(err){flash('error',err.message)}finally{setPLoad(false)}}}>Verify OTP</BtnPrimary>
                  <button onClick={()=>{setPStep('idle');setPOTP('')}} className="btn-ghost" style={{ padding:'8px 14px',fontSize:12 }}>Cancel</button>
                </div>
              )}
            </div>
            {/* Username */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,borderBottom:`2px solid ${T.gold}`,paddingBottom:8,marginBottom:14,fontFamily:MF }}>🏷️ Username</h4>
              <div style={{ display:'flex',gap:10,alignItems:'end' }}>
                <div style={{ flex:1 }}>
                  <FormField label="Username">
                    <div style={{ display:'flex',alignItems:'center',border:'1.5px solid #E2E8F0',borderRadius:9,overflow:'hidden' }}>
                      <span style={{ padding:'0 12px',fontSize:13,color:'#718096',background:'#F7F8FA',borderRight:'1px solid #E2E8F0',alignSelf:'stretch',display:'flex',alignItems:'center' }}>@</span>
                      <input type="text" value={uname} onChange={e=>setUname(e.target.value.toLowerCase().replace(/\s/g,'_'))} placeholder="admin_username"
                        style={{ flex:1,padding:'10px 13px',border:'none',background:'transparent',fontSize:14,fontFamily:IF,color:T.text,outline:'none' }}/>
                    </div>
                  </FormField>
                </div>
                <div style={{ marginBottom:22 }}><BtnPrimary disabled={!uname||uS} onClick={async()=>{setUS(true);try{await supabase.from('profiles').update({username:uname}).eq('user_id',user?.id);await logAudit('Edit','Account','Updated username');flash('success','Username saved!')}catch(err){flash('error',err.message)}finally{setUS(false)}}}><Save size={12}/> Save</BtnPrimary></div>
              </div>
            </div>
          </div>
        </div>}

        {/* ── 3. SECURITY ── */}
        {sec==='security'&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>{isSA?'Security':'Security Controls'} Controls</h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>2FA, OTP, sessions, and login history.</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:880 }}>

            {/* 2FA */}
            <div style={{ ...c(),gridColumn:'1/-1' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
                <h4 style={{ fontSize:13,fontWeight:700,color:T.text,fontFamily:MF,margin:0 }}>🔐 Two-Factor Authentication (2FA)</h4>
                <span style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,background:mfa?'#C6F6D5':'#FEF3C7',color:mfa?'#276749':'#92400E' }}>{mfa?'✓ Active':'Inactive'}</span>
              </div>
              {!isSA&&!mfa&&<div style={{ padding:'9px 12px',background:T.surface2,borderRadius:8,marginBottom:12,display:'flex',alignItems:'center',gap:8 }}><AlertCircle size={13} style={{ color:'#D97706',flexShrink:0 }}/><span style={{ fontSize:12,color:'#92400E',fontFamily:IF }}>Admin accounts should always have 2FA enabled for security.</span></div>}
              {mfaS==='idle'&&!mfa&&<BtnPrimary onClick={startMFA} disabled={ml}>{ml?<><RefreshCw size={12} style={{ animation:'spin .8s linear infinite' }}/> Setting up…</>:'🔐 Enable 2FA'}</BtnPrimary>}
              {mfaS==='enrolling'&&(
                <div style={{ background:T.surface2,borderRadius:10,padding:16 }}>
                  <div style={{ display:'flex',gap:16,marginBottom:14 }}>
                    <div style={{ padding:8,background:'white',border:`1px solid ${T.border}`,borderRadius:10,flexShrink:0 }}>{qr&&<img src={qr} alt="QR" style={{ width:110,height:110,display:'block' }}/>}</div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12,fontWeight:700,color:T.navy,margin:'0 0 6px',fontFamily:MF }}>Scan with Google Authenticator or Authy</p>
                      <ol style={{ fontSize:11,color:T.textMuted,lineHeight:2.2,paddingLeft:14,margin:'0 0 10px',fontFamily:IF }}><li>Open authenticator app</li><li>Tap + → Scan QR Code</li><li>Enter the 6-digit code</li></ol>
                      <div style={{ display:'flex',gap:6 }}>
                        <code style={{ fontSize:8,background:T.surface,border:`1px solid ${T.border}`,borderRadius:5,padding:'3px 7px',wordBreak:'break-all',flex:1,fontFamily:'monospace' }}>{msc}</code>
                        <button onClick={()=>{navigator.clipboard.writeText(msc);setCp(true);setTimeout(()=>setCp(false),2000)}} style={{ padding:'3px 8px',borderRadius:5,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',fontSize:9,color:cp?'#38A169':T.textMuted,display:'flex',alignItems:'center',gap:3,flexShrink:0 }}>{cp?'Copied!':'Copy'}</button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex',gap:10 }}>
                    <input type="text" inputMode="numeric" maxLength={6} value={mc} onChange={e=>setMC(e.target.value.replace(/\D/g,''))} placeholder="000000"
                      style={{ width:120,padding:'10px',borderRadius:9,border:`2px solid ${T.border}`,fontSize:20,fontWeight:700,letterSpacing:'6px',textAlign:'center',fontFamily:'monospace',outline:'none',background:'white',color:'#2D3748' }}
                      onFocus={e=>e.target.style.borderColor=T.navy} onBlur={e=>e.target.style.borderColor=T.border}/>
                    <BtnPrimary onClick={verifyMFA} disabled={ml||mc.length!==6}>{ml?'Verifying…':'Activate 2FA'}</BtnPrimary>
                    <button onClick={()=>{setMfaS('idle');setQR(null);setMSec(null);setMC('')}} className="btn-ghost" style={{ padding:'8px 14px',fontSize:12 }}>Cancel</button>
                  </div>
                </div>
              )}
              {mfaS==='idle'&&mfa&&(
                <div style={{ display:'flex',alignItems:'center',gap:14 }}>
                  <div style={{ flex:1,padding:'10px 14px',background:'#F0FFF4',borderRadius:9,border:'1px solid #9AE6B4',display:'flex',alignItems:'center',gap:8 }}>
                    <CheckCircle size={13} style={{ color:'#38A169',flexShrink:0 }}/><span style={{ fontSize:12,color:'#276749',fontWeight:600,fontFamily:IF }}>2FA is active and protecting your admin account.</span>
                  </div>
                  {isSA&&<button onClick={()=>setMfaS('disabling')} style={{ padding:'7px 14px',borderRadius:7,border:`1.5px solid ${T.crimson}`,background:T.surface,color:T.crimson,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:IF }}>Disable</button>}
                  {!isSA&&<span style={{ fontSize:11,color:T.textMuted,fontFamily:IF }}>Only Super Admin can disable admin 2FA.</span>}
                </div>
              )}
              {mfaS==='disabling'&&(
                <div style={{ padding:'12px 14px',background:T.surface2,borderRadius:9,border:`1px solid ${T.crimson}` }}>
                  <p style={{ fontSize:12,color:T.crimson,marginBottom:10,fontWeight:600,fontFamily:IF }}>Disable 2FA for your admin account?</p>
                  <div style={{ display:'flex',gap:9 }}>
                    <button onClick={()=>setMfaS('idle')} className="btn-ghost" style={{ padding:'7px 14px',fontSize:12 }}>Cancel</button>
                    <button onClick={disableMFA} disabled={ml} style={{ padding:'7px 14px',borderRadius:7,background:T.crimson,color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:IF }}>{ml?'…':'Confirm Disable'}</button>
                  </div>
                </div>
              )}
            </div>

            {/* OTP */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 14px',fontFamily:MF }}>📧 Email OTP Verification</h4>
              {!otpS?<BtnPrimary onClick={sendOTP} disabled={otpL} style={{ background:'#38A169' }}>{otpL?'Sending…':'Send OTP to Email'}</BtnPrimary>:(
                <div>
                  <p style={{ fontSize:12,color:'#38A169',marginBottom:8,fontWeight:600,fontFamily:IF }}>✅ OTP sent to {user?.email}</p>
                  <div style={{ display:'flex',gap:9 }}>
                    <input type="text" inputMode="numeric" maxLength={6} value={otpC} onChange={e=>setOtpC(e.target.value.replace(/\D/g,''))} className="input-field" style={{ width:110,letterSpacing:'4px',fontSize:18,fontWeight:700,textAlign:'center',fontFamily:'monospace' }} placeholder="000000"/>
                    <BtnPrimary onClick={verifyOTP} disabled={otpL||otpC.length!==6} style={{ background:'#38A169' }}>{otpL?'…':'Verify'}</BtnPrimary>
                    <button onClick={()=>{setOtpS(false);setOtpC('')}} className="btn-ghost" style={{ padding:'8px 12px',fontSize:12 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sessions */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 14px',fontFamily:MF }}>🖥️ Active Sessions</h4>
              <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:14 }}>
                {sess.map(s=>(
                  <div key={s.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:9,background:s.current?`${T.navy}10`:T.surface2,border:`1px solid ${s.current?`${T.navy}30`:T.border}` }}>
                    <Monitor size={14} style={{ color:s.current?T.navy:T.textMuted,flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <span style={{ fontSize:12,fontWeight:s.current?700:500,color:s.current?T.navy:T.text,fontFamily:IF }}>{s.device}</span>
                        {s.current&&<span style={{ fontSize:8,background:'#C6F6D5',color:'#276749',padding:'1px 6px',borderRadius:10,fontWeight:700 }}>Current</span>}
                      </div>
                      <span style={{ fontSize:10,color:T.textMuted,fontFamily:IF }}>{s.loc} · {s.time}</span>
                    </div>
                    {!s.current&&<button onClick={()=>setSess(p=>p.filter(x=>x.id!==s.id))} style={{ padding:'4px 9px',borderRadius:6,border:`1px solid ${T.crimson}30`,background:T.surface,color:T.crimson,cursor:'pointer',fontSize:10,fontWeight:600,fontFamily:IF }}>Remove</button>}
                  </div>
                ))}
              </div>
              {lcC?(<div style={{ padding:'10px 14px',background:T.surface2,borderRadius:9,border:`1px solid ${T.crimson}` }}>
                <p style={{ fontSize:12,color:T.crimson,marginBottom:8,fontWeight:600,fontFamily:IF }}>Force logout all other sessions?</p>
                <div style={{ display:'flex',gap:8 }}>
                  <button onClick={()=>setLCC(false)} className="btn-ghost" style={{ padding:'6px 12px',fontSize:11 }}>Cancel</button>
                  <button onClick={()=>{setSess(p=>p.filter(s=>s.current));logAudit('Edit','Security','Logged out all sessions');flash('success','All other sessions terminated.');setLCC(false)}} style={{ padding:'6px 12px',borderRadius:7,background:T.crimson,color:'white',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:IF }}>Force Logout All</button>
                </div>
              </div>):(
                <button onClick={()=>setLCC(true)} style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,border:`1.5px solid ${T.crimson}`,background:T.surface,color:T.crimson,cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:IF }}><LogOut size={12}/> Logout All Other Sessions</button>
              )}
            </div>

            {/* Login History */}
            <div style={{ ...c(),gridColumn:'1/-1' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                <h4 style={{ fontSize:13,fontWeight:700,color:T.text,fontFamily:MF,margin:0 }}>📋 Login History</h4>
                <button onClick={loadLH} style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:7,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',fontSize:11,color:T.text,fontFamily:IF }}><RefreshCw size={10}/> Refresh</button>
              </div>
              {lhL?<p style={{ fontSize:12,color:T.textMuted,fontFamily:IF }}>Loading…</p>:lh.length===0?<p style={{ fontSize:12,color:T.textMuted,fontFamily:IF }}>No history found.</p>:(
                <div style={{ maxHeight:200,overflowY:'auto' }}>
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr><TH>Action</TH><TH>Module</TH><TH>Details</TH><TH>Time</TH></tr></thead>
                    <tbody>{lh.map((l,i)=>(
                      <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=T.tableHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <TD>{l.action||'—'}</TD><TD>{l.module||'—'}</TD>
                        <TD style={{ maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{l.description||'—'}</TD>
                        <TD style={{ color:T.textMuted,fontSize:10 }}>{l.created_at?new Date(l.created_at).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</TD>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>}

        {/* ── 4. USER MANAGEMENT (Admin+SA) ── */}
        {sec==='users'&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>User Management</h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>View, edit, approve, deactivate, and manage resident accounts. {isSA&&'Super Admin can also delete accounts and reset passwords.'}</p>
          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
            <div style={{ position:'relative',flex:1,maxWidth:340 }}><Search size={13} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.textMuted }}/><input className="input-field" style={{ paddingLeft:32,fontSize:12 }} placeholder="Search name or email…" value={uSrch} onChange={e=>setUSrch(e.target.value)}/></div>
            <button onClick={loadUsers} style={{ display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',fontSize:12,color:T.text,fontFamily:IF }}><RefreshCw size={12}/> Refresh</button>
          </div>
          <div style={{ background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden' }}>
            {uLoad?<div style={{ padding:32,textAlign:'center',color:T.textMuted }}>Loading users…</div>:filtUsers.length===0?<div style={{ padding:32,textAlign:'center',color:T.textMuted }}>No users found.</div>:(
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr><TH>Name / Email</TH><TH>Role</TH><TH>Assign Role</TH>{isSA&&<TH>Reset PW</TH>}<TH>Status</TH>{isSA&&<TH>Delete</TH>}</tr></thead>
                <tbody>{filtUsers.map(u=>{
                  const isSelf=u.user_id===user?.id
                  const isDeact=u.role==='deactivated'
                  return (
                    <tr key={u.id} onMouseEnter={e=>e.currentTarget.style.background=T.tableHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <TD><p style={{ fontSize:12,fontWeight:600,color:T.navy,margin:'0 0 1px',fontFamily:IF }}>{u.name||'—'}</p><p style={{ fontSize:10,color:T.textMuted,margin:0,fontFamily:IF }}>{u.email}</p></TD>
                      <TD><RolePill r={u.role}/></TD>
                      <TD>
                        <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                          <select disabled={isSelf} value={rmap[u.user_id]||'resident'} onChange={e=>setRmap(p=>({...p,[u.user_id]:e.target.value}))}
                            style={{ padding:'5px 8px',borderRadius:7,border:`1px solid ${T.border}`,background:isSelf?T.surface2:T.surface,color:T.text,fontSize:11,fontFamily:IF,cursor:isSelf?'not-allowed':'pointer' }}>
                            <option value="resident">Resident</option>
                            {isSA&&<option value="admin">Admin</option>}
                            {isSA&&<option value="super_admin">Super Admin</option>}
                          </select>
                          <BtnPrimary onClick={()=>saveRole(u)} disabled={isSelf} style={{ padding:'5px 10px',fontSize:11 }}>Set</BtnPrimary>
                        </div>
                      </TD>
                      {isSA&&<TD>
                        {prOpen===u.user_id?(
                          <div style={{ display:'flex',gap:4 }}>
                            <input type="text" placeholder="New password" value={prVal[u.user_id]||''} onChange={e=>setPrVal(p=>({...p,[u.user_id]:e.target.value}))}
                              style={{ width:110,padding:'5px 8px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,fontSize:11,fontFamily:IF,color:T.text,outline:'none' }}/>
                            <BtnPrimary onClick={()=>resetPw(u.user_id,u.email)} style={{ padding:'5px 8px',fontSize:10 }}>Send</BtnPrimary>
                            <button onClick={()=>setPrOpen(null)} style={{ padding:'5px 7px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',color:T.textMuted,fontSize:10 }}>✕</button>
                          </div>
                        ):<button onClick={()=>setPrOpen(u.user_id)} disabled={isSelf} style={{ padding:'5px 10px',borderRadius:7,border:`1px solid ${T.border}`,background:T.surface2,cursor:isSelf?'not-allowed':'pointer',fontSize:11,color:T.text,fontFamily:IF,fontWeight:600,opacity:isSelf?.5:1 }}>Reset</button>}
                      </TD>}
                      <TD><button onClick={()=>toggleStatus(u)} disabled={isSelf} style={{ padding:'5px 10px',borderRadius:7,border:`1px solid ${isDeact?'#9AE6B4':'#FC8181'}`,background:isDeact?'#F0FFF4':'#FFF5F5',cursor:isSelf?'not-allowed':'pointer',fontSize:11,color:isDeact?'#276749':'#C53030',fontFamily:IF,fontWeight:600,opacity:isSelf?.5:1 }}>{isDeact?'Activate':'Deactivate'}</button></TD>
                      {isSA&&<TD><button onClick={()=>deleteUser(u)} disabled={isSelf} style={{ padding:'5px 8px',borderRadius:7,border:`1px solid ${isSelf?T.border:'#FC8181'}`,background:isSelf?T.surface2:'#FFF5F5',cursor:isSelf?'not-allowed':'pointer',color:isSelf?T.textMuted:'#C53030',fontSize:11,fontWeight:700,fontFamily:IF,opacity:isSelf?.5:1 }}>🗑️</button></TD>}
                    </tr>
                  )
                })}</tbody>
              </table>
            )}
          </div>
        </div>}

        {/* ── 6. AUDIT LOGS (view) ── */}
        {sec==='logs'&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>Audit Logs {!isSA&&<span style={{ fontSize:13,fontWeight:600,color:T.textMuted }}>(View Only)</span>}</h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>All system activity tracked in chronological order.</p>
          <div style={{ display:'flex',gap:12,marginBottom:14 }}>
            <div style={{ position:'relative',flex:1,maxWidth:340 }}><Search size={13} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.textMuted }}/><input className="input-field" style={{ paddingLeft:32,fontSize:12 }} placeholder="Filter by action, module, user…" value={logSrch} onChange={e=>setLogSrch(e.target.value)}/></div>
            <button onClick={loadLogs} style={{ display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',fontSize:12,color:T.text,fontFamily:IF }}><RefreshCw size={12}/> Refresh</button>
            {isSA&&<button onClick={()=>{const d=filtLogs;const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`audit-logs-${new Date().toISOString().split('T')[0]}.json`;a.click();logAudit('Export','Logs','Exported audit logs')}} style={{ display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',fontSize:12,color:T.text,fontFamily:IF }}><Download size={12}/> Export JSON</button>}
          </div>
          <div style={{ background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden' }}>
            {logL?<div style={{ padding:24,textAlign:'center',color:T.textMuted }}>Loading…</div>:filtLogs.length===0?<div style={{ padding:24,textAlign:'center',color:T.textMuted }}>No logs found.</div>:(
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr><TH>User</TH><TH>Action</TH><TH>Module</TH><TH>Details</TH><TH>Time</TH></tr></thead>
                <tbody>{filtLogs.slice(0,50).map((l,i)=>(
                  <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=T.tableHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <TD style={{ fontSize:11 }}>{l.user_name||'—'}</TD><TD>{l.action||'—'}</TD><TD>{l.module||'—'}</TD>
                    <TD style={{ maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{l.description||'—'}</TD>
                    <TD style={{ color:T.textMuted,fontSize:10 }}>{l.created_at?new Date(l.created_at).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</TD>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>}

        {/* ── SUPER ADMIN ONLY SECTIONS ── */}
        {!isSA&&['admins','system','db','notifs','reports','backup','maintenance'].includes(sec)&&(
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:300,gap:16 }}>
            <div style={{ fontSize:48 }}>🔒</div>
            <p style={{ fontSize:18,fontWeight:700,color:T.navy,fontFamily:MF,margin:0 }}>Super Admin Only</p>
            <p style={{ fontSize:13,color:T.textMuted,fontFamily:IF,margin:0 }}>This section requires Super Admin privileges.</p>
          </div>
        )}

        {/* ── 7. ADMIN MANAGEMENT (SA) ── */}
        {sec==='admins'&&isSA&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>Admin Management <span style={{ fontSize:13,background:`${T.gold}20`,color:T.gold,padding:'2px 10px',borderRadius:20,fontWeight:600 }}>Super Admin</span></h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>Create, manage and remove admin accounts. Cannot delete the last Super Admin.</p>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
            <button onClick={loadAdmins} style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',fontSize:12,color:T.text,fontFamily:IF }}><RefreshCw size={11}/> Refresh</button>
            <BtnPrimary onClick={()=>setAAO(true)}><Plus size={13}/> Add Admin</BtnPrimary>
          </div>
          {addAdmOpen&&(
            <div style={{ ...c(),background:`${T.gold}08`,border:`1px solid ${T.gold}` }}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 14px',fontFamily:MF }}>New Admin Account</h4>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:12,alignItems:'end' }}>
                <FormField label="Full Name"><input className="input-field" value={newAdm.name} onChange={e=>setNewAdm(p=>({...p,name:e.target.value}))} placeholder="Admin Name"/></FormField>
                <FormField label="Email"><input className="input-field" type="email" value={newAdm.email} onChange={e=>setNewAdm(p=>({...p,email:e.target.value}))} placeholder="admin@email.com"/></FormField>
                <div style={{ marginBottom:22 }}>
                  <select value={newAdm.role} onChange={e=>setNewAdm(p=>({...p,role:e.target.value}))} className="input-field" style={{ marginBottom:0 }}>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <BtnPrimary onClick={async()=>{if(!newAdm.name||!newAdm.email){toast('Name and email required.','error');return}try{const tmpPw='Admin@'+Math.random().toString(36).slice(2,10);const{data,error}=await supabase.auth.admin.createUser({email:newAdm.email,password:tmpPw,email_confirm:true});if(error)throw error;await supabase.from('user_roles').upsert({user_id:data.user.id,email:newAdm.email,name:newAdm.name,role:newAdm.role},{onConflict:'user_id'});await logAudit('Create','Admins',`Created admin: ${newAdm.email}`);flash('success',`Admin created. Temp password: ${tmpPw}`);setNewAdm({name:'',email:'',role:'admin'});setAAO(false);loadAdmins()}catch(err){flash('error',err.message)}}}><Plus size={12}/> Create Admin</BtnPrimary>
                <button onClick={()=>{setAAO(false);setNewAdm({name:'',email:'',role:'admin'})}} className="btn-ghost" style={{ padding:'8px 16px',fontSize:12 }}><X size={12}/> Cancel</button>
              </div>
            </div>
          )}
          <div style={{ background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden' }}>
            {admLoad?<div style={{ padding:24,textAlign:'center',color:T.textMuted }}>Loading admins…</div>:admins.length===0?<div style={{ padding:24,textAlign:'center',color:T.textMuted }}>No admins found.</div>:(
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr><TH>Name / Email</TH><TH>Role</TH><TH>Change Role</TH><TH>Remove</TH></tr></thead>
                <tbody>{admins.map(a=>{
                  const isSelf=a.user_id===user?.id
                  const saCount=admins.filter(x=>x.role==='super_admin').length
                  const canDelete=!isSelf&&!(a.role==='super_admin'&&saCount<=1)
                  return (
                    <tr key={a.id} onMouseEnter={e=>e.currentTarget.style.background=T.tableHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <TD><p style={{ fontSize:12,fontWeight:600,color:T.navy,margin:'0 0 1px',fontFamily:IF }}>{a.name||'—'}</p><p style={{ fontSize:10,color:T.textMuted,margin:0 }}>{a.email}</p></TD>
                      <TD><RolePill r={a.role}/></TD>
                      <TD>
                        <div style={{ display:'flex',gap:6 }}>
                          <select disabled={isSelf} value={rmap[a.user_id]||a.role} onChange={e=>setRmap(p=>({...p,[a.user_id]:e.target.value}))}
                            style={{ padding:'5px 8px',borderRadius:7,border:`1px solid ${T.border}`,background:isSelf?T.surface2:T.surface,fontSize:11,fontFamily:IF,color:T.text,cursor:isSelf?'not-allowed':'pointer' }}>
                            <option value="admin">Admin</option><option value="super_admin">Super Admin</option>
                          </select>
                          <BtnPrimary onClick={()=>saveRole(a)} disabled={isSelf} style={{ padding:'5px 9px',fontSize:10 }}>Save</BtnPrimary>
                        </div>
                      </TD>
                      <TD>
                        {canDelete
                          ?<button onClick={()=>deleteUser(a)} style={{ padding:'5px 8px',borderRadius:7,border:'1px solid #FC8181',background:'#FFF5F5',cursor:'pointer',color:'#C53030',fontSize:11,fontWeight:700 }}>🗑️ Remove</button>
                          :<span style={{ fontSize:10,color:T.textMuted,fontFamily:IF }}>{isSelf?'(You)':saCount<=1?'Last SA — Protected':''}</span>}
                      </TD>
                    </tr>
                  )
                })}</tbody>
              </table>
            )}
          </div>
          <div style={{ padding:'10px 14px',background:'#FEF9E7',borderRadius:10,border:'1px solid #FCD34D',marginTop:14,display:'flex',alignItems:'center',gap:8 }}>
            <AlertCircle size={13} style={{ color:'#D97706',flexShrink:0 }}/>
            <span style={{ fontSize:12,color:'#92400E',fontFamily:IF }}>The last Super Admin account cannot be deleted. At least one Super Admin must exist.</span>
          </div>
        </div>}

        {/* ── 8. SYSTEM SETTINGS (SA) ── */}
        {sec==='system'&&isSA&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>System Settings <span style={{ fontSize:13,background:`${T.gold}20`,color:T.gold,padding:'2px 10px',borderRadius:20,fontWeight:600 }}>Super Admin</span></h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>Branding, appearance personalisation, security policies and navbar visibility.</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:920 }}>

            {/* Branding */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 14px',fontFamily:MF }}>🏛️ Branding</h4>
              <p style={{ fontSize:11,color:T.textMuted,margin:'0 0 12px',lineHeight:1.6,fontFamily:IF }}>Changes here sync instantly to the user-facing portal.</p>
              <FormField label="System Name">
                <input className="input-field" value={sysName} onChange={e=>{setSysName(e.target.value);updateSettings({sysName:e.target.value})}}/>
              </FormField>
              <FormField label="Barangay Name">
                <input className="input-field" defaultValue={siteSettings.barangay} onChange={e=>updateSettings({barangay:e.target.value})}/>
              </FormField>
              <FormField label="Logo Upload">
                <input type="file" accept="image/*" className="input-field" style={{ fontSize:12,padding:'8px 12px' }}
                  onChange={e=>{
                    const file=e.target.files?.[0]; if(!file) return
                    const reader=new FileReader()
                    reader.onload=ev=>{ updateSettings({logoUrl:ev.target.result}); flash('success','Logo updated! Changes are live on the user portal. ✅') }
                    reader.readAsDataURL(file)
                  }}/>
              </FormField>
              {siteSettings.logoUrl&&siteSettings.logoUrl!='/SK_Logo.png'&&(
                <div style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`,marginTop:6 }}>
                  <img src={siteSettings.logoUrl} alt="Current logo" style={{ width:36,height:36,objectFit:'contain',borderRadius:6,border:`1px solid ${T.border}` }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:12,fontWeight:600,color:T.text,margin:0,fontFamily:IF }}>Custom logo active</p>
                    <p style={{ fontSize:10,color:T.textMuted,margin:0,fontFamily:IF }}>Showing on user portal and admin panel</p>
                  </div>
                  <button onClick={()=>{updateSettings({logoUrl:'/SK_Logo.png'});flash('success','Logo reset to default.')}} style={{ padding:'4px 10px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',fontSize:10,color:T.textMuted,fontFamily:IF }}>Reset</button>
                </div>
              )}
            </div>

            {/* Navbar Visibility */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 14px',fontFamily:MF }}>🖥️ Navbar Visibility</h4>
              <p style={{ fontSize:12,color:T.textMuted,margin:'0 0 14px',lineHeight:1.6,fontFamily:IF }}>Toggle the top navigation bar. When hidden, only the sidebar is shown, giving more vertical space for content.</p>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:T.surface2,borderRadius:10,border:`1px solid ${T.border}` }}>
                <div>
                  <p style={{ fontSize:13,fontWeight:600,color:T.text,margin:'0 0 2px',fontFamily:IF }}>Top Navigation Bar</p>
                  <p style={{ fontSize:11,color:T.textMuted,margin:0,fontFamily:IF }}>{navbarVisible?'Visible — shown at top of every page':'Hidden — more vertical space available'}</p>
                </div>
                <Tog on={navbarVisible} onChange={v=>{setNavbarVisible(v);flash('success',v?'Navbar shown.':'Navbar hidden — more content space.')}}/>
              </div>
              <div style={{ marginTop:10,padding:'9px 12px',background:navbarVisible?`${T.gold}10`:'#F0FFF4',borderRadius:8,border:`1px solid ${navbarVisible?T.gold:'#9AE6B4'}`,display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ fontSize:14 }}>{navbarVisible?'📌':'✅'}</span>
                <span style={{ fontSize:11,color:navbarVisible?'#7B4800':'#276749',fontFamily:IF }}>{navbarVisible?'Navbar is currently visible on all admin pages.':'Navbar is hidden. Toggle to restore it.'}</span>
              </div>
            </div>

            {/* Colour Palette Presets */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 6px',fontFamily:MF }}>🎨 Colour Palette</h4>
              <p style={{ fontSize:11,color:T.textMuted,margin:'0 0 12px',fontFamily:IF }}>Choose a preset palette for the admin dashboard.</p>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14 }}>
                {Object.entries(PALETTES).map(([key,pal])=>{
                  const active=palette===key&&!customColors
                  const previewColor=pal.light.navy
                  const previewAccent=pal.light.accent
                  return (
                    <button key={key} onClick={()=>{setPalette(key);saveCustomColors(null);updateSettings({primaryColor:pal.light.navy,primaryLt:pal.light.navyLt||pal.light.navy,accentColor:pal.light.accent});flash('success',`${pal.label} applied and synced! 🎨`)}}
                      style={{ padding:'10px 12px',borderRadius:10,border:`2px solid ${active?previewColor:'#E2E8F0'}`,background:active?`${previewColor}08`:'white',cursor:'pointer',textAlign:'left',transition:'all .18s' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:4 }}>
                        <div style={{ width:14,height:14,borderRadius:'50%',background:previewColor,flexShrink:0 }}/>
                        <div style={{ width:10,height:10,borderRadius:'50%',background:previewAccent,flexShrink:0 }}/>
                        {active&&<CheckCircle size={11} style={{ color:previewColor,marginLeft:'auto' }}/>}
                      </div>
                      <p style={{ fontSize:11,fontWeight:active?700:500,color:active?previewColor:'#4A5568',margin:0,fontFamily:IF }}>{pal.label}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Colours */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 6px',fontFamily:MF }}>🖌️ Custom Colours</h4>
              <p style={{ fontSize:11,color:T.textMuted,margin:'0 0 12px',fontFamily:IF }}>Override the palette with your own brand colours. Leave blank to use the selected preset.</p>
              <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:14 }}>
                {[
                  { label:'Primary Colour',    value:customPrimary,   set:setCustPrimary,   hint:'Main colour (sidebar, buttons)' },
                  { label:'Primary Light',     value:customPrimaryLt, set:setCustPrimaryLt, hint:'Hover & lighter variant' },
                  { label:'Accent / Gold',     value:customAccent,    set:setCustAccent,    hint:'Highlights, badges, borders' },
                ].map(({label,value,set,hint})=>(
                  <div key={label} style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <div>
                      <input type="color" value={value} onChange={e=>set(e.target.value)}
                        style={{ width:38,height:38,padding:2,borderRadius:8,border:'1.5px solid #E2E8F0',cursor:'pointer',flexShrink:0 }}/>
                    </div>
                    <div>
                      <p style={{ fontSize:12,fontWeight:600,color:T.text,margin:'0 0 1px',fontFamily:IF }}>{label}</p>
                      <p style={{ fontSize:10,color:T.textMuted,margin:0,fontFamily:IF }}>{hint} · {value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',gap:8 }}>
                <BtnPrimary onClick={()=>{saveCustomColors({primary:customPrimary,primaryLt:customPrimaryLt,accent:customAccent});updateSettings({primaryColor:customPrimary,primaryLt:customPrimaryLt,accentColor:customAccent});logAudit('Edit','System','Applied custom colour palette');flash('success','Custom colours applied and synced to user portal! 🎨')}}>Apply Custom Colours</BtnPrimary>
                <button onClick={()=>{saveCustomColors(null);setCustPrimary('#1A365D');setCustPrimaryLt('#2A4A7F');setCustAccent('#D69E2E');flash('success','Custom colours cleared.')}} className="btn-ghost" style={{ display:'flex',alignItems:'center',gap:5,padding:'8px 14px',fontSize:12 }}>
                  <RefreshCw size={12}/> Reset
                </button>
              </div>
            </div>

            {/* Password Policy */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 14px',fontFamily:MF }}>🔑 Password Policy</h4>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <FormField label="Min Length"><input type="number" className="input-field" value={policies.minPw} min={6} max={32} onChange={e=>setPolicies(p=>({...p,minPw:parseInt(e.target.value)||8}))}/></FormField>
                <FormField label="Max Attempts"><input type="number" className="input-field" value={policies.maxAttempts} min={3} max={20} onChange={e=>setPolicies(p=>({...p,maxAttempts:parseInt(e.target.value)||5}))}/></FormField>
              </div>
              {[{k:'upperReq',l:'Require uppercase letter'},{k:'numReq',l:'Require at least one number'},{k:'specReq',l:'Require special character'}].map(({k,l})=>(
                <div key={k} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:12,color:T.text,fontFamily:IF }}>{l}</span>
                  <Tog on={policies[k]} onChange={v=>setPolicies(p=>({...p,[k]:v}))}/>
                </div>
              ))}
            </div>

            {/* Session & Auth */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 14px',fontFamily:MF }}>⏱️ Session & Authentication</h4>
              <FormField label="Session Timeout (minutes)"><input type="number" className="input-field" value={policies.sessionTimeout} min={5} max={480} onChange={e=>setPolicies(p=>({...p,sessionTimeout:parseInt(e.target.value)||60}))}/></FormField>
              {[{k:'enforced2FA',l:'Enforce 2FA for all admins'},{k:'otpEnabled',l:'Allow Email OTP login'}].map(({k,l})=>(
                <div key={k} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:12,color:T.text,fontFamily:IF }}>{l}</span>
                  <Tog on={policies[k]} onChange={v=>setPolicies(p=>({...p,[k]:v}))}/>
                </div>
              ))}
            </div>

          </div>
          <div style={{ display:'flex',gap:10,marginTop:8 }}>
            <BtnPrimary disabled={polS} onClick={async()=>{setPolS(true);await new Promise(r=>setTimeout(r,600));await logAudit('Edit','System','Updated system settings');flash('success','System settings saved!');setPolS(false)}}>{polS?<><RefreshCw size={12} style={{ animation:'spin .8s linear infinite' }}/> Saving…</>:<><Save size={12}/> Save All Settings</>}</BtnPrimary>
            <button className="btn-ghost" style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 16px',fontSize:12 }} onClick={()=>{setPolicies({minPw:8,upperReq:true,numReq:true,specReq:false,sessionTimeout:60,enforced2FA:false,otpEnabled:true,maxAttempts:5});setPalette('navy');saveCustomColors(null);setNavbarVisible(true);flash('success','All settings reset to defaults.')}}>Reset All Defaults</button>
          </div>
        </div>}

        {/* ── 12. BACKUP (SA) ── */}
        {sec==='backup'&&isSA&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>Backup & Restore <span style={{ fontSize:13,background:`${T.gold}20`,color:T.gold,padding:'2px 10px',borderRadius:20,fontWeight:600 }}>Super Admin</span></h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>Download, restore and schedule automatic backups of all system data.</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:920 }}>

            {/* Download backup */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 6px',fontFamily:MF }}>💾 Download Backup</h4>
              <p style={{ fontSize:12,color:T.textMuted,margin:'0 0 14px',lineHeight:1.6,fontFamily:IF }}>Export a full JSON backup of all tables: users, events, projects, announcements, feedback and audit logs.</p>
              <BtnPrimary onClick={async()=>{
                try{
                  const[u,e,p,a,f,l]=await Promise.all([supabase.from('user_roles').select('*'),supabase.from('events').select('*'),supabase.from('projects').select('*'),supabase.from('announcements').select('*'),supabase.from('feedback').select('*'),supabase.from('audit_logs').select('*')])
                  const ts=new Date().toISOString()
                  const backup={timestamp:ts,version:'2.0',app:'YouthLink Bakakeng Central',data:{users:u.data,events:e.data,projects:p.data,announcements:a.data,feedback:f.data,audit_logs:l.data}}
                  const b=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})
                  const x=document.createElement('a');x.href=URL.createObjectURL(b);x.download=`backup-${ts.split('T')[0]}.json`;x.click()
                  await logAudit('Export','Backup','Downloaded full system backup')
                  const hist=[{date:ts,label:`Manual backup — ${ts.split('T')[0]}`},...backupHistory].slice(0,10)
                  setBkHistory(hist);localStorage.setItem('backup_history',JSON.stringify(hist))
                  flash('success','Full backup downloaded! 💾')
                }catch(err){flash('error',err.message)}
              }}><Download size={13}/> Download Full Backup</BtnPrimary>

              {/* Backup history */}
              {backupHistory.length>0&&(
                <div style={{ marginTop:16 }}>
                  <p style={{ fontSize:11,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:'.4px',margin:'0 0 8px',fontFamily:IF }}>Recent Backups</p>
                  {backupHistory.map((h,i)=>(
                    <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 10px',background:T.surface2,borderRadius:7,marginBottom:4 }}>
                      <span style={{ fontSize:13 }}>📄</span>
                      <span style={{ fontSize:12,color:T.text,fontFamily:IF,flex:1 }}>{h.label}</span>
                      <span style={{ fontSize:10,color:T.textMuted,fontFamily:IF }}>{new Date(h.date).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auto Backup */}
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 6px',fontFamily:MF }}>⚡ Automatic Backup</h4>
              <p style={{ fontSize:12,color:T.textMuted,margin:'0 0 14px',lineHeight:1.6,fontFamily:IF }}>Schedule automatic backups to run at the end of each day or on any interruption. Files are downloaded to your browser.</p>

              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:T.surface2,borderRadius:10,border:`1px solid ${T.border}`,marginBottom:12 }}>
                <div>
                  <p style={{ fontSize:13,fontWeight:600,color:T.text,margin:'0 0 2px',fontFamily:IF }}>Auto Backup</p>
                  <p style={{ fontSize:11,color:T.textMuted,margin:0,fontFamily:IF }}>{autoBackup?`Enabled — runs ${backupFreq}`:'Disabled'}</p>
                </div>
                <Tog on={autoBackup} onChange={v=>{setAutoBackup(v);localStorage.setItem('auto_backup',v);flash(v?'success':'success',v?'Auto backup enabled!':'Auto backup disabled.')}}/>
              </div>

              {autoBackup&&(
                <div style={{ marginBottom:12 }}>
                  <p style={{ fontSize:11,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:'.4px',margin:'0 0 8px',fontFamily:IF }}>Backup Frequency</p>
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    {[
                      { v:'daily',       l:'🌙 End of every day',      sub:'Backup runs automatically at midnight' },
                      { v:'on_interrupt',l:'⚡ On any interruption',    sub:'Backup triggers on logout, errors or session end' },
                      { v:'both',        l:'🔄 Both (recommended)',     sub:'Daily backup + backup on interruption' },
                    ].map(({v,l,sub})=>(
                      <button key={v} onClick={()=>{setBackupFreq(v);localStorage.setItem('backup_freq',v)}}
                        style={{ padding:'10px 12px',borderRadius:9,border:`1.5px solid ${backupFreq===v?T.navy:'#E2E8F0'}`,background:backupFreq===v?`${T.navy}08`:'white',cursor:'pointer',textAlign:'left',transition:'all .15s' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                          <p style={{ fontSize:12,fontWeight:backupFreq===v?700:500,color:backupFreq===v?T.navy:'#4A5568',margin:0,fontFamily:IF }}>{l}</p>
                          {backupFreq===v&&<CheckCircle size={12} style={{ color:T.navy,marginLeft:'auto' }}/>}
                        </div>
                        <p style={{ fontSize:10,color:'#718096',margin:'2px 0 0',fontFamily:IF }}>{sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {autoBackup&&(
                <div style={{ padding:'9px 12px',background:'#F0FFF4',borderRadius:8,border:'1px solid #9AE6B4',display:'flex',alignItems:'center',gap:8 }}>
                  <CheckCircle size={12} style={{ color:'#38A169',flexShrink:0 }}/>
                  <span style={{ fontSize:11,color:'#276749',fontFamily:IF }}>Auto backup active — {backupFreq==='daily'?'runs at end of day':backupFreq==='on_interrupt'?'triggers on any interruption':'runs daily and on interruptions'}.</span>
                </div>
              )}
            </div>

            {/* Restore from backup */}
            <div style={{ ...c(),gridColumn:'1/-1',background:'#FFFBEB',border:'1px solid #FCD34D' }}>
              <h4 style={{ fontSize:13,fontWeight:700,color:'#92400E',margin:'0 0 6px',fontFamily:MF }}>📂 Restore from Backup File</h4>
              <p style={{ fontSize:12,color:'#92400E',margin:'0 0 14px',lineHeight:1.6,fontFamily:IF }}>Upload a previously downloaded backup JSON file to restore your data. <strong>This will insert missing records but will not overwrite existing ones.</strong></p>

              <input ref={restoreRef} type="file" accept=".json" style={{ display:'none' }} onChange={async e=>{
                const file=e.target.files?.[0]; if(!file) return
                setRestoring(true)
                try{
                  const text=await file.text()
                  const parsed=JSON.parse(text)
                  if(!parsed.data||parsed.version<'1.0') throw new Error('Invalid backup file format.')
                  setRestoreFile({ name:file.name, timestamp:parsed.timestamp, version:parsed.version, tables:Object.keys(parsed.data), rowCounts:Object.fromEntries(Object.entries(parsed.data).map(([k,v])=>[k,v?.length||0])) })
                  flash('success',`Backup file loaded: ${file.name} (${parsed.timestamp?.split('T')[0]}). Review details below and confirm to restore.`)
                }catch(err){ flash('error',`Failed to read backup: ${err.message}`) }
                finally{ setRestoring(false) }
              }}/>

              {!restoreFile?(
                <div style={{ display:'flex',gap:10,alignItems:'center' }}>
                  <BtnPrimary onClick={()=>restoreRef.current?.click()} disabled={restoring} style={{ background:'#D97706' }}>
                    {restoring?<><RefreshCw size={12} style={{ animation:'spin .8s linear infinite' }}/> Reading…</>:<>📂 Choose Backup File</>}
                  </BtnPrimary>
                  <span style={{ fontSize:11,color:'#92400E',fontFamily:IF }}>Accepts .json backup files only</span>
                </div>
              ):(
                <div>
                  {/* File summary */}
                  <div style={{ padding:'12px 14px',background:'white',borderRadius:10,border:'1px solid #FCD34D',marginBottom:12 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                      <span style={{ fontSize:20 }}>📄</span>
                      <div>
                        <p style={{ fontSize:13,fontWeight:700,color:'#92400E',margin:0,fontFamily:MF }}>{restoreFile.name}</p>
                        <p style={{ fontSize:11,color:'#718096',margin:0,fontFamily:IF }}>Backup date: {restoreFile.timestamp?.split('T')[0]} · Version {restoreFile.version}</p>
                      </div>
                      <button onClick={()=>setRestoreFile(null)} style={{ marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#718096',padding:4,display:'flex' }}><X size={14}/></button>
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6 }}>
                      {restoreFile.tables.map(t=>(
                        <div key={t} style={{ padding:'6px 10px',background:'#FFFBEB',borderRadius:7,border:'1px solid #FCD34D',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                          <span style={{ fontSize:11,color:'#92400E',fontFamily:IF,fontWeight:600,textTransform:'capitalize' }}>{t.replace('_',' ')}</span>
                          <span style={{ fontSize:11,color:'#D97706',fontFamily:IF,fontWeight:700 }}>{restoreFile.rowCounts[t]} rows</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Confirm restore */}
                  <div style={{ padding:'12px 14px',background:'#FFF5F5',borderRadius:10,border:'1px solid #FC8181',marginBottom:12,display:'flex',alignItems:'center',gap:10 }}>
                    <AlertCircle size={15} style={{ color:'#C53030',flexShrink:0 }}/>
                    <p style={{ fontSize:12,color:'#C53030',margin:0,fontFamily:IF }}>⚠️ Restoring will attempt to upsert data from the backup. Existing records with matching IDs may be updated. This cannot be undone.</p>
                  </div>

                  <div style={{ display:'flex',gap:10 }}>
                    <button onClick={()=>setRestoreFile(null)} className="btn-ghost" style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',fontSize:12 }}><X size={12}/> Cancel</button>
                    <BtnPrimary onClick={async()=>{
                      setRestoring(true)
                      try{
                        const text=await (await fetch(URL.createObjectURL(new Blob([JSON.stringify({data:restoreFile})])))).json().catch(()=>null)
                        // Re-read from file input
                        const fileInput=restoreRef.current
                        const file=fileInput?.files?.[0]
                        if(!file) throw new Error('No file selected.')
                        const rawText=await file.text()
                        const parsed=JSON.parse(rawText)
                        const d=parsed.data
                        let restored=0
                        if(d.announcements?.length){ const{error}=await supabase.from('announcements').upsert(d.announcements,{onConflict:'id',ignoreDuplicates:false}); if(!error)restored+=d.announcements.length }
                        if(d.events?.length){ const{error}=await supabase.from('events').upsert(d.events,{onConflict:'id',ignoreDuplicates:false}); if(!error)restored+=d.events.length }
                        if(d.projects?.length){ const{error}=await supabase.from('projects').upsert(d.projects,{onConflict:'id',ignoreDuplicates:false}); if(!error)restored+=d.projects.length }
                        if(d.feedback?.length){ const{error}=await supabase.from('feedback').upsert(d.feedback,{onConflict:'id',ignoreDuplicates:false}); if(!error)restored+=d.feedback.length }
                        await logAudit('Restore','Backup',`Restored backup: ${restoreFile.name} (${restored} records)`)
                        flash('success',`Restore complete! ${restored} records restored successfully. ✅`)
                        setRestoreFile(null)
                      }catch(err){ flash('error',`Restore failed: ${err.message}`) }
                      finally{ setRestoring(false) }
                    }} disabled={restoring} style={{ background:'#D97706' }}>
                      {restoring?<><RefreshCw size={12} style={{ animation:'spin .8s linear infinite' }}/> Restoring…</>:<>✅ Confirm Restore</>}
                    </BtnPrimary>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>}

        {sec==='maintenance'&&isSA&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>Maintenance Mode <span style={{ fontSize:13,background:`${T.gold}20`,color:T.gold,padding:'2px 10px',borderRadius:20,fontWeight:600 }}>Super Admin</span></h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>Enable maintenance mode to restrict user access during system updates.</p>
          <div style={{ maxWidth:560 }}>
            <div style={{ ...c(),background:mainMode?'#FFF5F5':'#F7FAFC',border:`1px solid ${mainMode?'#FC8181':T.border}` }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
                <div>
                  <h4 style={{ fontSize:14,fontWeight:700,color:mainMode?CR:T.text,margin:'0 0 3px',fontFamily:MF }}>🚧 Maintenance Mode {mainMode?'— ACTIVE':'— Disabled'}</h4>
                  <p style={{ fontSize:12,color:T.textMuted,margin:0,fontFamily:IF }}>When ON, regular users cannot log in or access the portal.</p>
                </div>
                <button onClick={()=>{setMainMode(m=>!m);logAudit(mainMode?'Disable':'Enable','Maintenance',`Maintenance mode ${mainMode?'disabled':'enabled'}`);flash(mainMode?'success':'error',mainMode?'Maintenance mode disabled. Portal is accessible.':'⚠️ MAINTENANCE MODE ENABLED — users cannot access the portal.')}}
                  style={{ width:56,height:30,borderRadius:15,border:'none',cursor:'pointer',background:mainMode?CR:'#CBD5E0',position:'relative',transition:'background .2s',flexShrink:0 }}>
                  <span style={{ display:'block',width:24,height:24,borderRadius:'50%',background:'white',position:'absolute',top:3,left:mainMode?29:3,transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.2)' }}/>
                </button>
              </div>
              {mainMode&&<div style={{ padding:'10px 14px',background:'#FEE2E2',borderRadius:9,border:'1px solid #FC8181',display:'flex',alignItems:'center',gap:8 }}>
                <AlertCircle size={15} style={{ color:CR,flexShrink:0 }}/><p style={{ fontSize:13,color:CR,fontWeight:700,margin:0,fontFamily:IF }}>⚠️ PORTAL IS OFFLINE — only Super Admins can log in during maintenance.</p>
              </div>}
            </div>
          </div>
        </div>}


        {/* ── ADMIN: ROLE & PERMISSIONS (view-only) ── */}
        {sec==='role'&&!isSA&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>Role & Permissions</h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>Your assigned role and what you can do in this system. Read-only.</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:820 }}>
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 14px',fontFamily:MF }}>Your Role</h4>
              <div style={{ padding:'20px',background:`${T.navy}08`,borderRadius:12,border:`1px solid ${T.navy}30`,textAlign:'center',marginBottom:14 }}>
                <p style={{ fontSize:32,margin:'0 0 8px' }}>🛠️</p>
                <p style={{ fontSize:18,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>Administrator</p>
                <p style={{ fontSize:12,color:T.textMuted,margin:0,fontFamily:IF }}>Manages portal content and resident accounts</p>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:12,padding:'9px 12px',background:T.surface2,borderRadius:8 }}>
                <span style={{ fontSize:11,color:T.textMuted,fontWeight:700,textTransform:'uppercase',width:70,fontFamily:IF }}>Email</span>
                <span style={{ fontSize:13,color:T.text,fontFamily:IF }}>{user?.email}</span>
              </div>
            </div>
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 14px',fontFamily:MF }}>Permissions</h4>
              {[
                ['Manage Announcements', true],
                ['Manage Events',        true],
                ['Manage Projects',      true],
                ['View Feedback',        true],
                ['View Audit Logs',      true],
                ['Manage Users',         true, 'view-only'],
                ['Assign Roles',         false],
                ['Delete User Accounts', false],
                ['System Settings',      false],
                ['Database Access',      false],
              ].map(([label,allowed,note])=>(
                <div key={label} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <span style={{ fontSize:12,color:T.text,fontFamily:IF }}>{label}</span>
                    {note&&<span style={{ fontSize:9,background:`${T.gold}20`,color:T.gold,padding:'1px 6px',borderRadius:10,fontWeight:700 }}>{note}</span>}
                  </div>
                  <span style={{ fontSize:11,fontWeight:700,color:allowed?'#276749':'#A0AEC0' }}>{allowed?'✓ Allowed':'✗ No Access'}</span>
                </div>
              ))}
            </div>
            <div style={{ ...c(),gridColumn:'1/-1',background:'#EBF8FF',border:`1px solid ${T.navy}30` }}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <span style={{ fontSize:18 }}>ℹ️</span>
                <div>
                  <p style={{ fontSize:13,fontWeight:700,color:T.navy,margin:'0 0 2px',fontFamily:MF }}>Admin Role Restrictions</p>
                  <p style={{ fontSize:12,color:T.textMuted,margin:0,fontFamily:IF }}>Admins cannot promote users to Super Admin, delete accounts, or modify system settings. Contact your Super Admin for elevated access.</p>
                </div>
              </div>
            </div>
          </div>
        </div>}

        {/* ── ADMIN: ACCOUNT STATUS ── */}
        {sec==='acctStatus'&&!isSA&&<div>
          <h2 style={{ fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px',fontFamily:MF }}>Account Status</h2>
          <p style={{ fontSize:13,color:T.textMuted,margin:'0 0 18px',fontFamily:IF }}>Admin account restrictions and deactivation policy.</p>
          <div style={{ maxWidth:640 }}>
            <div style={{ ...c(),background:'#FFF5F5',border:'1px solid #FC8181',marginBottom:16 }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
                <div style={{ width:42,height:42,borderRadius:10,background:'#FEE2E2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <AlertCircle size={20} style={{ color:CR }}/>
                </div>
                <div>
                  <p style={{ fontSize:14,fontWeight:700,color:CR,margin:'0 0 6px',fontFamily:MF }}>❌ Account Deletion Not Available</p>
                  <p style={{ fontSize:12,color:CR,margin:'0 0 10px',lineHeight:1.7,fontFamily:IF }}>Admin accounts <strong>cannot be deleted by the admin themselves</strong>. This prevents accidental loss of admin access and maintains system security.</p>
                  <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                    {[
                      '✅ You can request deactivation via Super Admin',
                      '✅ Super Admin can permanently delete admin accounts',
                      '❌ Admins cannot delete their own account',
                      '❌ Admins cannot promote themselves to Super Admin',
                    ].map((item,i)=>(
                      <p key={i} style={{ fontSize:12,color:CR,margin:0,fontFamily:IF }}>{item}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 6px',fontFamily:MF }}>📨 Request Deactivation from Super Admin</h4>
              <p style={{ fontSize:12,color:T.textMuted,margin:'0 0 14px',lineHeight:1.6,fontFamily:IF }}>If you need your account temporarily deactivated, submit a request to the Super Admin. Your account remains active until they approve it.</p>
              <BtnPrimary onClick={async()=>{
                await supabase.from('profiles').update({deactivation_requested:true}).eq('user_id',user?.id)
                await logAudit('Request','Account','Admin requested deactivation')
                flash('success','Deactivation request submitted. The Super Admin will review your request.')
              }} style={{ background:'#D97706' }}>
                📨 Submit Deactivation Request
              </BtnPrimary>
            </div>
            <div style={c()}>
              <h4 style={{ fontSize:13,fontWeight:700,color:T.text,margin:'0 0 6px',fontFamily:MF }}>Current Account Status</h4>
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {[
                  ['Account', 'Active ✓', '#276749'],
                  ['Role', 'Administrator', T.navy],
                  ['Email', user?.email||'—', T.text],
                  ['2FA', mfa?'Enabled ✓':'Not Enabled', mfa?'#276749':'#92400E'],
                ].map(([k,v,col])=>(
                  <div key={k} style={{ display:'flex',alignItems:'center',gap:12,padding:'9px 12px',background:T.surface2,borderRadius:8 }}>
                    <span style={{ fontSize:11,color:T.textMuted,fontWeight:700,textTransform:'uppercase',width:70,flexShrink:0,fontFamily:IF }}>{k}</span>
                    <span style={{ fontSize:13,color:col,fontWeight:k==='Account'||k==='2FA'?700:400,fontFamily:IF }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>}

      </div>
    </div>
  )
}



/* ═══════════════════════════════
   ANNOUNCEMENTS PAGE
═══════════════════════════════ */
const ANN_EMPTY = { title:'', content:'', location:'', date_time:'', type:'General', status:'upcoming' }

export function AnnouncementsPage() {
  const { T } = useAdminTheme()
  const { user, role, logAudit } = useAuth()
  const { toast } = useToast()
  const isSuperAdmin = role === 'super_admin'

  const [anns,     setAnns]    = useState([])
  const [loading,  setLoading] = useState(false)
  const [modal,    setModal]   = useState(false)
  const [editItem, setEdit]    = useState(null)
  const [form,     setForm]    = useState(ANN_EMPTY)
  const [delItem,  setDel]     = useState(null)
  const [delLoad,  setDL]      = useState(false)
  const [saving,   setSaving]  = useState(false)
  const [viewItem, setView]    = useState(null)
  const [search,   setSearch]  = useState('')
  const [statusFilt, setStatusFilt] = useState('all')
  const [typeFilt,   setTypeFilt]   = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const safeFormat = (val, fmt) => {
    try { const d = new Date(val); return isNaN(d.getTime()) ? '' : format(d, fmt) } catch { return '' }
  }

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending:false })
      if (data) setAnns(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEdit(null); setForm(ANN_EMPTY); setModal(true) }
  const openEdit = a => {
    setEdit(a)
    setForm({ title:a.title, content:a.content, location:a.location||'', date_time:a.date_time||'', type:a.type||'General', status:a.status||'upcoming' })
    setModal(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast('Title and Content are required.', 'error'); return }
    if (!user?.id) { toast('Session expired. Please refresh the page.', 'error'); return }
    setSaving(true)
    try {
      const payload = { title:form.title, content:form.content, location:form.location||null, date_time:form.date_time||null, type:form.type, status:form.status, user_id:user.id }
      const { error } = editItem
        ? await supabase.from('announcements').update(payload).eq('id', editItem.id)
        : await supabase.from('announcements').insert({ ...payload, created_at:new Date().toISOString() })
      if (error) throw error
      await logAudit(editItem ? 'Edit' : 'Create', 'Announcements', `${editItem ? 'Edited' : 'Created'}: ${form.title}`)
      toast(`Announcement ${editItem ? 'updated' : 'created'}!`, 'success')
      setModal(false); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async () => {
    setDL(true)
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', delItem.id)
      if (error) throw error
      await logAudit('Delete', 'Announcements', `Deleted: ${delItem.title}`)
      toast('Announcement deleted.', 'success'); setDel(null); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setDL(false) }
  }

  const statusBadge = (s) => {
    const map = {
      upcoming:  { bg:'#DBEAFE', color:'#1D4ED8', border:'#BFDBFE', dot:'#3B82F6' },
      ongoing:   { bg:'#DCFCE7', color:'#166534', border:'#A7F3D0', dot:'#22C55E' },
      cancelled: { bg:'#FEE2E2', color:'#DC2626', border:'#FECACA', dot:'#EF4444' },
      finished:  { bg:'#F3F4F6', color:'#6B7280', border:'#E5E7EB', dot:'#9CA3AF' },
    }
    const st = map[(s||'').toLowerCase()] || { bg:'#F3F4F6', color:'#6B7280', border:'#E5E7EB', dot:'#9CA3AF' }
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:st.dot, flexShrink:0 }}/>
        {s}
      </span>
    )
  }

  const typeBadge = (t) => {
    const map = {
      General:              { bg:`${T.navy}12`,   color:T.navy,      border:`${T.navy}30`,   icon:'📢' },
      Event:                { bg:'#F0FFF4',        color:'#276749',   border:'#A7F3D0',       icon:'📅' },
      Emergency:            { bg:'#FEE2E2',        color:'#DC2626',   border:'#FECACA',       icon:'🚨' },
      Notice:               { bg:'#FEF9E7',        color:'#7B4800',   border:'#FDE68A',       icon:'📋' },
      'Training & Workshop':{ bg:'#EDE9FE',        color:'#5B21B6',   border:'#C4B5FD',       icon:'🎓' },
      Sports:               { bg:'#D1FAE5',        color:'#065F46',   border:'#6EE7B7',       icon:'⚽' },
      Assembly:             { bg:'#DBEAFE',        color:'#1D4ED8',   border:'#BFDBFE',       icon:'🏛️' },
    }
    const st = map[t] || { bg:'#F3F4F6', color:T.textMuted, border:'#E5E7EB', icon:'🔔' }
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
        <span style={{ fontSize:9 }}>{st.icon}</span>
        {t}
      </span>
    )
  }

  const filtered = anns.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      a.title?.toLowerCase().includes(q) ||
      a.content?.toLowerCase().includes(q) ||
      a.type?.toLowerCase().includes(q) ||
      a.status?.toLowerCase().includes(q)
    const matchStatus = statusFilt === 'all' || (a.status||'').toLowerCase() === statusFilt.toLowerCase()
    const matchType   = typeFilt   === 'all' || (a.type||'').toLowerCase()   === typeFilt.toLowerCase()
    return matchSearch && matchStatus && matchType
  })

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, color:T.navy, marginBottom:4, fontFamily:MF }}>Announcements</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:20, fontFamily:IF }}>
        {isSuperAdmin ? 'Create, edit and manage all barangay announcements.' : 'View all barangay announcements.'}
      </p>

      {/* ── Toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 260px', maxWidth:360 }}>
          <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:T.textMuted }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, type, status…"
            className="input-field" style={{ paddingLeft:32, fontSize:12, width:'100%', boxSizing:'border-box' }}/>
          {search && (
            <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.textMuted, display:'flex', padding:0 }}>
              <X size={13}/>
            </button>
          )}
        </div>
        {/* Status filter dropdown */}
        <div style={{ position:'relative' }}>
          <select
            value={statusFilt}
            onChange={e => setStatusFilt(e.target.value)}
            style={{
              appearance:'none', WebkitAppearance:'none',
              padding:'7px 32px 7px 12px',
              borderRadius:8,
              border:`1.5px solid ${statusFilt !== 'all' ? (() => {
                const cols = { upcoming:'#1D4ED8', ongoing:'#166534', finished:'#6B7280', cancelled:'#DC2626' }
                return cols[statusFilt] || T.border
              })() : T.border}`,
              background: statusFilt !== 'all' ? (() => {
                const bgs = { upcoming:'#DBEAFE', ongoing:'#DCFCE7', finished:'#F3F4F6', cancelled:'#FEE2E2' }
                return bgs[statusFilt] || T.surface
              })() : T.surface,
              color: statusFilt !== 'all' ? (() => {
                const cols = { upcoming:'#1D4ED8', ongoing:'#166534', finished:'#6B7280', cancelled:'#DC2626' }
                return cols[statusFilt] || T.text
              })() : T.text,
              fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:IF,
              minWidth:130
            }}>
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="finished">Finished</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', fontSize:10,
            color: statusFilt !== 'all' ? (() => {
              const cols = { upcoming:'#1D4ED8', ongoing:'#166534', finished:'#6B7280', cancelled:'#DC2626' }
              return cols[statusFilt] || T.textMuted
            })() : T.textMuted
          }}>▼</span>
        </div>

        {/* Type filter dropdown */}
        <div style={{ position:'relative' }}>
          <select
            value={typeFilt}
            onChange={e => setTypeFilt(e.target.value)}
            style={{
              appearance:'none', WebkitAppearance:'none',
              padding:'7px 32px 7px 12px',
              borderRadius:8,
              border:`1.5px solid ${typeFilt !== 'all' ? (() => {
                const cols = { General:T.navy, Event:'#276749', Emergency:'#DC2626', Notice:'#7B4800', 'Training & Workshop':'#5B21B6', Sports:'#065F46', Assembly:'#1D4ED8' }
                return cols[typeFilt] || T.border
              })() : T.border}`,
              background: typeFilt !== 'all' ? (() => {
                const bgs = { General:`${T.navy}15`, Event:'#F0FFF4', Emergency:'#FEE2E2', Notice:'#FEF9E7', 'Training & Workshop':'#EDE9FE', Sports:'#D1FAE5', Assembly:'#DBEAFE' }
                return bgs[typeFilt] || T.surface
              })() : T.surface,
              color: typeFilt !== 'all' ? (() => {
                const cols = { General:T.navy, Event:'#276749', Emergency:'#DC2626', Notice:'#7B4800', 'Training & Workshop':'#5B21B6', Sports:'#065F46', Assembly:'#1D4ED8' }
                return cols[typeFilt] || T.text
              })() : T.text,
              fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:IF,
              minWidth:130
            }}>
            <option value="all">All Types</option>
            <option value="General">General</option>
            <option value="Event">Event</option>
            <option value="Emergency">Emergency</option>
            <option value="Notice">Notice</option>
            <option value="Training & Workshop">Training &amp; Workshop</option>
            <option value="Sports">Sports</option>
            <option value="Assembly">Assembly</option>
          </select>
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', fontSize:10,
            color: typeFilt !== 'all' ? (() => {
              const cols = { General:T.navy, Event:'#276749', Emergency:'#DC2626', Notice:'#7B4800', 'Training & Workshop':'#5B21B6', Sports:'#065F46', Assembly:'#1D4ED8' }
              return cols[typeFilt] || T.textMuted
            })() : T.textMuted
          }}>▼</span>
        </div>
        {/* Refresh button */}
        <button onClick={handleRefresh} title="Refresh"
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8,
            border:`1px solid ${T.border}`, background:T.surface, cursor:'pointer',
            fontSize:12, fontWeight:600, color:T.text, fontFamily:IF, transition:'all .15s',
            boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
          onMouseEnter={e => { e.currentTarget.style.background=T.tableHover; e.currentTarget.style.borderColor=T.navy }}
          onMouseLeave={e => { e.currentTarget.style.background=T.surface; e.currentTarget.style.borderColor=T.border }}>
          <RefreshCw size={13} style={{ transition:'transform .4s',
            animation: refreshing ? 'spin .6s linear infinite' : 'none' }}/>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <div style={{ marginLeft:'auto' }}>
          <BtnPrimary onClick={openAdd}><Plus size={14}/> Add Announcement</BtnPrimary>
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ background:T.surface, borderRadius:14, border:`1px solid ${T.border}`, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.04)' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:T.textMuted, fontFamily:IF }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📢" title={search ? 'No results found' : 'No announcements yet'}
            subtitle={search ? 'Try a different search term.' : "Click 'Add Announcement' to create your first one."}
            action={!search && <BtnPrimary onClick={openAdd}><Plus size={13}/> Add Announcement</BtnPrimary>}/>
        ) : (
          filtered.map((a, idx) => (
            <div key={a.id}
              onClick={() => setView(a)}
              style={{ padding:'18px 22px', borderBottom: idx < filtered.length-1 ? `1px solid ${T.border}` : 'none', display:'flex', gap:14, alignItems:'flex-start', transition:'background .12s', cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {/* Icon */}
              <div style={{ width:40, height:40, borderRadius:10, background:`${T.navy}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Bell size={18} style={{ color:T.navy }}/>
              </div>

              {/* Body */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                  <span style={{ fontWeight:700, fontSize:14, color:T.text, fontFamily:MF }}>{a.title}</span>
                  {statusBadge(a.status)}
                  {typeBadge(a.type)}
                </div>
                {a.date_time && (
                  <p style={{ fontSize:12, color:T.textMuted, marginBottom:2, display:'flex', alignItems:'center', gap:5, fontFamily:IF }}>
                    📅 {safeFormat(a.date_time, "MMMM do, yyyy 'at' h:mm a")}
                  </p>
                )}
                {a.location && (
                  <p style={{ fontSize:12, color:T.textMuted, marginBottom:6, display:'flex', alignItems:'center', gap:5, fontFamily:IF }}>
                    📍 {a.location}
                  </p>
                )}
                <p style={{ fontSize:13, color:T.text, lineHeight:1.7, fontFamily:IF }}>{a.content}</p>
                <p style={{ fontSize:11, color:T.textMuted, marginTop:8, fontFamily:IF }}>
                  Posted {a.created_at ? safeFormat(a.created_at, "MMMM do, yyyy 'at' h:mm a") : ''}
                </p>
              </div>


            </div>
          ))
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Announcement' : 'Add New Announcement'}
        footer={
          <><button onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</BtnPrimary></>
        }>
        <FormField label="Title" required>
          <input className="input-field" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Enter the announcement title"/>
        </FormField>
        <FormField label="Content" required>
          <textarea className="input-field" rows={4} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Enter the announcement details" style={{ resize:'vertical' }}/>
        </FormField>
        <FormField label="Location (Optional)">
          <input className="input-field" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g., Barangay Hall"/>
        </FormField>
        <FormField label="Date & Time (Optional)">
          <input type="datetime-local" className="input-field" value={form.date_time} onChange={e=>setForm(f=>({...f,date_time:e.target.value}))}/>
        </FormField>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label="Type">
            <select className="input-field" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              {['General','Event','Emergency','Notice','Training & Workshop','Sports','Assembly'].map(t => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className="input-field" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              {['upcoming','ongoing','cancelled','finished'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </FormField>
        </div>
      </Modal>

      {/* ── View Modal ── */}
      <Modal open={!!viewItem} onClose={() => setView(null)} title="Announcement Details"
        footer={
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
            {/* Left: Delete (danger) */}
            {isSuperAdmin
              ? <button onClick={() => { setDel(viewItem); setView(null) }}
                  style={{ padding:'8px 18px', borderRadius:7, background:'#FFF5F5', color:'#C53030', border:'1px solid #FC8181', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:IF, display:'flex', alignItems:'center', gap:6, transition:'all .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#FEE2E2'}
                  onMouseLeave={e=>e.currentTarget.style.background='#FFF5F5'}>
                  🗑️ Delete
                </button>
              : <span/>
            }
            {/* Right: Edit + Close */}
            <div style={{ display:'flex', gap:8 }}>
              {isSuperAdmin && (
                <button onClick={() => { openEdit(viewItem); setView(null) }}
                  style={{ padding:'8px 18px', borderRadius:7, background:T.navy, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:IF }}>
                  ✏️ Edit
                </button>
              )}
              <button onClick={() => setView(null)} className="btn-ghost">Close</button>
            </div>
          </div>
        }>
        {viewItem && (
          <div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              {statusBadge(viewItem.status)}
              {typeBadge(viewItem.type)}
            </div>
            <h3 style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:10, fontFamily:MF }}>{viewItem.title}</h3>
            {viewItem.date_time && <p style={{ fontSize:13, color:T.textMuted, marginBottom:4, fontFamily:IF }}>📅 {safeFormat(viewItem.date_time, "MMMM do, yyyy 'at' h:mm a")}</p>}
            {viewItem.location  && <p style={{ fontSize:13, color:T.textMuted, marginBottom:10, fontFamily:IF }}>📍 {viewItem.location}</p>}
            <p style={{ fontSize:14, color:T.text, lineHeight:1.7, whiteSpace:'pre-wrap', fontFamily:IF }}>{viewItem.content}</p>
            <p style={{ fontSize:11, color:T.textMuted, marginTop:14, fontFamily:IF }}>Posted {viewItem.created_at ? safeFormat(viewItem.created_at, "MMMM do, yyyy 'at' h:mm a") : ''}</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delItem} onClose={() => setDel(null)} onConfirm={del} loading={delLoad} danger
        title="Delete Announcement" message={`Delete "${delItem?.title}"? This cannot be undone.`}/>
    </div>
  )
}
