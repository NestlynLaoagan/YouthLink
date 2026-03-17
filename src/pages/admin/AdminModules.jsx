import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Download, MoreHorizontal, Send, Search, RefreshCw, Eye, EyeOff, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useAdminTheme } from '../../contexts/AdminThemeContext'
import { Modal, FormField, ConfirmDialog, EmptyState, ReadOnlyBanner } from '../../components/UI'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const MF = "'Montserrat','Inter',sans-serif"
const IF = "'Inter',sans-serif"

/* ── Shared styled components ── */
function BtnPrimary({ children, onClick, disabled, style = {} }) {
  const { T } = useAdminTheme()
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
              <button key={i} onClick={() => { item.onClick(); setOpen(false) }}
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
const PROJ_EMPTY = { project_name:'', description:'', status:'planning', budget:'', start_date:'', end_date:'', images:[] }

export function ProjectsPage() {
  const { T } = useAdminTheme()
  const { logAudit, role } = useAuth()
  const { toast }    = useToast()
  const isSuperAdmin = role === 'super_admin'
  const [upcoming,   setUpcoming] = useState([])
  const [done,       setDone]     = useState([])
  const [modal,      setModal]    = useState(false)
  const [edit,       setEdit]     = useState(null)
  const [form,       setForm]     = useState(PROJ_EMPTY)
  const [newImages,  setNewImages]= useState([])
  const [saving,     setSaving]   = useState(false)
  const [delItem,    setDel]      = useState(null)
  const [delLoad,    setDL]       = useState(false)
  const [complItem,  setComp]     = useState(null)
  const [compLoad,   setCL]       = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending:false })
    if (data) {
      setUpcoming(data.filter(p => p.status !== 'completed'))
      setDone(data.filter(p => p.status === 'completed'))
    }
  }

  const openAdd  = () => { setEdit(null); setForm(PROJ_EMPTY); setNewImages([]); setModal(true) }
  const openEdit = p => {
    setEdit(p)
    setForm({ project_name:p.project_name, description:p.description||'', status:p.status, budget:p.budget||'', start_date:p.start_date||'', end_date:p.end_date||'', images:p.images||[] })
    setNewImages([]); setModal(true)
  }

  const save = async () => {
    if (!form.project_name.trim()) { toast('Project name is required.', 'error'); return }
    setSaving(true)
    try {
      let imgUrls = [...(form.images||[])]
      for (const img of newImages.slice(0, Math.max(0, 4 - imgUrls.length))) {
        const ext  = img.name.split('.').pop()
        const path = `projects/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('project-images').upload(path, img, { upsert:true })
        if (!upErr) {
          const { data } = supabase.storage.from('project-images').getPublicUrl(path)
          imgUrls.push(data.publicUrl)
        }
      }
      const payload = { project_name:form.project_name, description:form.description, status:form.status, budget:parseFloat(form.budget)||null, start_date:form.start_date||null, end_date:form.end_date||null, images:imgUrls.slice(0,4) }
      const { error } = edit
        ? await supabase.from('projects').update(payload).eq('id', edit.id)
        : await supabase.from('projects').insert({ ...payload, created_at:new Date().toISOString() })
      if (error) throw error
      await logAudit(edit?'Edit':'Create', 'Projects', `${edit?'Edited':'Created'}: ${form.project_name}`)
      toast(`Project ${edit?'updated':'created'}!`, 'success')
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
    setCL(true)
    try {
      await supabase.from('projects').update({ status:'completed', completion_date:new Date().toISOString() }).eq('id', complItem.id)
      await logAudit('Complete', 'Projects', `Marked complete: ${complItem.project_name}`)
      toast(`"${complItem.project_name}" marked as completed!`, 'success'); setComp(null); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setCL(false) }
  }

  const downloadReport = async (p) => {
    const lines = [
      'PROJECT COMPLETION REPORT', '='.repeat(52), '',
      `Project Name:     ${p.project_name}`,
      `Description:      ${p.description||'N/A'}`,
      `Budget:           ₱${p.budget?.toLocaleString()||'N/A'}`,
      `Start Date:       ${p.start_date ? format(new Date(p.start_date),'MMMM dd, yyyy') : 'N/A'}`,
      `End Date:         ${p.end_date   ? format(new Date(p.end_date),  'MMMM dd, yyyy') : 'N/A'}`,
      `Completion Date:  ${p.completion_date ? format(new Date(p.completion_date),'MMMM dd, yyyy') : 'N/A'}`,
      `Status:           Completed`, '',
      `Images: ${(p.images||[]).join('\n         ')||'None'}`, '',
      '─'.repeat(52),
      'Generated by BarangayConnect — Barangay Bakakeng Central SK',
      format(new Date(), 'MMMM dd, yyyy hh:mm a'),
    ]
    const a = document.createElement('a')
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(lines.join('\n'))
    a.download = `${p.project_name.replace(/\s+/g,'-')}-report.txt`
    a.click()
    await logAudit('Export', 'Projects', `Downloaded report: ${p.project_name}`)
    toast('Report downloaded.', 'success')
  }

  const sBadge = s => {
    const m = { planning:{bg:'#EBF8FF',color:'#1A365D'}, ongoing:{bg:'#F0FFF4',color:'#276749'}, 'on hold':{bg:'#FEF9E7',color:'#7B4800'}, completed:{bg:'#F7FAFC',color:'#718096'} }
    const st = m[(s||'').toLowerCase()] || { bg:'#F7FAFC', color:'#718096' }
    return <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:st.bg, color:st.color, textTransform:'capitalize', fontFamily:IF }}>{s}</span>
  }

  const card = { background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, marginBottom:20, overflow:'visible' }

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:700, color:T.navy, marginBottom:4, fontFamily:MF }}>Project Management</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, fontFamily:IF }}>Oversee all community projects, both upcoming and accomplished.</p>

      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:T.text, fontFamily:MF }}>Upcoming Projects</h2>
          <BtnPrimary onClick={openAdd}><Plus size={14}/> Add Project</BtnPrimary>
        </div>
        {upcoming.length === 0
          ? <EmptyState icon="📁" title="No upcoming projects" subtitle="Click Add Project to get started."/>
          : <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><TH>Project Name</TH><TH>End Date</TH><TH>Status</TH><TH>Budget</TH><TH>Actions</TH></tr></thead>
              <tbody>
                {upcoming.map(p => (
                  <tr key={p.id} style={{ transition:'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <TD style={{ fontWeight:600 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width:34, height:26, objectFit:'cover', borderRadius:5, flexShrink:0 }}/>}
                        {p.project_name}
                      </div>
                    </TD>
                    <TD>{p.end_date ? format(new Date(p.end_date),'MMM dd, yyyy') : '—'}</TD>
                    <TD>{sBadge(p.status)}</TD>
                    <TD>{p.budget ? `₱${parseFloat(p.budget).toLocaleString()}` : '—'}</TD>
                    <TD>
                      <ThreeDotMenu items={[
                        { label:'Edit Project',      icon:'✏️', onClick:() => openEdit(p) },
                        { label:'Mark as Completed', icon:'✅', onClick:() => setComp(p) },
                        'divider',
                        { label:'Delete Project',    icon:'🗑️', onClick:() => setDel(p), danger:true },
                      ]}/>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      <div style={card}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:T.text, fontFamily:MF }}>Accomplished Projects</h2>
        </div>
        {done.length === 0
          ? <EmptyState icon="✅" title="No completed projects yet" subtitle="Mark a project as done to see it here."/>
          : <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><TH>Project Name</TH><TH>Date Completed</TH><TH>Budget</TH><TH>Report</TH></tr></thead>
              <tbody>
                {done.map(p => (
                  <tr key={p.id}
                    onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <TD style={{ fontWeight:600 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width:34, height:26, objectFit:'cover', borderRadius:5 }}/>}
                        {p.project_name}
                      </div>
                    </TD>
                    <TD>{p.completion_date ? format(new Date(p.completion_date),'MMM dd, yyyy') : '—'}</TD>
                    <TD>{p.budget ? `₱${parseFloat(p.budget).toLocaleString()}` : '—'}</TD>
                    <TD><BtnPrimary onClick={() => downloadReport(p)} style={{ padding:'6px 14px', fontSize:12 }}><Download size={13}/> Download</BtnPrimary></TD>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Project' : 'Add New Project'} size="md"
        footer={<><button onClick={() => setModal(false)} className="btn-ghost">Cancel</button><BtnPrimary onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</BtnPrimary></>}>
        <FormField label="Project Name" required><input className="input-field" value={form.project_name} onChange={e=>setForm(f=>({...f,project_name:e.target.value}))} placeholder="Enter project name"/></FormField>
        <FormField label="Description"><textarea className="input-field" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{ resize:'vertical' }}/></FormField>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label="Status"><select className="input-field" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="planning">Planning</option><option value="ongoing">Ongoing</option><option value="on hold">On Hold</option></select></FormField>
          <FormField label="Budget (₱)"><input type="number" className="input-field" value={form.budget} onChange={e=>setForm(f=>({...f,budget:e.target.value}))} placeholder="0.00" min="0"/></FormField>
          <FormField label="Start Date & Time"><input type="datetime-local" className="input-field" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/></FormField>
          <FormField label="End Date & Time"><input type="datetime-local" className="input-field" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/></FormField>
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

      <ConfirmDialog open={!!delItem}   onClose={()=>setDel(null)}  onConfirm={del}      loading={delLoad}  danger title="Delete Project"    message={`Delete "${delItem?.project_name}"? This cannot be undone.`}/>
      <ConfirmDialog open={!!complItem} onClose={()=>setComp(null)} onConfirm={complete} loading={compLoad} title="Mark as Completed?" message={`Mark "${complItem?.project_name}" as completed?`}/>
    </div>
  )
}

/* ═══════════════════════════════
   EVENTS PAGE
═══════════════════════════════ */
const EVT_EMPTY = { title:'', description:'', start_date:'', end_date:'', status:'Planning' }

export function EventsPage() {
  const { T } = useAdminTheme()
  const { logAudit, role } = useAuth()
  const { toast }   = useToast()
  const [events,  setEvents] = useState([])
  const [modal,   setModal]  = useState(false)
  const [edit,    setEdit]   = useState(null)
  const [form,    setForm]   = useState(EVT_EMPTY)
  const [saving,  setSave]   = useState(false)
  const [del,     setDel]    = useState(null)
  const [delLoad, setDL]     = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending:true })
    if (data) setEvents(data)
  }

  const openAdd  = () => { setEdit(null); setForm(EVT_EMPTY); setModal(true) }
  const openEdit = ev => {
    setEdit(ev)
    setForm({ title:ev.title, description:ev.description||'', start_date:ev.start_date||'', end_date:ev.end_date||'', status:ev.status||'Planning' })
    setModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) { toast('Event title is required.','error'); return }
    setSave(true)
    try {
      const payload = { title:form.title, description:form.description, start_date:form.start_date||null, end_date:form.end_date||null, status:form.status }
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

  const sBadge = s => {
    const m = { planning:{bg:'#EBF8FF',color:'#1A365D'}, ongoing:{bg:'#F0FFF4',color:'#276749'}, cancelled:{bg:'#FFF5F5',color:'#C53030'}, completed:{bg:'#F7FAFC',color:'#718096'} }
    const st = m[(s||'').toLowerCase()] || { bg:'#F7FAFC',color:'#718096' }
    return <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:st.bg, color:st.color, fontFamily:IF }}>{s}</span>
  }

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:700, color:T.navy, marginBottom:4, fontFamily:MF }}>Event Management</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, fontFamily:IF }}>Create, edit, and manage all community events.</p>
      <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, overflow:'visible' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:T.text, fontFamily:MF }}>Community Events</h2>
            <p style={{ fontSize:12, color:T.textMuted, marginTop:2, fontFamily:IF }}>Schedule and manage upcoming barangay events.</p>
          </div>
          <BtnPrimary onClick={openAdd}><Plus size={14}/> Add Event</BtnPrimary>
        </div>
        {events.length === 0
          ? <EmptyState icon="📅" title="No events yet" subtitle="Click Add Event to schedule one."/>
          : <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><TH>Event Name</TH><TH>Start Date & Time</TH><TH>End Date & Time</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}
                    onMouseEnter={e=>e.currentTarget.style.background=T.tableHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <TD style={{ fontWeight:600 }}>{ev.title}</TD>
                    <TD>{ev.start_date ? format(new Date(ev.start_date),'MMM d, yyyy h:mm a') : '—'}</TD>
                    <TD>{ev.end_date   ? format(new Date(ev.end_date),  'MMM d, yyyy h:mm a') : '—'}</TD>
                    <TD>{sBadge(ev.status)}</TD>
                    <TD>
                      <ThreeDotMenu items={[
                        { label:'Edit Event',   icon:'✏️', onClick:() => openEdit(ev) },
                        'divider',
                        { label:'Delete Event', icon:'🗑️', onClick:() => setDel(ev), danger:true },
                      ]}/>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Event' : 'Add New Event'}
        footer={<><button onClick={() => setModal(false)} className="btn-ghost">Cancel</button><BtnPrimary onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</BtnPrimary></>}>
        <FormField label="Event Title" required><input className="input-field" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Enter the event title"/></FormField>
        <FormField label="Description"><textarea className="input-field" rows={4} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{ resize:'vertical' }}/></FormField>
        <FormField label="Start Date & Time"><input type="datetime-local" className="input-field" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/></FormField>
        <FormField label="End Date & Time"><input type="datetime-local" className="input-field" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/></FormField>
        <FormField label="Status"><select className="input-field" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option>Planning</option><option>Ongoing</option><option>Cancelled</option><option>Completed</option></select></FormField>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} loading={delLoad} danger title="Delete Event" message={`Delete "${del?.title}"?`}/>
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
  const { T } = useAdminTheme()
  const { user, profile, refreshProfile, logAudit } = useAuth()
  const { toast } = useToast()
  const [pw,        setPw]       = useState({ newpw:'', confirm:'', showNew:false })
  const [saving,    setSave]     = useState(false)
  const [nameEdit,  setNameEdit] = useState(false)
  const [newName,   setNewName]  = useState('')

  const handlePw = async e => {
    e.preventDefault()
    if (pw.newpw !== pw.confirm) { toast('Passwords do not match.','error'); return }
    if (pw.newpw.length < 8)     { toast('Minimum 8 characters.','error'); return }
    if (!/[A-Z]/.test(pw.newpw)) { toast('Need at least 1 uppercase letter.','error'); return }
    if (!/[0-9]/.test(pw.newpw)) { toast('Need at least 1 number.','error'); return }
    setSave(true)
    try {
      const { error } = await supabase.auth.updateUser({ password:pw.newpw })
      if (error) throw error
      await logAudit('Edit','Settings','Changed admin password')
      toast('Password updated!','success')
      setPw({ newpw:'', confirm:'', showNew:false })
    } catch (err) { toast(err.message,'error') }
    finally { setSave(false) }
  }

  const handleName = async () => {
    if (!newName.trim()) { toast('Name cannot be empty.','error'); return }
    try {
      await supabase.from('user_roles').update({ name:newName }).eq('user_id', user?.id)
      await supabase.from('profiles').update({ name:newName }).eq('user_id', user?.id)
      await refreshProfile()
      await logAudit('Edit','Settings','Updated display name')
      toast('Name updated!','success'); setNameEdit(false)
    } catch (err) { toast(err.message,'error') }
  }

  const card = { background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, padding:24, marginBottom:18 }

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:700, color:T.navy, marginBottom:4, fontFamily:MF }}>Admin Settings</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, fontFamily:IF }}>Manage your admin account credentials and display information.</p>
      <div style={{ maxWidth:540 }}>
        <div style={card}>
          <h3 style={{ fontSize:15, fontWeight:700, color:T.text, borderBottom:`2px solid ${T.gold}`, paddingBottom:8, marginBottom:18, fontFamily:MF }}>Account Information</h3>
          {[['Email', user?.email], ['Verification', profile?.verification_status||'Unverified']].map(([k,v]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 12px', background:T.surface2, borderRadius:8, marginBottom:8 }}>
              <span style={{ fontSize:11, color:T.textMuted, fontWeight:700, textTransform:'uppercase', width:100, fontFamily:IF }}>{k}</span>
              <span style={{ fontSize:13, color:T.text, fontFamily:IF }}>{v}</span>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 12px', background:T.surface2, borderRadius:8 }}>
            <span style={{ fontSize:11, color:T.textMuted, fontWeight:700, textTransform:'uppercase', width:100, fontFamily:IF }}>Name</span>
            {nameEdit ? (
              <div style={{ display:'flex', gap:8, flex:1 }}>
                <input className="input-field" style={{ flex:1, fontSize:13 }} value={newName} onChange={e=>setNewName(e.target.value)} autoFocus/>
                <BtnPrimary onClick={handleName} style={{ padding:'6px 12px', fontSize:12 }}><Save size={13}/></BtnPrimary>
                <button onClick={() => setNameEdit(false)} className="btn-ghost" style={{ padding:'6px 10px' }}><X size={13}/></button>
              </div>
            ) : (
              <><span style={{ fontSize:13, color:T.text, flex:1, fontFamily:IF }}>{profile?.name||'—'}</span>
                <button onClick={() => { setNewName(profile?.name||''); setNameEdit(true) }}
                  style={{ fontSize:12, color:T.navy, background:T.surface2, border:'none', borderRadius:6, padding:'4px 12px', cursor:'pointer', fontWeight:600, fontFamily:IF }}>Edit</button>
              </>
            )}
          </div>
        </div>
        <div style={card}>
          <h3 style={{ fontSize:15, fontWeight:700, color:T.text, borderBottom:`2px solid ${T.gold}`, paddingBottom:8, marginBottom:18, fontFamily:MF }}>Change Password</h3>
          <form onSubmit={handlePw}>
            <FormField label="New Password" required>
              <div style={{ position:'relative' }}>
                <input className="input-field" type={pw.showNew?'text':'password'} value={pw.newpw}
                  onChange={e=>setPw(p=>({...p,newpw:e.target.value}))} required minLength={8} style={{ paddingRight:42 }}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"/>
                <button type="button" onClick={() => setPw(p=>({...p,showNew:!p.showNew}))}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.textMuted, display:'flex' }}>
                  {pw.showNew ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </FormField>
            <FormField label="Confirm Password" required>
              <input className="input-field" type={pw.showNew?'text':'password'} value={pw.confirm}
                onChange={e=>setPw(p=>({...p,confirm:e.target.value}))} required placeholder="Re-enter new password"/>
            </FormField>
            {pw.newpw && pw.confirm && pw.newpw !== pw.confirm && (
              <p style={{ fontSize:12, color:'#C53030', marginBottom:10, fontFamily:IF }}>⚠️ Passwords do not match</p>
            )}
            <BtnPrimary disabled={saving} style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
              {saving ? 'Updating…' : 'Update Password'}
            </BtnPrimary>
          </form>
        </div>
      </div>
    </div>
  )
}
