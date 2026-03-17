import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Bell, Sun, Moon, LogOut, User, Settings, Flag, Send,
  ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, X, Star
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, parseISO, addMonths, subMonths
} from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { ConfirmDialog, Modal, FormField } from '../components/UI'
import ProfilingForm from './ProfilingForm'
import ISKAIChat from '../components/ISKAIChat'

/* ── THEME TOKENS ── */
const LIGHT = {
  bg:        '#F7FAFC',
  surface:   '#FFFFFF',
  surface2:  '#EDF2F7',
  border:    '#E2E8F0',
  text:      '#2D3748',
  textMuted: '#718096',
  navBg:     '#FFFFFF',
  heroText:  '#1A365D',
  navy:      '#1A365D',
  crimson:   '#C53030',
  gold:      '#D69E2E',
  sectionBg: '#F7FAFC',
  calBg:     '#FFFFFF',
  calBorder: '#E2E8F0',
  annBg:     '#FFFFFF',
  footerBg:  '#1A365D',
  footerText:'#FFFFFF',
}
const DARK = {
  bg:        '#0F172A',
  surface:   '#1E293B',
  surface2:  '#334155',
  border:    '#334155',
  text:      '#F1F5F9',
  textMuted: '#94A3B8',
  navBg:     '#0F172A',
  heroText:  '#F1F5F9',
  navy:      '#60A5FA',
  crimson:   '#F87171',
  gold:      '#FBBF24',
  sectionBg: '#0F172A',
  calBg:     '#1E293B',
  calBorder: '#334155',
  annBg:     '#1E293B',
  footerBg:  '#0F172A',
  footerText:'#94A3B8',
}

