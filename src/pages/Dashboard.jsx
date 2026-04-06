import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bell, Sun, Moon, LogOut, User, Settings, Flag, Send, Menu, X,
  Home, Megaphone, FolderOpen, Calendar, MessageSquare,
  ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Star,
  Heart, Activity, Users, Award, Facebook, Mail, LayoutDashboard,
  Paperclip, Trash2
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
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useTheme } from '../contexts/ThemeContext'

/* ─────────────────────── CACHE HELPERS ─────────────────────── */
const CACHE_KEYS = {
  projects:      'sk_cache_projects_v2',
  announcements: 'sk_cache_announcements_v2',
  events:        'sk_cache_events_v2',
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > 10 * 60 * 1000) { localStorage.removeItem(key); return null }
    return Array.isArray(data) ? data : null
  } catch { return null }
}

function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

/* ─────────────────────── GLOBAL CSS ─────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&display=swap');

  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }

  @keyframes fadeSlideIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes carouselNext { from { opacity:0; transform:translateX(60px) scale(.97); } to { opacity:1; transform:none; } }
  @keyframes carouselPrev { from { opacity:0; transform:translateX(-60px) scale(.97); } to { opacity:1; transform:none; } }
  @keyframes progressBar  { from { width:0; } to { width:100%; } }
  @keyframes pulseSlow    { 0%,100% { opacity:.5; } 50% { opacity:.9; } }
  @keyframes shimmer      { from{background-position:-200% 0;} to{background-position:200% 0;} }
  @keyframes spin         { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

  .sk-card {
    background: var(--sk-surface);
    border: 1px solid var(--sk-border);
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04);
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .sk-card:hover {
    box-shadow: 0 6px 24px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05);
    transform: translateY(-1px);
  }

  .sk-ev-card { transition: all .22s cubic-bezier(.4,0,.2,1); cursor: pointer; }
  .sk-ev-card:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 40px rgba(0,0,0,.15) !important; }

  .sk-ann-card { transition: all .18s ease; cursor: pointer; }
  .sk-ann-card:hover { transform: translateX(2px); }

  .sk-soc-btn { transition: all .2s ease; }
  .sk-soc-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.12) !important; }

  .sk-readmore { transition: color .15s; }
  .sk-readmore:hover { opacity: 0.75; }

  .sk-skeleton {
    background: linear-gradient(90deg, rgba(0,0,0,.04) 25%, rgba(0,0,0,.08) 50%, rgba(0,0,0,.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 8px;
  }
  .dark .sk-skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 75%);
    background-size: 200% 100%;
  }

  .sk-hero-img { transition: transform .9s cubic-bezier(.4,0,.2,1); }
  .sk-hero-wrap:hover .sk-hero-img { transform: scale(1.03); }

  .animate-pulse { animation: pulseSlow 1.8s ease-in-out infinite; }

  .sk-nav-item { transition: all .15s ease; }
  .sk-nav-item:hover { background: var(--sk-surface2) !important; }

  @media (max-width: 900px) {
    .sk-right-sidebar { display: none !important; }
    .sk-events-grid { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 640px) {
    .sk-events-grid { grid-template-columns: 1fr !important; }
    .sk-ev-card:hover { transform: none !important; }
  }

  /* ── Events page responsive layout ── */
  .sk-events-layout {
    display: flex;
    flex-direction: row;
    gap: 24px;
    align-items: flex-start;
    max-width: 1200px;
    margin: 0 auto;
  }
  .sk-events-cal-col { flex: 2 1 0; min-width: 0; }
  .sk-events-panel-col {
    flex: 0 0 300px;
    min-width: 280px;
    max-width: 320px;
  }
  .sk-events-cal-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .sk-events-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .sk-events-clock { display: block; }

  /* Tablet: stack events panel above calendar */
  @media (max-width: 1200px) {
    .sk-events-layout { flex-direction: column; }
    .sk-events-panel-col {
      flex: none;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      order: -1;
    }
    .sk-events-cal-col { width: 100%; }
    .sk-right-sidebar { display: none !important; }
  }
  @media (max-width: 900px) {
    .sk-events-header { margin-bottom: 16px; }
  }
  @media (max-width: 640px) {
    .sk-events-cal-grid { grid-template-columns: 1fr !important; }
    .sk-events-clock { display: none; }
  }
