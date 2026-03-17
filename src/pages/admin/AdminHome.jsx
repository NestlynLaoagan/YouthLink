import React, { useState, useEffect, useRef } from 'react'
import { Plus, MoreHorizontal, Calendar, CheckSquare, Users, Bell, Megaphone } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Modal, FormField, ConfirmDialog, EmptyState } from '../../components/UI'
import { useAdminTheme } from '../../contexts/AdminThemeContext'

const EMPTY = { title:'', content:'', location:'', date_time:'', type:'General', status:'Upcoming' }

function ThreeDotMenu({ items }) {
  const { T } = useAdminTheme()
  const [open, setOpen] = React.useState(false)
  const [pos,  setPos]  = React.useState({ top:0, right:0 })
  const ref = React.useRef()
  React.useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const toggle = e => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ top:r.bottom + window.scrollY + 4, right:window.innerWidth - r.right })
    setOpen(o => !o)
  }
  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button onClick={toggle}
        style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:'4px 8px', borderRadius:6, display:'flex', alignItems:'center' }}
        onMouseEnter={e=>{ e.currentTarget.style.background='#F3F4F6'; e.currentTarget.style.color='#374151' }}
        onMouseLeave={e=>{ e.currentTarget.style.background='none'; e.currentTarget.style.color='#9CA3AF' }}>
        <MoreHorizontal size={18}/>
      </button>
      {open && (
        <div style={{ position:'fixed', right:pos.right, top:pos.top, width:190, background:T.surface, borderRadius:10, boxShadow:'0 10px 40px rgba(0,0,0,0.15)', border:`1px solid ${T.border}`, zIndex:9999, overflow:'hidden' }}>
          {items.map((item, i) => item === 'divider'
            ? <div key={i} style={{ height:1, background:'#F3F4F6', margin:'0 10px' }}/>
            : (
              <button key={i} onClick={() => { item.onClick(); setOpen(false) }}
                style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, color: item.danger ? '#DC2626' : '#374151', fontFamily:"'Montserrat','Inter',sans-serif", textAlign:'left' }}
                onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#FEF2F2' : '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                {item.icon && <span style={{ fontSize:13 }}>{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminHome() {
  const { T } = useAdminTheme()
  const { user, role, logAudit } = useAuth()
  const isSuperAdmin = role === 'super_admin'
  const { toast }          = useToast()
  const [anns,    setAnns]   = useState([])
  const [stats,   setStats]  = useState({ events:0, projects:0, members:0, announcements:0 })
  const [modal,   setModal]  = useState(false)
  const [editItem,setEdit]   = useState(null)
  const [form,    setForm]   = useState(EMPTY)
  const [delItem, setDel]    = useState(null)
  const [delLoad, setDL]     = useState(false)
  const [saving,  setSaving] = useState(false)
  const [viewItem,setView]   = useState(null)

  const safeFormat = (val, fmt) => {
    try { const d = new Date(val); return isNaN(d.getTime()) ? '' : format(d, fmt) } catch { return '' }
  }

  const load = async () => {
    const [a, ev, pr, us] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at',{ascending:false}),
      supabase.from('events').select('id',{count:'exact',head:true}),
      supabase.from('projects').select('id',{count:'exact',head:true}).eq('status','completed'),
      supabase.from('user_roles').select('id',{count:'exact',head:true}),
    ])
    if (a.data) setAnns(a.data)
    setStats({
      events:       ev.count  || 0,
      projects:     pr.count  || 0,
      members:      us.count  || 0,
      announcements:a.data?.length || 0,
    })
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEdit(null); setForm(EMPTY); setModal(true) }
  const openEdit = a => {
    setEdit(a)
    setForm({ title:a.title, content:a.content, location:a.location||'', date_time:a.date_time||'', type:a.type||'General', status:a.status||'Upcoming' })
    setModal(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast('Title and Content are required.','error'); return }
    setSaving(true)
    try {
      const payload = { title:form.title, content:form.content, location:form.location||null, date_time:form.date_time||null, type:form.type, status:form.status, user_id:user?.id }
      const { error } = editItem
        ? await supabase.from('announcements').update(payload).eq('id',editItem.id)
        : await supabase.from('announcements').insert({ ...payload, created_at:new Date().toISOString() })
      if (error) throw error
      await logAudit(editItem?'Edit':'Create','Announcements',`${editItem?'Edited':'Created'}: ${form.title}`)
      toast(`Announcement ${editItem?'updated':'created'}!`,'success')
      setModal(false); load()
    } catch (err) { toast(err.message,'error') }
    finally { setSaving(false) }
  }

  const del = async () => {
    setDL(true)
    try {
      const { error } = await supabase.from('announcements').delete().eq('id',delItem.id)
      if (error) throw error
      await logAudit('Delete','Announcements',`Deleted: ${delItem.title}`)
      toast('Announcement deleted.','success'); setDel(null); load()
    } catch (err) { toast(err.message,'error') }
    finally { setDL(false) }
  }

  const statusBadge = (s) => {
    const map = {
      upcoming:  { bg:'#DBEAFE', color:'#1D4ED8' },
      ongoing:   { bg:'#DCFCE7', color:'#166534' },
      cancelled: { bg:'#FEE2E2', color:'#DC2626' },
      finished:  { bg:'#F3F4F6', color:T.textMuted },
    }
    const st = map[(s||'').toLowerCase()] || { bg:'#F3F4F6', color:T.textMuted }
    return (
      <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:st.bg, color:st.color }}>
        {s}
      </span>
    )
  }

  const statCards = [
    { label:'Upcoming Events',   value:stats.events,        Icon:Calendar    },
    { label:'Finished Projects', value:stats.projects,      Icon:CheckSquare },
    { label:'Community Members', value:stats.members,       Icon:Users       },
    { label:'Announcements',     value:stats.announcements, Icon:Megaphone   },
  ]

  const cardStyle = { background:T.surface, borderRadius:12, padding:'20px 22px', border:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }

  return (
    <div>
      <h1 style={{ fontSize:28, fontWeight:700, color:T.text, marginBottom:4, fontFamily:"'Montserrat','Inter',sans-serif" }}>Admin Dashboard</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24 }}>Welcome back · {new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
        {statCards.map(({ label, value, Icon }) => (
          <div key={label} style={cardStyle}>
            <div>
              <p style={{ fontSize:12, color:T.textMuted, marginBottom:8, fontWeight:500 }}>{label}</p>
              <p style={{ fontSize:32, fontWeight:700, color:T.navy, fontFamily:"'Montserrat','Inter',sans-serif" }}>
                {value || 0}
              </p>
            </div>
            <div style={{ color:T.navy, opacity:0.7 }}><Icon size={20}/></div>
          </div>
        ))}
      </div>

      {/* Announcements */}
      <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, overflow:'visible' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${T.border}` }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:T.text, fontFamily:"'Montserrat','Inter',sans-serif" }}>Recent Announcements</h2>
            <p style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>
              {isSuperAdmin ? 'Manage all barangay announcements.' : 'View all barangay announcements. (Read-only for Admin)'}
            </p>
          </div>
          <button onClick={openAdd}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:8, background:T.navy, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Montserrat','Inter',sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background='#1B5E20'}
            onMouseLeave={e => e.currentTarget.style.background=T.navy}>
            <Plus size={15}/> Add Announcement
          </button>
        </div>

        {anns.length === 0 ? (
          <EmptyState icon="📢" title="No announcements yet" subtitle="Click 'Add Announcement' to create your first one."
            action={<button onClick={openAdd} style={{ padding:'8px 20px', borderRadius:8, background:T.navy, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>Add Announcement</button>}/>
        ) : (
          <div>
            {anns.map(a => (
              <div key={a.id} style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:38, height:38, borderRadius:8, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Megaphone size={18} style={{ color:T.navy }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                    <span style={{ fontWeight:700, fontSize:14, color:T.text }}>{a.title}</span>
                    {statusBadge(a.status)}
                  </div>
                  {a.date_time && (
                    <p style={{ fontSize:12, color:T.textMuted, marginBottom:2, display:'flex', alignItems:'center', gap:5 }}>
                      <span>📅</span> {safeFormat(a.date_time,"MMMM do, yyyy 'at' h:mm a")}
                    </p>
                  )}
                  {a.location && (
                    <p style={{ fontSize:12, color:T.textMuted, marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                      <span>📍</span> {a.location}
                    </p>
                  )}
                  <p style={{ fontSize:13, color:T.text, lineHeight:1.7 }}>{a.content}</p>
                  <p style={{ fontSize:11, color:'#9CA3AF', textAlign:'right', marginTop:8 }}>
                    Posted on {a.created_at ? safeFormat(a.created_at,"MMMM do, yyyy h:mm a") : ''}
                  </p>
                </div>
                {isSuperAdmin ? (
                  <ThreeDotMenu items={[
                    { label:'View Details', icon:'👁', onClick:() => setView(a) },
                    { label:'Edit Announcement', icon:'✏️', onClick:() => openEdit(a) },
                    'divider',
                    { label:'Delete Announcement', icon:'🗑️', onClick:() => setDel(a), danger:true },
                  ]}/>
                ) : (
                  <button onClick={() => setView(a)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:T.textMuted, padding:'4px 8px', borderRadius:6, fontSize:12 }}>
                    👁
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Announcement' : 'Add New Announcement'}
        footer={
          <><button onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving}
            style={{ padding:'9px 22px', borderRadius:8, background:T.navy, color:'white', border:'none', cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:700, opacity:saving?0.7:1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button></>
        }>
        <FormField label="Title" required><input className="input-field" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Enter the announcement title"/></FormField>
        <FormField label="Content" required><textarea className="input-field" rows={4} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Enter the announcement details" style={{ resize:'vertical' }}/></FormField>
        <FormField label="Location (Optional)"><input className="input-field" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g., Barangay Hall"/></FormField>
        <FormField label="Date & Time of Event (Optional)"><input type="datetime-local" className="input-field" value={form.date_time} onChange={e=>setForm(f=>({...f,date_time:e.target.value}))}/></FormField>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label="Type">
            <select className="input-field" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              {['General','Event','Emergency','Notice'].map(t=><option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className="input-field" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              {['Upcoming','Ongoing','Cancelled','Finished'].map(s=><option key={s}>{s}</option>)}
            </select>
          </FormField>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewItem} onClose={() => setView(null)} title="Announcement Details"
        footer={<><button onClick={() => { openEdit(viewItem); setView(null) }} style={{ padding:'8px 18px', borderRadius:7, background:T.navy, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>Edit</button><button onClick={() => setView(null)} className="btn-ghost">Close</button></>}>
        {viewItem && (
          <div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              {statusBadge(viewItem.status)}
              <span style={{ fontSize:12, background:'#F3F4F6', color:T.textMuted, padding:'2px 9px', borderRadius:20 }}>{viewItem.type}</span>
            </div>
            <h3 style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:10, fontFamily:"'Montserrat','Inter',sans-serif" }}>{viewItem.title}</h3>
            {viewItem.date_time && <p style={{ fontSize:13, color:T.textMuted, marginBottom:4 }}>📅 {safeFormat(viewItem.date_time,"MMMM do, yyyy 'at' h:mm a")}</p>}
            {viewItem.location  && <p style={{ fontSize:13, color:T.textMuted, marginBottom:10 }}>📍 {viewItem.location}</p>}
            <p style={{ fontSize:14, color:T.text, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{viewItem.content}</p>
            <p style={{ fontSize:11, color:'#9CA3AF', marginTop:14 }}>Posted {viewItem.created_at ? safeFormat(viewItem.created_at,'MMMM do, yyyy h:mm a') : ''}</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delItem} onClose={() => setDel(null)} onConfirm={del} loading={delLoad} danger
        title="Delete Announcement" message={`Delete "${delItem?.title}"? This cannot be undone.`}/>
    </div>
  )
}
