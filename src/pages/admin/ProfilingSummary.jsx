import React, { useState, useEffect } from 'react'
import { Search, Download, Eye, CheckCircle, XCircle, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Modal, ConfirmDialog } from '../../components/UI'
import { useAdminTheme } from '../../contexts/AdminThemeContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function BtnGreen({ children, onClick, disabled, style={} }) {
  const { T } = useAdminTheme()
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, background:disabled?'#9CA3AF':T.navy, color:'white', border:'none', cursor:disabled?'not-allowed':'pointer', fontSize:13, fontWeight:700, fontFamily:'Inter,Georgia,serif', transition:'background .15s', ...style }}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.background=T.crimson }}
      onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.background=T.navy }}>
      {children}
    </button>
  )
}

export default function ProfilingSummary() {
  const { T } = useAdminTheme()
  const { role, logAudit } = useAuth()
  const { toast }          = useToast()
  const isSuperAdmin = role === 'super_admin'

  const [profiles,   setProfiles]  = useState([])
  const [search,     setSearch]    = useState('')
  const [dateFilter, setDateFilter]= useState('All Time')
  const [activeTab,  setActiveTab] = useState('data')
  const [reviewItem, setReview]    = useState(null)
  const [signedUrls, setSignedUrls]= useState({ front:null, back:null })
  const [lightbox,   setLightbox]  = useState(null)
  const [declineOpen,setDecline]   = useState(false)
  const [declineReason,setReason]  = useState('')
  const [loading,    setLoading]   = useState(false)
  const [actionLoad, setActionLoad]= useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at',{ascending:false})
      if (error) throw error
      if (data) setProfiles(data)
    } catch (err) { toast(err.message,'error') }
    finally { setLoading(false) }
  }

  const filtered = profiles.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.email?.toLowerCase().includes(search.toLowerCase())) return false
    if (dateFilter === 'Last Month') {
      const d = new Date(); d.setMonth(d.getMonth()-1)
      if (!p.created_at || new Date(p.created_at) < d) return false
    }
    return true
  })

  const approve = async (p) => {
    setActionLoad(true)
    try {
      const { error } = await supabase.from('profiles').update({ verification_status:'Verified' }).eq('id',p.id)
      if (error) throw error
      await logAudit('Approve','Profiling Summary',`Verified profile: ${p.name||p.email}`)
      toast(`${p.name||'Resident'} verified!`,'success')
      setReview(null); load()
    } catch (err) { toast(err.message,'error') }
    finally { setActionLoad(false) }
  }

  const decline = async () => {
    if (!reviewItem) return
    setActionLoad(true)
    try {
      const { error } = await supabase.from('profiles').update({ verification_status:'Declined', decline_reason:declineReason }).eq('id',reviewItem.id)
      if (error) throw error
      await logAudit('Decline','Profiling Summary',`Declined: ${reviewItem.name||reviewItem.email} — ${declineReason}`)
      toast('Profile declined.','success')
      setDecline(false); setReview(null); setReason(''); load()
    } catch (err) { toast(err.message,'error') }
    finally { setActionLoad(false) }
  }

  const exportSpreadsheet = () => {
    const cols = ['Name','Email','Contact Number','Purok','Verification Status','Work Status','Civil Status','Birthday','Age','Gender']
    const rows = filtered.map(p => [p.name||'',p.email||'',p.contact_number||'N/A',p.address?.split(',')?.[0]?.replace('Purok','').trim()||'N/A',p.verification_status||'Unverified',p.work_status||'N/A',p.civil_status||'N/A',p.birthday||'',p.age||'',p.gender||''])
    const csv  = [cols,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv)
    a.download = `profiling-summary-${format(new Date(),'yyyy-MM-dd')}.csv`
    a.click()
    logAudit('Export','Profiling Summary','Exported profiles as CSV')
    toast('Exported!','success')
  }

  const verifiedProfiles = profiles.filter(p=>p.verification_status==='Verified')
  const chartData = {
    civil: ['Single','Married','Divorced','Widowed','Separated','Live-in'].map(k=>({name:k,value:verifiedProfiles.filter(p=>(p.civil_status||'').toLowerCase()===k.toLowerCase()).length})).filter(d=>d.value>0),
    work:  ['Employed','Unemployed','Self-Employed','Looking for a job'].map(k=>({name:k==='Looking for a job'?'Job Seeking':k,value:verifiedProfiles.filter(p=>(p.work_status||'').toLowerCase()===k.toLowerCase()).length})).filter(d=>d.value>0),
    age:   ['16-17 yrs old','18-24 yrs old','25-30 yrs old'].map(k=>({name:k,value:verifiedProfiles.filter(p=>p.youth_age_group===k).length})).filter(d=>d.value>0),
    class: ['In school youth','Out of School youth','Working Youth','Youth with special needs'].map(k=>({name:k==='In school youth'?'In school':k==='Out of School youth'?'Out of school':k,value:verifiedProfiles.filter(p=>(p.youth_classification||'').toLowerCase()===k.toLowerCase()).length})).filter(d=>d.value>0),
  }

  const vBadge = s => {
    const m = { Verified:{bg:'#DCFCE7',color:'#166534'}, Declined:{bg:'#FEE2E2',color:'#DC2626'} }
    const st = m[s]||{bg:'#F3F4F6',color:T.textMuted}
    return <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:st.bg, color:st.color }}>{s||'Unverified'}</span>
  }

  const ChartCard = ({ title, data }) => (
    <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, padding:20 }}>
      <p style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:16, fontFamily:"'Montserrat','Inter',sans-serif" }}>{title}</p>
      {data.length === 0
        ? <p style={{ fontSize:13, color:T.textMuted, textAlign:'center', padding:'32px 0' }}>No data yet</p>
        : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{left:-10,bottom:20}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
            <XAxis dataKey="name" tick={{fontSize:10}} angle={-20} textAnchor="end"/>
            <YAxis tick={{fontSize:11}} allowDecimals={false}/>
            <Tooltip/>
            <Bar dataKey="value" fill={T.navy} radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:700, color:T.text, marginBottom:4, fontFamily:"'Montserrat','Inter',sans-serif" }}>Profiling Summary</h1>
          <p style={{ fontSize:13, color:T.textMuted }}>View and export community member profiles.</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Filter size={14} style={{ color:T.textMuted }}/>
            <select style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${T.border}`, background:T.surface, fontSize:13, fontFamily:"'Montserrat','Inter',sans-serif", cursor:'pointer' }}
              value={dateFilter} onChange={e=>setDateFilter(e.target.value)}>
              <option>All Time</option><option>Last Month</option>
            </select>
          </div>
          {isSuperAdmin && (
            <BtnGreen onClick={exportSpreadsheet} style={{ padding:'8px 18px' }}>
              <Download size={14}/> Export as Spreadsheet
            </BtnGreen>
          )}
        </div>
      </div>

      {!isSuperAdmin && (
        <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(214,158,46,0.1)', border:'1px solid rgba(214,158,46,0.3)', marginBottom:16, fontSize:13, color:'#7B4800', display:'flex', alignItems:'center', gap:8 }}>
          👁 <strong>Read-Only Access</strong> — You can view profiles and demographics. Contact a Super Admin to verify or export profiles.
        </div>
      )}
      {/* Tabs */}
      <div style={{ background:T.surface, borderRadius:'12px 12px 0 0', border:`1px solid ${T.border}`, borderBottom:'none', display:'flex' }}>
        {['data','demographics'].map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{ flex:1, padding:'14px 20px', border:'none', background:'none', cursor:'pointer', fontSize:14, fontWeight: activeTab===tab?700:400, color: activeTab===tab?'#111827':'#6B7280', fontFamily:"'Montserrat','Inter',sans-serif", borderBottom: activeTab===tab?`2px solid ${T.navy}`:'2px solid transparent', transition:'all .15s' }}>
            {tab==='data' ? 'Data Summary' : 'Demographics Overview'}
          </button>
        ))}
      </div>

      {/* Data Summary Tab */}
      {activeTab === 'data' && (
        <div style={{ background:T.surface, borderRadius:'0 0 12px 12px', border:`1px solid ${T.border}`, overflow:'hidden' }}>
          {/* Search */}
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ position:'relative', flex:1, maxWidth:320 }}>
              <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:T.textMuted }}/>
              <input style={{ width:'100%', padding:'9px 12px 9px 34px', borderRadius:8, border:`1px solid ${T.border}`, background:T.surface2, fontSize:13, fontFamily:"'Montserrat','Inter',sans-serif", outline:'none' }}
                placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <p style={{ fontSize:12, color:T.textMuted }}>{filtered.length} records</p>
          </div>

          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:T.textMuted }}>Loading profiles…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:T.textMuted }}>
              <div style={{ fontSize:36, marginBottom:12 }}>👥</div>
              <p style={{ fontSize:14, fontWeight:600 }}>No profiles found</p>
              <p style={{ fontSize:13, marginTop:4 }}>Residents will appear here once they complete the profiling form.</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                  <th style={{ padding:'11px 16px', textAlign:'left', fontSize:12, fontWeight:500, color:T.textMuted }}>Name</th>
                  <th style={{ padding:'11px 16px', textAlign:'left', fontSize:12, fontWeight:500, color:T.textMuted }}>Email</th>
                  <th style={{ padding:'11px 16px', textAlign:'left', fontSize:12, fontWeight:500, color:T.textMuted }}>Contact Number</th>
                  <th style={{ padding:'11px 16px', textAlign:'left', fontSize:12, fontWeight:500, color:T.textMuted }}>Verification Status</th>
                  <th style={{ padding:'11px 16px', textAlign:'left', fontSize:12, fontWeight:500, color:T.textMuted }}>Work Status</th>
                  {isSuperAdmin && <th style={{ padding:'11px 16px', textAlign:'left', fontSize:12, fontWeight:500, color:T.textMuted }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background='#F9FAFB'} onMouseLeave={e=>e.currentTarget.style.background='white'}
                    style={{ borderBottom:`1px solid ${T.border}` }}>
                    <td style={{ padding:'12px 16px', fontSize:13, color:T.text, fontWeight:500 }}>{p.name||'—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:T.text }}>{p.email||'—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:T.text }}>{p.contact_number||'N/A'}</td>
                    <td style={{ padding:'12px 16px' }}>{vBadge(p.verification_status)}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:T.text }}>{p.work_status||'N/A'}</td>
                    {isSuperAdmin && (
                      <td style={{ padding:'12px 16px' }}>
                        <button onClick={async () => {
                          // Generate 1-hour signed URLs for private bucket
                          const urls = { front: null, back: null }
                          // Extract storage path from any URL format or use path directly
                          const extractPath = (val) => {
                            if (!val) return null
                            if (val.startsWith('http')) {
                              // Extract path after /verification-ids/ or /object/public/verification-ids/
                              const match = val.match(/verification-ids\/(.+)/)
                              return match ? match[1] : null
                            }
                            return val // already a plain path
                          }
                          const frontPath = extractPath(p.id_front_url || p.verification_id_url)
                          const backPath  = extractPath(p.id_back_url)
                          if (frontPath) {
                            const { data, error } = await supabase.storage.from('verification-ids').createSignedUrl(frontPath, 3600)
                            urls.front = data?.signedUrl || null
                            if (error) console.warn('Front signed URL error:', error.message)
                          }
                          if (backPath) {
                            const { data, error } = await supabase.storage.from('verification-ids').createSignedUrl(backPath, 3600)
                            urls.back = data?.signedUrl || null
                            if (error) console.warn('Back signed URL error:', error.message)
                          }
                          setSignedUrls(urls)
                          setReview(p)
                        }}
                          style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, background:'#F0FDF4', color:T.navy, border:`1px solid #BBF7D0`, cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Montserrat','Inter',sans-serif" }}>
                          <Eye size={13}/> Review
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Demographics Tab */}
      {activeTab === 'demographics' && (
        <div style={{ background:T.bg, borderRadius:'0 0 12px 12px', border:`1px solid ${T.border}`, padding:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <ChartCard title="Civil Status"        data={chartData.civil}/>
            <ChartCard title="Work Status"         data={chartData.work}/>
            <ChartCard title="Youth Age Group"     data={chartData.age}/>
            <ChartCard title="Youth Classification" data={chartData.class}/>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:T.surface, borderRadius:16, padding:28, maxWidth:560, width:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:12, borderBottom:'2px solid #D69E2E' }}>
              <h2 style={{ fontSize:18, fontWeight:700, color:T.text, fontFamily:"'Montserrat','Inter',sans-serif" }}>Profile Review</h2>
              <button onClick={()=>{ setReview(null); setSignedUrls({front:null,back:null}) }} style={{ background:'none', border:'none', cursor:'pointer', color:T.textMuted, fontSize:20 }}>✕</button>
            </div>

            {/* Profile header */}
            <div style={{ background:'linear-gradient(135deg,#1B5E20,#2D7D32)', borderRadius:10, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>👤</div>
              <div style={{ flex:1 }}>
                <p style={{ color:'white', fontWeight:700, fontSize:16 }}>{reviewItem.name||'—'}</p>
                <p style={{ color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:2 }}>{reviewItem.email||'—'}</p>
              </div>
              {vBadge(reviewItem.verification_status)}
            </div>

            {/* Profile fields */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
              {[['Contact',reviewItem.contact_number||'N/A'],['Birthday',reviewItem.birthday||'N/A'],['Age',reviewItem.age||'N/A'],['Gender',reviewItem.gender||'N/A'],['Civil Status',reviewItem.civil_status||'N/A'],['Work Status',reviewItem.work_status||'N/A'],['Address',reviewItem.address||'N/A'],['Youth Age Group',reviewItem.youth_age_group||'N/A']].map(([k,v])=>(
                <div key={k} style={{ background:T.surface2, borderRadius:8, padding:'8px 12px' }}>
                  <p style={{ fontSize:10, color:T.textMuted, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{k}</p>
                  <p style={{ fontSize:13, color:T.text }}>{v}</p>
                </div>
              ))}
            </div>
              {/* ID Documents — Front & Back */}
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <p style={{ fontSize:12, fontWeight:700, color:T.text, textTransform:'uppercase', letterSpacing:'0.3px', margin:0 }}>
                  🪪 Verification ID Documents
                </p>
                {(signedUrls.front || signedUrls.back || reviewItem.id_front_url || reviewItem.id_back_url) && (
                  <span style={{ fontSize:10, color:'#48BB78', fontWeight:700, background:'#F0FFF4', padding:'2px 8px', borderRadius:20, border:'1px solid #9AE6B4' }}>
                    ✓ Uploaded
                  </span>
                )}
              </div>
              {(signedUrls.front || signedUrls.back || reviewItem.id_front_url || reviewItem.id_back_url || reviewItem.verification_id_url) ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[
                    { label:'Front', url: signedUrls.front || reviewItem.id_front_url || reviewItem.verification_id_url, otherLabel:'Back',  otherUrl: signedUrls.back || reviewItem.id_back_url },
                    { label:'Back',  url: signedUrls.back  || reviewItem.id_back_url,                                    otherLabel:'Front', otherUrl: signedUrls.front || reviewItem.id_front_url || reviewItem.verification_id_url },
                  ].map(({ label, url, otherLabel, otherUrl }) =>
                    url ? (
                      <div key={label}>
                        <p style={{ fontSize:11, fontWeight:700, color:T.textMuted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label} of ID</p>
                        <div
                          onClick={() => setLightbox({
                            url, label, name: reviewItem.name || reviewItem.email,
                            other: otherUrl ? { url:otherUrl, label:otherLabel, name:reviewItem.name||reviewItem.email, other:{ url, label, name:reviewItem.name||reviewItem.email, other:null, otherLabel:label }, otherLabel:label } : null,
                            otherLabel,
                          })}
                          style={{ cursor:'zoom-in', borderRadius:10, overflow:'hidden', border:`2px solid ${T.border}`, position:'relative', background:T.surface2, transition:'border-color .15s, transform .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor='#1A365D'; e.currentTarget.style.transform='scale(1.02)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor=T.border;   e.currentTarget.style.transform='scale(1)' }}>
                          <img src={url} alt={label + ' ID'}
                            style={{ width:'100%', height:140, objectFit:'cover', display:'block' }}/>
                          {/* Hover overlay */}
                          <div style={{ position:'absolute', inset:0, background:'rgba(26,54,93,0)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .2s' }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(26,54,93,0.35)'}
                            onMouseLeave={e => e.currentTarget.style.background='rgba(26,54,93,0)'}>
                            <span style={{ color:'white', fontSize:22, opacity:0, transition:'opacity .2s', pointerEvents:'none' }}>🔍</span>
                          </div>
                        </div>
                        <p style={{ fontSize:10, color:T.textMuted, marginTop:4, textAlign:'center' }}>Click to view full size</p>
                      </div>
                    ) : (
                      <div key={label}>
                        <p style={{ fontSize:11, fontWeight:700, color:T.textMuted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label} of ID</p>
                        <div style={{ background:T.surface2, borderRadius:10, border:`2px dashed ${T.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:140, gap:6 }}>
                          <span style={{ fontSize:28, opacity:0.4 }}>🖼️</span>
                          <p style={{ fontSize:11, color:T.textMuted }}>{label} not uploaded</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div style={{ background:T.surface2, borderRadius:10, padding:28, textAlign:'center', border:`2px dashed ${T.border}` }}>
                  <span style={{ fontSize:36, display:'block', marginBottom:8, opacity:0.4 }}>🪪</span>
                  <p style={{ fontSize:13, color:T.textMuted, fontWeight:600 }}>No ID documents uploaded yet.</p>
                  <p style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>The resident has not submitted their verification ID.</p>
                </div>
              )}
              {reviewItem.id_submitted_at && (
                <p style={{ fontSize:11, color:T.textMuted, marginTop:8, textAlign:'right' }}>
                  Submitted: {reviewItem.id_submitted_at ? new Date(reviewItem.id_submitted_at).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setDecline(true)}
                style={{ flex:1, padding:11, borderRadius:8, border:'2px solid #DC2626', background:T.surface, color:'#DC2626', cursor:'pointer', fontWeight:700, fontSize:13, fontFamily:"'Montserrat','Inter',sans-serif" }}>
                Decline
              </button>
              <BtnGreen onClick={()=>approve(reviewItem)} disabled={actionLoad} style={{ flex:1, justifyContent:'center', padding:11 }}>
                {actionLoad ? 'Approving…' : '✓ Approve & Verify'}
              </BtnGreen>
            </div>
          </div>
        </div>
      )}

      {/* Decline reason modal */}
      {declineOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:T.surface, borderRadius:14, padding:24, maxWidth:400, width:'100%' }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:14 }}>Decline Reason</h3>
            <select style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:`1px solid ${T.border}`, fontSize:13, fontFamily:"'Montserrat','Inter',sans-serif", marginBottom:14, outline:'none' }}
              value={declineReason} onChange={e=>setReason(e.target.value)}>
              <option value="">Select a reason…</option>
              <option>Invalid ID</option>
              <option>Outside Age Range</option>
              <option>Incomplete Information</option>
              <option>Duplicate Profile</option>
              <option>Other</option>
            </select>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setDecline(false)} className="btn-ghost" style={{ flex:1 }}>Cancel</button>
              <button onClick={decline} disabled={!declineReason||actionLoad}
                style={{ flex:1, padding:'10px', borderRadius:8, background:declineReason?'#DC2626':'#9CA3AF', color:'white', border:'none', cursor:declineReason?'pointer':'not-allowed', fontSize:13, fontWeight:700 }}>
                {actionLoad ? 'Declining…' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox — full featured */}
      {lightbox && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:10001, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
          onClick={e => { if (e.target === e.currentTarget) setLightbox(null) }}>

          {/* Top bar */}
          <div style={{ position:'absolute', top:0, left:0, right:0, padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🪪</div>
              <div>
                <p style={{ color:'white', fontWeight:700, fontSize:14, margin:0 }}>{lightbox.label} of ID</p>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, margin:0 }}>{lightbox.name}</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {/* Download */}
              <a href={lightbox.url} download target="_blank" rel="noreferrer"
                style={{ padding:'7px 14px', borderRadius:8, background:'rgba(255,255,255,0.12)', color:'white', fontSize:12, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6, border:'1px solid rgba(255,255,255,0.2)' }}>
                ⬇ Download
              </a>
              {/* Switch front/back */}
              {lightbox.other && (
                <button onClick={() => setLightbox(lightbox.other)}
                  style={{ padding:'7px 14px', borderRadius:8, background:'rgba(214,158,46,0.3)', color:'#F6E05E', fontSize:12, fontWeight:600, border:'1px solid rgba(214,158,46,0.4)', cursor:'pointer' }}>
                  View {lightbox.otherLabel} →
                </button>
              )}
              {/* Close */}
              <button onClick={() => setLightbox(null)}
                style={{ width:34, height:34, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'white', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
                ✕
              </button>
            </div>
          </div>

          {/* Image */}
          <img src={lightbox.url} alt={lightbox.label + ' ID'}
            style={{ maxWidth:'88%', maxHeight:'78vh', borderRadius:12, objectFit:'contain', boxShadow:'0 0 60px rgba(0,0,0,0.8)', border:'2px solid rgba(255,255,255,0.1)' }}/>

          {/* Bottom label */}
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, marginTop:14 }}>Click outside to close</p>
        </div>
      )}
    </div>
  )
}