`

/* ─────────────────────── THEME ─────────────────────── */
/* These are used inline for the user Dashboard (not admin) */
const LIGHT = {
  /* Base */
  bg:           'transparent',
  surface:      'rgba(255,255,255,0.90)',
  surface2:     'rgba(247,250,252,0.92)',
  surfaceGlass: 'rgba(255,255,255,0.78)',
  border:       'rgba(226,232,240,0.9)',
  borderHover:  '#CBD5E0',
  /* Text */
  text:         '#2D3748',
  textHeading:  '#1A365D',
  textMuted:    '#718096',
  textSubtle:   '#A0AEC0',
  /* Branding */
  navy:         '#1A365D',
  navyLt:       '#2A4A7F',
  gold:         '#D69E2E',
  crimson:      '#C53030',
  /* Specifics */
  calBg:        'rgba(255,255,255,0.92)',
  calBorder:    '#E2E8F0',
  footerBg:     '#1A365D',
  footerText:   '#FFFFFF',
  /* Shadows */
  shadow:       '0 4px 20px rgba(0,0,0,0.07)',
  shadowLg:     '0 12px 40px rgba(26,54,93,0.12)',
}

const DARK = {
  bg:           'transparent',
  surface:      'rgba(30,41,59,0.92)',
  surface2:     'rgba(51,65,85,0.85)',
  surfaceGlass: 'rgba(30,41,59,0.80)',
  border:       'rgba(51,65,85,0.9)',
  borderHover:  '#475569',
  text:         '#E2E8F0',
  textHeading:  '#60A5FA',
  textMuted:    '#94A3B8',
  textSubtle:   '#64748B',
  navy:         '#60A5FA',
  navyLt:       '#93C5FD',
  gold:         '#FBBF24',
  crimson:      '#F87171',
  calBg:        'rgba(30,41,59,0.92)',
  calBorder:    '#334155',
  footerBg:     '#0F172A',
  footerText:   '#94A3B8',
  shadow:       '0 4px 20px rgba(0,0,0,0.3)',
  shadowLg:     '0 12px 40px rgba(0,0,0,0.45)',
}

/* ─────────────────────── CALENDAR GRID ─────────────────────── */
function CalGrid({ month, events, T, selectedDate, onDateClick }) {
  const start = startOfMonth(month)
  const days = eachDayOfInterval({ start, end: endOfMonth(month) })
  const blanks = Array(getDay(start)).fill(null)
  const all = [...blanks, ...days]
  const today = new Date()
  const [hoveredDay, setHoveredDay] = React.useState(null)
  const [cardHover, setCardHover] = React.useState(false)

  const hasEv = d => d && events.some(ev => {
    try { return isSameDay(parseISO(ev.start_date || ev.created_at), d) } catch { return false }
  })
  const isToday = d => d && isSameDay(d, today)
  const isSelected = d => d && selectedDate && isSameDay(d, selectedDate)

  return (
    <div
      onMouseEnter={() => setCardHover(true)}
      onMouseLeave={() => { setCardHover(false); setHoveredDay(null) }}
      style={{
        background: T.calBg,
        borderRadius: 14,
        padding: '14px 16px',
        border: `1px solid ${cardHover ? T.navy : T.calBorder}`,
        transform: cardHover ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
        boxShadow: cardHover ? T.shadowLg : T.shadow,
        transition: 'all .25s cubic-bezier(.4,0,.2,1)',
        cursor: 'default',
        backdropFilter: 'blur(10px)',
      }}>
      <p style={{ textAlign:'center', fontSize:11, fontWeight:800, color:T.navy,
        textTransform:'uppercase', letterSpacing:'1px', marginBottom:8,
        fontFamily: T.fontFamily }}>
        {format(month, 'MMMM yyyy')}
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', color:T.textMuted, fontWeight:700, paddingBottom:4, fontSize:9 }}>{d}</div>
        ))}
        {all.map((d, i) => {
          const ev = hasEv(d); const sel = isSelected(d); const tod = isToday(d); const hov = hoveredDay === i && d !== null
          let bg = 'transparent'
          if (sel) bg = T.gold
          else if (hov && ev) bg = T.navy
          else if (hov && !ev) bg = `${T.navy}18`
          else if (ev) bg = T.navy
          else if (tod) bg = `${T.gold}25`
          let col = T.text
          if (sel || (hov && ev) || ev) col = 'white'
          else if (hov && !ev) col = T.navy
          else if (tod && !hov) col = T.gold
          return (
            <div key={i} style={{ textAlign:'center', padding:'2px 0' }}>
              {d ? (
                <button onClick={() => onDateClick(d)}
                  onMouseEnter={() => setHoveredDay(i)}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{ width:22, height:22, borderRadius:'50%', background:bg, color:col,
                    border: tod&&!sel&&!ev ? `1.5px solid ${T.gold}` : 'none',
                    fontSize:10, fontWeight:(ev||sel||tod)?700:400, cursor:'pointer',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    transition:'all .15s', padding:0 }}>
                  {format(d,'d')}
                </button>
              ) : <span style={{ display:'inline-block', width:22, height:22 }}/>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────── ACCOMPLISHED CAROUSEL ─────────────────────── */
function AccomplishedCarousel({ projects, onSelect, isMobile, siteSettings, isLoading, dark = false }) {
  const { theme: _aTheme } = useTheme()
  const _aFont = `'${_aTheme.fontFamily || 'Plus Jakarta Sans'}', sans-serif`
  const _aPrimary = dark ? (_aTheme.darkPrimaryColor || '#60A5FA') : (_aTheme.primaryColor || '#1A365D')
  const [current, setCurrent] = useState(0)
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)
  const total = projects.length
  const totalRef = useRef(total)
  const currentRef = useRef(current)
  const INTERVAL = 3000
  useEffect(() => { totalRef.current = total }, [total])
  useEffect(() => { currentRef.current = current }, [current])

  const variants = {
    enter: d => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { x:{type:'spring',stiffness:300,damping:30}, opacity:{duration:.25} } },
    exit: d => ({ x: d > 0 ? '-100%' : '100%', opacity: 0, transition: { x:{type:'spring',stiffness:300,damping:30}, opacity:{duration:.2} } }),
  }

  const goNext = useCallback(() => {
    const t = totalRef.current
    setDir(1); setCurrent(prev => (prev + 1) % t)
  }, [])

  useEffect(() => {
    if (paused || total < 2) return
    const t = setInterval(goNext, INTERVAL)
    return () => clearInterval(t)
  }, [paused, total, goNext])

  useEffect(() => { setCurrent(0) }, [projects.length])

  if (isLoading) return (
    <div className="animate-pulse" style={{
      borderRadius:18, height:isMobile?220:300,
      background: dark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.8)',
      border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
      boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.06)',
    }}/>
  )

  if (total === 0) return (
    <div style={{
      borderRadius:18, height:280, display:'flex', alignItems:'center', justifyContent:'center',
      flexDirection:'column', gap:10,
      background: dark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.8)',
      border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
      backdropFilter:'blur(10px)',
    }}>
      <span style={{ fontSize:48 }}>🏛️</span>
      <p style={{ color:dark?'#64748B':'#A0AEC0', fontSize:13, margin:0 }}>No accomplished projects yet.</p>
    </div>
  )

  const p = projects[current]
  const imgSrc = (Array.isArray(p.images) && p.images[0]) || p.banner_url || siteSettings?.heroImage || '/Hero.png'
  const dateFinished = p.completion_date || p.end_date || p.updated_at || p.created_at
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) } catch { return '' } }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ userSelect:'none' }}>
      <div style={{
        borderRadius:18, overflow:'hidden', position:'relative',
        height:isMobile?220:300, flexShrink:0,
        boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.65)' : '0 10px 40px rgba(26,54,93,0.18)',
        border: `1px solid ${dark?'rgba(212,175,55,0.15)':'rgba(26,54,93,0.12)'}`,
      }}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.div key={`acc-${current}`} custom={dir} variants={variants}
            initial="enter" animate="center" exit="exit"
            onClick={() => onSelect && onSelect(p)}
            style={{ position:'absolute', inset:0, cursor:'pointer', willChange:'transform,opacity' }}>
            <img className="sk-hero-img" src={imgSrc} alt={p.project_name||p.title||''}
              onError={e => e.target.src='/Hero.png'}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(15,23,42,0.92) 0%,rgba(15,23,42,0.45) 55%,rgba(15,23,42,0.05) 100%)' }}/>
            <div style={{ position:'absolute', top:14, left:16, display:'inline-flex', alignItems:'center', gap:5,
              padding:'4px 12px', borderRadius:20, background:'rgba(16,185,129,0.92)', color:'white',
              fontSize:9, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase',
              backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,0.2)' }}>
              ✦ ACCOMPLISHED
            </div>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
              justifyContent:'flex-end', padding:isMobile?'16px 18px':'22px 26px' }}>
              <h2 style={{ fontSize:isMobile?17:22, fontWeight:900, color:'white',
                fontFamily: _aFont, lineHeight:1.2, margin:'0 0 8px',
                textShadow:'0 2px 12px rgba(0,0,0,0.6)' }}>
                {p.project_name || p.title}
              </h2>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                {dateFinished && <span style={{ fontSize:11, color:'rgba(255,255,255,0.75)', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ color:'#34D399' }}>✅</span> Completed {fmtDate(dateFinished)}
                </span>}
                {p.budget && <span style={{ fontSize:12, fontWeight:700, color:'#FBBF24' }}>₱{parseFloat(p.budget).toLocaleString()}</span>}
              </div>
              {p.description && <p style={{ fontSize:11, color:'rgba(255,255,255,0.65)', margin:'6px 0 0',
                lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                overflow:'hidden', maxWidth:560 }}>{p.description}</p>}
            </div>
          </motion.div>
        </AnimatePresence>

        {total > 1 && (
          <div style={{ position:'absolute', top:14, right:16, zIndex:20, fontSize:10, fontWeight:700,
            color:'rgba(255,255,255,0.7)', background:'rgba(0,0,0,0.45)', padding:'3px 10px',
            borderRadius:20, backdropFilter:'blur(4px)', pointerEvents:'none' }}>
            {current+1} / {total}
          </div>
        )}

        {total > 1 && (<>
          <button onClick={e => { e.stopPropagation(); setDir(-1); setCurrent(prev=>(prev-1+totalRef.current)%totalRef.current) }}
            style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:34, height:34,
              borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1.5px solid rgba(255,255,255,0.2)',
              color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              zIndex:20, transition:'all .15s', backdropFilter:'blur(4px)' }}>
            <ChevronLeft size={17}/>
          </button>
          <button onClick={e => { e.stopPropagation(); setDir(1); setCurrent(prev=>(prev+1)%totalRef.current) }}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:34, height:34,
              borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1.5px solid rgba(255,255,255,0.2)',
              color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              zIndex:20, transition:'all .15s', backdropFilter:'blur(4px)' }}>
            <ChevronRight size={17}/>
          </button>
        </>)}

        {total > 1 && !paused && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,0.15)', zIndex:20 }}>
            <div key={`pb-acc-${current}`} style={{ height:'100%',
              background: dark ? 'linear-gradient(90deg,#FBBF24,#FDE68A)' : 'linear-gradient(90deg,#C53030,#D69E2E)',
              animation:`progressBar ${INTERVAL}ms linear forwards` }}/>
          </div>
        )}
      </div>

      {total > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:10 }}>
          {projects.map((_,i) => (
            <button key={i} onClick={() => { setDir(i>=current?1:-1); setCurrent(i) }}
              style={{ width:i===current?20:6, height:6, borderRadius:3, border:'none', padding:0,
                background: i===current ? (dark?'#FBBF24':'#1A365D') : (dark?'rgba(255,255,255,0.2)':'rgba(26,54,93,0.2)'),
                cursor:'pointer', transition:'all .35s cubic-bezier(.4,0,.2,1)' }}/>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── PRE-REGISTRATION MODAL ─────────────────────── */
function PreRegistrationModal({ project, profile, T, onClose, onSuccess, userId }) {
  // Compose full name: Given Name + Middle Name + Last Name
  const profileFullName = [
    profile?.given_name,
    profile?.middle_name,
    profile?.last_name,
  ].filter(Boolean).join(' ') || profile?.name || ''

  const profileAddr   = (profile?.address || '').split(',')
  const profilePurok  = (profileAddr[0] || '').replace(/^Purok\s*/i, '').trim()
  const profileStreet = (profileAddr[1] || '').replace(/^Street\s*/i, '').trim()

  const [regForm, setRegForm] = useState({
    full_name:    profileFullName,
    age:          profile?.age ? String(profile.age) : '',
    purok_number: profilePurok,
    street:       profileStreet,
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const inpStyle = {
    width:'100%', padding:'11px 14px', borderRadius:10,
    border:`1.5px solid ${T.border}`, background:T.surface,
    color:T.text, fontSize:13, outline:'none', boxSizing:'border-box',
    fontFamily:'inherit', transition:'border-color .15s',
  }
  const readOnlyStyle = {
    ...inpStyle,
    background: T.surface2,
    color: T.textMuted,
    cursor: 'default',
  }

  const submit = async () => {
    if (!regForm.full_name.trim()) { toast('Please enter your full name.', 'error'); return }
    const ageNum = parseInt(regForm.age)
    if (!regForm.age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) { toast('Please enter a valid age (1–120).', 'error'); return }
    if (!regForm.purok_number.trim()) { toast('Please enter your Purok Number.', 'error'); return }
    setSaving(true)
    try {
      const maxP = project.max_participants ? parseInt(project.max_participants) : null
      if (maxP !== null) {
        const { count: fresh } = await supabase
          .from('project_registrations')
          .select('id', { count:'exact', head:true })
          .eq('project_id', project.id)
        if ((fresh || 0) >= maxP) {
          toast('Sorry, this project is now full.', 'error'); setSaving(false); return
        }
      }
      // Guard: prevent duplicate registration by same user
      if (userId) {
        const { data: existing } = await supabase
          .from('project_registrations')
          .select('id').eq('project_id', project.id).eq('user_id', userId).maybeSingle()
        if (existing) { toast('You have already registered for this project.', 'error'); setSaving(false); return }
      }
      const { error } = await supabase.from('project_registrations').insert({
        project_id:   project.id,
        user_id:      userId || null,
        full_name:    regForm.full_name.trim(),
        age:          ageNum,
        purok_number: regForm.purok_number.trim(),
        street:       regForm.street.trim() || null,
        created_at:   new Date().toISOString(),
      })
      if (error) throw error
      onSuccess(regForm.full_name.trim())
    } catch (err) { toast(err.message || 'Registration failed. Please try again.', 'error') }
    finally { setSaving(false) }
  }

  const hasProfileData = !!(profileFullName || profile?.age || profilePurok || profileStreet)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:9100,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(8px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.surface, borderRadius:20, maxWidth:460, width:'100%',
          boxShadow:'0 32px 80px rgba(0,0,0,0.45)', border:`1px solid ${T.border}`,
          animation:'fadeSlideIn .22s ease', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${T.border}`,
          background:'linear-gradient(135deg,#1A365D,#2A4A7F)', position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:14, right:14, width:30, height:30,
            borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
            color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14}/>
          </button>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase',
            letterSpacing:'1px', margin:'0 0 4px' }}>📋 Pre-Registration</p>
          <h3 style={{ fontSize:16, fontWeight:800, color:'white', margin:0, lineHeight:1.3, paddingRight:36 }}>
            {project.project_name}
          </h3>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px' }}>
          {hasProfileData && (
            <div style={{ padding:'9px 12px', borderRadius:9, background:'rgba(26,54,93,0.06)',
              border:'1px solid rgba(26,54,93,0.12)', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14 }}>ℹ️</span>
              <p style={{ fontSize:11, color:T.textMuted, margin:0, lineHeight:1.5 }}>
                Your account details have been pre-filled. You may edit them if needed.
              </p>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Full Name */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:'.5px', display:'block', marginBottom:6 }}>Full Name *</label>
              <input value={regForm.full_name}
                onChange={e => setRegForm(f=>({...f, full_name:e.target.value}))}
                placeholder="Given Name Middle Name Last Name"
                style={profileFullName ? readOnlyStyle : inpStyle}/>
              {profileFullName && (
                <p style={{ fontSize:10, color:T.textMuted, margin:'4px 0 0', fontStyle:'italic' }}>
                  Auto-filled from your account (Given · Middle · Last)
                </p>
              )}
            </div>

            {/* Age */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:'.5px', display:'block', marginBottom:6 }}>Age *</label>
              <input type="number" min="1" max="120"
                value={regForm.age}
                onChange={e => setRegForm(f=>({...f, age:e.target.value}))}
                placeholder="Enter your age"
                style={profile?.age ? readOnlyStyle : inpStyle}/>
            </div>

            {/* Purok Number */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:'.5px', display:'block', marginBottom:6 }}>Purok Number *</label>
              <input value={regForm.purok_number}
                onChange={e => setRegForm(f=>({...f, purok_number:e.target.value}))}
                placeholder="e.g. 1, Sampaguita"
                style={profilePurok ? readOnlyStyle : inpStyle}/>
              {profilePurok && (
                <p style={{ fontSize:10, color:T.textMuted, margin:'4px 0 0', fontStyle:'italic' }}>
                  Auto-filled from your account
                </p>
              )}
            </div>

            {/* Street */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:'.5px', display:'block', marginBottom:6 }}>Street</label>
              <input value={regForm.street}
                onChange={e => setRegForm(f=>({...f, street:e.target.value}))}
                placeholder="e.g. Abanao Street"
                style={profileStreet ? readOnlyStyle : inpStyle}/>
              {profileStreet && (
                <p style={{ fontSize:10, color:T.textMuted, margin:'4px 0 0', fontStyle:'italic' }}>
                  Auto-filled from your account
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button onClick={submit} disabled={saving}
              style={{ flex:1, padding:'12px', borderRadius:11,
                background:'linear-gradient(135deg,#1A365D,#2A4A7F)', color:'white',
                fontSize:13, fontWeight:800, border:'none',
                cursor: saving ? 'not-allowed':'pointer', opacity: saving ? .7:1,
                boxShadow:'0 4px 16px rgba(26,54,93,0.3)', letterSpacing:'.2px' }}>
              {saving ? 'Submitting…' : '✅ Submit Registration'}
            </button>
            <button onClick={onClose} disabled={saving}
              style={{ padding:'12px 18px', borderRadius:11, background:T.surface2,
                border:`1.5px solid ${T.border}`, color:T.textMuted,
                fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── PROJECT DETAIL MODAL ─────────────────────── */
function ProjectDetailModal({ project, profile, T, onClose, logAudit, userId }) {
  const [galIdx,         setGalIdx]         = useState(0)
  const [evidenceGalIdx, setEvidenceGalIdx] = useState(0)
  const [regCount,  setRegCount]  = useState(null)
  const [showReg,   setShowReg]   = useState(false)
  const [regDone,   setRegDone]   = useState(false)
  const [regName,   setRegName]   = useState('')
  const imgs         = (project?.images          || []).filter(Boolean)
  const evidenceImgs = (project?.evidence_images || []).filter(Boolean)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') { if (showReg) setShowReg(false); else onClose() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, showReg])

  // Load current registration count on open + check if user already registered
  useEffect(() => {
    if (!project?.id) return
    supabase
      .from('project_registrations')
      .select('id', { count:'exact', head:true })
      .eq('project_id', project.id)
      .then(({ count }) => setRegCount(count || 0))
    if (userId) {
      supabase
        .from('project_registrations')
        .select('id')
        .eq('project_id', project.id)
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => { if (data) setRegDone(true) })
    }
  }, [project?.id, userId])

  if (!project) return null

  const status       = (project.status||'').toLowerCase().trim()
  const isAccomplishedP = ['accomplished','completed','done'].includes(status)
  const isUpcoming   = status === 'upcoming'
  const maxP         = project.max_participants ? parseInt(project.max_participants) : null
  const isFull       = maxP !== null && regCount !== null && regCount >= maxP
  const showJoinBtn  = isUpcoming && !isFull && !regDone

  // ── Schedule helpers ──────────────────────────────────────────────
  const sd = project.start_date ? new Date(project.start_date) : null
  const ed = project.end_date   ? new Date(project.end_date)   : null
  const fmtDate  = d => d.toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' })
  const fmtDay   = d => d.toLocaleDateString('en-PH', { weekday:'long' })
  const fmtTime  = d => d.toLocaleTimeString('en-PH', { hour:'numeric', minute:'2-digit', hour12:true })
  const isLongTerm = sd && ed && (
    ed.getFullYear() !== sd.getFullYear() ||
    ed.getMonth()    !== sd.getMonth()    ||
    ed.getDate()     !== sd.getDate()
  )

  // ── Status badge style ────────────────────────────────────────────
  const badgeStyle = isAccomplishedP
    ? { bg:'rgba(16,185,129,0.13)',  color:'#059669', border:'rgba(16,185,129,0.3)',  label:'✦ Accomplished' }
    : isUpcoming
      ? { bg:'rgba(59,130,246,0.12)', color:'#1D4ED8', border:'rgba(59,130,246,0.3)', label:'⟳ Upcoming' }
      : status === 'ongoing'
        ? { bg:'rgba(245,158,11,0.12)', color:'#B45309', border:'rgba(245,158,11,0.3)', label:'● Ongoing' }
        : { bg:'rgba(100,116,139,0.1)', color:'#475569', border:'rgba(100,116,139,0.25)', label:(project.status||'').charAt(0).toUpperCase()+(project.status||'').slice(1) }

  // ── Banner image source ───────────────────────────────────────────
  const bannerSrc = imgs.length > 0 ? imgs[galIdx] : (project.banner_url || null)

  return (
    <>
    <div style={{ position:'fixed', inset:0, background:'rgba(10,15,30,0.78)', zIndex:9000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(8px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.surface, borderRadius:22, maxWidth:820, width:'100%', maxHeight:'92vh',
          overflow:'hidden', display:'flex', flexDirection:'column',
          boxShadow:'0 40px 100px rgba(0,0,0,0.5)', border:`1px solid ${T.border}`,
          animation:'fadeSlideIn .25s ease' }}>

        {/* ══════════════════════════════════════════════════════════
            SECTION 1 — TITLE + STATUS BADGE (always at very top)
        ══════════════════════════════════════════════════════════ */}
        <div style={{ padding:'22px 26px 18px', borderBottom:`1px solid ${T.border}`,
          background: `linear-gradient(135deg, #0f1e35 0%, #1a2f50 100%)`,
          flexShrink:0, position:'relative' }}>

          {/* Close button */}
          <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:32, height:32,
            borderRadius:'50%', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)',
            color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.22)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}>
            <X size={14}/>
          </button>

          {/* Status badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 13px',
            borderRadius:20, fontSize:10, fontWeight:800, letterSpacing:'1px', textTransform:'uppercase',
            marginBottom:10, background:badgeStyle.bg, color:badgeStyle.color,
            border:`1px solid ${badgeStyle.border}` }}>
            {badgeStyle.label}
          </div>

          {/* Title */}
          <h2 style={{ fontSize:24, fontWeight:900, color:'#ffffff', fontFamily:T.fontFamily,
            margin:0, lineHeight:1.25, paddingRight:40, letterSpacing:'-0.3px' }}>
            {project.project_name || project.title}
          </h2>
        </div>

        {/* ══════════════════════════════════════════════════════════
            SCROLLABLE BODY
        ══════════════════════════════════════════════════════════ */}
        <div style={{ overflowY:'auto', flex:1 }}>

          {/* ── SECTION 2 — Full-width picture banner ── */}
          {bannerSrc && (
            <div style={{ position:'relative', width:'100%', height:240, overflow:'hidden',
              background:'#0a0f1a', flexShrink:0 }}>
              <img src={bannerSrc} alt={project.project_name} onError={e=>e.target.src='/Hero.png'}
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
              <div style={{ position:'absolute', inset:0,
                background:'linear-gradient(to bottom, transparent 50%, rgba(10,15,30,0.4) 100%)' }}/>
              {imgs.length > 1 && (<>
                <button onClick={() => setGalIdx(i=>(i-1+imgs.length)%imgs.length)}
                  style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:34, height:34,
                    borderRadius:'50%', background:'rgba(0,0,0,0.55)', border:'1px solid rgba(255,255,255,0.2)',
                    color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ChevronLeft size={16}/>
                </button>
                <button onClick={() => setGalIdx(i=>(i+1)%imgs.length)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:34, height:34,
                    borderRadius:'50%', background:'rgba(0,0,0,0.55)', border:'1px solid rgba(255,255,255,0.2)',
                    color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ChevronRight size={16}/>
                </button>
                {/* Dot indicators */}
                <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
                  display:'flex', gap:5 }}>
                  {imgs.map((_,i) => (
                    <button key={i} onClick={()=>setGalIdx(i)}
                      style={{ width: i===galIdx?18:6, height:6, borderRadius:3, border:'none', padding:0,
                        background: i===galIdx?'white':'rgba(255,255,255,0.45)', cursor:'pointer', transition:'all .2s' }}/>
                  ))}
                </div>
              </>)}
            </div>
          )}

          {/* ── Body padding wrapper ── */}
          <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:14 }}>

            {/* ── COMPLETED ON BANNER (accomplished projects only) ── */}
            {isAccomplishedP && (project.completion_date || project.end_date) && (() => {
              const cd = new Date(project.completion_date || project.end_date)
              const fmtCD = cd.toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric', weekday:'long' })
              return (
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px',
                  borderRadius:14, background:'rgba(16,185,129,0.1)',
                  border:'1.5px solid rgba(16,185,129,0.3)' }}>
                  <span style={{ fontSize:22 }}>✅</span>
                  <div>
                    <p style={{ fontSize:10, fontWeight:800, color:'#059669', textTransform:'uppercase',
                      letterSpacing:'1.2px', margin:'0 0 2px' }}>Completed On</p>
                    <p style={{ fontSize:16, fontWeight:900, color:'#065F46', margin:0, lineHeight:1.3 }}>
                      {fmtCD}
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* ── SECTION 3 — Schedule ── */}
            {sd && (
              <div style={{ background:T.surface2, borderRadius:14, border:`1px solid ${T.border}`,
                overflow:'hidden' }}>
                {/* Section header bar */}
                <div style={{ padding:'9px 16px', background:'rgba(26,54,93,0.07)',
                  borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14 }}>📅</span>
                  <span style={{ fontSize:10, fontWeight:800, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:'1px' }}>Schedule</span>
                </div>
                <div style={{ padding:'16px 18px' }}>
                  {isLongTerm ? (<>
                    {/* Long-term project */}
                    <p style={{ fontSize:16, fontWeight:800, color:T.textHeading, margin:'0 0 6px', lineHeight:1.4 }}>
                      Dates: {fmtDate(sd)} – {fmtDate(ed)}
                    </p>
                    <p style={{ fontSize:13, fontWeight:600, color:T.textMuted, margin:'0 0 4px', lineHeight:1.6 }}>
                      Time: {fmtTime(sd)}{ed ? ` – ${fmtTime(ed)}` : ''}
                    </p>
                    {(project.days_of_week || []).length > 0 && (
                      <p style={{ fontSize:13, fontWeight:700, color:T.text, margin:0, lineHeight:1.6 }}>
                        📅 {project.days_of_week.join(' · ')}
                      </p>
                    )}
                  </>) : (<>
                    {/* Single-occurrence (1-day) project */}
                    <p style={{ fontSize:16, fontWeight:800, color:T.textHeading, margin:'0 0 6px', lineHeight:1.4 }}>
                      Date: {fmtDate(sd)}, {fmtDay(sd)}
                    </p>
                    <p style={{ fontSize:13, fontWeight:600, color:T.textMuted, margin:0, lineHeight:1.6 }}>
                      {fmtTime(sd)}{ed ? ` – ${fmtTime(ed)}` : ''}
                    </p>
                  </>)}
                </div>
              </div>
            )}

            {/* ── SECTION 4 — Administrative Details (2-column grid) ── */}
            {(project.prepared_by || project.budget || project.fund_source) && (
              <div style={{ background:T.surface2, borderRadius:14, border:`1px solid ${T.border}`,
                overflow:'hidden' }}>
                {/* Section header bar */}
                <div style={{ padding:'9px 16px', background:'rgba(26,54,93,0.07)',
                  borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14 }}>🗂️</span>
                  <span style={{ fontSize:10, fontWeight:800, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:'1px' }}>Administrative Details</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
                  {/* Prepared By — full width if alone, otherwise top-left */}
                  {project.prepared_by && (
                    <div style={{ padding:'14px 18px',
                      borderRight:`1px solid ${T.border}`,
                      borderBottom: (project.budget || project.fund_source) ? `1px solid ${T.border}` : 'none',
                      gridColumn: (!project.budget && !project.fund_source) ? '1 / -1' : 'auto' }}>
                      <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                        letterSpacing:'.6px', margin:'0 0 5px' }}>👤 Prepared By</p>
                      <p style={{ fontSize:15, fontWeight:800, color:T.text, margin:0 }}>{project.prepared_by}</p>
                    </div>
                  )}
                  {/* Placeholder to keep grid aligned if no prepared_by but has budget */}
                  {!project.prepared_by && (project.budget || project.fund_source) && (
                    <div style={{ borderRight:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}/>
                  )}
                  {/* Budget */}
                  {project.budget && (
                    <div style={{ padding:'14px 18px',
                      borderBottom: project.fund_source ? `1px solid ${T.border}` : 'none' }}>
                      <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                        letterSpacing:'.6px', margin:'0 0 5px' }}>💰 Budget</p>
                      <p style={{ fontSize:18, fontWeight:900, color:'#059669', margin:0, letterSpacing:'-0.3px' }}>
                        ₱{parseFloat(project.budget).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {/* Fund Source — spans full width at bottom */}
                  {project.fund_source && (
                    <div style={{ padding:'14px 18px', gridColumn:'1 / -1',
                      borderTop: project.budget ? `1px solid ${T.border}` : 'none' }}>
                      <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                        letterSpacing:'.6px', margin:'0 0 5px' }}>🏦 Fund Source</p>
                      <p style={{ fontSize:15, fontWeight:800, color:T.text, margin:0 }}>{project.fund_source}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SECTION 5 — About this Project ── */}
            {project.description && (
              <div style={{ background:T.surface2, borderRadius:14, border:`1px solid ${T.border}`,
                overflow:'hidden' }}>
                <div style={{ padding:'9px 16px', background:'rgba(26,54,93,0.07)',
                  borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14 }}>📄</span>
                  <span style={{ fontSize:10, fontWeight:800, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:'1px' }}>About this Project</span>
                </div>
                <p style={{ fontSize:13.5, color:T.text, lineHeight:1.85, margin:0,
                  padding:'16px 18px', whiteSpace:'pre-wrap' }}>{project.description}</p>
              </div>
            )}

            {/* ── SECTION 6 — Evidence of Completion (accomplished only) ── */}
            {isAccomplishedP && evidenceImgs.length > 0 && (
              <div style={{ background:T.surface2, borderRadius:14, border:`1px solid rgba(16,185,129,0.3)`,
                overflow:'hidden' }}>
                <div style={{ padding:'9px 16px', background:'rgba(16,185,129,0.08)',
                  borderBottom:`1px solid rgba(16,185,129,0.2)`, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14 }}>📸</span>
                  <span style={{ fontSize:10, fontWeight:800, color:'#059669', textTransform:'uppercase',
                    letterSpacing:'1px' }}>Evidence of Completion</span>
                  <span style={{ marginLeft:'auto', fontSize:9, fontWeight:700, color:'#059669',
                    background:'rgba(16,185,129,0.12)', padding:'2px 8px', borderRadius:20 }}>
                    {evidenceImgs.length} photo{evidenceImgs.length > 1 ? 's' : ''}
                  </span>
                </div>
                {/* Featured photo with nav arrows */}
                <div style={{ padding:'14px 14px 8px' }}>
                  <div style={{ borderRadius:10, overflow:'hidden', position:'relative',
                    aspectRatio: evidenceImgs.length === 1 ? '16/7' : '16/8',
                    background:'#0a0a0a', boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
                    <img src={evidenceImgs[evidenceGalIdx]} alt={`Evidence ${evidenceGalIdx+1}`}
                      onError={e=>e.target.src='/Hero.png'}
                      style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'opacity .25s' }}/>
                    {evidenceImgs.length > 1 && (
                      <>
                        <button onClick={() => setEvidenceGalIdx(i=>(i-1+evidenceImgs.length)%evidenceImgs.length)}
                          style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                            width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.55)',
                            border:'none', color:'white', fontSize:20, cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>&#8249;</button>
                        <button onClick={() => setEvidenceGalIdx(i=>(i+1)%evidenceImgs.length)}
                          style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                            width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.55)',
                            border:'none', color:'white', fontSize:20, cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>&#8250;</button>
                        <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
                          display:'flex', gap:5 }}>
                          {evidenceImgs.map((_,i) => (
                            <button key={i} onClick={()=>setEvidenceGalIdx(i)}
                              style={{ width:i===evidenceGalIdx?18:6, height:6, borderRadius:3,
                                border:'none', padding:0, cursor:'pointer', transition:'all .25s',
                                background:i===evidenceGalIdx?'white':'rgba(255,255,255,0.45)' }}/>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* Thumbnail strip */}
                {evidenceImgs.length > 1 && (
                  <div style={{ display:'flex', gap:8, padding:'0 14px 14px', overflowX:'auto' }}>
                    {evidenceImgs.map((src, i) => (
                      <img key={i} src={src} alt={`Thumb ${i+1}`}
                        onClick={() => setEvidenceGalIdx(i)}
                        onError={e=>e.target.src='/Hero.png'}
                        style={{ width:72, height:54, objectFit:'cover', borderRadius:8, flexShrink:0,
                          cursor:'pointer', transition:'all .2s',
                          border: i===evidenceGalIdx ? '2px solid #059669' : '2px solid transparent',
                          opacity: i===evidenceGalIdx ? 1 : 0.65 }}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Slots info ── */}
            {maxP !== null && regCount !== null && (
              <div style={{ padding:'12px 16px', background:T.surface2, borderRadius:12,
                border:`1px solid ${isFull ? 'rgba(197,48,48,0.3)' : T.border}`,
                display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>👥</span>
                <div>
                  <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:'.5px', margin:'0 0 2px' }}>Slots</p>
                  <p style={{ fontSize:14, fontWeight:800,
                    color: isFull ? '#C53030' : T.text, margin:0 }}>
                    {regCount} / {maxP} registered{isFull ? ' — FULL' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* ── Registration status banners ── */}
            {isUpcoming && regDone && (
              <div style={{ padding:'18px 16px', borderRadius:12, background:'rgba(16,185,129,0.07)',
                border:'1.5px solid rgba(16,185,129,0.25)', textAlign:'center' }}>
                <p style={{ fontSize:24, margin:'0 0 6px' }}>🎉</p>
                <p style={{ fontSize:14, fontWeight:800, color:'#059669', margin:'0 0 4px' }}>You're Registered!</p>
                <p style={{ fontSize:12, color:T.textMuted, margin:0 }}>
                  Thank you, <strong>{regName}</strong>! Your slot has been reserved.
                </p>
              </div>
            )}
            {isUpcoming && isFull && !regDone && (
              <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(197,48,48,0.06)',
                border:'1.5px solid rgba(197,48,48,0.2)', textAlign:'center' }}>
                <p style={{ fontSize:18, margin:'0 0 4px' }}>🚫</p>
                <p style={{ fontSize:13, fontWeight:800, color:'#C53030', margin:'0 0 2px' }}>Registration is Full</p>
                <p style={{ fontSize:11, color:T.textMuted, margin:0 }}>This project has reached its maximum participants.</p>
              </div>
            )}
          </div>{/* end body padding wrapper */}
        </div>{/* end scrollable body */}

        {/* ══════════════════════════════════════════════════════════
            FOOTER — Pre-register (primary) + Close (outline)
        ══════════════════════════════════════════════════════════ */}
        <div style={{ padding:'16px 26px', borderTop:`1px solid ${T.border}`, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10,
          background:T.surface2 }}>
          {/* Pre-register button — always visible for upcoming, disabled once done/full */}
          {isUpcoming && (
            <button
              onClick={() => { if (!regDone && !isFull) setShowReg(true) }}
              disabled={regDone || isFull}
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 26px',
                borderRadius:10, background: regDone || isFull
                  ? 'rgba(100,116,139,0.2)'
                  : 'linear-gradient(135deg,#1A365D,#2A4A7F)',
                color: regDone || isFull ? T.textMuted : 'white',
                fontSize:13, fontWeight:800, border:'none',
                cursor: regDone || isFull ? 'not-allowed' : 'pointer',
                boxShadow: regDone || isFull ? 'none' : '0 4px 18px rgba(26,54,93,0.4)',
                letterSpacing:'.3px', transition:'opacity .15s' }}
              onMouseEnter={e=>{ if(!regDone&&!isFull) e.currentTarget.style.opacity='.88' }}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              {regDone ? '✅ Registered' : isFull ? '🚫 Full' : '📋 Pre-register'}
            </button>
          )}
          <button onClick={onClose}
            style={{ padding:'11px 26px', borderRadius:10, background:'transparent',
              border:`2px solid ${T.border}`, color:T.text, fontSize:13, fontWeight:700,
              cursor:'pointer', transition:'border-color .15s, background .15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.textMuted; e.currentTarget.style.background=T.surface2 }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background='transparent' }}>
            Close
          </button>
        </div>
      </div>
    </div>

    {/* Separate pre-registration modal layered on top */}
    {showReg && (
      <PreRegistrationModal
        project={project}
        profile={profile}
        T={T}
        userId={userId}
        onClose={() => setShowReg(false)}
        onSuccess={async name => {
          setRegCount(c => (c||0) + 1)
          setRegName(name)
          setRegDone(true)
          setShowReg(false)
          if (logAudit) await logAudit('Join', 'Projects', `Joined project: ${project.title}`)
        }}
      />
    )}
    </>
  )
}

/* ─────────────────────── EVENT DETAIL PANEL ─────────────────────── */
function EventDetailPanel({ ev, clock, evCountdown, T, onClose }) {
  const cd = evCountdown(ev)
  const statusStyle = {
    upcoming:  { bg:'rgba(245,158,11,0.1)',   color:'#D97706',   border:'rgba(245,158,11,0.25)' },
    ongoing:   { bg:'rgba(16,185,129,0.1)',   color:'#059669',   border:'rgba(16,185,129,0.25)' },
    finished:  { bg:'rgba(100,116,139,0.1)',  color:'#718096',   border:'rgba(100,116,139,0.2)' },
    cancelled: { bg:'rgba(197,48,48,0.08)',   color:'#C53030',   border:'rgba(197,48,48,0.2)' },
    completed: { bg:'rgba(16,185,129,0.1)',   color:'#059669',   border:'rgba(16,185,129,0.25)' },
  }
  const ss = statusStyle[(ev.status||'').toLowerCase()] || statusStyle.upcoming
  return (
    <div style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.border}`,
      overflow:'hidden', animation:'fadeSlideIn .2s ease',
      boxShadow:'0 8px 32px rgba(0,0,0,0.1)' }}>
      {ev.banner_url && (
        <div style={{ height:130, overflow:'hidden', position:'relative' }}>
          <img src={ev.banner_url} alt={ev.title} onError={e=>e.target.src='/Hero.png'}
            style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(15,23,42,0.6),transparent)' }}/>
        </div>
      )}
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20,
            background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`, textTransform:'capitalize' }}>
            {ev.status||'upcoming'}
          </span>
          <button onClick={onClose} style={{ background:T.surface2, border:`1px solid ${T.border}`,
            borderRadius:7, width:28, height:28, cursor:'pointer', color:T.textMuted,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={13}/>
          </button>
        </div>
        <h3 style={{ fontSize:16, fontWeight:800, color:T.textHeading, margin:'0 0 12px',
          fontFamily: T.fontFamily, lineHeight:1.3 }}>{ev.title}</h3>
        {cd && (ev.status||'').toLowerCase() !== 'cancelled' && (
          <div style={{ padding:'8px 12px', borderRadius:10, background:ss.bg,
            border:`1px solid ${ss.border}`, marginBottom:12 }}>
            <p style={{ fontSize:12, fontWeight:700, color:ss.color, margin:0 }}>⏱ {cd.label}</p>
          </div>
        )}
        {[
          ev.start_date && ['📅 Date', new Date(ev.start_date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})],
          ev.start_date && ['🕐 Time', new Date(ev.start_date).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})],
          ev.handler && ['👤 Handler', ev.handler],
        ].filter(Boolean).map(([label, val]) => (
          <div key={label} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:10, color:T.textMuted, width:80, flexShrink:0 }}>{label}</span>
            <span style={{ fontSize:11, color:T.text, fontWeight:500 }}>{val}</span>
          </div>
        ))}
        {ev.location && (() => {
          const hasC = ev.location_lat && ev.location_lng
          const embedUrl = hasC
            ? `https://maps.google.com/maps?q=${ev.location_lat},${ev.location_lng}&output=embed&z=17`
            : `https://maps.google.com/maps?q=${encodeURIComponent(ev.location)}&output=embed&z=16&iwloc=near`
          const openUrl = hasC
            ? `https://maps.google.com/?q=${ev.location_lat},${ev.location_lng}&z=17`
            : `https://maps.google.com/?q=${encodeURIComponent(ev.location)}&z=16`
          return (
            <div>
              <div style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:10, color:T.textMuted, width:80, flexShrink:0 }}>📍 Venue</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <span style={{ fontSize:11, color:T.text, fontWeight:500 }}>{ev.location}</span>
                  {hasC && (
                    <span style={{ display:'inline-block', marginLeft:6, fontSize:9, color:'#059669',
                      fontFamily:'monospace', background:'rgba(5,150,105,0.08)',
                      padding:'1px 6px', borderRadius:20, border:'1px solid rgba(5,150,105,0.2)', fontWeight:600 }}>
                      📌 {parseFloat(ev.location_lat).toFixed(4)}, {parseFloat(ev.location_lng).toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ marginTop:10, borderRadius:10, overflow:'hidden', border:`1px solid ${T.border}` }}>
                <div style={{ padding:'5px 10px', background:T.surface2, borderBottom:`1px solid ${T.border}`,
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>🗺️ Map</span>
                  <a href={openUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize:9, fontWeight:700, color:T.navy, textDecoration:'none' }}>Open in Maps ↗</a>
                </div>
                <iframe title="event-location" src={embedUrl}
                  width="100%" height="180" style={{ display:'block', border:'none' }}
                  loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"/>
              </div>
            </div>
          )
        })()}
        {ev.description && (
          <p style={{ fontSize:12, color:T.textMuted, marginTop:10, lineHeight:1.7 }}>{ev.description}</p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── PROJECTS PAGE ─────────────────────── */
const PROJECTS_AUTOPLAY_INTERVAL = 3000
const PROJECTS_STATUS_COLORS = {
  light: {
    upcoming:     { bg:'#DBEAFE', color:'#1D4ED8' },
    ongoing:      { bg:'#DCFCE7', color:'#166534' },
    'on hold':    { bg:'#FEF9E7', color:'#7B4800' },
    planning:     { bg:'#EBF8FF', color:'#0369A1' },
    completed:    { bg:'#F0FFF4', color:'#276749' },
    accomplished: { bg:'#F0FFF4', color:'#276749' },
    done:         { bg:'#F0FFF4', color:'#276749' },
  },
  dark: {
    upcoming:     { bg:'rgba(59,130,246,0.18)',  color:'#93C5FD' },
    ongoing:      { bg:'rgba(34,197,94,0.15)',   color:'#6EE7B7' },
    'on hold':    { bg:'rgba(251,191,36,0.12)',  color:'#FCD34D' },
    planning:     { bg:'rgba(96,165,250,0.12)',  color:'#7DD3FC' },
    completed:    { bg:'rgba(52,211,153,0.12)',  color:'#6EE7B7' },
    accomplished: { bg:'rgba(52,211,153,0.12)',  color:'#6EE7B7' },
    done:         { bg:'rgba(52,211,153,0.12)',  color:'#6EE7B7' },
  },
}

function ProjectsMainCarousel({ items, label, accentColor, dark, isMobile, siteSettings, setSelectedProject }) {
  const { theme: _pTheme } = useTheme()
  const _pFont    = `'${_pTheme.fontFamily || 'Plus Jakarta Sans'}', sans-serif`
  const _pCrimson = dark ? (_pTheme.darkSecondaryColor || '#F87171') : (_pTheme.secondaryColor || '#C53030')
  const [idx, setIdx]     = React.useState(0)
  const [dir, setDir]     = React.useState(1)
  const [paused, setPaused] = React.useState(false)
  const total             = items.length
  const totalRef          = React.useRef(total)
  const idxRef            = React.useRef(idx)
  React.useEffect(() => { totalRef.current = total }, [total])
  React.useEffect(() => { idxRef.current = idx }, [idx])

  const variants = {
    enter: (d) => ({ x: d>0?'100%':'-100%', opacity:0 }),
    center: { x:0, opacity:1, transition:{ x:{type:'spring',stiffness:300,damping:30}, opacity:{duration:.25,ease:'easeOut'} } },
    exit: (d) => ({ x: d>0?'-100%':'100%', opacity:0, transition:{ x:{type:'spring',stiffness:300,damping:30}, opacity:{duration:.2,ease:'easeIn'} } }),
  }

  const go = React.useCallback((nextIdx, nextDir) => {
    const t = totalRef.current
    const safe = ((nextIdx%t)+t)%t
    setDir(nextDir); setIdx(safe)
  }, [])

  const goNext = React.useCallback(() => go((idxRef.current+1)%totalRef.current, 1), [go])
  const goPrev = React.useCallback(() => {
    const t = totalRef.current; go((idxRef.current-1+t)%t, -1)
  }, [go])

  React.useEffect(() => {
    if (paused || total < 2) return
    const t = setInterval(goNext, PROJECTS_AUTOPLAY_INTERVAL)
    return () => clearInterval(t)
  }, [paused, total, goNext])

  React.useEffect(() => { setIdx(0) }, [items.length])

  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'}) } catch { return '' } }
  const getImg  = p => (Array.isArray(p.images)&&p.images.filter(Boolean)[0])||p.banner_url||siteSettings?.heroImage||'/Hero.png'
  const getSc   = p => (dark?PROJECTS_STATUS_COLORS.dark:PROJECTS_STATUS_COLORS.light)[(p.status||'').toLowerCase()]||{bg:dark?'rgba(148,163,184,0.12)':'#F3F4F6',color:dark?'#94A3B8':'#718096'}
  const isAccP  = p => ['accomplished','completed','done'].includes((p.status||'').toLowerCase())

  if (total === 0) return (
    <div style={{
      borderRadius:18, height:isMobile?220:320,
      display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10,
      background: dark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.85)',
      border:`1px solid ${dark?'#334155':'#E2E8F0'}`,
      boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontSize:42 }}>🏗️</span>
      <p style={{ color:dark?'#64748B':'#A0AEC0', fontSize:13, margin:0 }}>No {label.toLowerCase()} projects yet.</p>
    </div>
  )

  const p = items[idx]; const sc = getSc(p)
  const completionDate = p.completion_date || p.end_date
  const date = isAccP(p) ? completionDate : (p.end_date||p.start_date||p.created_at)

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ userSelect:'none' }}>
      <div style={{
        borderRadius:18, overflow:'hidden', position:'relative', height:isMobile?220:320,
        background: dark ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.75)',
        border:`1px solid ${dark?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.9)'}`,
        boxShadow: dark ? '0 16px 50px rgba(0,0,0,0.55)' : '0 8px 36px rgba(26,54,93,0.14)',
      }}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.div key={`${label}-${idx}`} custom={dir} variants={variants}
            initial="enter" animate="center" exit="exit"
            onClick={() => setSelectedProject(p)}
            style={{ position:'absolute', inset:0, cursor:'pointer', willChange:'transform,opacity' }}>
            <img src={getImg(p)} alt={p.project_name||''} onError={e=>e.target.src='/Hero.png'}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(15,23,42,0.92) 0%,rgba(15,23,42,0.48) 50%,rgba(15,23,42,0.04) 100%)' }}/>
            <div style={{ position:'absolute', top:14, left:16, display:'inline-flex', alignItems:'center', gap:5,
              padding:'4px 12px', borderRadius:20,
              background: isAccP(p)
                ? 'rgba(16,185,129,0.92)'
                : (p.status||'').toLowerCase().trim() === 'ongoing'
                  ? 'rgba(245,158,11,0.92)'
                  : 'rgba(59,130,246,0.9)',
              color:'white', fontSize:9, fontWeight:800, letterSpacing:'1.5px',
              textTransform:'uppercase', backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,0.2)' }}>
              {isAccP(p) ? '✦ ACCOMPLISHED' : (p.status||'').toLowerCase().trim() === 'ongoing' ? '● ONGOING' : '⟳ '+(p.status||'UPCOMING').toUpperCase()}
            </div>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
              justifyContent:'flex-end', padding:isMobile?'16px 18px':'20px 24px' }}>
              <p style={{ fontSize:isMobile?16:20, fontWeight:900, color:'white',
                fontFamily: _pFont, margin:'0 0 6px', lineHeight:1.25,
                textShadow:'0 2px 12px rgba(0,0,0,0.55)',
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {p.project_name||p.title}
              </p>
              {p.budget && <p style={{ fontSize:11, color:'rgba(255,255,255,0.8)', margin:'0 0 3px', fontWeight:600 }}>
                Budget: ₱{parseFloat(p.budget).toLocaleString()}
              </p>}
              {date && <p style={{ fontSize:11, color: isAccP(p) ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.6)', margin:'0 0 8px', display:'flex', alignItems:'center', gap:4 }}>
                {isAccP(p) ? '✅ Completed ' : '📅 '}{fmtDate(date)}
              </p>}
              {(p.status||'').toLowerCase().trim() === 'upcoming' && (
                <div onClick={e => { e.stopPropagation(); setSelectedProject(p) }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 18px',
                    borderRadius:20, background:'linear-gradient(135deg,#1A365D,#2A4A7F)',
                    color:'white', fontSize:12, fontWeight:800, cursor:'pointer',
                    boxShadow:'0 4px 16px rgba(26,54,93,0.5)', letterSpacing:'.3px',
                    border:'1.5px solid rgba(255,255,255,0.25)', backdropFilter:'blur(4px)' }}>
                    📋 Pre-register
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {total > 1 && (
          <div style={{ position:'absolute', top:14, right:14, zIndex:20, fontSize:10, fontWeight:700,
            color:'rgba(255,255,255,0.7)', background:'rgba(0,0,0,0.45)', padding:'3px 10px',
            borderRadius:20, backdropFilter:'blur(4px)', pointerEvents:'none' }}>
            {idx+1} / {total}
          </div>
        )}

        {total > 1 && (<>
          <button onClick={e => { e.stopPropagation(); goPrev() }}
            style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:34, height:34,
              borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1.5px solid rgba(255,255,255,0.2)',
              color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              zIndex:20, backdropFilter:'blur(4px)', transition:'background .15s' }}>
            <ChevronLeft size={15}/>
          </button>
          <button onClick={e => { e.stopPropagation(); goNext() }}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:34, height:34,
              borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1.5px solid rgba(255,255,255,0.2)',
              color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              zIndex:20, backdropFilter:'blur(4px)', transition:'background .15s' }}>
            <ChevronRight size={15}/>
          </button>
        </>)}

        {total > 1 && !paused && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,0.15)', zIndex:20 }}>
            <div key={`pb-${label}-${idx}`}
              style={{ height:'100%', background: accentColor||'linear-gradient(90deg,#C53030,#D69E2E)',
                animation:`progressBar ${PROJECTS_AUTOPLAY_INTERVAL}ms linear forwards` }}/>
          </div>
        )}
      </div>

      {total > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:10 }}>
          {items.map((_,i) => (
            <button key={i} onClick={() => go(i, i>=idx?1:-1)}
              style={{ width:i===idx?20:6, height:6, borderRadius:3, border:'none', padding:0, cursor:'pointer',
                transition:'all 0.35s cubic-bezier(.4,0,.2,1)',
                background: i===idx ? (dark?'#FBBF24':_pCrimson) : (dark?'rgba(255,255,255,0.2)':'rgba(26,54,93,0.2)') }}/>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectsDenseCard({ p, dark, T, setSelectedProject }) {
  const [hov, setHov] = React.useState(false)
  const sc = (dark?PROJECTS_STATUS_COLORS.dark:PROJECTS_STATUS_COLORS.light)[(p.status||'').toLowerCase()]||{bg:dark?'rgba(148,163,184,0.12)':'#F3F4F6',color:dark?'#94A3B8':'#718096'}
  const categoryIcons = { Technology:'💻', Health:'🏥', Sports:'⚽', Education:'📚', Environment:'🌿', Livelihood:'💼', Governance:'🏛️', Social:'🤝', Infrastructure:'🏗️', Training:'🎓' }
  const icon = categoryIcons[p.category] || '📋'
  const isAcc = ['accomplished','completed','done'].includes((p.status||'').toLowerCase().trim())
  const completionDate = p.completion_date || p.end_date
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) } catch { return '' } }
  return (
    <div onClick={() => setSelectedProject(p)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.surface2 : T.surface,
        border:`1px solid ${hov ? T.borderHover : T.border}`,
        borderRadius:12, padding:'12px 14px', cursor:'pointer',
        transition:'all .2s ease',
        transform: hov ? 'scale(1.01) translateY(-1px)' : 'none',
        boxShadow: hov ? T.shadowLg : T.shadow,
      }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
          background: dark ? 'rgba(96,165,250,0.1)' : 'rgba(26,54,93,0.06)',
          border: `1px solid ${dark?'rgba(96,165,250,0.2)':'rgba(26,54,93,0.1)'}`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>{icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3, gap:6 }}>
            <p style={{ fontSize:12, fontWeight:700, color:T.textHeading, margin:0,
              fontFamily: T.fontFamily, lineHeight:1.3,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>
              {p.project_name||p.title}
            </p>
            {p.budget && <span style={{ fontSize:9, fontWeight:700, color:dark?'#FBBF24':'#D69E2E', flexShrink:0 }}>
              ₱{parseFloat(p.budget).toLocaleString()}
            </span>}
          </div>
          {p.description && (
            <p style={{ fontSize:10, color:T.textMuted, margin:'0 0 5px', lineHeight:1.5,
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {p.description}
            </p>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20,
              fontSize:9, fontWeight:700, background:sc.bg, color:sc.color, textTransform:'capitalize' }}>
              {p.status||'upcoming'}
            </span>
            {isAcc && completionDate && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:600,
                color: dark ? 'rgba(52,211,153,0.85)' : '#276749' }}>
                ✅ Completed {fmtDate(completionDate)}
              </span>
            )}
            {(p.status||'').toLowerCase().trim() === 'upcoming' && (
              <span onClick={e => { e.stopPropagation(); setSelectedProject(p) }}
                style={{ display:'inline-flex', alignItems:'center', gap:4,
                  padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:800,
                  background:'linear-gradient(135deg,#1A365D,#2A4A7F)', color:'white',
                  cursor:'pointer', border:'none', letterSpacing:'.2px',
                  boxShadow:'0 2px 8px rgba(26,54,93,0.35)' }}>
                📋 Pre-register
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectsSectionLabel({ text, color, icon, T }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
      <div style={{ width:3, height:20, borderRadius:2, background:color, flexShrink:0 }}/>
      <h3 style={{ fontSize:12, fontWeight:900, letterSpacing:'2px', textTransform:'uppercase',
        margin:0, color:T.textMuted, display:'flex', alignItems:'center', gap:6 }}>
        {icon && <span style={{ fontSize:14 }}>{icon}</span>}{text}
      </h3>
    </div>
  )
}

/* ─────────────────────── PROJECTS PAGE ─────────────────────── */
function ProjectsPage({ projects, dark, isMobile, isTablet, T, siteSettings, format, setSelectedProject, PageFooter }) {
  const isAccomplished = p => ['accomplished','completed','done'].includes((p.status||'').toLowerCase().trim())
  const active       = projects.filter(p => { const s=(p.status||'').toLowerCase().trim(); return s==='upcoming'||s==='ongoing' })
  const accomplished = projects.filter(p => isAccomplished(p))

  // On tablet/mobile: stack vertically. On desktop: side-by-side.
  const stackLayout = isMobile || isTablet

  return (
    <div style={{ animation:'fadeSlideIn .2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
      <section style={{ position:'relative', zIndex:2, flex:1, padding:isMobile?'20px 14px 48px':isTablet?'28px 20px 48px':'48px 36px 60px' }}>

        {/* Page header */}
        <div style={{ textAlign:'center', marginBottom:isMobile?20:isTablet?28:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 16px', borderRadius:30, marginBottom:14,
            background: dark ? 'rgba(96,165,250,0.1)' : 'rgba(26,54,93,0.06)',
            border: dark ? '1px solid rgba(96,165,250,0.18)' : '1px solid rgba(26,54,93,0.1)' }}>
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:'2px', textTransform:'uppercase',
              color:T.textHeading }}>SK Initiatives</span>
          </div>
          <h2 style={{ fontSize:isMobile?22:isTablet?28:34, fontWeight:900, margin:'0 0 8px', color:T.textHeading,
            fontFamily: T.fontFamily, textTransform:'uppercase', letterSpacing:'1px' }}>Community Projects</h2>
          <p style={{ fontSize:isMobile?12:14, color:T.textMuted, maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>
            Track all SK initiatives — from upcoming and ongoing programs to accomplished milestones.
          </p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:14 }}>
            <div style={{ height:1, width:50, background:`${T.navy}30` }}/>
            <div style={{ width:7, height:7, borderRadius:'50%', background:T.crimson }}/>
            <div style={{ height:1, width:50, background:`${T.navy}30` }}/>
          </div>
        </div>

        {active.length === 0 && accomplished.length === 0 ? (
          <div style={{ maxWidth:460, margin:'0 auto', background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:16, textAlign:'center', padding:'48px 32px',
            boxShadow:T.shadow, color:T.textMuted }}>
            <p style={{ fontSize:36, margin:'0 0 12px' }}>📋</p>
            <p style={{ fontWeight:700, color:T.textHeading, marginBottom:6 }}>No projects yet</p>
            <p style={{ fontSize:13 }}>Projects will appear here once they are added by the SK team.</p>
          </div>
        ) : (
          <div style={{ maxWidth:1100, margin:'0 auto' }}>

            {/* ── Upcoming and Ongoing Projects ── */}
            <div style={{ marginBottom:isMobile?28:isTablet?36:48 }}>
              <ProjectsSectionLabel text="Upcoming and Ongoing Projects" color={dark?'#60A5FA':'#1A365D'} icon="⟳" T={T}/>

              {active.length === 0 ? (
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
                  textAlign:'center', padding:'32px 24px', color:T.textMuted, fontSize:13 }}>
                  No upcoming or ongoing projects at the moment.
                </div>
              ) : stackLayout ? (
                /* Mobile / Tablet */
                <>
                  <ProjectsMainCarousel items={active} label="Active"
                    accentColor={dark?'linear-gradient(90deg,#60A5FA,#93C5FD)':'linear-gradient(90deg,#1D4ED8,#3B82F6)'}
                    dark={dark} isMobile={isMobile} siteSettings={siteSettings} setSelectedProject={setSelectedProject}/>
                  <div style={{ marginTop:14 }}>
                    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
                      overflow:'hidden', boxShadow:T.shadow }}>
                      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${T.border}`,
                        display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:3, height:14, borderRadius:2, background:dark?'#60A5FA':'#1A365D' }}/>
                        <span style={{ fontSize:10, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', color:T.textMuted }}>
                          All Active ({active.length})
                        </span>
                      </div>
                      <div style={{ padding:'10px', display:'flex', flexDirection:'column', gap:8,
                        maxHeight: isMobile ? 260 : 320, overflowY:'auto' }}>
                        {active.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} T={T} setSelectedProject={setSelectedProject}/>)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Desktop: carousel left (7), list right (3) */
                <div style={{ display:'flex', flexDirection:'row', gap:24, alignItems:'flex-start' }}>
                  <div style={{ flex:'7 0 0', minWidth:0 }}>
                    <ProjectsMainCarousel items={active} label="Active"
                      accentColor={dark?'linear-gradient(90deg,#60A5FA,#93C5FD)':'linear-gradient(90deg,#1D4ED8,#3B82F6)'}
                      dark={dark} isMobile={false} siteSettings={siteSettings} setSelectedProject={setSelectedProject}/>
                  </div>
                  <div style={{ flex:'3 0 0', minWidth:0 }}>
                    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16,
                      overflow:'hidden', boxShadow:T.shadow }}>
                      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`,
                        display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:3, height:14, borderRadius:2, background:dark?'#60A5FA':'#1A365D' }}/>
                        <span style={{ fontSize:10, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', color:T.textMuted }}>
                          All Active ({active.length})
                        </span>
                      </div>
                      <div style={{ padding:'12px', maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
                        {active.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} T={T} setSelectedProject={setSelectedProject}/>)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Accomplished Projects ── */}
            <div>
              <ProjectsSectionLabel text="Accomplished Projects" color={dark?'#34D399':'#166534'} icon="✦" T={T}/>

              {accomplished.length === 0 ? (
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
                  textAlign:'center', padding:'32px 24px', color:T.textMuted, fontSize:13 }}>
                  No accomplished projects yet.
                </div>
              ) : stackLayout ? (
                /* Mobile / Tablet */
                <>
                  <ProjectsMainCarousel items={accomplished} label="Accomplished"
                    accentColor={dark?'linear-gradient(90deg,#34D399,#6EE7B7)':'linear-gradient(90deg,#059669,#34D399)'}
                    dark={dark} isMobile={isMobile} siteSettings={siteSettings} setSelectedProject={setSelectedProject}/>
                  <div style={{ marginTop:14 }}>
                    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
                      overflow:'hidden', boxShadow:T.shadow }}>
                      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${T.border}`,
                        display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:3, height:14, borderRadius:2, background:dark?'#34D399':'#166534' }}/>
                        <span style={{ fontSize:10, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', color:T.textMuted }}>
                          All Accomplished ({accomplished.length})
                        </span>
                      </div>
                      <div style={{ padding:'10px', display:'flex', flexDirection:'column', gap:8,
                        maxHeight: isMobile ? 260 : 320, overflowY:'auto' }}>
                        {accomplished.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} T={T} setSelectedProject={setSelectedProject}/>)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Desktop: list left (3), carousel right (7) */
                <div style={{ display:'flex', flexDirection:'row', gap:24, alignItems:'flex-start' }}>
                  <div style={{ flex:'3 0 0', minWidth:0 }}>
                    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16,
                      overflow:'hidden', boxShadow:T.shadow }}>
                      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`,
                        display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:3, height:14, borderRadius:2, background:dark?'#34D399':'#166534' }}/>
                        <span style={{ fontSize:10, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', color:T.textMuted }}>
                          All Accomplished ({accomplished.length})
                        </span>
                      </div>
                      <div style={{ padding:'12px', maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
                        {accomplished.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} T={T} setSelectedProject={setSelectedProject}/>)}
                      </div>
                    </div>
                  </div>
                  <div style={{ flex:'7 0 0', minWidth:0 }}>
                    <ProjectsMainCarousel items={accomplished} label="Accomplished"
                      accentColor={dark?'linear-gradient(90deg,#34D399,#6EE7B7)':'linear-gradient(90deg,#059669,#34D399)'}
                      dark={dark} isMobile={false} siteSettings={siteSettings} setSelectedProject={setSelectedProject}/>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </section>
      <PageFooter/>
    </div>
  )
}

/* ─────────────────────── ANNOUNCEMENTS PAGE ─────────────────────── */
function AnnouncementsPage({ announcements, dark, isMobile, isTablet, T, format, PageFooter, onSelect }) {
  const [expandedId, setExpandedId] = React.useState(null)

  const statusStyle = s => ({
    upcoming:  { bg:dark?'rgba(59,130,246,0.1)':'#DBEAFE', color:dark?'#93C5FD':'#1D4ED8', border:dark?'rgba(96,165,250,0.2)':'#BFDBFE', dot:'#3B82F6', accentBar:'#3B82F6' },
    ongoing:   { bg:dark?'rgba(34,197,94,0.1)':'#DCFCE7',  color:dark?'#6EE7B7':'#166534', border:dark?'rgba(74,222,128,0.2)':'#A7F3D0',  dot:'#22C55E', accentBar:'#22C55E' },
    cancelled: { bg:dark?'rgba(197,48,48,0.1)':'#FEE2E2',  color:dark?'#F87171':'#DC2626', border:dark?'rgba(248,113,113,0.2)':'#FECACA', dot:'#EF4444', accentBar:'#EF4444' },
    finished:  { bg:dark?'rgba(100,116,139,0.1)':'#F3F4F6', color:dark?'#94A3B8':'#718096', border:dark?'rgba(100,116,139,0.2)':'#E5E7EB', dot:'#9CA3AF', accentBar:dark?'#334155':'#CBD5E0' },
  })[(s||'').toLowerCase()] || { bg:dark?'rgba(100,116,139,0.1)':'#F3F4F6', color:dark?'#94A3B8':'#718096', border:dark?'rgba(100,116,139,0.2)':'#E5E7EB', dot:'#9CA3AF', accentBar:dark?'#334155':'#CBD5E0' }

  const typeStyle = t => ({
    'General':             { bg:dark?'rgba(96,165,250,0.1)':'rgba(26,54,93,0.06)',   color:dark?'#93C5FD':'#1A365D', border:dark?'rgba(96,165,250,0.2)':'rgba(26,54,93,0.15)', icon:'📢' },
    'Event':               { bg:dark?'rgba(52,211,153,0.1)':'#F0FFF4',              color:dark?'#6EE7B7':'#276749', border:dark?'rgba(52,211,153,0.2)':'#A7F3D0',            icon:'📅' },
    'Emergency':           { bg:dark?'rgba(197,48,48,0.12)':'#FEE2E2',             color:dark?'#FCA5A5':'#DC2626', border:dark?'rgba(248,113,113,0.2)':'#FECACA',           icon:'🚨' },
    'Notice':              { bg:dark?'rgba(251,191,36,0.1)':'#FEF9E7',             color:dark?'#FCD34D':'#7B4800', border:dark?'rgba(251,191,36,0.2)':'#FDE68A',            icon:'📋' },
    'Training & Workshop': { bg:dark?'rgba(192,132,252,0.1)':'#FAF5FF',            color:dark?'#D8B4FE':'#6B21A8', border:dark?'rgba(192,132,252,0.2)':'#E9D5FF',           icon:'🎓' },
    'Sports':              { bg:dark?'rgba(56,189,248,0.1)':'#EFF6FF',             color:dark?'#7DD3FC':'#0369A1', border:dark?'rgba(56,189,248,0.2)':'#BAE6FD',            icon:'⚽' },
    'Assembly':            { bg:dark?'rgba(167,139,250,0.1)':'#F5F3FF',            color:dark?'#C4B5FD':'#5B21B6', border:dark?'rgba(167,139,250,0.2)':'#DDD6FE',           icon:'🏛️' },
  })[t] || { bg:dark?'rgba(100,116,139,0.1)':'#F3F4F6', color:dark?'#94A3B8':'#718096', border:dark?'rgba(100,116,139,0.2)':'#E5E7EB', icon:'🔔' }

  return (
    <div style={{ animation:'fadeSlideIn .2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
      <section style={{ position:'relative', zIndex:2, flex:1, padding:isMobile?'24px 14px 48px':isTablet?'32px 20px 48px':'52px 40px 60px' }}>

        {/* Page header */}
        <div style={{ textAlign:'center', marginBottom:isMobile?20:isTablet?28:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 16px', borderRadius:30, marginBottom:14,
            background: dark?'rgba(96,165,250,0.1)':'rgba(26,54,93,0.06)',
            border: dark?'1px solid rgba(96,165,250,0.18)':'1px solid rgba(26,54,93,0.1)' }}>
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:'2px', textTransform:'uppercase', color:T.textHeading }}>
              Community Board
            </span>
          </div>
          <h2 style={{ fontSize:isMobile?26:34, fontWeight:900, margin:'0 0 10px', color:T.textHeading,
            fontFamily: T.fontFamily, textTransform:'uppercase', letterSpacing:'1px' }}>Latest Announcements</h2>
          <p style={{ fontSize:14, color:T.textMuted, maxWidth:460, margin:'0 auto', lineHeight:1.7 }}>
            Stay informed about important news and updates in our community.
          </p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:14 }}>
            <div style={{ height:1, width:60, background:`${T.navy}25` }}/>
            <div style={{ width:8, height:8, borderRadius:'50%', background:T.crimson }}/>
            <div style={{ height:1, width:60, background:`${T.navy}25` }}/>
          </div>
        </div>

        {/* Feed */}
        <div style={{ maxWidth:740, margin:'0 auto', display:'flex', flexDirection:'column', gap:12 }}>
          {announcements.length === 0 ? (
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16,
              padding:'40px 32px', textAlign:'center', color:T.textMuted, boxShadow:T.shadow }}>
              <p style={{ fontSize:32, margin:'0 0 12px' }}>📭</p>
              <p style={{ fontWeight:700, color:T.textHeading, marginBottom:4 }}>No announcements yet</p>
              <p style={{ fontSize:12 }}>Check back soon for community news and updates.</p>
            </div>
          ) : announcements.map((a) => {
            const ss = statusStyle(a.status)
            const ts = typeStyle(a.type || a.category)
            return (
              <div key={a.id}
                onClick={() => onSelect ? onSelect(a) : setExpandedId(expandedId === a.id ? null : a.id)}
                style={{
                  position:'relative',
                  background: T.surface,
                  border:`1px solid ${T.border}`,
                  borderRadius:14, overflow:'hidden', cursor:'pointer',
                  transition:'all .2s ease',
                  boxShadow: T.shadow,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateX(2px)'; e.currentTarget.style.boxShadow=T.shadowLg }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=T.shadow }}>
                {/* Left accent bar */}
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4,
                  background:ss.accentBar, borderRadius:'14px 0 0 14px' }}/>

                <div style={{ padding:isMobile?'14px 14px 14px 20px':'16px 20px 16px 24px' }}>
                  {/* Title + badges */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:800, fontSize:isMobile?14:15, color:T.textHeading,
                      fontFamily: T.fontFamily, flex:1, minWidth:0, lineHeight:1.35 }}>
                      {a.title}
                    </span>
                    <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4,
                        padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700,
                        background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`, whiteSpace:'nowrap' }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:ss.dot, flexShrink:0 }}/>
                        {a.status||'general'}
                      </span>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4,
                        padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700,
                        background:ts.bg, color:ts.color, border:`1px solid ${ts.border}`, whiteSpace:'nowrap' }}>
                        <span style={{ fontSize:9 }}>{ts.icon}</span>
                        {a.type||a.category||'General'}
                      </span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:4 }}>
                    {a.date_time && (
                      <span style={{ fontSize:11, color:dark?'#7DD3FC':'#2B6CB0', display:'inline-flex', alignItems:'center', gap:4 }}>
                        📅 {format(new Date(a.date_time),"MMM d, yyyy 'at' h:mm a")}
                      </span>
                    )}
                    {a.location && (
                      <span style={{ fontSize:11, color:dark?'#86EFAC':'#276749', display:'inline-flex', alignItems:'center', gap:4 }}>
                        📍 {a.location}
                      </span>
                    )}
                  </div>

                  {a.content && (
                    <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.65, margin:'4px 0 6px',
                      display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {a.content}
                    </p>
                  )}

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                    <span style={{ fontSize:10, color:T.textSubtle }}>
                      Posted {a.created_at ? format(new Date(a.created_at),'MMM d, yyyy') : ''}
                    </span>
                    <span style={{ fontSize:10, fontWeight:700, color:T.crimson,
                      display:'flex', alignItems:'center', gap:4 }}>
                      Read more →
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <PageFooter/>
    </div>
  )
}

/* ─────────────────────── ANNOUNCEMENT MODAL ─────────────────────── */
function AnnouncementModal({ ann, T, onClose, onViewAll }) {
  const catColors = {
    Advisory: ['#D69E2E','rgba(214,158,46,0.1)'], News: ['#3B82F6','rgba(59,130,246,0.1)'],
    Events: ['#10B981','rgba(16,185,129,0.1)'], Event: ['#10B981','rgba(16,185,129,0.1)'],
    Governance: ['#8B5CF6','rgba(139,92,246,0.1)'], General: ['#718096','rgba(113,128,150,0.1)'],
    Emergency: ['#EF4444','rgba(239,68,68,0.1)'], 'Training & Workshop': ['#A855F7','rgba(168,85,247,0.1)'],
    Sports: ['#0EA5E9','rgba(14,165,233,0.1)'], Notice: ['#F59E0B','rgba(245,158,11,0.1)'],
    Assembly: ['#1D4ED8','rgba(29,78,216,0.1)'],
  }
  const statusColors = {
    upcoming:  { bg:'#DBEAFE', color:'#1D4ED8' },
    ongoing:   { bg:'#DCFCE7', color:'#166534' },
    finished:  { bg:'#F3F4F6', color:'#6B7280' },
    cancelled: { bg:'#FEE2E2', color:'#DC2626' },
  }

  const cat    = ann.type || ann.category || 'General'
  const [cc, cbg] = catColors[cat] || catColors.General
  const stCol  = statusColors[(ann.status||'').toLowerCase()] || null
  const hasCoords = ann.location_lat && ann.location_lng
  const mapsEmbedUrl = ann.location
    ? hasCoords
      ? `https://maps.google.com/maps?q=${ann.location_lat},${ann.location_lng}&output=embed&z=17`
      : `https://maps.google.com/maps?q=${encodeURIComponent(ann.location)}&output=embed&z=16&iwloc=near`
    : null
  const mapsOpenUrl = ann.location
    ? hasCoords
      ? `https://maps.google.com/?q=${ann.location_lat},${ann.location_lng}&z=17`
      : `https://maps.google.com/?q=${encodeURIComponent(ann.location)}&z=16`
    : null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', zIndex:9000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.surface, borderRadius:20, maxWidth:820, width:'100%', maxHeight:'90vh',
          overflow:'hidden', display:'flex', flexDirection:'column',
          boxShadow:'0 32px 80px rgba(0,0,0,0.3)', border:`1px solid ${T.border}`,
          animation:'fadeSlideIn .25s ease' }}>

        {/* ── Header ── */}
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`,
          display:'flex', alignItems:'flex-start', gap:12, background:T.surface2 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ padding:'3px 10px', borderRadius:20, background:cbg, color:cc,
                fontSize:10, fontWeight:700, border:`1px solid ${cc}25` }}>{cat}</span>
              {stCol && (
                <span style={{ padding:'3px 10px', borderRadius:20, background:stCol.bg, color:stCol.color,
                  fontSize:10, fontWeight:700 }}>
                  {(ann.status||'').charAt(0).toUpperCase()+(ann.status||'').slice(1)}
                </span>
              )}
              {ann.created_at && (
                <span style={{ fontSize:10, color:T.textMuted }}>
                  {new Date(ann.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                </span>
              )}
            </div>
            <h3 style={{ fontSize:18, fontWeight:800, color:T.textHeading, margin:0, lineHeight:1.3,
              fontFamily: T.fontFamily }}>{ann.title}</h3>
          </div>
          <button onClick={onClose} style={{ background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:8, width:32, height:32, cursor:'pointer', color:T.textMuted,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <X size={15}/>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ padding:'18px 22px', overflowY:'auto', flex:1 }}>

          {/* 1. Pictures */}
          {ann.pictures && ann.pictures.length > 0 && (
            <div style={{ marginBottom:18 }}>
              <div style={{ display:'grid', gridTemplateColumns: ann.pictures.length === 1 ? '1fr' : 'repeat(2,1fr)', gap:8 }}>
                {ann.pictures.map((src, i) => (
                  <div key={i} style={{ borderRadius:12, overflow:'hidden', border:`1px solid ${T.border}`,
                    aspectRatio: ann.pictures.length === 1 ? '16/6' : '4/3' }}>
                    <img src={src} alt={`photo-${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Schedule – date & time */}
          {ann.date_time && (
            <div style={{ marginBottom:12, background:T.surface2, borderRadius:12,
              border:`1px solid ${T.border}`, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
                <span style={{ fontSize:22 }}>📅</span>
                <div>
                  <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:'.5px', margin:'0 0 3px' }}>Schedule</p>
                  <p style={{ fontSize:15, fontWeight:700, color:T.text, margin:0 }}>
                    {new Date(ann.date_time).toLocaleDateString('en-PH',{
                      weekday:'long', month:'long', day:'numeric', year:'numeric'
                    })}
                  </p>
                  <p style={{ fontSize:13, fontWeight:600, color:T.textMuted, margin:'2px 0 0' }}>
                    {new Date(ann.date_time).toLocaleTimeString('en-PH',{
                      hour:'2-digit', minute:'2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Prepared By / Date of Completion */}
          {(ann.prepared_by || ann.date_of_completion) && (
            <div style={{ marginBottom:12, padding:'12px 16px', background:T.surface2, borderRadius:12,
              border:`1px solid ${T.border}`, display:'flex', flexWrap:'wrap', gap:16 }}>
              {ann.prepared_by && (
                <div style={{ flex:1, minWidth:120 }}>
                  <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:'.5px', margin:'0 0 3px' }}>Prepared By</p>
                  <p style={{ fontSize:14, fontWeight:700, color:T.text, margin:0 }}>{ann.prepared_by}</p>
                </div>
              )}
              {ann.date_of_completion && (
                <div style={{ flex:1, minWidth:120 }}>
                  <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:'.5px', margin:'0 0 3px' }}>Date of Completion</p>
                  <p style={{ fontSize:14, fontWeight:700, color:T.text, margin:0 }}>
                    {new Date(ann.date_of_completion).toLocaleDateString('en-PH',{ year:'numeric', month:'long', day:'numeric' })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. Details / Full content */}
          {ann.content && (
            <div style={{ marginBottom:12, padding:'14px 16px', background:T.surface2, borderRadius:12,
              border:`1px solid ${T.border}` }}>
              <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:'.5px', margin:'0 0 8px' }}>Details</p>
              <p style={{ fontSize:13, color:T.text, lineHeight:1.85, margin:0,
                whiteSpace:'pre-wrap' }}>{ann.content}</p>
            </div>
          )}

          {/* 5. Location row + Google Maps embed */}
          {ann.location && (
            <div style={{ marginBottom:12, background:T.surface2, borderRadius:12,
              border:`1px solid ${T.border}`, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
                borderBottom: mapsEmbedUrl ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontSize:16 }}>📍</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:'.5px', margin:'0 0 1px' }}>Location</p>
                  <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:'0 0 3px' }}>{ann.location}</p>
                  {hasCoords && (
                    <span style={{ fontSize:10, color:'#059669', fontFamily:'monospace',
                      background:'rgba(5,150,105,0.08)', padding:'2px 8px', borderRadius:20,
                      border:'1px solid rgba(5,150,105,0.2)', fontWeight:600 }}>
                      📌 {parseFloat(ann.location_lat).toFixed(5)}, {parseFloat(ann.location_lng).toFixed(5)}
                    </span>
                  )}
                </div>
                <a href={mapsOpenUrl}
                  target="_blank" rel="noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 11px',
                    borderRadius:8, background:'#1A365D', color:'white', fontSize:10, fontWeight:700,
                    textDecoration:'none', flexShrink:0, whiteSpace:'nowrap' }}>
                  🗺️ Open Maps
                </a>
              </div>
              {mapsEmbedUrl && (
                <div>
                  <div style={{ padding:'8px 12px', background:T.surface2, borderBottom:`1px solid ${T.border}`,
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:12 }}>🗺️</span>
                      <span style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                        letterSpacing:'.5px' }}>Map Location</span>
                    </div>
                    <a href={mapsOpenUrl} target="_blank" rel="noreferrer"
                      style={{ fontSize:10, fontWeight:700, color:T.navy, textDecoration:'none',
                        display:'inline-flex', alignItems:'center', gap:4 }}>
                      Open in Maps ↗
                    </a>
                  </div>
                  <iframe
                    title="announcement-location"
                    src={mapsEmbedUrl}
                    width="100%" height="240"
                    style={{ display:'block', border:'none' }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'16px 22px', borderTop:`1px solid ${T.border}`,
          display:'flex', gap:10, alignItems:'center', justifyContent:'space-between', background:T.surface2 }}>
          {/* Left: posted date */}
          <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
            <span style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.6px' }}>
              Date Posted
            </span>
            <span style={{ fontSize:22, color:T.textHeading, fontWeight:900, letterSpacing:'-0.3px', lineHeight:1.2 }}>
              📅 {ann.created_at ? new Date(ann.created_at).toLocaleDateString('en-PH',{ month:'long', day:'numeric', year:'numeric' }) : ''}
            </span>
          </div>
          {/* Right: buttons */}
          <button onClick={onClose}
            style={{ padding:'9px 22px', borderRadius:10, background:T.navy,
              border:'none', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── EVENT MODAL ─────────────────────── */
function EventModal({ ev, T, clock, evCountdown, onClose, onViewAll, user, profile, logAudit }) {
  const { toast } = useToast()
  const cd = evCountdown(ev)
  const [posterIdx,    setPosterIdx]   = useState(0)
  const [joining,      setJoining]     = useState(false)
  const [joined,       setJoined]      = useState(false)
  const [slotCount,    setSlotCount]   = useState(null) // current registration count
  const [slotsLoading, setSlotsLoading]= useState(false)
  const [joinConfirm,  setJoinConfirm] = useState(false)

  const statusStyle = {
    upcoming:  { bg:'rgba(245,158,11,0.1)',   color:'#D97706',   border:'rgba(245,158,11,0.25)' },
    ongoing:   { bg:'rgba(16,185,129,0.1)',   color:'#059669',   border:'rgba(16,185,129,0.25)' },
    planning:  { bg:'rgba(139,92,246,0.1)',   color:'#7C3AED',   border:'rgba(139,92,246,0.2)'  },
    finished:  { bg:'rgba(100,116,139,0.1)',  color:'#718096',   border:'rgba(100,116,139,0.2)' },
    cancelled: { bg:'rgba(197,48,48,0.08)',   color:'#C53030',   border:'rgba(197,48,48,0.2)'   },
    completed: { bg:'rgba(16,185,129,0.1)',   color:'#059669',   border:'rgba(16,185,129,0.25)' },
  }
  const ss = statusStyle[(ev.status||'').toLowerCase()] || statusStyle.upcoming

  const hasC = ev.location_lat && ev.location_lng
  const embedUrl = ev.location
    ? hasC
      ? `https://maps.google.com/maps?q=${ev.location_lat},${ev.location_lng}&output=embed&z=17`
      : `https://maps.google.com/maps?q=${encodeURIComponent(ev.location)}&output=embed&z=16&iwloc=near`
    : null
  const openUrl = ev.location
    ? hasC
      ? `https://maps.google.com/?q=${ev.location_lat},${ev.location_lng}&z=17`
      : `https://maps.google.com/?q=${encodeURIComponent(ev.location)}&z=16`
    : null

  const maxP      = ev.max_participants ? parseInt(ev.max_participants) : null
  const slotsLeft = maxP !== null && slotCount !== null ? Math.max(0, maxP - slotCount) : null
  const isFull    = slotsLeft !== null && slotsLeft <= 0
  const posters   = (ev.posters || []).filter(Boolean)
  const statusCap = (ev.status||'upcoming').charAt(0).toUpperCase() + (ev.status||'upcoming').slice(1)
  const isUpcoming = ['upcoming','planning','ongoing'].includes((ev.status||'').toLowerCase())

  // Load registration count + check if already joined
  useEffect(() => {
    if (!ev?.id) return
    setSlotsLoading(true)
    const run = async () => {
      try {
        const { count } = await supabase
          .from('event_registrations')
          .select('id', { count:'exact', head:true })
          .eq('event_id', ev.id)
        setSlotCount(count ?? 0)
        if (user?.id) {
          const { data: existing } = await supabase
            .from('event_registrations')
            .select('id').eq('event_id', ev.id).eq('user_id', user.id).maybeSingle()
          if (existing) setJoined(true)
        }
      } catch(_) {}
      finally { setSlotsLoading(false) }
    }
    run()
  }, [ev?.id, user?.id])

  // Countdown digits (days / hours / min / sec)
  const startMs = ev.start_date ? new Date(ev.start_date) - clock : null
  const cdDigits = startMs !== null && startMs > 0 ? {
    d: Math.floor(startMs / 86400000),
    h: Math.floor((startMs % 86400000) / 3600000),
    m: Math.floor((startMs % 3600000)  / 60000),
    s: Math.floor((startMs % 60000)    / 1000),
  } : null

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleJoin = async () => {
    if (!user) { toast('Please log in to join this event.', 'error'); return }
    if (joined || isFull || !isUpcoming) return
    setJoining(true)
    try {
      // Re-check capacity
      if (maxP !== null) {
        const { count: fresh } = await supabase
          .from('event_registrations')
          .select('id', { count:'exact', head:true })
          .eq('event_id', ev.id)
        if ((fresh||0) >= maxP) { toast('Sorry, this event is now full.','error'); setSlotCount(fresh); setJoining(false); return }
      }
      // Check duplicate
      const { data: dup } = await supabase
        .from('event_registrations')
        .select('id').eq('event_id', ev.id).eq('user_id', user.id).maybeSingle()
      if (dup) { setJoined(true); setJoining(false); return }

      const { error } = await supabase.from('event_registrations').insert({
        event_id:   ev.id,
        user_id:    user.id,
        full_name:  profile?.name || user.email,
        email:      user.email,
        created_at: new Date().toISOString(),
      })
      if (error) throw error

      setJoined(true)
      setSlotCount(c => (c ?? 0) + 1)
      toast('🎉 You\'ve joined this event! A confirmation has been sent to your email.', 'success')
      if (logAudit) await logAudit('Join', 'Events', `Joined event: ${ev.title}`)

      // Trigger calendar invite via edge function (non-fatal)
      try {
        await supabase.functions.invoke('send-event-rsvp', {
          body: { event: ev, user_email: user.email, user_name: profile?.name || user.email }
        })
      } catch(_) {}
    } catch (err) { toast(err.message || 'Could not join event. Please try again.', 'error') }
    finally { setJoining(false) }
  }

  const CountBox = ({ val, label }) => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      background:T.navy, borderRadius:10, padding:'8px 14px', minWidth:52 }}>
      <span style={{ fontSize:22, fontWeight:800, color:'white', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
        {String(val).padStart(2,'0')}
      </span>
      <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.65)', textTransform:'uppercase',
        letterSpacing:'.8px', marginTop:2 }}>{label}</span>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.65)', zIndex:9000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.surface, borderRadius:20, maxWidth:820, width:'100%', maxHeight:'90vh',
          overflow:'hidden', display:'flex', flexDirection:'column',
          boxShadow:'0 32px 80px rgba(0,0,0,0.3)', border:`1px solid ${T.border}`,
          animation:'fadeSlideIn .25s ease' }}>

        {/* ── Header ── */}
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`,
          display:'flex', alignItems:'flex-start', gap:12, background:T.surface2 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ padding:'3px 10px', borderRadius:20, background:ss.bg, color:ss.color,
                fontSize:10, fontWeight:700, border:`1px solid ${ss.border}` }}>{statusCap}</span>
              {ev.start_date && (
                <span style={{ fontSize:10, color:T.textMuted }}>
                  {new Date(ev.start_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                </span>
              )}
            </div>
            <h3 style={{ fontSize:18, fontWeight:800, color:T.textHeading, margin:0, lineHeight:1.3,
              fontFamily: T.fontFamily }}>{ev.title}</h3>
          </div>
          <button onClick={onClose} style={{ background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:8, width:32, height:32, cursor:'pointer', color:T.textMuted,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <X size={15}/>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ padding:'18px 22px', overflowY:'auto', flex:1 }}>

          {/* Poster carousel */}
          {posters.length > 0 && (
            <div style={{ position:'relative', borderRadius:12, overflow:'hidden',
              marginBottom:16, height:180, background:'#0F172A' }}>
              <img src={posters[posterIdx]} alt="Event poster"
                style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.95 }}/>
              {posters.length > 1 && (<>
                <button onClick={() => setPosterIdx(i => (i-1+posters.length)%posters.length)}
                  style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
                    background:'rgba(0,0,0,0.45)', border:'none', borderRadius:'50%', width:30, height:30,
                    color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ChevronLeft size={16}/>
                </button>
                <button onClick={() => setPosterIdx(i => (i+1)%posters.length)}
                  style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                    background:'rgba(0,0,0,0.45)', border:'none', borderRadius:'50%', width:30, height:30,
                    color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ChevronRight size={16}/>
                </button>
                <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)',
                  display:'flex', gap:5 }}>
                  {posters.map((_,i) => (
                    <div key={i} onClick={() => setPosterIdx(i)}
                      style={{ width:i===posterIdx?18:6, height:6, borderRadius:3,
                        background: i===posterIdx ? 'white' : 'rgba(255,255,255,0.45)',
                        cursor:'pointer', transition:'all .2s' }}/>
                  ))}
                </div>
              </>)}
            </div>
          )}

          {/* Countdown ticker */}
          {cdDigits && (ev.status||'').toLowerCase() !== 'cancelled' && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:'.6px', margin:'0 0 8px' }}>⏳ Starts In</p>
              <div style={{ display:'flex', gap:8 }}>
                <CountBox val={cdDigits.d} label="Days"/>
                <CountBox val={cdDigits.h} label="Hours"/>
                <CountBox val={cdDigits.m} label="Min"/>
                <CountBox val={cdDigits.s} label="Sec"/>
              </div>
            </div>
          )}
          {/* Ongoing/ended pill if no countdown */}
          {cd && !cdDigits && (ev.status||'').toLowerCase() !== 'cancelled' && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px',
              borderRadius:20, background:ss.bg, border:`1px solid ${ss.border}`, marginBottom:16 }}>
              <span style={{ fontSize:14 }}>⏱</span>
              <span style={{ fontSize:12, fontWeight:700, color:ss.color }}>{cd.label}</span>
            </div>
          )}

          {/* Meta block */}
          {(ev.start_date || ev.location) && (
            <div style={{ marginBottom:16, background:T.surface2, borderRadius:12,
              border:`1px solid ${T.border}`, overflow:'hidden' }}>
              {ev.start_date && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
                  borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:16 }}>📅</span>
                  <div>
                    <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                      letterSpacing:'.5px', margin:'0 0 1px' }}>Date & Time</p>
                    <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:0 }}>
                      {new Date(ev.start_date).toLocaleDateString('en-PH',{
                        weekday:'long', month:'long', day:'numeric', year:'numeric'
                      })}{' at '}{new Date(ev.start_date).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              )}
              {ev.end_date && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
                  borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:16 }}>🏁</span>
                  <div>
                    <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                      letterSpacing:'.5px', margin:'0 0 1px' }}>Ends</p>
                    <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:0 }}>
                      {new Date(ev.end_date).toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}{' at '}{new Date(ev.end_date).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              )}
              {ev.handler && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
                  borderBottom: ev.location ? `1px solid ${T.border}` : 'none' }}>
                  <span style={{ fontSize:16 }}>👤</span>
                  <div>
                    <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                      letterSpacing:'.5px', margin:'0 0 1px' }}>Handler</p>
                    <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:0 }}>{ev.handler}</p>
                  </div>
                </div>
              )}
              {ev.location && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px' }}>
                  <span style={{ fontSize:16 }}>📍</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                      letterSpacing:'.5px', margin:'0 0 1px' }}>Venue</p>
                    <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:'0 0 3px' }}>{ev.location}</p>
                    {hasC && (
                      <span style={{ fontSize:10, color:'#059669', fontFamily:'monospace',
                        background:'rgba(5,150,105,0.08)', padding:'2px 8px', borderRadius:20,
                        border:'1px solid rgba(5,150,105,0.2)', fontWeight:600 }}>
                        📌 {parseFloat(ev.location_lat).toFixed(5)}, {parseFloat(ev.location_lng).toFixed(5)}
                      </span>
                    )}
                  </div>
                  {openUrl && (
                    <a href={openUrl} target="_blank" rel="noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 11px',
                        borderRadius:8, background:'#1A365D', color:'white', fontSize:10, fontWeight:700,
                        textDecoration:'none', flexShrink:0, whiteSpace:'nowrap' }}>
                      🗺️ Open Maps
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Google Maps embed */}
          {embedUrl && (
            <div style={{ marginBottom:16, borderRadius:12, overflow:'hidden',
              border:`1px solid ${T.border}`, boxShadow:`0 2px 12px rgba(0,0,0,0.08)` }}>
              <div style={{ padding:'8px 12px', background:T.surface2, borderBottom:`1px solid ${T.border}`,
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12 }}>🗺️</span>
                  <span style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                    letterSpacing:'.5px' }}>Map Location</span>
                </div>
                <a href={openUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize:10, fontWeight:700, color:T.navy, textDecoration:'none',
                    display:'inline-flex', alignItems:'center', gap:4 }}>
                  Open in Maps ↗
                </a>
              </div>
              <iframe title="event-location" src={embedUrl}
                width="100%" height="220" style={{ display:'block', border:'none' }}
                loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"/>
            </div>
          )}

          {/* About */}
          {ev.description && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:'.5px', margin:'0 0 8px' }}>About this Event</p>
              <p style={{ fontSize:13, color:T.text, lineHeight:1.85, margin:0,
                whiteSpace:'pre-wrap' }}>{ev.description}</p>
            </div>
          )}

          {/* Slots left */}
          {maxP !== null && (
            <div style={{ padding:'12px 14px', borderRadius:12, background:T.surface2,
              border:`1px solid ${isFull ? 'rgba(197,48,48,0.3)' : T.border}`, marginBottom:4 }}>
              <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:'.5px', margin:'0 0 6px' }}>👥 Participant Slots</p>
              {slotsLoading ? (
                <p style={{ fontSize:13, color:T.textMuted, margin:0 }}>Loading…</p>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:20, fontWeight:800,
                      color: isFull ? '#C53030' : slotsLeft <= 5 ? '#D97706' : '#059669' }}>
                      {isFull ? 'Full' : `${slotsLeft} slot${slotsLeft!==1?'s':''} left`}
                    </span>
                    <span style={{ fontSize:11, color:T.textMuted }}>
                      ({slotCount ?? 0} / {maxP} registered)
                    </span>
                  </div>
                  <div style={{ height:7, borderRadius:10, background:T.border, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:10, transition:'width .4s',
                      background: isFull ? '#C53030' : slotsLeft <= 5 ? '#D97706' : '#059669',
                      width:`${Math.min(100,((slotCount??0)/maxP)*100)}%` }}/>
                  </div>
                </>
              )}
            </div>
          )}
          {/* Joined confirmation banner */}
          {joined && (
            <div style={{ marginTop:10, padding:'10px 14px', borderRadius:10,
              background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.25)',
              display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>✅</span>
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:'#059669', margin:'0 0 1px' }}>You're registered!</p>
                <p style={{ fontSize:11, color:T.textMuted, margin:0 }}>A calendar invite & confirmation was sent to your email.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'14px 22px', borderTop:`1px solid ${T.border}`,
          display:'flex', gap:10, alignItems:'center', justifyContent:'space-between', background:T.surface2 }}>
          {/* Left — posted date + Join Event button */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {ev.created_at && (
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                <span style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.6px' }}>
                  Date Posted
                </span>
                <span style={{ fontSize:13, color:T.textHeading, fontWeight:700 }}>
                  📅 {new Date(ev.created_at).toLocaleDateString('en-PH',{ month:'long', day:'numeric', year:'numeric' })}
                </span>
              </div>
            )}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {isUpcoming && (
              <button onClick={() => { if (!joined && !isFull && !joining) setJoinConfirm(true) }}
                disabled={joined || isFull || joining}
                style={{ padding:'10px 20px', borderRadius:10, fontSize:12, fontWeight:700,
                  cursor: joined || isFull ? 'default' : 'pointer',
                  border:'none', display:'flex', alignItems:'center', gap:7, transition:'all .2s',
                  background: joined ? 'rgba(5,150,105,0.12)' : isFull ? T.surface : T.navy,
                  color: joined ? '#059669' : isFull ? T.textMuted : 'white',
                  opacity: joining ? .7 : 1 }}>
                {joining ? (
                  <><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/> Joining…</>
                ) : joined ? (
                  <>✅ Joined!</>
                ) : isFull ? (
                  <>🔒 Event Full</>
                ) : (
                  <>📋 Join Event</>
                )}
              </button>
            )}
            {onViewAll && (
              <button onClick={() => { onClose(); onViewAll() }}
                style={{ padding:'9px 16px', borderRadius:10, background:T.surface,
                  border:`1px solid ${T.border}`, color:T.textMuted, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                View All
              </button>
            )}
          </div>
          </div>
          {/* Right — Close */}
          <button onClick={onClose}
            style={{ padding:'10px 24px', borderRadius:10, background:T.navy,
              border:'none', color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            Close
          </button>
        </div>
      </div>

      {/* ── Join Confirmation Dialog ── */}
      {joinConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)',
          zIndex:9100, display:'flex', alignItems:'center', justifyContent:'center',
          padding:20, backdropFilter:'blur(4px)' }}
          onClick={() => setJoinConfirm(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:T.surface, borderRadius:16, padding:'28px 28px 22px',
              maxWidth:380, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.25)',
              border:`1px solid ${T.border}`, animation:'fadeSlideIn .2s ease' }}>
            {/* Icon */}
            <div style={{ width:52, height:52, borderRadius:14, background:'rgba(26,54,93,0.1)',
              display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
              <span style={{ fontSize:26 }}>📋</span>
            </div>
            <h3 style={{ fontSize:16, fontWeight:800, color:T.textHeading, margin:'0 0 8px',
              fontFamily:T.fontFamily }}>Join this event?</h3>
            <p style={{ fontSize:13, color:T.textMuted, margin:'0 0 6px', lineHeight:1.5 }}>
              <strong style={{ color:T.textHeading }}>{ev.title}</strong>
            </p>
            <p style={{ fontSize:12, color:T.textMuted, margin:'0 0 22px', lineHeight:1.6 }}>
              {new Date(ev.start_date).toLocaleDateString('en-PH',{ weekday:'long', month:'long', day:'numeric', year:'numeric' })}
              {ev.location ? ` · ${ev.location}` : ''}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setJoinConfirm(false); handleJoin() }}
                style={{ flex:1, padding:'11px', borderRadius:10, background:T.navy,
                  border:'none', color:'white', fontSize:13, fontWeight:700, cursor:'pointer',
                  transition:'opacity .15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity='.85'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                ✅ Yes, Join
              </button>
              <button onClick={() => setJoinConfirm(false)}
                style={{ flex:1, padding:'11px', borderRadius:10, background:T.surface,
                  border:`1.5px solid ${T.border}`, color:T.text, fontSize:13, fontWeight:600, cursor:'pointer',
                  transition:'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background=T.surface2}
                onMouseLeave={e => e.currentTarget.style.background=T.surface}>
                ✖ No, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── EVENTS LIST (extracted to fix Rules of Hooks) ─────────────────────── */
function EventsList({ events, dark, isMobile, T, evCountdown, clock, onSelect }) {
  const PAGE_SIZE = 5
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [expandedId,   setExpandedId]   = useState(null)

  const sorted = [...events]
    .filter(ev => {
      const s = (ev.status||'').toLowerCase().trim()
      return s !== 'completed' && s !== 'finished' && s !== 'cancelled'
    })
    .sort((a,b) => {
      const order = s => { const l=(s||'').toLowerCase(); return l==='ongoing'?0:l==='upcoming'?1:l==='planning'?2:3 }
      const od = order(a.status)-order(b.status)
      if (od!==0) return od
      return new Date(a.start_date||0)-new Date(b.start_date||0)
    })

  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  const statusCfg = s => {
    const l=(s||'').toLowerCase()
    if(l==='upcoming')  return { bg:dark?'rgba(59,130,246,0.15)':'#1D4ED8', color:'white', label:'Upcoming',  dot:'#3B82F6' }
    if(l==='ongoing')   return { bg:dark?'rgba(16,185,129,0.15)':'#166534', color:'white', label:'Ongoing',   dot:'#22C55E' }
    if(l==='planning')  return { bg:dark?'rgba(234,179,8,0.15)':'#D97706',  color:'white', label:'Planning',  dot:'#F59E0B' }
    if(l==='cancelled') return { bg:dark?'rgba(197,48,48,0.15)':'#C53030',  color:'white', label:'Cancelled', dot:'#EF4444' }
    if(l==='completed'||l==='finished') return { bg:dark?'rgba(100,116,139,0.15)':'#6B7280', color:'white', label:'Past Event', dot:'#9CA3AF' }
    return { bg:T.surface2, color:T.textMuted, label:s||'—', dot:'#9CA3AF' }
  }

  const dayName  = d => { try { return new Date(d).toLocaleDateString('en-US',{weekday:'short'}).toUpperCase() } catch { return '—' } }
  const fullDate = d => { try { return new Date(d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}).toUpperCase() } catch { return '—' } }

  /* ── Inline Detail Panel ── */
  const InlineDetail = ({ ev }) => {
    const cd = evCountdown(ev)
    const statusStyle = {
      upcoming:  { bg:'rgba(245,158,11,0.1)',   color:'#D97706',   border:'rgba(245,158,11,0.25)' },
      ongoing:   { bg:'rgba(16,185,129,0.1)',   color:'#059669',   border:'rgba(16,185,129,0.25)' },
      finished:  { bg:'rgba(100,116,139,0.1)',  color:'#718096',   border:'rgba(100,116,139,0.2)' },
      cancelled: { bg:'rgba(197,48,48,0.08)',   color:'#C53030',   border:'rgba(197,48,48,0.2)'   },
      completed: { bg:'rgba(16,185,129,0.1)',   color:'#059669',   border:'rgba(16,185,129,0.25)' },
      planning:  { bg:'rgba(234,179,8,0.08)',   color:'#D97706',   border:'rgba(234,179,8,0.2)'   },
    }
    const ss = statusStyle[(ev.status||'').toLowerCase()] || statusStyle.upcoming
    const hasC = ev.location_lat && ev.location_lng
    const embedUrl = ev.location
      ? hasC
        ? `https://maps.google.com/maps?q=${ev.location_lat},${ev.location_lng}&output=embed&z=17`
        : `https://maps.google.com/maps?q=${encodeURIComponent(ev.location)}&output=embed&z=16&iwloc=near`
      : null
    const openUrl = ev.location
      ? hasC
        ? `https://maps.google.com/?q=${ev.location_lat},${ev.location_lng}&z=17`
        : `https://maps.google.com/?q=${encodeURIComponent(ev.location)}&z=16`
      : null

    return (
      <div style={{
        borderTop: `2px solid ${T.navy}22`,
        background: dark ? 'rgba(15,23,42,0.5)' : 'rgba(247,250,252,0.8)',
        padding: isMobile ? '16px 14px 20px' : '20px 24px 24px',
        animation: 'fadeSlideIn .2s ease',
      }}>
        {/* Countdown pill */}
        {cd && (ev.status||'').toLowerCase() !== 'cancelled' && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px',
            borderRadius:20, background:ss.bg, border:`1px solid ${ss.border}`, marginBottom:16 }}>
            <span style={{ fontSize:13 }}>⏱</span>
            <span style={{ fontSize:12, fontWeight:700, color:ss.color }}>{cd.label}</span>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 0 : 24 }}>
          {/* Left column — meta */}
          <div>
            {[
              ev.start_date && ['📅 Date', new Date(ev.start_date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})],
              ev.start_date && ['🕐 Time', new Date(ev.start_date).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})],
              ev.end_date   && ['🏁 Ends',  new Date(ev.end_date).toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric'})],
              ev.handler    && ['👤 Handler', ev.handler],
              ev.location   && ['📍 Venue', ev.location],
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:11, color:T.textMuted, width:90, flexShrink:0, paddingTop:1 }}>{label}</span>
                <span style={{ fontSize:12, color:T.text, fontWeight:600, lineHeight:1.5 }}>{val}</span>
              </div>
            ))}
            {ev.description && (
              <div style={{ marginTop:14 }}>
                <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                  letterSpacing:'.8px', margin:'0 0 6px' }}>About this event</p>
                <p style={{ fontSize:13, color:T.text, lineHeight:1.8, margin:0 }}>{ev.description}</p>
              </div>
            )}
          </div>

          {/* Right column — map */}
          {embedUrl && (
            <div style={{ marginTop: isMobile ? 16 : 0 }}>
              <div style={{ borderRadius:12, overflow:'hidden', border:`1px solid ${T.border}` }}>
                <div style={{ padding:'7px 12px', background:T.surface, borderBottom:`1px solid ${T.border}`,
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.5px' }}>
                    🗺️ Map Location
                  </span>
                  <a href={openUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize:10, fontWeight:700, color:T.navy, textDecoration:'none' }}>
                    Open in Maps ↗
                  </a>
                </div>
                <iframe title={`map-${ev.id}`} src={embedUrl}
                  width="100%" height="200" style={{ display:'block', border:'none' }}
                  loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"/>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {sorted.length === 0 ? (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16,
            padding:'48px 32px', textAlign:'center' }}>
            <p style={{ fontSize:36, margin:'0 0 12px' }}>📅</p>
            <p style={{ fontWeight:700, color:T.textHeading, margin:'0 0 4px', fontFamily:T.fontFamily }}>No events scheduled</p>
            <p style={{ fontSize:13, color:T.textMuted, margin:0 }}>Check back soon for upcoming community events.</p>
          </div>
        ) : visible.map((ev) => {
          const sc         = statusCfg(ev.status)
          const cd         = evCountdown(ev)
          const isExpanded = expandedId === ev.id
          const isCancelled = (ev.status||'').toLowerCase()==='cancelled'
          const isPast      = (ev.status||'').toLowerCase()==='completed'||(ev.status||'').toLowerCase()==='finished'||cd?.label==='Event has ended'

          return (
            <div key={ev.id}
              style={{
                background: T.surface,
                border: `1px solid ${isExpanded ? T.navy : T.border}`,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: isExpanded
                  ? `0 8px 32px rgba(0,0,0,0.12), 0 0 0 2px ${T.navy}22`
                  : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'box-shadow .2s, border-color .2s',
              }}>

              {/* ── Clickable summary row ── */}
              <div
                onClick={() => onSelect ? onSelect(ev) : setExpandedId(isExpanded ? null : ev.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>

                {/* Date badge */}
                <div style={{ flexShrink:0, width:isMobile?64:76, alignSelf:'stretch',
                  background: isCancelled||isPast ? (dark?'#1E293B':'#334155') : T.navy,
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  padding:'0 8px', gap:0 }}>
                  <span style={{ fontSize:isMobile?9:10, fontWeight:800, color:'rgba(255,255,255,0.65)',
                    letterSpacing:'1.5px', textTransform:'uppercase' }}>
                    {ev.start_date ? dayName(ev.start_date) : '—'}
                  </span>
                  <span style={{ fontSize:isMobile?26:32, fontWeight:900, color:'white', lineHeight:1, letterSpacing:'-1px' }}>
                    {ev.start_date ? new Date(ev.start_date).getDate() : '—'}
                  </span>
                </div>

                {/* Main content */}
                <div style={{ flex:1, padding:isMobile?'12px 12px':'14px 20px', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                    {ev.start_date && (
                      <span style={{ fontSize:isMobile?11:12, fontWeight:700, color:T.textMuted, whiteSpace:'nowrap' }}>
                        {fullDate(ev.start_date)}
                      </span>
                    )}
                    <span style={{ fontSize:isMobile?13:15, fontWeight:800, color:T.textHeading,
                      fontFamily:T.fontFamily, lineHeight:1.25 }}>
                      {ev.title}
                    </span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 11px',
                      borderRadius:20, fontSize:10, fontWeight:700,
                      background:sc.bg, color:sc.color }}>
                      <span style={{ width:5, height:5, borderRadius:'50%', background:sc.color==='white'?'rgba(255,255,255,0.7)':sc.dot, flexShrink:0 }}/>
                      {sc.label}
                    </span>
                    {cd && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:cd.color }}>
                        ◆ {cd.label}
                      </span>
                    )}
                    {ev.location && !isMobile && (
                      <span style={{ fontSize:11, color:T.textMuted }}>📍 {ev.location}</span>
                    )}
                  </div>
                </div>

                {/* Expand chevron */}
                <div style={{ flexShrink:0, padding:isMobile?'0 14px':'0 20px', color:T.textMuted }}>
                  <ChevronRight size={18} style={{
                    transform: (!onSelect && isExpanded) ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform .2s ease',
                    color: (!onSelect && isExpanded) ? T.navy : T.textMuted,
                  }}/>
                </div>
              </div>

              {/* ── Inline expanded detail ── */}
              {!onSelect && isExpanded && <InlineDetail ev={ev} />}
            </div>
          )
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div style={{ textAlign:'center', marginTop:20 }}>
          <button onClick={() => setVisibleCount(c=>c+PAGE_SIZE)}
            style={{ padding:'11px 36px', borderRadius:10,
              background:T.surface, border:`1.5px solid ${T.border}`,
              color:T.textHeading, fontSize:13, fontWeight:700,
              cursor:'pointer', transition:'all .15s', fontFamily:T.fontFamily,
              boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}
            onMouseEnter={e=>{ e.currentTarget.style.background=T.navy; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor=T.navy }}
            onMouseLeave={e=>{ e.currentTarget.style.background=T.surface; e.currentTarget.style.color=T.textHeading; e.currentTarget.style.borderColor=T.border }}>
            Load More
          </button>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── MAIN DASHBOARD ─────────────────────── */
export default function Dashboard() {
  const { user, profile, signOut, logAudit, role } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [dark, setDark] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1200)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [activePage, setActivePage] = useState('home')
  const [logoutOpen, setLogout] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef()

  const [announcements, setAnns]      = useState(() => readCache(CACHE_KEYS.announcements) ?? [])
  const [selectedAnn,   setSelectedAnn]   = useState(null)
  const [projects,      setProjects]   = useState(() => readCache(CACHE_KEYS.projects)      ?? [])
  const [selectedProject, setSelectedProject] = useState(null)
  const [events,        setEvents]     = useState(() => readCache(CACHE_KEYS.events)         ?? [])
  const [dataLoaded, setDataLoaded]   = useState(() =>
    !!(readCache(CACHE_KEYS.projects) && readCache(CACHE_KEYS.announcements) && readCache(CACHE_KEYS.events))
  )
  const [calSlide, setCalSlide] = useState(0)
  const [clock, setClock] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedEv, setSelectedEv] = useState(null)
  const [homeEvModal, setHomeEvModal] = useState(null) // event opened from home tab

  // ── Deep-link handler: /dashboard?tab=events&event=<id> ──────────────────
  // Sent by the invitation email's "Join Now" button.
  // Waits until the events list is loaded, then switches to the events tab
  // and auto-opens the matching event modal.
  useEffect(() => {
    const tabParam   = searchParams.get('tab')
    const eventParam = searchParams.get('event')
    if (tabParam !== 'events') return
    setActivePage('events')
    if (!eventParam) return
    // Events may not be loaded yet — poll until they are (max ~5 s)
    let attempts = 0
    const tryOpen = () => {
      setEvents(prev => {
        const match = prev.find(ev => String(ev.id) === String(eventParam))
        if (match) {
          setSelectedEv(match)
          return prev
        }
        return prev
      })
      // If events are empty or match not yet found, retry
      attempts++
      if (attempts < 25) setTimeout(tryOpen, 200)
    }
    tryOpen()
    // Clean up URL so refreshing doesn't re-trigger the modal
    window.history.replaceState({}, '', window.location.pathname)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  const [evNotifDone, setEvNotifDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sk_evNotifDone_v2') || '{}') } catch { return {} }
  })
  const [notifItems, setNotifItems] = useState([]) // in-panel notification items
  const [sysNotifs, setSysNotifs]   = useState([]) // DB-based notifications (report resolved, etc.)
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sk_readNotifIds') || '[]')) } catch { return new Set() }
  })
  const [feedback, setFeedback] = useState({ subject:'', rating:'', message:'' })
  const [hoveredStar, setHoveredStar] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [attachments, setAttachments] = useState([])   // { file, preview, name }
  const [attachUploading, setAttachUploading] = useState(false)
  const attachInputRef = useRef(null)
  const [settingsPw, setSettingsPw] = useState({ newpw:'', confirm:'', show:false })
  const [showSettings, setShowSettings] = useState(false)
  const [showReport,   setShowReport]   = useState(false)
  const [reportForm,   setReportForm]   = useState({ category:'', description:'', contact:'', file:null, fileName:'' })
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportDone,   setReportDone]   = useState(false)
  const reportFileRef = useRef(null)

  const { settings: siteSettings } = useSiteSettings()
  const { theme: liveTheme } = useTheme()

  /* Apply body dark class for CSS variables */
  useEffect(() => {
    if (dark) document.body.classList.add('dark')
    else document.body.classList.remove('dark')
    return () => document.body.classList.remove('dark')
  }, [dark])

  // Sync dark mode toggle with ThemeContext darkMode flag
  useEffect(() => {
    if (liveTheme.darkMode !== undefined) setDark(!!liveTheme.darkMode)
  }, [liveTheme.darkMode])

  const BASE = dark ? DARK : LIGHT

  // Resolve all colours from liveTheme (respects dark mode overrides)
  const _primary   = dark ? (liveTheme.darkPrimaryColor   || '#60A5FA') : (liveTheme.primaryColor   || BASE.navy)
  const _secondary = dark ? (liveTheme.darkSecondaryColor || '#F87171') : (liveTheme.secondaryColor || BASE.crimson)
  const _accent    = dark ? (liveTheme.darkAccentColor    || '#FBBF24') : (liveTheme.accentColor    || BASE.gold)
  const _surface   = dark ? (liveTheme.darkCardColor      || '#1E293B') : (liveTheme.cardColor      || '#FFFFFF')
  const _text      = dark ? (liveTheme.darkBodyColor      || '#E2E8F0') : (liveTheme.bodyColor      || BASE.text)
  const _heading   = dark ? '#93C5FD'                                   : (liveTheme.headingColor   || _primary)
  const _muted     = dark ? '#94A3B8'                                   : (liveTheme.mutedColor     || BASE.textMuted)
  const _border    = dark ? '#334155'                                   : (liveTheme.borderColor    || BASE.border)
  const _font      = `'${liveTheme.fontFamily || 'Plus Jakarta Sans'}', sans-serif`
  const _cardR     = liveTheme.cardRadius ?? 12
  const _cardShadow = {
    none:     'none',
    low:      '0 1px 4px rgba(0,0,0,.06)',
    moderate: '0 4px 20px rgba(0,0,0,.08)',
    high:     '0 8px 32px rgba(0,0,0,.14)',
  }[liveTheme.cardShadow || 'moderate']

  const T = {
    ...BASE,
    bg:          'transparent',
    surface:     _surface,
    surface2:    dark ? 'rgba(51,65,85,0.85)' : '#F7FAFC',
    border:      _border,
    borderHover: _border,
    text:        _text,
    textHeading: _heading,
    textMuted:   _muted,
    navy:        _primary,
    navyLt:      _primary + 'CC',
    gold:        _accent,
    crimson:     _secondary,
    footerBg:    dark ? '#0F172A' : _primary,
    shadow:      _cardShadow,
    shadowLg:    _cardShadow,
    calBg:       dark ? 'rgba(30,41,59,0.92)' : _surface,
    calBorder:   _border,
    fontFamily:  _font,
    cardRadius:  _cardR,
  }
  const SITE_LOGO = siteSettings.logoUrl || liveTheme.logoUrl || '/SK_Logo.png'

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768
      const tablet = window.innerWidth < 1200
      setIsMobile(mobile)
      setIsTablet(tablet)
      if (!mobile && !tablet) setMobileSidebar(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (activePage === 'projects') {
      supabase.from('projects').select('*').order('created_at',{ascending:false})
        .then(({ data }) => { if (data) { setProjects(data); writeCache(CACHE_KEYS.projects, data) } })
    }
  }, [activePage])

  useEffect(() => {
    loadData()
    const h = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', h)

    const projectsSub = supabase.channel('dashboard-projects')
      .on('postgres_changes',{event:'*',schema:'public',table:'projects'},() => {
        supabase.from('projects').select('*').order('completion_date',{ascending:false}).order('created_at',{ascending:false})
          .then(({ data }) => { if (data) { setProjects(data); writeCache(CACHE_KEYS.projects, data) } })
      }).subscribe()

    const annsSub = supabase.channel('dashboard-announcements')
      .on('postgres_changes',{event:'*',schema:'public',table:'announcements'},() => {
        supabase.from('announcements').select('*').order('created_at',{ascending:false})
          .then(({ data }) => { if (data) { setAnns(data); writeCache(CACHE_KEYS.announcements, data) } })
      }).subscribe()

    const eventsSub = supabase.channel('dashboard-events')
      .on('postgres_changes',{event:'*',schema:'public',table:'events'},() => {
        supabase.from('events').select('*').order('start_date',{ascending:true})
          .then(({ data }) => { if (data) { setEvents(data); writeCache(CACHE_KEYS.events, data) } })
      }).subscribe()

    return () => {
      document.removeEventListener('mousedown', h)
      supabase.removeChannel(projectsSub)
      supabase.removeChannel(annsSub)
      supabase.removeChannel(eventsSub)
    }
  }, [])

  // Load system notifications (report status updates, etc.)
  useEffect(() => {
    if (!user?.id) return
    const loadSysNotifs = async () => {
      const { data } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setSysNotifs(data)
    }
    loadSysNotifs()
    const ch = supabase.channel('user-notifs-'+user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
        () => loadSysNotifs())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user?.id])

  const loadData = async () => {
    try {
      const [a, p, e] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at',{ascending:false}),
        supabase.from('projects').select('*').order('completion_date',{ascending:false}).order('created_at',{ascending:false}),
        supabase.from('events').select('*').order('start_date',{ascending:true}),
      ])
      if (a.data) { setAnns(a.data);      writeCache(CACHE_KEYS.announcements, a.data) }
      if (p.data) { setProjects(p.data);  writeCache(CACHE_KEYS.projects, p.data) }
      if (e.data) { setEvents(e.data);    writeCache(CACHE_KEYS.events, e.data) }
    } catch (err) {
      console.warn('[SK Portal] loadData error, using cache:', err)
    } finally {
      setDataLoaded(true)
    }
  }

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Build notification panel items from events + announcements
  useEffect(() => {
    const now = clock
    const evNotifs = []
    events.forEach(ev => {
      const _evS = (ev.status||'').toLowerCase().trim()
      if (!ev.start_date || _evS === 'cancelled' || _evS === 'completed' || _evS === 'finished') return
      const start = new Date(ev.start_date)
      const diffMs = start - now
      if (diffMs <= 0) return // past events excluded
      const diffH = diffMs / 3600000
      let tier = null
      if (diffH <= 12)        tier = { key:'12h', label:'Starting in 12 hours',  emoji:'⚡', urgency:4, color:'#EF4444' }
      else if (diffH <= 24)   tier = { key:'1d',  label:'Starting tomorrow',      emoji:'🔴', urgency:3, color:'#F97316' }
      else if (diffH <= 48)   tier = { key:'2d',  label:'Starting in 2 days',     emoji:'🟠', urgency:2, color:'#EAB308' }
      else if (diffH <= 72)   tier = { key:'3d',  label:'Starting in 3 days',     emoji:'🟡', urgency:1, color:'#3B82F6' }
      if (!tier) return
      const hoursLeft = Math.ceil(diffH)
      const minsLeft  = Math.ceil(diffMs / 60000)
      let timeLabel = ''
      if (diffH <= 1)        timeLabel = `${minsLeft} min`
      else if (diffH <= 12)  timeLabel = `${Math.ceil(diffH)}h`
      else if (diffH <= 24)  timeLabel = 'Tomorrow'
      else                   timeLabel = `${Math.ceil(diffH/24)} days`
      evNotifs.push({
        id: `ev_${ev.id}_${tier.key}`,
        type: 'event',
        urgency: tier.urgency,
        emoji: tier.emoji,
        color: tier.color,
        title: ev.title,
        subtitle: `${tier.label} · in ${timeLabel}`,
        raw: ev,
        ts: start,
      })
    })
    const annNotifs = announcements.map(a => ({
      id: `ann_${a.id}`,
      type: 'announcement',
      urgency: 0,
      emoji: '📢',
      color: '#6366F1',
      title: a.title,
      subtitle: a.content ? a.content.slice(0,70)+(a.content.length>70?'…':'') : 'New announcement',
      raw: a,
      ts: new Date(a.created_at),
    }))
    const sysNotifItems = sysNotifs.map(n => ({
      id: `sys_${n.id}`,
      type: 'system',
      urgency: 2,
      emoji: n.emoji || '🔔',
      color: n.color || '#38A169',
      title: n.title,
      subtitle: n.message,
      raw: n,
      ts: new Date(n.created_at),
    }))
    const combined = [...sysNotifItems, ...evNotifs, ...annNotifs]
      .sort((a,b) => b.urgency - a.urgency || b.ts - a.ts)
    setNotifItems(combined)
  }, [events, announcements, clock, sysNotifs])

  // Toast pop-ups at threshold crossings (3d/2d/1d/12h)
  useEffect(() => {
    if (!events.length) return
    const t = setInterval(() => {
      const now = new Date()
      let updated = false
      const next = { ...evNotifDone }
      events.forEach(ev => {
        if (!ev.start_date || (ev.status||'').toLowerCase() === 'cancelled') return
        const start = new Date(ev.start_date)
        const diffMs = start - now
        if (diffMs <= 0) return
        const diffH = diffMs / 3600000
        const thresholds = [
          { key:'3d', maxH:72,  minH:48, msg:`🟡 3 days away: "${ev.title}"`,  type:'info'    },
          { key:'2d', maxH:48,  minH:24, msg:`🟠 2 days away: "${ev.title}"`,  type:'info'    },
          { key:'1d', maxH:24,  minH:12, msg:`🔴 Tomorrow: "${ev.title}"`,      type:'warning' },
          { key:'12h',maxH:12,  minH:0,  msg:`⚡ Starting in 12h: "${ev.title}"`, type:'warning' },
        ]
        thresholds.forEach(({ key, maxH, minH, msg, type }) => {
          const k = ev.id+'_'+key
          if (diffH <= maxH && diffH > minH && !next[k]) {
            toast(msg, type)
            next[k] = true
            updated = true
          }
        })
      })
      if (updated) {
        setEvNotifDone(next)
        try { localStorage.setItem('sk_evNotifDone_v2', JSON.stringify(next)) } catch {}
      }
    }, 30000)
    return () => clearInterval(t)
  }, [events, evNotifDone])

  const handleLogout = async () => { await signOut(); navigate('/login') }

  const handleFeedback = async ev => {
    ev.preventDefault()
    if (!feedback.rating) { toast('Please select a rating.','error'); return }
    if (!feedback.message?.trim()) { toast('Please enter a message.','error'); return }
    setSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: todayFb } = await supabase.from('feedback').select('id').eq('user_id',user.id)
        .gte('created_at',today+'T00:00:00').lte('created_at',today+'T23:59:59')
      if (todayFb && todayFb.length > 0) { toast('You have already submitted feedback today.','error'); setSubmitting(false); return }

      // Upload attachments to Supabase Storage and collect public URLs
      const attachmentUrls = []
      if (attachments.length > 0) {
        setAttachUploading(true)
        for (const att of attachments) {
          const ext = att.file.name.split('.').pop()
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('feedback-attachments')
            .upload(path, att.file, { upsert: false })
          if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
          const { data: urlData } = supabase.storage.from('feedback-attachments').getPublicUrl(path)
          if (urlData?.publicUrl) attachmentUrls.push(urlData.publicUrl)
        }
        setAttachUploading(false)
      }

      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        resident_name: profile?.name || user.email,
        subject: feedback.subject,
        rating: feedback.rating,
        message: feedback.message,
        attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null,
      })
      if (error) throw error
      await logAudit('Submit','Feedback','Submitted resident feedback')
      toast('Thank you for your feedback!','success')
      setFeedback({ subject:'', rating:'', message:'' })
      setAttachments([])
      setHoveredStar('')
    } catch (err) { toast(err.message,'error') }
    finally { setSubmitting(false); setAttachUploading(false) }
  }

  const handlePasswordUpdate = async ev => {
    ev.preventDefault()
    if (settingsPw.newpw !== settingsPw.confirm) { toast('Passwords do not match.','error'); return }
    try {
      const { error } = await supabase.auth.updateUser({ password:settingsPw.newpw })
      if (error) throw error
      toast('Password updated!','success')
      setShowSettings(false)
      setSettingsPw({ newpw:'', confirm:'', show:false })
    } catch (err) { toast(err.message,'error') }
  }

  const evCountdown = ev => {
    const start = ev.start_date ? new Date(ev.start_date) : null
    const end = ev.end_date ? new Date(ev.end_date) : null
    if (!start || isNaN(start)) return null
    const diffMs = start - clock
    if (end && clock >= end) return { label:'Event has ended', color:'#718096' }
    if (diffMs < 0) return { label:'Event is ongoing', color:'#059669' }
    const diffD = Math.floor(diffMs/86400000); const diffH = Math.floor(diffMs/3600000); const diffM = Math.floor(diffMs/60000)
    if (diffD===0&&diffH===0) return { label:`${diffM}m remaining`, color:T.crimson }
    if (diffD===0) return { label:`${diffH}h remaining`, color:T.gold }
    if (diffD===1) return { label:'Tomorrow!', color:T.gold }
    if (diffD<=2) return { label:'Event is today!', color:T.crimson }
    return { label:`${diffD} days remaining`, color:T.navy }
  }

  const eventsOnDate = d => events.filter(ev => {
    try { return isSameDay(parseISO(ev.start_date||ev.created_at), d) } catch { return false }
  })

  const YEAR = new Date().getFullYear()
  const MONTHS = Array.from({length:12},(_,i) => new Date(YEAR,i,1))
  const SLIDES = [MONTHS.slice(0,4), MONTHS.slice(4,8), MONTHS.slice(8,12)]
  const SLIDE_LABELS = [`January – April ${YEAR}`, `May – August ${YEAR}`, `September – December ${YEAR}`]
  const months = SLIDES[calSlide] || SLIDES[0]
  const eventsInRange = events.filter(ev => {
    try { const d=parseISO(ev.start_date||ev.created_at); return months.some(m=>d.getFullYear()===m.getFullYear()&&d.getMonth()===m.getMonth()) } catch { return false }
  })

  const NAV_ITEMS = [
    { label:'Home',          Icon:Home,          page:'home' },
    { label:'Announcements', Icon:Megaphone,      page:'announcements' },
    { label:'Projects',      Icon:FolderOpen,     page:'projects' },
    { label:'Events',        Icon:Calendar,       page:'events' },
    { label:'Feedback',      Icon:MessageSquare,  page:'feedback' },
  ]

  const accomplishedProjects = projects.filter(p => {
    const s = (p.status||'').toLowerCase().trim()
    return s==='accomplished'||s==='completed'||s==='done'
  })

  /* ─ Announcement sidebar cards ─ */
  const STATIC_ANNS = [
    { id:'s1', type:'Advisory', color:'#D69E2E', bg:'rgba(214,158,46,0.1)', bar:'#D69E2E', date:'Mar 2026', title:'Health Tips for the Community', content:'Free medical consultation every Saturday.' },
    { id:'s2', type:'News', color:'#3B82F6', bg:'rgba(59,130,246,0.1)', bar:'#3B82F6', date:'Mar 2026', title:'Skills Training Program Now Open', content:'Register now for the livelihood training.' },
    { id:'s3', type:'Events', color:'#10B981', bg:'rgba(16,185,129,0.1)', bar:'#10B981', date:'Mar 2026', title:'Basketball League — Grand Finals', content:'Watch the championship game this weekend.' },
    { id:'s4', type:'Governance', color:'#8B5CF6', bg:'rgba(139,92,246,0.1)', bar:'#8B5CF6', date:'Mar 2026', title:'SK Budget Report Released', content:'Transparency report for Q1 2026 is now available.' },
  ]

  const annCards = dataLoaded
    ? announcements.slice(0,4).length > 0
      ? announcements.slice(0,4).map(a => ({
          id: a.id, type: a.type||a.category||'General', real: a,
          color: ({Advisory:'#D69E2E',News:'#3B82F6',Events:'#10B981',Event:'#10B981',Governance:'#8B5CF6',Emergency:'#EF4444',Sports:'#0EA5E9',General:'#718096'}[a.type||a.category]||'#718096'),
          bg: ({Advisory:'rgba(214,158,46,0.08)',News:'rgba(59,130,246,0.08)',Events:'rgba(16,185,129,0.08)',Event:'rgba(16,185,129,0.08)',Governance:'rgba(139,92,246,0.08)',Emergency:'rgba(239,68,68,0.08)',Sports:'rgba(14,165,233,0.08)',General:'rgba(113,128,150,0.08)'}[a.type||a.category]||'rgba(113,128,150,0.08)'),
          bar: ({Advisory:'#D69E2E',News:'#3B82F6',Events:'#10B981',Event:'#10B981',Governance:'#8B5CF6',Emergency:'#EF4444',Sports:'#0EA5E9',General:'#718096'}[a.type||a.category]||'#718096'),
          date: a.created_at ? new Date(a.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '',
          title: a.title, content: a.content,
        }))
      : STATIC_ANNS
    : null

  /* ─ Page footer ─ */
  const PageFooter = () => (
    <footer style={{
      flexShrink:0,
      background: T.footerBg,
      borderTop: `1px solid ${dark?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.1)'}`,
      padding:'18px 32px',
      display:'flex', flexDirection:isMobile?'column':'row',
      alignItems:'center', justifyContent:'space-between', gap:12,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <img src={SITE_LOGO} alt="SK Logo" style={{ width:30, height:30, objectFit:'contain', flexShrink:0 }}/>
        <div>
          <p style={{ margin:0, fontSize:11, fontWeight:800, color:'white', letterSpacing:'1px',
            textTransform:'uppercase', fontFamily: T.fontFamily, lineHeight:1.2 }}>Bakakeng Central</p>
          <p style={{ margin:0, fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:'1px', textTransform:'uppercase' }}>
            Sangguniang Kabataan
          </p>
        </div>
      </div>
      <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase',
        letterSpacing:'.6px', textAlign:'center' }}>
        © 2026 Barangay Bakakeng Central. All Rights Reserved.
      </p>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <a href="https://facebook.com/SK.BakakengCentral" target="_blank" rel="noreferrer"
          style={{ width:30, height:30, borderRadius:8, background:'rgba(24,119,242,0.15)',
            border:'1px solid rgba(24,119,242,0.25)', display:'flex', alignItems:'center',
            justifyContent:'center', textDecoration:'none', transition:'transform .15s' }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </a>
        <a href="mailto:skbakakengcentral@gmail.com"
          style={{ width:30, height:30, borderRadius:8, background:'rgba(234,67,53,0.1)',
            border:'1px solid rgba(234,67,53,0.2)', display:'flex', alignItems:'center',
            justifyContent:'center', textDecoration:'none', transition:'transform .15s' }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          <svg width="14" height="11" viewBox="0 0 24 18" fill="none"><path d="M22 0H2C.9 0 0 .9 0 2v14c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2zm0 4l-10 6L2 4V2l10 6 10-6v2z" fill="#EA4335"/></svg>
        </a>
      </div>
    </footer>
  )

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div style={{
      height:'100vh', overflow:'hidden',
      fontFamily: T.fontFamily,
      display:'flex', position:'relative',
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── GLOBAL BACKGROUND (synced from ThemeContext) ── */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <div style={{
          position:'absolute', inset:0,
          backgroundImage: liveTheme.bgMode === 'image' && liveTheme.bgImageUrl
            ? `url(${liveTheme.bgImageUrl})`
            : "url('/login-bg.png')",
          backgroundSize: liveTheme.bgFitting || 'cover',
          backgroundPosition:'center', backgroundRepeat:'no-repeat',
        }}/>
        <div style={{
          position:'absolute', inset:0,
          background: liveTheme.bgMode === 'image' && liveTheme.bgImageUrl && liveTheme.bgOverlayColor
            ? liveTheme.bgOverlayColor + Math.round(((liveTheme.bgOpacity ?? 30) / 100) * 255).toString(16).padStart(2,'0')
            : liveTheme.bgMode === 'color' && liveTheme.bgColor
              ? liveTheme.bgColor
              : dark ? 'rgba(15,23,42,0.88)' : 'rgba(247,250,252,0.82)',
        }}/>
      </div>

      {/* ── MOBILE / TABLET OVERLAY ── */}
      {(isMobile || isTablet) && mobileSidebar && (
        <div onClick={() => setMobileSidebar(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:299, backdropFilter:'blur(2px)' }}/>
      )}

      {/* ══════════ LEFT SIDEBAR ══════════ */}
      <div style={{
        width:260, flexShrink:0,
        background: dark ? 'rgba(10,22,40,0.97)' : 'rgba(12,30,68,0.97)',
        backdropFilter:'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        display:'flex', flexDirection:'column',
        borderRight:'1px solid rgba(212,175,55,0.1)',
        zIndex:300, position:'relative',
        boxShadow:'4px 0 24px rgba(0,0,0,0.2)',
        /* Mobile/Tablet: fixed drawer */
        ...((isMobile || isTablet) ? {
          position:'fixed', top:0, left:0, bottom:0, height:'100vh',
          transform: mobileSidebar ? 'translateX(0)' : 'translateX(-100%)',
          transition:'transform .28s cubic-bezier(.4,0,.2,1)',
          boxShadow: mobileSidebar ? '8px 0 40px rgba(0,0,0,0.4)' : '4px 0 24px rgba(0,0,0,0.2)',
        } : {}),
      }}>
        {/* Logo */}
        <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, overflow:'hidden', flexShrink:0,
              background:'rgba(212,175,55,0.1)', border:'1px solid rgba(212,175,55,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src={SITE_LOGO} alt="SK" style={{ width:34, height:34, objectFit:'contain' }}/>
            </div>
            <div>
              <p style={{ color:'white', fontSize:10, fontWeight:800, letterSpacing:'.8px', margin:0,
                fontFamily: T.fontFamily, lineHeight:1.2 }}>BAKAKENG CENTRAL</p>
              <p style={{ color:'rgba(212,175,55,0.6)', fontSize:8, letterSpacing:'1px',
                textTransform:'uppercase', margin:0 }}>Sangguniang Kabataan</p>
            </div>
          </div>
          {(isMobile || isTablet) && (
            <button onClick={() => setMobileSidebar(false)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', padding:4 }}>
              <X size={18}/>
            </button>
          )}
        </div>

        {/* User chip */}
        <div style={{ margin:'12px 14px', padding:'10px 12px', borderRadius:12,
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%',
            background:`linear-gradient(135deg,${T.crimson},${T.crimson}CC)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'white', fontSize:13, fontWeight:800, flexShrink:0,
            boxShadow:`0 2px 8px ${T.crimson}59`, overflow:'hidden' }}>
            {profile?.photo_url
              ? <img src={profile.photo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : (profile?.name||user?.email||'R')[0].toUpperCase()
            }
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ color:'white', fontSize:12, fontWeight:700, margin:0,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {profile?.name||'Resident'}
            </p>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:9, margin:0,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
          </div>
        </div>

        {/* Nav label */}
        <div style={{ padding:'4px 18px 6px' }}>
          <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)',
            textTransform:'uppercase', letterSpacing:'1.5px', margin:0 }}>Navigation</p>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, padding:'4px 10px', overflowY:'auto' }}>
          {NAV_ITEMS.map(({ label, Icon, page }) => {
            const isActive = activePage === page
            return (
              <button key={label} className="sk-nav-item"
                onClick={() => { setActivePage(page); if (isMobile || isTablet) setMobileSidebar(false) }}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                  width:'100%', borderRadius:10,
                  border: isActive ? `1px solid ${T.crimson}4D` : '1px solid transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  background: isActive ? T.crimson : 'transparent',
                  fontSize:13, fontWeight:isActive?700:400, marginBottom:3,
                  cursor:'pointer', textAlign:'left',
                  boxShadow: isActive ? `0 2px 12px ${T.crimson}4D` : 'none',
                  transition:'none',
                }}>
                <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={14} style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.5)' }}/>
                </div>
                <span>{label}</span>
                {isActive && <div style={{ marginLeft:'auto', width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.8)' }}/>}
              </button>
            )
          })}
        </nav>

        {/* Bottom controls */}
        <div style={{ padding:'10px 10px 18px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          {/* Back to Admin Dashboard — only for admin/super_admin */}
          {(role === 'admin' || role === 'super_admin') && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'8px 12px',
                borderRadius:8, border:'none', background:'rgba(251,191,36,0.08)', cursor:'pointer',
                color:'rgba(251,191,36,0.9)', fontSize:12, marginBottom:6, transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(251,191,36,0.18)'; e.currentTarget.style.color='#FCD34D' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(251,191,36,0.08)'; e.currentTarget.style.color='rgba(251,191,36,0.9)' }}
            >
              <div style={{ width:26, height:26, borderRadius:7,
                background:'rgba(251,191,36,0.12)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <LayoutDashboard size={13} />
              </div>
              Back to Admin Panel
            </button>
          )}
          {[
            { icon: dark ? <Sun size={13}/> : <Moon size={13}/>, label: dark ? 'Light Mode' : 'Dark Mode', action: () => setDark(d=>!d) },
            { icon: <Settings size={13}/>, label: 'Settings', action: () => navigate('/settings') },
            { icon: <LogOut size={13}/>, label: 'Log Out', action: () => setLogout(true), red: true },
          ].map(({ icon, label, action, red }) => (
            <button key={label} onClick={action}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'8px 12px',
                borderRadius:8, border:'none', background:'none', cursor:'pointer',
                color: red ? 'rgba(248,113,113,0.75)' : 'rgba(255,255,255,0.45)',
                fontSize:12, marginBottom:2, transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; if(!red) e.currentTarget.style.color='white' }}
              onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color=red?'rgba(248,113,113,0.75)':'rgba(255,255,255,0.45)' }}>
              <div style={{ width:26, height:26, borderRadius:7,
                background: red ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {icon}
              </div>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0, position:'relative', zIndex:1 }}>

        {/* ── MOBILE/TABLET TOP BAR ── */}
        {(isMobile || isTablet) && activePage !== 'home' && (
          <div style={{ position:'sticky', top:0, zIndex:200, display:'flex', alignItems:'center',
            justifyContent:'space-between', padding:'10px 16px',
            background: dark ? 'rgba(10,22,40,0.97)' : 'rgba(255,255,255,0.97)',
            borderBottom:`1px solid ${T.border}`, backdropFilter:'blur(12px)',
            WebkitBackdropFilter:'blur(12px)', flexShrink:0,
            boxShadow:'0 2px 12px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setMobileSidebar(o=>!o)}
              style={{ width:38, height:38, borderRadius:10,
                background: dark ? 'rgba(30,41,59,0.9)' : 'rgba(247,250,252,0.9)',
                border:`1px solid ${T.border}`, cursor:'pointer', display:'flex',
                alignItems:'center', justifyContent:'center', color:T.text }}>
              <Menu size={18}/>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:7, overflow:'hidden',
                background:'rgba(212,175,55,0.1)', border:'1px solid rgba(212,175,55,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src={SITE_LOGO} alt="SK" style={{ width:24, height:24, objectFit:'contain' }}/>
              </div>
              <span style={{ fontSize:11, fontWeight:800, color:T.textHeading, letterSpacing:'.5px' }}>
                BAKAKENG CENTRAL
              </span>
            </div>
            <div style={{ width:38 }}/>{/* spacer to center logo */}
          </div>
        )}

        <div style={{ flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>

          {/* ════════ HOME PAGE ════════ */}
          {activePage === 'home' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', height:'100%',
            overflow:'hidden', position:'relative', zIndex:1 }}>

            {/* Top strip */}
            <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center',
              justifyContent:'space-between', padding:'12px 20px 0', flexShrink:0 }}>
              {(isMobile || isTablet) ? (
                <button onClick={() => setMobileSidebar(o=>!o)}
                  style={{ width:38, height:38, borderRadius:10,
                    background: dark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
                    border:`1px solid ${T.border}`, cursor:'pointer', display:'flex',
                    alignItems:'center', justifyContent:'center', color:T.text,
                    backdropFilter:'blur(8px)' }}>
                  <Menu size={18}/>
                </button>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                  <p style={{ margin:0, fontSize:10, fontWeight:700, color: dark?'rgba(251,191,36,0.9)':'rgba(214,158,46,0.95)',
                    letterSpacing:'2.5px', textTransform:'uppercase', lineHeight:1 }}>
                    {clock.toLocaleDateString('en-US',{weekday:'long'})}
                  </p>
                  <p style={{ margin:0, fontSize:13, fontWeight:500, color: dark?'rgba(255,255,255,0.65)':T.textMuted,
                    letterSpacing:'.3px', lineHeight:1.4 }}>
                    {clock.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                  </p>
                </div>
              )}

              {/* Bell */}
              <div ref={notifRef} style={{ position:'relative' }}>
                <button onClick={() => { setShowNotifs(n=>!n) }}
                  style={{ width:40, height:40, borderRadius:12,
                    background: dark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
                    border:`1px solid ${T.border}`, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:T.text, backdropFilter:'blur(8px)',
                    transition:'all .15s', position:'relative',
                    boxShadow:T.shadow }}>
                  <Bell size={17}/>
                  {(() => {
                    const unread = notifItems.filter(n => !readNotifIds.has(n.id)).length
                    return unread > 0 ? (
                      <span style={{ position:'absolute', top:-5, right:-5, minWidth:18, height:18,
                        background:'#EF4444', borderRadius:9, color:'white', fontSize:9, fontWeight:800,
                        display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px',
                        border:'2px solid white' }}>{Math.min(unread,9)}</span>
                    ) : null
                  })()}
                </button>

                {showNotifs && (
                  <div style={{ position:'absolute', right:0, top:50, width:340,
                    background: dark ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.99)',
                    border:`1px solid ${T.border}`, borderRadius:18,
                    boxShadow:'0 24px 64px rgba(0,0,0,0.22)', zIndex:500, overflow:'hidden',
                    backdropFilter:'blur(24px)' }}>
                    {/* Header */}
                    <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`,
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <p style={{ fontWeight:800, fontSize:13, color:T.textHeading, margin:0,
                          fontFamily: T.fontFamily }}>Notifications</p>
                        {notifItems.filter(n=>!readNotifIds.has(n.id)).length > 0 && (
                          <span style={{ background:'#EF4444', color:'white', fontSize:9, fontWeight:800,
                            borderRadius:8, padding:'1px 6px' }}>
                            {notifItems.filter(n=>!readNotifIds.has(n.id)).length} new
                          </span>
                        )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {notifItems.filter(n=>!readNotifIds.has(n.id)).length > 0 && (
                          <button onClick={() => {
                            const allIds = new Set(notifItems.map(n=>n.id))
                            setReadNotifIds(allIds)
                            try { localStorage.setItem('sk_readNotifIds', JSON.stringify([...allIds])) } catch {}
                          }} style={{ background:'none', border:'none', color:T.textMuted, cursor:'pointer',
                            fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:6,
                            transition:'background .15s' }}
                            onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                            onMouseLeave={e=>e.currentTarget.style.background='none'}>
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setShowNotifs(false)} style={{ background:'none', border:'none',
                          color:T.textMuted, cursor:'pointer', padding:2 }}><X size={14}/></button>
                      </div>
                    </div>

                    {/* System notifications (report resolved, etc.) */}
                    {notifItems.filter(n=>n.type==='system').length > 0 && (
                      <div>
                        <p style={{ fontSize:9, fontWeight:700, letterSpacing:1, color:T.textMuted,
                          padding:'10px 18px 4px', margin:0, textTransform:'uppercase' }}>Notifications</p>
                        {notifItems.filter(n=>n.type==='system').slice(0,5).map(n => {
                          const isUnread = !readNotifIds.has(n.id)
                          return (
                            <div key={n.id}
                              onClick={() => {
                                const next = new Set(readNotifIds); next.add(n.id); setReadNotifIds(next)
                                try { localStorage.setItem('sk_readNotifIds', JSON.stringify([...next])) } catch {}
                                // mark as read in DB
                                supabase.from('user_notifications').update({ read: true }).eq('id', n.raw.id).then(()=>{})
                              }}
                              style={{ padding:'10px 18px', borderBottom:`1px solid ${T.border}`,
                                display:'flex', gap:10, alignItems:'center', cursor:'default',
                                background: isUnread ? (dark?'rgba(56,161,105,0.09)':'rgba(56,161,105,0.05)') : 'transparent',
                                transition:'background .15s' }}
                              onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                              onMouseLeave={e=>e.currentTarget.style.background=isUnread?(dark?'rgba(56,161,105,0.09)':'rgba(56,161,105,0.05)'):'transparent'}>
                              <div style={{ width:3, alignSelf:'stretch', borderRadius:4, background:n.color, flexShrink:0 }}/>
                              <div style={{ width:32, height:32, borderRadius:10, flexShrink:0,
                                background:`${n.color}18`, border:`1px solid ${n.color}40`,
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                                {n.emoji}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ fontSize:12, fontWeight:700, color:T.textHeading, margin:0,
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</p>
                                <p style={{ fontSize:10, fontWeight:500, color:n.color, margin:'2px 0 0',
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.subtitle}</p>
                                <p style={{ fontSize:10, color:T.textMuted, margin:'2px 0 0' }}>
                                  {new Date(n.raw.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                                </p>
                              </div>
                              {isUnread && <div style={{ width:7, height:7, borderRadius:'50%', background:'#38A169', flexShrink:0 }}/>}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Event reminder section */}
                    {notifItems.filter(n=>n.type==='event').length > 0 && (
                      <div>
                        <p style={{ fontSize:9, fontWeight:700, letterSpacing:1, color:T.textMuted,
                          padding:'10px 18px 4px', margin:0, textTransform:'uppercase' }}>Upcoming Events</p>
                        {notifItems.filter(n=>n.type==='event').slice(0,5).map(n => {
                          const isUnread = !readNotifIds.has(n.id)
                          return (
                            <div key={n.id}
                              onClick={() => {
                                const next = new Set(readNotifIds); next.add(n.id); setReadNotifIds(next)
                                try { localStorage.setItem('sk_readNotifIds', JSON.stringify([...next])) } catch {}
                                setShowNotifs(false); setSelectedEv(n.raw); setActivePage('events')
                              }}
                              style={{ padding:'10px 18px', borderBottom:`1px solid ${T.border}`,
                                display:'flex', gap:10, alignItems:'center', cursor:'pointer',
                                background: isUnread ? (dark?'rgba(99,102,241,0.07)':'rgba(99,102,241,0.04)') : 'transparent',
                                transition:'background .15s' }}
                              onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                              onMouseLeave={e=>e.currentTarget.style.background=isUnread?(dark?'rgba(99,102,241,0.07)':'rgba(99,102,241,0.04)'):'transparent'}>
                              {/* Color bar */}
                              <div style={{ width:3, alignSelf:'stretch', borderRadius:4, background:n.color, flexShrink:0 }}/>
                              {/* Icon */}
                              <div style={{ width:32, height:32, borderRadius:10, flexShrink:0,
                                background:`${n.color}18`, border:`1px solid ${n.color}40`,
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                                {n.emoji}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ fontSize:12, fontWeight:700, color:T.textHeading, margin:0,
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</p>
                                <p style={{ fontSize:10, fontWeight:500, color:n.color, margin:'2px 0 0' }}>{n.subtitle}</p>
                              </div>
                              {isUnread && <div style={{ width:7, height:7, borderRadius:'50%', background:'#6366F1', flexShrink:0 }}/>}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Announcements section */}
                    {notifItems.filter(n=>n.type==='announcement').length > 0 && (
                      <div>
                        <p style={{ fontSize:9, fontWeight:700, letterSpacing:1, color:T.textMuted,
                          padding:'10px 18px 4px', margin:0, textTransform:'uppercase' }}>Announcements</p>
                        {notifItems.filter(n=>n.type==='announcement').slice(0,5).map(n => {
                          const isUnread = !readNotifIds.has(n.id)
                          return (
                            <div key={n.id}
                              onClick={() => {
                                const next = new Set(readNotifIds); next.add(n.id); setReadNotifIds(next)
                                try { localStorage.setItem('sk_readNotifIds', JSON.stringify([...next])) } catch {}
                                setShowNotifs(false); setSelectedAnn(n.raw)
                              }}
                              style={{ padding:'10px 18px', borderBottom:`1px solid ${T.border}`,
                                display:'flex', gap:10, alignItems:'center', cursor:'pointer',
                                background: isUnread ? (dark?'rgba(99,102,241,0.07)':'rgba(99,102,241,0.04)') : 'transparent',
                                transition:'background .15s' }}
                              onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                              onMouseLeave={e=>e.currentTarget.style.background=isUnread?(dark?'rgba(99,102,241,0.07)':'rgba(99,102,241,0.04)'):'transparent'}>
                              <div style={{ width:3, alignSelf:'stretch', borderRadius:4, background:'#6366F1', flexShrink:0 }}/>
                              <div style={{ width:32, height:32, borderRadius:10, flexShrink:0,
                                background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)',
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📢</div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ fontSize:12, fontWeight:700, color:T.textHeading, margin:0,
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</p>
                                <p style={{ fontSize:10, color:T.textMuted, margin:'2px 0 0',
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.subtitle}</p>
                              </div>
                              {isUnread && <div style={{ width:7, height:7, borderRadius:'50%', background:'#6366F1', flexShrink:0 }}/>}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {notifItems.length === 0 && (
                      <div style={{ padding:'32px 18px', textAlign:'center' }}>
                        <div style={{ fontSize:28, marginBottom:8 }}>🔔</div>
                        <p style={{ fontSize:12, color:T.textSubtle, margin:0 }}>You're all caught up!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3-column grid */}
            <div style={{ position:'relative', zIndex:5, flex:1, display:'flex', gap:0,
              overflow:'hidden', padding:isMobile?'10px 10px 0':isTablet?'10px 14px 0':'10px 18px 0', animation:'fadeSlideIn .35s ease' }}>

              {/* CENTER: main content */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16,
                overflowY:'auto', paddingRight:(isMobile||isTablet)?0:16, paddingBottom:16, minWidth:0 }}>

                {/* Portal greeting */}
                <div style={{ paddingTop:4, flexShrink:0 }}>
                  <p style={{ fontSize:10, fontWeight:700,
                    color: dark ? 'rgba(251,191,36,0.8)' : 'rgba(214,158,46,0.95)',
                    letterSpacing:'3px', textTransform:'uppercase', margin:'0 0 5px' }}>
                    SANGGUNIANG KABATAAN — BAKAKENG CENTRAL
                  </p>
                  <h1 style={{ fontSize:isMobile?17:isTablet?20:22, fontWeight:900,
                    color: dark ? 'white' : T.textHeading,
                    margin:0, lineHeight:1.2, fontFamily: T.fontFamily,
                    textTransform:'uppercase', letterSpacing:'.3px' }}>
                    WELCOME TO THE SK PORTAL OF{' '}
                    <span style={{ color: T.gold }}>
                      BARANGAY BAKAKENG CENTRAL!
                    </span>
                  </h1>
                </div>

                {/* Hero Carousel */}
                <AccomplishedCarousel
                  projects={accomplishedProjects}
                  onSelect={setSelectedProject}
                  isMobile={isMobile}
                  siteSettings={siteSettings}
                  isLoading={!dataLoaded}
                  dark={dark}
                />

                {/* Events section */}
                <div style={{ flexShrink:0 }}>
                  {(() => {
                    const now = new Date()
                    const thisYear = now.getFullYear(); const thisMonth = now.getMonth()

                    if (!dataLoaded) return (
                      <>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                          <div style={{ width:3, height:16, borderRadius:2, background:T.gold, flexShrink:0 }}/>
                          <div className="sk-skeleton" style={{ width:200, height:14 }}/>
                        </div>
                        <div className="sk-events-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                          {[0,1].map(i => <div key={i} className="sk-skeleton animate-pulse" style={{ borderRadius:14, height:160 }}/>)}
                        </div>
                      </>
                    )

                    const monthEvents = events.filter(ev => {
                      const s = (ev.status||'').toLowerCase().trim()
                      // Exclude completed, finished, and cancelled events entirely
                      if (s === 'cancelled' || s === 'completed' || s === 'finished') return false
                      if (!ev.start_date) return false
                      try {
                        const d = new Date(ev.start_date)
                        // Show: current-month events OR any future/upcoming/ongoing/planning events
                        const isCurrentMonth = d.getFullYear()===thisYear && d.getMonth()===thisMonth
                        const isUpcoming = d >= now || s === 'upcoming' || s === 'ongoing' || s === 'planning'
                        return isCurrentMonth || isUpcoming
                      } catch { return false }
                    }).sort((a,b) => new Date(a.start_date||0) - new Date(b.start_date||0))
                    const monthLabel = now.toLocaleDateString('en-US',{month:'long',year:'numeric'})

                    const sMapLight = {
                      upcoming:  { bg:'#FEF9E7',  color:'#D97706', border:'rgba(245,158,11,0.25)',  label:'Upcoming'  },
                      ongoing:   { bg:'#DCFCE7',  color:'#166534', border:'rgba(16,185,129,0.25)',  label:'Ongoing'   },
                      finished:  { bg:'#F3F4F6',  color:'#718096', border:'rgba(100,116,139,0.2)',  label:'Finished'  },
                      completed: { bg:'#DCFCE7',  color:'#166534', border:'rgba(16,185,129,0.25)',  label:'Completed' },
                      planning:  { bg:'#F5F3FF',  color:'#5B21B6', border:'rgba(139,92,246,0.2)',   label:'Planning'  },
                      cancelled: { bg:'#FEF2F2',  color:'#C53030', border:'rgba(197,48,48,0.2)',    label:'Cancelled' },
                    }
                    const sMapDark = {
                      upcoming:  { bg:'rgba(245,158,11,0.12)',  color:'#FBBF24', border:'rgba(245,158,11,0.25)',  label:'Upcoming'  },
                      ongoing:   { bg:'rgba(16,185,129,0.12)', color:'#34D399', border:'rgba(16,185,129,0.25)',  label:'Ongoing'   },
                      finished:  { bg:'rgba(100,116,139,0.12)',color:'#94A3B8', border:'rgba(100,116,139,0.2)',  label:'Finished'  },
                      completed: { bg:'rgba(16,185,129,0.12)', color:'#34D399', border:'rgba(16,185,129,0.25)',  label:'Completed' },
                      planning:  { bg:'rgba(139,92,246,0.12)', color:'#A78BFA', border:'rgba(139,92,246,0.2)',   label:'Planning'  },
                      cancelled: { bg:'rgba(197,48,48,0.1)',   color:'#F87171', border:'rgba(197,48,48,0.25)',   label:'Cancelled' },
                    }
                    const sMap = dark ? sMapDark : sMapLight

                    return (
                      <>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:3, height:16, borderRadius:2, background:T.gold, flexShrink:0 }}/>
                            <h3 style={{ fontSize:13, fontWeight:800, color:T.textHeading, margin:0,
                              fontFamily: T.fontFamily, textTransform:'uppercase', letterSpacing:'.8px' }}>
                              Upcoming Events
                            </h3>
                            {monthEvents.length > 0 && (
                              <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:10,
                                background:'rgba(214,158,46,0.1)', color:T.gold, border:`1px solid rgba(214,158,46,0.2)` }}>
                                {monthEvents.length}
                              </span>
                            )}
                          </div>
                          <button onClick={() => setActivePage('events')}
                            style={{ fontSize:11, color:T.gold, background:'none', border:'none',
                              cursor:'pointer', fontWeight:700, letterSpacing:'.5px' }}>
                            VIEW ALL →
                          </button>
                        </div>

                        {monthEvents.length === 0 ? (
                          <div style={{ borderRadius:14, background:T.surface, border:`1px solid ${T.border}`,
                            padding:'24px', textAlign:'center', color:T.textMuted, fontSize:12, boxShadow:T.shadow }}>
                            No upcoming events scheduled.
                          </div>
                        ) : (
                          <div className="sk-events-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                            {monthEvents.map(ev => {
                              const sc = sMap[(ev.status||'').toLowerCase()] || sMap.upcoming
                              const imgUrl = ev.banner_url || siteSettings?.heroImage || '/Hero.png'
                              const startDate = ev.start_date ? new Date(ev.start_date) : null
                              return (
                                <div key={ev.id} className="sk-ev-card"
                                  onClick={() => setHomeEvModal(ev)}
                                  style={{
                                    borderRadius:14, overflow:'hidden',
                                    background: dark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.92)',
                                    border:`1px solid ${T.border}`,
                                    boxShadow: T.shadow,
                                    cursor:'pointer', transition:'transform .15s, box-shadow .15s',
                                  }}
                                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.15)'}}
                                  onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=T.shadow}}>
                                  <div style={{ height:105, position:'relative', overflow:'hidden' }}>
                                    <img src={imgUrl} alt={ev.title} onError={e=>e.target.src='/Hero.png'}
                                      style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.85)', display:'block' }}/>
                                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(15,23,42,0.75),transparent 55%)' }}/>
                                    <span style={{ position:'absolute', top:8, left:10, padding:'3px 9px', borderRadius:20,
                                      background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`,
                                      fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>
                                      {sc.label}
                                    </span>
                                  </div>
                                  <div style={{ padding:'10px 13px 13px' }}>
                                    <p style={{ fontSize:13, fontWeight:700, color: dark?'white':T.textHeading,
                                      lineHeight:1.35, margin:'0 0 5px',
                                      fontFamily: T.fontFamily,
                                      display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                                      {ev.title}
                                    </p>
                                    {startDate && (
                                      <p style={{ fontSize:10, color:T.textMuted, margin:'0 0 3px',
                                        display:'flex', alignItems:'center', gap:4 }}>
                                        <span style={{ color:T.gold }}>📅</span>
                                        {startDate.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                                        {' · '}{startDate.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                                      </p>
                                    )}
                                    {ev.location && <p style={{ fontSize:10, color:T.textMuted, margin:0, display:'flex', alignItems:'center', gap:4 }}>
                                      📍 {ev.location}
                                    </p>}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

              </div>{/* end center */}

              {/* RIGHT SIDEBAR */}
              <div className="sk-right-sidebar" style={{ width:300, flexShrink:0, display:'flex', flexDirection:'column', gap:14, overflowY:'auto', paddingBottom:16 }}>

                {/* Latest Announcements */}
                <div className="sk-card" style={{ flexShrink:0, overflow:'hidden' }}>
                  <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`,
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:3, height:16, borderRadius:2, background:T.gold }}/>
                      <h3 style={{ fontSize:13, fontWeight:800, color:T.textHeading, margin:0,
                        fontFamily: T.fontFamily }}>Latest Announcements</h3>
                    </div>
                    <button onClick={() => setActivePage('announcements')}
                      style={{ fontSize:9, color:T.navy, background:'none', border:'none',
                        cursor:'pointer', fontWeight:700, letterSpacing:'1px' }}>SEE ALL →</button>
                  </div>

                  <div>
                    {!annCards ? (
                      [0,1,2,3].map(i => (
                        <div key={i} style={{ padding:'13px 18px', borderBottom:`1px solid ${T.border}`,
                          display:'flex', gap:12 }}>
                          <div className="sk-skeleton animate-pulse" style={{ width:3, borderRadius:2, flexShrink:0, alignSelf:'stretch' }}/>
                          <div style={{ flex:1 }}>
                            <div className="sk-skeleton animate-pulse" style={{ width:80, height:12, marginBottom:8 }}/>
                            <div className="sk-skeleton animate-pulse" style={{ width:'90%', height:12, marginBottom:6 }}/>
                            <div className="sk-skeleton animate-pulse" style={{ width:'60%', height:10 }}/>
                          </div>
                        </div>
                      ))
                    ) : (
                      annCards.map((card, i) => (
                        <div key={card.id} className="sk-ann-card"
                          onClick={() => card.real ? setSelectedAnn(card.real) : null}
                          style={{ padding:'13px 0 13px 18px', borderBottom: i<annCards.length-1 ? `1px solid ${T.border}` : 'none',
                            display:'flex', alignItems:'stretch', background:'transparent',
                            transition:'background .15s' }}
                          onMouseEnter={e => e.currentTarget.style.background=T.surface2}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <div style={{ width:4, borderRadius:2, background:card.bar, flexShrink:0, marginRight:14, alignSelf:'stretch' }}/>
                          <div style={{ flex:1, paddingRight:16, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                              <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20,
                                background:card.bg, color:card.color, fontSize:9, fontWeight:700,
                                border:`1px solid ${card.color}25` }}>{card.type}</span>
                              <span style={{ fontSize:9, color:T.textSubtle }}>{card.date}</span>
                            </div>
                            <p style={{ fontSize:12, fontWeight:700, color:T.textHeading, lineHeight:1.4, margin:'0 0 3px',
                              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                              {card.title}
                            </p>
                            <p style={{ fontSize:10, color:T.textMuted, lineHeight:1.55, margin:'0 0 6px',
                              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                              {card.content}
                            </p>
                            <button className="sk-readmore"
                              onClick={e => { e.stopPropagation(); card.real ? setSelectedAnn(card.real) : setActivePage('announcements') }}
                              style={{ background:'none', border:'none', cursor:'pointer', fontSize:10,
                                fontWeight:700, color:T.navy, padding:0, letterSpacing:'.5px' }}>
                              Read More →
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Connect With Us */}
                <div className="sk-card" style={{ padding:'16px 18px', flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <div style={{ width:3, height:14, borderRadius:2, background:T.gold }}/>
                    <h3 style={{ fontSize:12, fontWeight:800, color:T.textHeading, margin:0,
                      fontFamily: T.fontFamily, textTransform:'uppercase', letterSpacing:'.8px' }}>Connect With Us</h3>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <a href="https://facebook.com/SK.BakakengCentral" target="_blank" rel="noreferrer"
                      className="sk-soc-btn"
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                        borderRadius:12, background:'rgba(24,119,242,0.06)', border:'1px solid rgba(24,119,242,0.15)',
                        textDecoration:'none', boxShadow:'0 2px 8px rgba(24,119,242,0.08)' }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:'#1877F2', flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 10px rgba(24,119,242,0.3)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:700, color:T.textHeading, margin:0 }}>Facebook</p>
                        <p style={{ fontSize:10, color:T.textMuted, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>/SK.BakakengCentral</p>
                      </div>
                      <ChevronRight size={14} style={{ color:T.textSubtle, marginLeft:'auto', flexShrink:0 }}/>
                    </a>
                    <a href="mailto:skbakakengcentral@gmail.com"
                      className="sk-soc-btn"
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                        borderRadius:12, background:'rgba(234,67,53,0.05)', border:'1px solid rgba(234,67,53,0.15)',
                        textDecoration:'none', boxShadow:'0 2px 8px rgba(234,67,53,0.06)' }}>
                      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                        background:'linear-gradient(135deg,#EA4335,#FBBC04)',
                        display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 10px rgba(234,67,53,0.25)' }}>
                        <svg width="16" height="12" viewBox="0 0 24 18" fill="white"><path d="M22 0H2C.9 0 0 .9 0 2v14c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2zm0 4l-10 6L2 4V2l10 6 10-6v2z"/></svg>
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:700, color:T.textHeading, margin:0 }}>Gmail</p>
                        <p style={{ fontSize:10, color:T.textMuted, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>skbakakengcentral@gmail.com</p>
                      </div>
                      <ChevronRight size={14} style={{ color:T.textSubtle, marginLeft:'auto', flexShrink:0 }}/>
                    </a>
                  </div>
                </div>

              </div>{/* end right sidebar */}
            </div>{/* end 3-col grid */}

            {/* Footer */}
            <div style={{ position:'relative', zIndex:10, flexShrink:0 }}>
              <PageFooter/>
            </div>
          </div>
          )}

          {activePage === 'announcements' && <AnnouncementsPage announcements={announcements} dark={dark} isMobile={isMobile} isTablet={isTablet} T={T} format={format} PageFooter={PageFooter} onSelect={setSelectedAnn}/>}
          {activePage === 'projects' && <ProjectsPage projects={projects} dark={dark} isMobile={isMobile} isTablet={isTablet} T={T} siteSettings={siteSettings} format={format} setSelectedProject={setSelectedProject} PageFooter={PageFooter}/>}

          {/* ════════ EVENTS PAGE ════════ */}
          {activePage === 'events' && (
          <div style={{ animation:'fadeSlideIn .2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
            <section style={{ padding:isMobile?'20px 14px 48px':isTablet?'28px 24px 60px':'36px 48px 60px', flex:1 }}>

              {/* ── Header ── */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:isMobile?20:28, flexWrap:'wrap', gap:12 }}>
                <div>
                  <h2 style={{ fontSize:isMobile?22:28, fontWeight:900, color:T.textHeading,
                    textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 4px',
                    fontFamily: T.fontFamily }}>Community Events</h2>
                  <p style={{ fontSize:13, color:T.textMuted, margin:0 }}>
                    Stay updated with scheduled activities in Barangay Bakakeng Central.
                  </p>
                </div>
                {/* Live clock */}
                <div className="sk-card" style={{ padding:'10px 20px', textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontSize:11, color:T.textMuted, margin:'0 0 2px', fontWeight:500 }}>
                    {clock.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
                  </p>
                  <p style={{ fontSize:20, fontWeight:800, color:T.textHeading, margin:0, letterSpacing:'2px', fontVariantNumeric:'tabular-nums' }}>
                    {clock.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                  </p>
                </div>
              </div>

              {/* ── Event List ── */}
              <EventsList
                events={events}
                dark={dark}
                isMobile={isMobile}
                T={T}
                evCountdown={evCountdown}
                clock={clock}
                onSelect={setSelectedEv}
              />
            </section>


            <PageFooter/>
          </div>
          )}

          {/* ════════ FEEDBACK PAGE ════════ */}
          {activePage === 'feedback' && (
          <div style={{ animation:'fadeSlideIn .2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
            <section style={{ flex:1, padding:isMobile?'28px 18px':'52px 32px', background:'transparent' }}>
              <div style={{ maxWidth:1100, margin:'0 auto', display:'flex',
                flexDirection:isMobile?'column':'row', gap:isMobile?24:48,
                alignItems:'center', flexWrap:'wrap' }}>

                {/* Illustration side */}
                <div style={{ flex:'1 1 260px', position:'relative', minHeight:300,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:250, height:250, borderRadius:'50%', background:T.surface2,
                    position:'absolute', overflow:'hidden', boxShadow:T.shadowLg }}>
                    <img src="/feedback.png" alt="Feedback" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  </div>
                  <div className="sk-card" style={{ position:'absolute', top:16, left:6, padding:'12px 16px', maxWidth:200 }}>
                    <div style={{ display:'flex', gap:2, marginBottom:5 }}>
                      {[...Array(5)].map((_,i)=><Star key={i} size={10} fill={T.gold} color={T.gold}/>)}
                    </div>
                    <p style={{ fontSize:11, color:T.text, lineHeight:1.5, fontStyle:'italic', margin:0 }}>"Great service! Very responsive team."</p>
                  </div>
                  <div style={{ position:'absolute', bottom:16, right:6, background:T.navy,
                    borderRadius:14, padding:'12px 16px', maxWidth:200, boxShadow:T.shadowLg }}>
                    <p style={{ fontSize:11, color:'white', lineHeight:1.5, fontStyle:'italic', margin:0 }}>"Love the new digital portal. Easy to use!"</p>
                    <p style={{ fontSize:9, color:'rgba(255,255,255,0.6)', marginTop:4, fontWeight:600 }}>— Resident</p>
                  </div>
                </div>

                {/* Form side */}
                <div className="sk-card" style={{ flex:'1 1 320px', minWidth:0, padding:'28px' }}>
                  <div style={{ marginBottom:4 }}>
                    <div style={{ width:3, height:22, borderRadius:2, background:T.crimson, display:'inline-block', marginRight:10, verticalAlign:'middle' }}/>
                    <h2 style={{ fontSize:22, fontWeight:800, color:T.textHeading, display:'inline',
                      fontFamily: T.fontFamily, textTransform:'uppercase', letterSpacing:'.5px' }}>
                      Share Your Feedback
                    </h2>
                  </div>
                  <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, lineHeight:1.6 }}>
                    We value your opinion. Let us know how we can improve our services.
                  </p>
                  <form onSubmit={handleFeedback}>
                    <div style={{ marginBottom:14 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Subject</label>
                      <input type="text"
                        style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1px solid ${T.border}`,
                          background:T.surface2, color:T.text, fontSize:13, outline:'none',
                          transition:'border-color .15s, box-shadow .15s' }}
                        value={feedback.subject} onChange={e=>setFeedback(f=>({...f,subject:e.target.value}))}
                        placeholder="What is this about?"
                        onFocus={e => { e.target.style.borderColor=T.navy; e.target.style.boxShadow=`0 0 0 3px ${T.navy}12` }}
                        onBlur={e => { e.target.style.borderColor=T.border; e.target.style.boxShadow='none' }}/>
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:10 }}>Rating</label>
                      {/* Emoji Star Rating Widget — Bad / Poor / Average / Good / Excellent */}
                      {(() => {
                        const RATINGS = [
                          { value:'bad',       label:'Bad',       color:'#C53030', face:(active)=>(
                            <svg viewBox="0 0 64 64" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
                              <polygon points="32,4 39,24 61,24 44,37 50,58 32,45 14,58 20,37 3,24 25,24" fill={active?"#F6C90E":"#F6C90E55"} stroke={active?"#D4A000":"#ccc"} strokeWidth="1.5"/>
                              {active && <>
                                <circle cx="24" cy="30" r="3" fill="#333"/>
                                <circle cx="40" cy="30" r="3" fill="#333"/>
                                <path d="M22,44 Q32,38 42,44" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round"/>
                                <path d="M20,22 L26,26 M44,22 L38,26" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
                                <ellipse cx="28" cy="45" rx="3" ry="2" fill="#FF8A80" opacity="0.7"/>
                              </>}
                              {!active && <>
                                <circle cx="24" cy="30" r="2.5" fill="#aaa"/>
                                <circle cx="40" cy="30" r="2.5" fill="#aaa"/>
                                <path d="M22,43 Q32,38 42,43" stroke="#aaa" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                              </>}
                            </svg>
                          )},
                          { value:'poor',      label:'Poor',      color:'#DD6B20', face:(active)=>(
                            <svg viewBox="0 0 64 64" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
                              <polygon points="32,4 39,24 61,24 44,37 50,58 32,45 14,58 20,37 3,24 25,24" fill={active?"#F6C90E":"#F6C90E55"} stroke={active?"#D4A000":"#ccc"} strokeWidth="1.5"/>
                              {active && <>
                                <circle cx="24" cy="30" r="3" fill="#333"/>
                                <circle cx="40" cy="30" r="3" fill="#333"/>
                                <path d="M23,43 Q32,39 41,43" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round"/>
                              </>}
                              {!active && <>
                                <circle cx="24" cy="30" r="2.5" fill="#aaa"/>
                                <circle cx="40" cy="30" r="2.5" fill="#aaa"/>
                                <path d="M23,43 Q32,39 41,43" stroke="#aaa" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                              </>}
                            </svg>
                          )},
                          { value:'average',   label:'Average',   color:'#D69E2E', face:(active)=>(
                            <svg viewBox="0 0 64 64" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
                              <polygon points="32,4 39,24 61,24 44,37 50,58 32,45 14,58 20,37 3,24 25,24" fill={active?"#F6C90E":"#F6C90E55"} stroke={active?"#D4A000":"#ccc"} strokeWidth="1.5"/>
                              {active && <>
                                <circle cx="24" cy="30" r="3" fill="#333"/>
                                <circle cx="40" cy="30" r="3" fill="#333"/>
                                <line x1="22" y1="43" x2="42" y2="43" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
                              </>}
                              {!active && <>
                                <circle cx="24" cy="30" r="2.5" fill="#aaa"/>
                                <circle cx="40" cy="30" r="2.5" fill="#aaa"/>
                                <line x1="22" y1="43" x2="42" y2="43" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
                              </>}
                            </svg>
                          )},
                          { value:'good',      label:'Good',      color:'#38A169', face:(active)=>(
                            <svg viewBox="0 0 64 64" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
                              <polygon points="32,4 39,24 61,24 44,37 50,58 32,45 14,58 20,37 3,24 25,24" fill={active?"#F6C90E":"#F6C90E55"} stroke={active?"#D4A000":"#ccc"} strokeWidth="1.5"/>
                              {active && <>
                                <circle cx="24" cy="30" r="3" fill="#333"/>
                                <circle cx="40" cy="30" r="3" fill="#333"/>
                                <path d="M22,40 Q32,48 42,40" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round"/>
                              </>}
                              {!active && <>
                                <circle cx="24" cy="30" r="2.5" fill="#aaa"/>
                                <circle cx="40" cy="30" r="2.5" fill="#aaa"/>
                                <path d="M22,40 Q32,48 42,40" stroke="#aaa" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                              </>}
                            </svg>
                          )},
                          { value:'excellent', label:'Excellent',  color:'#E53E7A', face:(active)=>(
                            <svg viewBox="0 0 64 64" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
                              <polygon points="32,4 39,24 61,24 44,37 50,58 32,45 14,58 20,37 3,24 25,24" fill={active?"#F6C90E":"#F6C90E55"} stroke={active?"#D4A000":"#ccc"} strokeWidth="1.5"/>
                              {active && <>
                                <path d="M21,28 Q24,24 27,28" stroke="#C53030" strokeWidth="2" fill="none" strokeLinecap="round"/>
                                <path d="M37,28 Q40,24 43,28" stroke="#C53030" strokeWidth="2" fill="none" strokeLinecap="round"/>
                                <circle cx="23" cy="27" r="3.5" fill="#C53030"/>
                                <circle cx="41" cy="27" r="3.5" fill="#C53030"/>
                                <path d="M21,40 Q32,50 43,40" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                                <ellipse cx="32" cy="46" rx="5" ry="3" fill="#FF6B6B" opacity="0.5"/>
                              </>}
                              {!active && <>
                                <circle cx="24" cy="30" r="2.5" fill="#aaa"/>
                                <circle cx="40" cy="30" r="2.5" fill="#aaa"/>
                                <path d="M22,41 Q32,48 42,41" stroke="#aaa" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                              </>}
                            </svg>
                          )},
                        ]
                        const activeRating = hoveredStar || feedback.rating
                        const activeItem   = RATINGS.find(r => r.value === activeRating)
                        return (
                          <div>
                            <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
                              {RATINGS.map(r => (
                                <button
                                  key={r.value}
                                  type="button"
                                  onClick={() => setFeedback(f => ({ ...f, rating: r.value }))}
                                  onMouseEnter={() => setHoveredStar(r.value)}
                                  onMouseLeave={() => setHoveredStar(0)}
                                  style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 2px',
                                    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                                    transform: activeRating === r.value ? 'scale(1.22) translateY(-4px)' : 'scale(1)',
                                    transition:'transform .18s ease',
                                    outline:'none' }}>
                                  {r.face(activeRating === r.value)}
                                  <span style={{ fontSize:10, fontWeight:700,
                                    color: activeRating === r.value ? r.color : T.textMuted,
                                    transition:'color .15s', whiteSpace:'nowrap' }}>
                                    {r.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                            {!feedback.rating && !hoveredStar && (
                              <p style={{ fontSize:11, color:T.textMuted, marginTop:8, fontStyle:'italic' }}>
                                Click a star to rate your experience
                              </p>
                            )}
                            {activeItem && (
                              <p style={{ fontSize:12, fontWeight:700, color:activeItem.color, marginTop:8, transition:'color .15s' }}>
                                {activeItem.label === 'Bad' ? '😠 ' : activeItem.label === 'Poor' ? '😕 ' : activeItem.label === 'Average' ? '😐 ' : activeItem.label === 'Good' ? '😊 ' : '🤩 '}
                                {activeItem.label}
                              </p>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Message</label>
                      <textarea
                        style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1px solid ${T.border}`,
                          background:T.surface2, color:T.text, fontSize:13, outline:'none',
                          resize:'vertical', minHeight:90 }}
                        value={feedback.message} onChange={e=>setFeedback(f=>({...f,message:e.target.value}))}
                        placeholder="Your feedback..." required/>
                    </div>

                    {/* ── Attachments ── */}
                    <div style={{ marginBottom:22 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>
                        Attachments <span style={{ fontWeight:400, color:T.textMuted }}>(optional)</span>
                      </label>
                      {/* Hidden file input */}
                      <input
                        ref={attachInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        style={{ display:'none' }}
                        onChange={e => {
                          const files = Array.from(e.target.files || [])
                          const MAX = 5
                          const remaining = MAX - attachments.length
                          if (remaining <= 0) { toast(`Maximum ${MAX} files allowed.`, 'error'); return }
                          const toAdd = files.slice(0, remaining).map(file => ({
                            file,
                            name: file.name,
                            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                          }))
                          setAttachments(prev => [...prev, ...toAdd])
                          e.target.value = ''
                        }}
                      />
                      {/* Drop zone / trigger */}
                      <div
                        onClick={() => attachInputRef.current?.click()}
                        style={{ border:`2px dashed ${T.border}`, borderRadius:10, padding:'14px 16px',
                          cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                          background:T.surface2, transition:'border-color .15s, background .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor=T.navy; e.currentTarget.style.background=T.surface }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background=T.surface2 }}>
                        <Paperclip size={16} style={{ color:T.textMuted, flexShrink:0 }}/>
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:0 }}>Click to attach files</p>
                          <p style={{ fontSize:11, color:T.textMuted, margin:'2px 0 0' }}>Images (JPG, PNG), PDF, DOC, TXT · Max 5 files</p>
                        </div>
                      </div>
                      {/* Preview list */}
                      {attachments.length > 0 && (
                        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                          {attachments.map((att, i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                              background:T.surface, border:`1px solid ${T.border}`,
                              borderRadius:8, padding:'8px 10px' }}>
                              {att.preview ? (
                                <img src={att.preview} alt={att.name}
                                  style={{ width:36, height:36, borderRadius:6, objectFit:'cover', flexShrink:0 }}/>
                              ) : (
                                <div style={{ width:36, height:36, borderRadius:6, background:T.surface2,
                                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  <Paperclip size={14} style={{ color:T.textMuted }}/>
                                </div>
                              )}
                              <span style={{ flex:1, fontSize:12, color:T.text, overflow:'hidden',
                                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{att.name}</span>
                              <button type="button"
                                onClick={e => { e.stopPropagation(); setAttachments(prev => prev.filter((_,j)=>j!==i)) }}
                                style={{ background:'none', border:'none', cursor:'pointer', padding:4,
                                  color:T.textMuted, display:'flex', alignItems:'center', flexShrink:0 }}>
                                <Trash2 size={13}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={submitting || attachUploading}
                      style={{ width:'100%', padding:'13px', borderRadius:10, background:T.crimson,
                        color:'white', border:'none', cursor:submitting?'not-allowed':'pointer',
                        fontSize:14, fontWeight:700, letterSpacing:'.5px', display:'flex',
                        alignItems:'center', justifyContent:'center', gap:8,
                        boxShadow:'0 3px 12px rgba(197,48,48,0.3)', transition:'opacity .15s' }}
                      onMouseEnter={e=>{if(!submitting)e.currentTarget.style.opacity='.85'}}
                      onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      {attachUploading ? <><Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/> Uploading…</> : submitting ? <><Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/> Sending…</> : <><Send size={15}/> SEND FEEDBACK</>}
                    </button>
                    <p style={{ fontSize:11, color:T.textSubtle, textAlign:'center', marginTop:10 }}>
                      Your feedback is associated with your account for administrative purposes.
                    </p>
                  </form>
                </div>
              </div>
            </section>
            <PageFooter/>
          </div>
          )}

        </div>
      </div>

      {/* ISK AI Chatbot */}
      <ISKAIChat onNavigate={setActivePage}/>

      {/* Report Concern FAB */}
      <button
        title="Report a Website Concern"
        onClick={() => { setReportForm({ category:'', description:'', contact:'', file:null, fileName:'' }); setReportDone(false); setShowReport(true) }}
        style={{ position:'fixed', bottom:24, left:isMobile?'auto':24, right:isMobile?88:'auto',
          width:50, height:50, borderRadius:'50%', background:T.crimson,
          border:'none', cursor:'pointer', color:'white', display:'flex',
          alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 20px rgba(197,48,48,0.4)', zIndex:8000,
          transition:'transform .2s' }}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
        <Flag size={20}/>
      </button>

      {/* MODALS */}
      <Modal open={showProfile} onClose={() => setShowProfile(false)} title="Profile Information" size="lg">
        <ProfilingForm isUpdate/>
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Account Settings">
        <form onSubmit={handlePasswordUpdate}>
          <FormField label="New Password" required>
            <div style={{ position:'relative' }}>
              <input className="input-field" type={settingsPw.show?'text':'password'} value={settingsPw.newpw}
                onChange={e=>setSettingsPw(p=>({...p,newpw:e.target.value}))} required minLength={8} style={{ paddingRight:40 }}/>
              <button type="button" onClick={() => setSettingsPw(p=>({...p,show:!p.show}))}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'#A0AEC0' }}>
                {settingsPw.show?<EyeOff size={15}/>:<Eye size={15}/>}
              </button>
            </div>
          </FormField>
          <FormField label="Confirm Password" required>
            <input className="input-field" type={settingsPw.show?'text':'password'} value={settingsPw.confirm}
              onChange={e=>setSettingsPw(p=>({...p,confirm:e.target.value}))} required/>
          </FormField>
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <button type="button" onClick={() => setShowSettings(false)} className="btn-ghost" style={{ flex:1 }}>Cancel</button>
            <button type="submit" className="btn-navy" style={{ flex:1 }}>Update Password</button>
          </div>
        </form>
      </Modal>

      {selectedProject && <ProjectDetailModal project={selectedProject} profile={profile} T={T} onClose={() => setSelectedProject(null)} logAudit={logAudit} userId={user?.id}/>}
      {selectedAnn && <AnnouncementModal ann={selectedAnn} T={T} onClose={() => setSelectedAnn(null)} onViewAll={() => setActivePage('announcements')}/>}
      {selectedEv && <EventModal ev={selectedEv} T={T} clock={clock} evCountdown={evCountdown} onClose={() => setSelectedEv(null)} onViewAll={() => { setActivePage('events'); setSelectedEv(null) }} user={user} profile={profile} logAudit={logAudit}/>}

      <ConfirmDialog open={logoutOpen} onClose={() => setLogout(false)} onConfirm={handleLogout}
        title="Log Out" message="Do you want to log out?" danger
        cancelLabel="No" confirmLabel="Yes"/>

      {/* ── Home Event Detail Modal ── */}
      {homeEvModal && (
        <div onClick={() => setHomeEvModal(null)}
          style={{ position:'fixed', inset:0, zIndex:1200,
            background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e=>e.stopPropagation()}
            style={{ width:'100%', maxWidth:820, maxHeight:'88vh', overflowY:'auto',
              borderRadius:18, boxShadow:'0 24px 60px rgba(0,0,0,0.35)',
              animation:'fadeSlideIn .2s ease' }}>
            <EventDetailPanel ev={homeEvModal} clock={clock} evCountdown={evCountdown} T={T}
              onClose={() => setHomeEvModal(null)}/>
          </div>
        </div>
      )}

      {/* ── Report Concern Modal ── */}
      {showReport&&(
        <div onClick={()=>setShowReport(false)} style={{ position:'fixed',inset:0,zIndex:9500,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'white',borderRadius:20,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.3)',animation:'fadeSlideIn .2s ease' }}>
            {/* Header */}
            <div style={{ background:`linear-gradient(135deg,${T.crimson},#9B2C2C)`,borderRadius:'20px 20px 0 0',padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}><Flag size={18} color="white"/></div>
                <div>
                  <p style={{ color:'white',fontWeight:700,fontSize:15,margin:0 }}>Report a Concern</p>
                  <p style={{ color:'rgba(255,255,255,0.75)',fontSize:11,margin:0 }}>Help us improve the portal</p>
                </div>
              </div>
              <button onClick={()=>setShowReport(false)} style={{ background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:30,height:30,cursor:'pointer',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>✕</button>
            </div>
            {reportDone?(
              <div style={{ padding:40,textAlign:'center' }}>
                <div style={{ fontSize:48,marginBottom:12 }}>✅</div>
                <p style={{ fontSize:17,fontWeight:700,color:T.navy,margin:'0 0 8px' }}>Report Submitted!</p>
                <p style={{ fontSize:13,color:'#718096',margin:'0 0 20px' }}>Thank you. An admin will review your concern shortly.</p>
                <button onClick={()=>setShowReport(false)} style={{ padding:'10px 28px',borderRadius:10,background:T.navy,color:'white',border:'none',cursor:'pointer',fontWeight:600,fontSize:13 }}>Close</button>
              </div>
            ):(
              <div style={{ padding:22 }}>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#4A5568',marginBottom:6 }}>Report Category <span style={{ color:T.crimson }}>*</span></label>
                  <select value={reportForm.category} onChange={e=>setReportForm(f=>({...f,category:e.target.value}))}
                    style={{ width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid #E2E8F0',fontSize:13,color:reportForm.category?'#2D3748':'#A0AEC0',outline:'none',background:'white',cursor:'pointer' }}>
                    <option value="">Select a category...</option>
                    <option value="Technical Bug">🐛 Technical Bug</option>
                    <option value="Inappropriate Content">⚠️ Inappropriate Content</option>
                    <option value="Suggestion">💡 Suggestion</option>
                    <option value="Account Issue">🔐 Account Issue</option>
                    <option value="Other">📌 Other</option>
                  </select>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#4A5568',marginBottom:6 }}>Description <span style={{ color:T.crimson }}>*</span></label>
                  <textarea value={reportForm.description} onChange={e=>setReportForm(f=>({...f,description:e.target.value}))}
                    placeholder="Describe the issue in detail. What happened? What were you doing when it occurred?"
                    rows={4} style={{ width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid #E2E8F0',fontSize:13,color:'#2D3748',outline:'none',resize:'vertical',fontFamily:'inherit',lineHeight:1.6,boxSizing:'border-box' }}/>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#4A5568',marginBottom:6 }}>Evidence / Screenshot <span style={{ fontSize:11,color:'#A0AEC0',fontWeight:400 }}>(Optional)</span></label>
                  <input ref={reportFileRef} type="file" accept="image/*,.pdf" style={{ display:'none' }}
                    onChange={e=>{ const f=e.target.files?.[0]; if(f)setReportForm(p=>({...p,file:f,fileName:f.name})) }}/>
                  <button onClick={()=>reportFileRef.current?.click()}
                    style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',border:'1.5px dashed #CBD5E0',borderRadius:9,background:'#F7FAFC',cursor:'pointer',fontSize:13,color:'#4A5568',width:'100%',justifyContent:'center' }}>
                    📎 {reportForm.fileName||'Click to attach a file or screenshot'}
                  </button>
                  {reportForm.fileName&&<p style={{ fontSize:11,color:'#38A169',marginTop:4,marginBottom:0 }}>✓ {reportForm.fileName}</p>}
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#4A5568',marginBottom:6 }}>Contact Info <span style={{ fontSize:11,color:'#A0AEC0',fontWeight:400 }}>(Optional — for follow-up)</span></label>
                  <input type="text" value={reportForm.contact} onChange={e=>setReportForm(f=>({...f,contact:e.target.value}))}
                    placeholder="Your email or phone number"
                    style={{ width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid #E2E8F0',fontSize:13,color:'#2D3748',outline:'none',boxSizing:'border-box' }}/>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button onClick={()=>setShowReport(false)} style={{ flex:1,padding:'11px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'white',cursor:'pointer',fontWeight:600,fontSize:13,color:'#718096' }}>Cancel</button>
                  <button
                    disabled={!reportForm.category||!reportForm.description||reportSubmitting}
                    onClick={async()=>{
                      setReportSubmitting(true)
                      try{
                        let evidenceUrl=null
                        if(reportForm.file){
                          const ext=reportForm.file.name.split('.').pop()
                          const path=`reports/${Date.now()}.${ext}`
                          const{error:upErr}=await supabase.storage.from('evidence').upload(path,reportForm.file,{upsert:true})
                          if(!upErr){const{data:urlData}=supabase.storage.from('evidence').getPublicUrl(path);evidenceUrl=urlData?.publicUrl}
                        }
                        await supabase.from('reports').insert({
                          user_id:user?.id,
                          email:user?.email,
                          display_name:profile?.full_name||profile?.display_name||user?.email,
                          category:reportForm.category,
                          description:reportForm.description,
                          contact_info:reportForm.contact||null,
                          evidence_url:evidenceUrl,
                          status:'Open',
                        })
                        setReportDone(true)
                      }catch(err){alert('Failed to submit: '+err.message)}
                      finally{setReportSubmitting(false)}
                    }}
                    style={{ flex:2,padding:'11px',borderRadius:10,background:(!reportForm.category||!reportForm.description)?'#CBD5E0':T.crimson,color:'white',border:'none',cursor:(!reportForm.category||!reportForm.description)?'not-allowed':'pointer',fontWeight:700,fontSize:13,transition:'background .15s' }}>
                    {reportSubmitting?'Submitting…':'🚩 Submit Report'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