/* ── MINI CALENDAR ── */
function CalGrid({ month, events, T }) {
  const start  = startOfMonth(month)
  const days   = eachDayOfInterval({ start, end: endOfMonth(month) })
  const blanks = Array(getDay(start)).fill(null)
  const all    = [...blanks, ...days]

  const hasEv = d => d && events.some(ev => {
    try { return isSameDay(parseISO(ev.start_date || ev.created_at), d) } catch { return false }
  })

  return (
    <div style={{
      background: T.calBg, borderRadius:14, padding:'16px 18px',
      border:`1px solid ${T.calBorder}`,
      transition:'transform 0.25s ease, box-shadow 0.25s ease',
      cursor:'default', position:'relative', zIndex:1,
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform='scale(1.22)'
        e.currentTarget.style.boxShadow='0 16px 48px rgba(0,0,0,0.18)'
        e.currentTarget.style.zIndex='10'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform='scale(1)'
        e.currentTarget.style.boxShadow='none'
        e.currentTarget.style.zIndex='1'
      }}>
      <p style={{ textAlign:'center', fontSize:14, fontWeight:800, color: T.navy, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10, fontFamily:'Inter,sans-serif' }}>
        {format(month,'MMMM')}
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, fontSize:11 }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', color: T.textMuted, fontWeight:700, paddingBottom:5, fontSize:11 }}>{d}</div>
        ))}
        {all.map((d, i) => (
          <div key={i} style={{ textAlign:'center', padding:'3px 0' }}>
            {d ? (
              hasEv(d) ? (
                <span style={{ background: T.navy, color:'white', borderRadius:'50%', width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                  {format(d,'d')}
                </span>
              ) : (
                <span style={{ color: T.text, fontSize:11 }}>{format(d,'d')}</span>
              )
            ) : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Projects Showcase Carousel ── */
function ProjectsCarousel({ projects, T }) {
  const slides = React.useMemo(() => {
    const result = []
    for (const p of projects) {
      const imgs = (p.images || []).filter(Boolean)
      if (imgs.length > 0) {
        imgs.forEach((url, i) => result.push({ project: p, imageUrl: url, imageIndex: i, totalImages: imgs.length }))
      } else {
        result.push({ project: p, imageUrl: null, imageIndex: 0, totalImages: 0 })
      }
    }
    return result
  }, [projects])

  const [current, setCurrent] = React.useState(0)
  const [paused,  setPaused]  = React.useState(false)
  const timerRef = React.useRef()

  const go = React.useCallback((idx) => {
    setCurrent((idx + slides.length) % slides.length)
  }, [slides.length])

  React.useEffect(() => {
    if (paused || slides.length < 2) return
    timerRef.current = setInterval(() => go(current + 1), 1500)
    return () => clearInterval(timerRef.current)
  }, [current, paused, slides.length, go])

  if (slides.length === 0) return null

  const slide = slides[current]
  const p     = slide.project

  return (
    <div style={{ maxWidth:860, margin:'0 auto', userSelect:'none' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>

      {/* ── Main image ── */}
      <div style={{ position:'relative', width:'100%', paddingBottom:'56%', borderRadius:16, overflow:'hidden', background:'#1a1a1a', boxShadow:'0 8px 40px rgba(0,0,0,0.18)' }}>
        {slide.imageUrl ? (
          <img key={current} src={slide.imageUrl} alt={p.project_name}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', animation:'projFadeIn 0.5s ease' }}/>
        ) : (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg,${T.navy}22,${T.gold}22)` }}>
            <span style={{ fontSize:56 }}>🏗️</span>
            <span style={{ fontSize:13, color:T.textMuted, marginTop:8 }}>No photos uploaded</span>
          </div>
        )}

        {/* Arrow buttons */}
        {slides.length > 1 && (
          <>
            <button onClick={() => go(current - 1)}
              style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.38)', border:'1.5px solid rgba(255,255,255,0.25)', color:'white', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .15s', zIndex:2 }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.65)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.38)'}>‹</button>
            <button onClick={() => go(current + 1)}
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.38)', border:'1.5px solid rgba(255,255,255,0.25)', color:'white', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .15s', zIndex:2 }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.65)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.38)'}>›</button>
          </>
        )}

        {/* Progress bar */}
        {slides.length > 1 && !paused && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,0.15)' }}>
            <div key={current} style={{ height:'100%', background:T.gold, animation:'projProgress 1.5s linear forwards' }}/>
          </div>
        )}
      </div>

      {/* ── Title + Description below image ── */}
      <div style={{ textAlign:'center', marginTop:20, padding:'0 16px', minHeight:72 }}>
        <p style={{ fontWeight:800, fontSize:18, color:T.navy, fontFamily:"'Montserrat','Inter',sans-serif", margin:'0 0 8px' }}>
          {p.project_name}
        </p>
        {p.description && (
          <p style={{ fontSize:13, color:T.textMuted, lineHeight:1.7, margin:0, maxWidth:620, display:'inline-block' }}>
            {p.description}
          </p>
        )}
      </div>

      {/* ── Dot indicators ── */}
      {slides.length > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:7, marginTop:20 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => go(i)}
              style={{
                width: i === current ? 22 : 8, height:8, borderRadius:4, border:'none', padding:0,
                background: i === current ? T.navy : T.border,
                cursor:'pointer', transition:'all 0.3s ease',
              }}/>
          ))}
        </div>
      )}

      <style>{`
        @keyframes projFadeIn   { from { opacity:0; transform:scale(1.01); } to { opacity:1; transform:scale(1); } }
        @keyframes projProgress { from { width:0%; } to { width:100%; } }
      `}</style>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, signOut, role, logAudit } = useAuth()
  const { toast } = useToast()
  const navigate  = useNavigate()

  const [dark,         setDark]        = useState(false)
  const [profileMenu,  setMenu]        = useState(false)
  const [logoutOpen,   setLogout]      = useState(false)
  const [showProfile,  setShowProfile] = useState(false)
  const [showNotifs,   setShowNotifs]  = useState(false)
  const notifRef = useRef()
  const [showSettings, setShowSettings]= useState(false)
  const [announcements,setAnns]        = useState([])
  const [projects,     setProjects]    = useState([])
  const [events,       setEvents]      = useState([])
  const [calHalf,      setCalHalf]     = useState(0)
  const [feedback,     setFeedback]    = useState({ subject:'', rating:'', message:'' })
  const [submitting,   setSubmitting]  = useState(false)
  const [settingsPw,   setSettingsPw]  = useState({ newpw:'', confirm:'', show:false })
  const menuRef = useRef()

  const T = dark ? DARK : LIGHT

  useEffect(() => {
    loadData()
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const loadData = async () => {
    const [a, p, e] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at',{ascending:false}).limit(10),
      supabase.from('projects').select('*').eq('status','completed').order('completion_date',{ascending:false}),
      supabase.from('events').select('*').order('start_date',{ascending:true}),
    ])
    if (a.data) setAnns(a.data)
    if (p.data) setProjects(p.data)
    if (e.data) setEvents(e.data)
  }

  const handleLogout = async () => { await signOut(); navigate('/login') }

  const handleFeedback = async (ev) => {
    ev.preventDefault()
    if (!feedback.rating)   { toast('Please select a rating.','error'); return }
    if (!feedback.message?.trim()) { toast('Please enter a message.','error'); return }
    setSubmitting(true)
    try {
      // ONE FEEDBACK PER DAY limit
      const today = new Date().toISOString().split('T')[0]
      const { data: todayFb } = await supabase.from('feedback')
        .select('id').eq('user_id', user.id)
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59')
      if (todayFb && todayFb.length > 0) {
        toast('You have already submitted feedback today. You can submit again tomorrow.', 'error')
        setSubmitting(false); return
      }
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id, resident_name: profile?.name || user.email,
        subject: feedback.subject, rating: feedback.rating, message: feedback.message,
      })
      if (error) throw error
      await logAudit('Submit','Feedback','Submitted resident feedback')
      toast('Thank you for your feedback!','success')
      setFeedback({ subject:'', rating:'', message:'' })
    } catch (err) { toast(err.message,'error') }
    finally { setSubmitting(false) }
  }

  const handlePasswordUpdate = async (ev) => {
    ev.preventDefault()
    if (settingsPw.newpw !== settingsPw.confirm) { toast('Passwords do not match.','error'); return }
    try {
      const { error } = await supabase.auth.updateUser({ password: settingsPw.newpw })
      if (error) throw error
      toast('Password updated!','success')
      setShowSettings(false)
      setSettingsPw({ newpw:'', confirm:'', show:false })
    } catch (err) { toast(err.message,'error') }
  }

  /* months for calendar */
  const MONTHS = Array.from({length:12},(_,i) => new Date(2026,i,1))
  const months = calHalf === 0 ? MONTHS.slice(0,6) : MONTHS.slice(6,12)

  const eventsInRange = events.filter(ev => {
    try {
      const d = parseISO(ev.start_date || ev.created_at)
      return months.some(m => d.getFullYear()===m.getFullYear() && d.getMonth()===m.getMonth())
    } catch { return false }
  })

  const annBorderColor = s => ({
    upcoming:'#90CDF4', ongoing: T.gold, cancelled: T.crimson, finished:'#94A3B8'
  }[(s||'').toLowerCase()] || T.border)

  /* ratingBadge */
  const ratingToStars = r => r==='good'?5:r==='average'?3:1

  const sty = {
    page:    { minHeight:'100vh', background: T.bg, color: T.text, fontFamily:'Inter, Georgia, sans-serif', transition:'background .3s, color .3s' },
    nav:     { position:'sticky', top:0, zIndex:100, background: T.navBg, borderBottom:`1px solid ${T.border}`, height:56, display:'flex', alignItems:'center', padding:'0 24px', gap:12 },
    section: { padding:'56px 32px', background: T.sectionBg },
    secAlt:  { padding:'56px 32px', background: T.surface },
    h2:      { fontSize:28, fontWeight:800, color: T.navy, textAlign:'center', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8, fontFamily:'Inter, sans-serif' },
    sub:     { fontSize:14, color: T.textMuted, textAlign:'center', maxWidth:480, margin:'0 auto' },
    card:    { background: T.surface, borderRadius:12, border:`1px solid ${T.border}`, padding:20 },
  }

  return (
    <div style={sty.page}>

      {/* ══ NAVBAR ══ */}
      <nav style={sty.nav}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:180 }}>
          <img src="/SK_Logo.png" alt="SK Logo" style={{ width:52, height:52, objectFit:'contain', flexShrink:0 }}/>
          <div>
            <p style={{ fontSize:11, fontWeight:700, color: T.navy, lineHeight:1.2, fontFamily:'Inter,sans-serif' }}>BAKAKENG CENTRAL</p>
            <p style={{ fontSize:9, color: T.textMuted, letterSpacing:'0.5px', textTransform:'uppercase' }}>Sangguniang Kabataan</p>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ flex:1, display:'flex', justifyContent:'center', gap:4 }}>
          {['Home','Announcements','Projects','Events','Feedback'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              style={{ padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:500, color: T.textMuted, textDecoration:'none', transition:'all .15s', fontFamily:'Inter,sans-serif' }}
              onMouseEnter={e => { e.currentTarget.style.color = T.navy; e.currentTarget.style.background = T.surface2 }}
              onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'transparent' }}>
              {item}
            </a>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Dark mode toggle */}
          <button onClick={() => setDark(d => !d)}
            style={{ background: T.surface2, border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 8px', cursor:'pointer', color: T.textMuted, display:'flex', alignItems:'center' }}>
            {dark ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
          {/* Bell with dropdown */}
          <div ref={notifRef} style={{ position:'relative' }}>
            <button onClick={() => setShowNotifs(n => !n)}
              style={{ background:'none', border:'none', cursor:'pointer', color: T.textMuted, position:'relative', padding:4, display:'flex', alignItems:'center' }}>
              <Bell size={18}/>
              {(announcements.length + events.length) > 0 && (
                <span style={{ position:'absolute', top:-2, right:-2, minWidth:16, height:16, background: T.crimson, borderRadius:8, color:'white', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>
                  {Math.min(announcements.length + events.length, 9)}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="animate-fade-in" style={{ position:'absolute', right:0, top:38, width:320, background: T.surface, border:`1px solid ${T.border}`, borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', zIndex:300, overflow:'hidden' }}>
                <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <p style={{ fontWeight:700, fontSize:14, color: T.navy }}>Notifications</p>
                  <span style={{ fontSize:11, background: T.crimson, color:'white', padding:'2px 8px', borderRadius:10, fontWeight:700 }}>{Math.min(announcements.length+events.length,9)} new</span>
                </div>
                <div style={{ maxHeight:320, overflowY:'auto' }}>
                  {announcements.slice(0,5).map(a => (
                    <div key={a.id} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:10, alignItems:'flex-start' }}
                      onMouseEnter={e => e.currentTarget.style.background=T.surface2} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <div style={{ width:32, height:32, borderRadius:8, background:`${T.navy}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>📢</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color: T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                        <p style={{ fontSize:11, color: T.textMuted, marginTop:1 }}>{a.type} · {a.status}</p>
                      </div>
                    </div>
                  ))}
                  {events.slice(0,3).map(ev => (
                    <div key={ev.id} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:10, alignItems:'flex-start' }}
                      onMouseEnter={e => e.currentTarget.style.background=T.surface2} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <div style={{ width:32, height:32, borderRadius:8, background:`${T.gold}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>📅</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color: T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</p>
                        <p style={{ fontSize:11, color: T.textMuted, marginTop:1 }}>Event · {ev.status||'Upcoming'}</p>
                      </div>
                    </div>
                  ))}
                  {announcements.length===0 && events.length===0 && (
                    <div style={{ padding:'24px 16px', textAlign:'center', color: T.textMuted, fontSize:13 }}>No new notifications</div>
                  )}
                </div>
                <div style={{ padding:'10px 16px', borderTop:`1px solid ${T.border}` }}>
                  <button onClick={() => { setShowNotifs(false); navigate('/settings') }}
                    style={{ width:'100%', padding:'8px', borderRadius:8, background: T.navy, color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                    Manage Notification Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Avatar */}
          <div ref={menuRef} style={{ position:'relative' }}>
            <button onClick={() => setMenu(m => !m)}
              style={{ width:34, height:34, borderRadius:'50%', background: T.crimson, border:'none', cursor:'pointer', color:'white', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
              {(profile?.name || user?.email || 'R')[0].toUpperCase()}
            </button>
            {profileMenu && (
              <div className="animate-fade-in" style={{ position:'absolute', right:0, top:42, width:210, background: T.surface, border:`1px solid ${T.border}`, borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', overflow:'hidden', zIndex:200 }}>
                <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}` }}>
                  <p style={{ fontWeight:700, color: T.navy, fontSize:14, fontFamily:'Inter,sans-serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.name||'Resident'}</p>
                  <p style={{ fontSize:12, color: T.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>{user?.email}</p>
                </div>
                {[
                  { label:'Profile Information', icon:<User size={13}/>, action:()=>{ setShowProfile(true); setMenu(false) } },
                  { label:'Settings',             icon:<Settings size={13}/>, action:()=>{ navigate('/settings'); setMenu(false) } },
                  { label:'Log Out',              icon:<LogOut size={13}/>,  action:()=>{ setLogout(true); setMenu(false) }, danger:true },
                ].map(({ label, icon, action, danger }) => (
                  <button key={label} onClick={action}
                    style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'11px 16px', background:'none', border:'none', cursor:'pointer', fontSize:13, color: danger ? T.crimson : T.text, fontFamily:'Georgia,serif', textAlign:'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    {icon}{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ══ VERIFICATION STATUS BANNER ══ */}
  {profile && profile.verification_status === 'Pending' && (
    <div style={{ background:'#FEF9E7', borderTop:'3px solid #D69E2E', padding:'12px 24px', display:'flex', alignItems:'center', gap:12 }}>
      <span style={{ fontSize:18 }}>⏳</span>
      <div style={{ flex:1 }}>
        <p style={{ fontWeight:700, color:'#7B4800', fontSize:13 }}>ID Verification Pending</p>
        <p style={{ fontSize:12, color:'#92400E', marginTop:1 }}>Your ID is under review by the barangay admin. You'll be notified once approved.</p>
      </div>
    </div>
  )}
  {profile && profile.verification_status === 'Declined' && (
    <div style={{ background:'#FFF5F5', borderTop:'3px solid #C53030', padding:'12px 24px', display:'flex', alignItems:'center', gap:12 }}>
      <span style={{ fontSize:18 }}>❌</span>
      <div style={{ flex:1 }}>
        <p style={{ fontWeight:700, color:'#C53030', fontSize:13 }}>Verification Declined — Action Required</p>
        <p style={{ fontSize:12, color:'#C53030', marginTop:1 }}>Reason: {profile.decline_reason || 'Invalid ID'}. Please update your profile and re-upload a valid ID.</p>
      </div>
      <button onClick={() => navigate('/profile-setup')}
        style={{ padding:'7px 16px', borderRadius:8, background:'#C53030', color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0 }}>
        Re-upload ID
      </button>
    </div>
  )}
  {profile && profile.verification_status === 'Verified' && !profile._bannerDismissed && (
    <div style={{ background:'#F0FFF4', borderTop:'3px solid #48BB78', padding:'10px 24px', display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:16 }}>✅</span>
      <p style={{ fontSize:12, color:'#276749', fontWeight:600 }}>Your account is verified by Barangay Bakakeng Central SK.</p>
    </div>
  )}

  {/* ══ HERO ══ */}
      <section id="home" style={{ background: T.surface, padding:'48px 40px 56px', position:'relative', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', maxWidth:1200, margin:'0 auto', gap:40 }}>
          {/* Left content */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, background:'rgba(214,158,46,0.15)', border:`1px solid ${T.gold}`, fontSize:11, fontWeight:700, color: T.gold, textTransform:'uppercase', letterSpacing:'1px', marginBottom:20 }}>
              Official Portal
            </div>
            <h1 style={{ fontSize:48, fontWeight:900, lineHeight:1.1, marginBottom:20, fontFamily:'Inter, sans-serif', textTransform:'uppercase' }}>
              <span style={{ color: T.text }}>Welcome to</span><br/>
              <span style={{ color: T.text }}>Barangay</span><br/>
              <span style={{ color: T.gold }}>Bakakeng Central</span>
            </h1>
            <p style={{ fontSize:14, color: T.textMuted, lineHeight:1.8, marginBottom:28, maxWidth:420 }}>
              Stay connected, informed, and engaged with your community. Explore projects, events, and services all in one place.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <a href="#events">
                <button style={{ padding:'12px 28px', borderRadius:8, background: T.crimson, color:'white', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, fontFamily:'Inter,sans-serif', transition:'opacity .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.opacity='.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                  View Events
                </button>
              </a>
              <a href="#projects">
                <button style={{ padding:'12px 28px', borderRadius:8, background:'transparent', color: T.text, border:`2px solid ${T.border}`, cursor:'pointer', fontSize:14, fontWeight:700, fontFamily:'Inter,sans-serif', transition:'all .15s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.navy; e.currentTarget.style.color=T.navy }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.text }}>
                  Explore Projects
                </button>
              </a>
            </div>
          </div>

          {/* Right — Barangay Hall photo */}
          <div style={{ flexShrink:0, width:440, borderRadius:18, overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,0.18)', border:`2px solid ${T.border}` }}>
            <img src="/Hero.png" alt="Bakakeng Central Barangay Hall"
              style={{ width:'100%', height:300, objectFit:'cover', display:'block', transition:'transform .4s ease' }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
          </div>
        </div>
      </section>

      {/* ══ ANNOUNCEMENTS ══ */}
      <section id="announcements" style={{ ...sty.section, background: T.sectionBg }}>
        <h2 style={sty.h2}>Latest Announcements</h2>
        <p style={{ ...sty.sub, marginBottom:28 }}>Stay informed about important news and updates in our community.</p>
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          {announcements.length === 0 ? (
            <div style={{ ...sty.card, textAlign:'center', padding:'32px', color: T.textMuted, fontSize:14 }}>
              No recent announcements found.
            </div>
          ) : announcements.map(a => (
            <div key={a.id} style={{ ...sty.card, marginBottom:12, borderLeft:`4px solid ${annBorderColor(a.status)}`, borderRadius:'0 12px 12px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                <span style={{ fontWeight:700, fontSize:14, color: T.navy, fontFamily:'Inter,sans-serif' }}>{a.title}</span>
                <span style={{ padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:700, background: T.surface2, color: T.textMuted }}>{a.status}</span>
                <span style={{ padding:'2px 9px', borderRadius:20, fontSize:10, background: T.surface2, color: T.textMuted }}>{a.type}</span>
              </div>
              {a.date_time && <p style={{ fontSize:12, color: T.textMuted, marginBottom:4 }}>📅 {format(new Date(a.date_time),"MMM d, yyyy 'at' h:mm a")}</p>}
              {a.location   && <p style={{ fontSize:12, color: T.textMuted, marginBottom:6 }}>📍 {a.location}</p>}
              <p style={{ fontSize:13, color: T.text, lineHeight:1.7 }}>{a.content}</p>
              <p style={{ fontSize:11, color: T.textMuted, textAlign:'right', marginTop:8 }}>{a.created_at ? format(new Date(a.created_at),'MMM d, yyyy') : ''}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ ACCOMPLISHED PROJECTS ══ */}
      <section id="projects" style={{ ...sty.secAlt, background: T.surface }}>
        <h2 style={sty.h2}>Accomplished Projects</h2>
        <p style={{ ...sty.sub, marginBottom:40 }}>Take a look at the successful initiatives that have helped our community grow and prosper.</p>
        {projects.length === 0 ? (
          <div style={{ maxWidth:480, margin:'0 auto', ...sty.card, textAlign:'center', padding:'32px', color: T.textMuted, fontSize:14 }}>
            No completed projects documented yet.
          </div>
        ) : (
          <ProjectsCarousel projects={projects} T={T} />
        )}
      </section>

      {/* ══ COMMUNITY EVENTS ══ */}
      <section id="events" style={{ ...sty.section, background: T.sectionBg }}>
        <h2 style={sty.h2}>Community Events</h2>
        <p style={{ ...sty.sub, marginBottom:28 }}>Stay updated with the scheduled activities and events in Barangay Bakakeng Central.</p>

        {/* Half toggle */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:24 }}>
          <button onClick={() => setCalHalf(0)}
            style={{ width:32, height:32, borderRadius:'50%', border:`1px solid ${T.border}`, background: T.surface, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: T.textMuted }}>
            <ChevronLeft size={16}/>
          </button>
          <span style={{ fontSize:16, fontWeight:700, color: T.navy, fontFamily:'Inter,sans-serif', letterSpacing:'0.5px', minWidth:200, textAlign:'center' }}>
            {calHalf === 0 ? 'JANUARY - JUNE 2026' : 'JULY - DECEMBER 2026'}
          </span>
          <button onClick={() => setCalHalf(1)}
            style={{ width:32, height:32, borderRadius:'50%', background: T.gold, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
            <ChevronRight size={16}/>
          </button>
        </div>

        <div style={{ display:'flex', gap:20, maxWidth:1100, margin:'0 auto', overflow:'visible' }}>
          {/* 6-month calendar grid */}
          <div style={{ flex:'2 1 0', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, overflow:'visible' }}>
            {months.map(m => <CalGrid key={m.toString()} month={m} events={events} T={T}/>)}
          </div>
          {/* Event list sidebar */}
          <div style={{ flex:'1 1 0', minWidth:0, ...sty.card }}>
            <h3 style={{ fontSize:22, fontWeight:800, color: T.navy, fontFamily:'Inter,sans-serif', marginBottom:4 }}>
              {format(months[2],'MMMM yyyy').toUpperCase()}
            </h3>
            <div style={{ width:40, height:3, background: T.gold, borderRadius:2, marginBottom:16 }}/>
            {eventsInRange.length === 0
              ? <p style={{ fontSize:13, color: T.textMuted }}>No events scheduled.</p>
              : eventsInRange.map(ev => (
                <div key={ev.id} style={{ paddingBottom:12, marginBottom:12, borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background: T.gold, flexShrink:0 }}/>
                    <p style={{ fontSize:11, color: T.gold, fontWeight:700 }}>
                      {ev.start_date ? format(parseISO(ev.start_date),'MMM d, yyyy') : ''}
                    </p>
                  </div>
                  <p style={{ fontSize:13, fontWeight:700, color: T.navy, fontFamily:'Inter,sans-serif', paddingLeft:14 }}>{ev.title}</p>
                  {ev.description && <p style={{ fontSize:11, color: T.textMuted, paddingLeft:14, marginTop:2, lineHeight:1.5 }}>{ev.description}</p>}
                </div>
              ))
            }
          </div>
        </div>

        {/* Dot indicator */}
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:24 }}>
          {[0,1].map(i => (
            <button key={i} onClick={() => setCalHalf(i)}
              style={{ width: i === calHalf ? 28 : 10, height:10, borderRadius:5, border:'none', cursor:'pointer', background: i === calHalf ? T.gold : T.border, transition:'all .25s' }}/>
          ))}
        </div>
      </section>

      {/* ══ FEEDBACK ══ */}
      <section id="feedback" style={{ ...sty.secAlt, background: T.surface }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', gap:48, alignItems:'center', flexWrap:'wrap' }}>
          {/* Left — testimonial bubbles */}
          <div style={{ flex:'1 1 260px', position:'relative', minHeight:320, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {/* Background circle */}
            <div style={{ width:260, height:260, borderRadius:'50%', background: T.surface2, position:'absolute' }}/>
            {/* Top bubble */}
            <div style={{ position:'absolute', top:20, left:10, background: T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:'12px 16px', maxWidth:200, boxShadow:'0 4px 20px rgba(0,0,0,0.1)' }}>
              <div style={{ display:'flex', gap:2, marginBottom:5 }}>
                {[...Array(5)].map((_,i) => <Star key={i} size={11} fill={T.gold} color={T.gold}/>)}
              </div>
              <p style={{ fontSize:12, color: T.text, lineHeight:1.5, fontStyle:'italic' }}>"Great service! Very responsive team."</p>
            </div>
            {/* Bottom bubble */}
            <div style={{ position:'absolute', bottom:20, right:10, background: T.navy, borderRadius:14, padding:'12px 16px', maxWidth:200, boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }}>
              <p style={{ fontSize:12, color:'white', lineHeight:1.5, fontStyle:'italic' }}>"Love the new digital portal. Easy to use!"</p>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.6)', marginTop:4, fontWeight:600 }}>— Resident</p>
            </div>
          </div>

          {/* Right — feedback form */}
          <div style={{ flex:'1 1 320px', minWidth:0 }}>
            <h2 style={{ ...sty.h2, textAlign:'left', marginBottom:6 }}>Share Your Feedback</h2>
            <p style={{ fontSize:14, color: T.textMuted, marginBottom:24, lineHeight:1.6 }}>
              We value your opinion. Let us know how we can improve our services and community projects.
            </p>
            <form onSubmit={handleFeedback}>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color: T.text, marginBottom:6, fontFamily:'Inter,sans-serif' }}>Subject</label>
                <input
                  style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize:13, fontFamily:'Inter,sans-serif', outline:'none' }}
                  value={feedback.subject} onChange={e => setFeedback(f => ({...f, subject:e.target.value}))}
                  placeholder="What is this about?"/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color: T.text, marginBottom:6, fontFamily:'Inter,sans-serif' }}>Rating</label>
                <select
                  style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize:13, fontFamily:'Inter,sans-serif', outline:'none' }}
                  value={feedback.rating} onChange={e => setFeedback(f => ({...f, rating:e.target.value}))} required>
                  <option value="">How was your experience?</option>
                  <option value="good">Good ⭐⭐⭐⭐⭐</option>
                  <option value="average">Average ⭐⭐⭐</option>
                  <option value="bad">Bad ⭐</option>
                </select>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color: T.text, marginBottom:6, fontFamily:'Inter,sans-serif' }}>Message</label>
                <textarea
                  style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize:13, fontFamily:'Inter,sans-serif', outline:'none', resize:'vertical', minHeight:90 }}
                  value={feedback.message} onChange={e => setFeedback(f => ({...f, message:e.target.value}))}
                  placeholder="Your feedback..." required/>
              </div>
              <button type="submit" disabled={submitting}
                style={{ width:'100%', padding:'14px', borderRadius:8, background: T.crimson, color:'white', border:'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:700, fontFamily:'Inter,sans-serif', letterSpacing:'0.5px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'opacity .15s' }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.opacity='.85' }}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                {submitting ? <Loader2 size={16} className="spinner"/> : <Send size={15}/>}
                SEND FEEDBACK
              </button>
              <p style={{ fontSize:11, color: T.textMuted, textAlign:'center', marginTop:8 }}>
                Your feedback is associated with your account for administrative purposes.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background: T.footerBg, padding:'28px 32px', textAlign:'center', borderTop:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:8 }}>
          <img src="/SK_Logo.png" alt="SK Logo" style={{ width:54, height:54, objectFit:'contain' }}/>
          <p style={{ fontWeight:700, fontSize:14, color: T.footerText, fontFamily:'Inter,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>BAKAKENG CENTRAL</p>
        </div>
        <p style={{ fontSize:11, color: dark ? '#64748B' : 'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
          © 2026 Barangay Bakakeng Central. All Rights Reserved.
        </p>
      </footer>

      {/* ══ ISKAI CHATBOT (bottom-right) ══ */}
      <ISKAIChat/>

      {/* ══ REPORT CONCERN FAB (bottom-left) ══ */}
      <button title="Report a Concern"
        style={{ position:'fixed', bottom:24, left:24, width:52, height:52, borderRadius:'50%', background: T.crimson, border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(197,48,48,0.45)', zIndex:8000 }}>
        <Flag size={20}/>
      </button>

      {/* ══ MODALS ══ */}
      <Modal open={showProfile} onClose={() => setShowProfile(false)} title="Profile Information" size="lg">
        <ProfilingForm isUpdate/>
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Account Settings">
        <form onSubmit={handlePasswordUpdate}>
          <FormField label="New Password" required>
            <div style={{ position:'relative' }}>
              <input className="input-field" type={settingsPw.show ? 'text' : 'password'}
                value={settingsPw.newpw} onChange={e => setSettingsPw(p => ({...p, newpw:e.target.value}))} required minLength={8} style={{ paddingRight:40 }}/>
              <button type="button" onClick={() => setSettingsPw(p => ({...p, show:!p.show}))}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A0AEC0' }}>
                {settingsPw.show ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </FormField>
          <FormField label="Confirm Password" required>
            <input className="input-field" type={settingsPw.show ? 'text' : 'password'}
              value={settingsPw.confirm} onChange={e => setSettingsPw(p => ({...p, confirm:e.target.value}))} required/>
          </FormField>
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <button type="button" onClick={() => setShowSettings(false)} className="btn-ghost" style={{ flex:1 }}>Cancel</button>
            <button type="submit" className="btn-navy" style={{ flex:1 }}>Update Password</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={logoutOpen} onClose={() => setLogout(false)} onConfirm={handleLogout}
        title="Log Out?" message="Are you sure you want to log out?" danger/>
    </div>
  )
}
