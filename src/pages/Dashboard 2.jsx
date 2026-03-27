import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Sun, Moon, LogOut, User, Settings, Flag, Send, Menu, X,
  Home, Megaphone, FolderOpen, Calendar, MessageSquare,
  ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Star,
  Heart, Activity, Users, Award, Facebook, Mail
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
  projects:      'sk_cache_projects_v1',
  announcements: 'sk_cache_announcements_v1',
  events:        'sk_cache_events_v1',
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
  }
  @media (max-width: 640px) {
    .sk-events-grid { grid-template-columns: 1fr !important; }
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
                fontFamily: T.fontFamily, lineHeight:1.2, margin:'0 0 8px',
                textShadow:'0 2px 12px rgba(0,0,0,0.6)' }}>
                {p.project_name || p.title}
              </h2>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                {dateFinished && <span style={{ fontSize:11, color:'rgba(255,255,255,0.75)', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ color:'#FBBF24' }}>📅</span> {fmtDate(dateFinished)}
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

/* ─────────────────────── PROJECT DETAIL MODAL ─────────────────────── */
function ProjectDetailModal({ project, T, onClose }) {
  const [galIdx, setGalIdx] = useState(0)
  const imgs = (project?.images || []).filter(Boolean)
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  if (!project) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.7)', zIndex:9000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.surface, borderRadius:20, maxWidth:580, width:'100%', maxHeight:'88vh',
          overflow:'hidden', display:'flex', flexDirection:'column',
          boxShadow:'0 32px 80px rgba(0,0,0,0.4)', border:`1px solid ${T.border}`,
          animation:'fadeSlideIn .25s ease' }}>
        {imgs.length > 0 && (
          <div style={{ position:'relative', height:240, overflow:'hidden', flexShrink:0 }}>
            <img src={imgs[galIdx]} alt={project.project_name} onError={e=>e.target.src='/Hero.png'}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(15,23,42,0.7),transparent 60%)' }}/>
            {imgs.length > 1 && (<>
              <button onClick={() => setGalIdx(i=>(i-1+imgs.length)%imgs.length)}
                style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:32, height:32,
                  borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.2)',
                  color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ChevronLeft size={15}/>
              </button>
              <button onClick={() => setGalIdx(i=>(i+1)%imgs.length)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:32, height:32,
                  borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.2)',
                  color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ChevronRight size={15}/>
              </button>
            </>)}
            <button onClick={onClose} style={{ position:'absolute', top:12, right:12, width:32, height:32,
              borderRadius:'50%', background:'rgba(0,0,0,0.55)', border:'1px solid rgba(255,255,255,0.2)',
              color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={15}/>
            </button>
          </div>
        )}
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>
          {imgs.length === 0 && (
            <button onClick={onClose} style={{ float:'right', background:T.surface2,
              border:`1px solid ${T.border}`, borderRadius:8, color:T.text, cursor:'pointer', padding:'4px 10px', fontSize:12 }}>✕ Close</button>
          )}
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 11px',
            borderRadius:20, background:'rgba(16,185,129,0.12)', color:'#059669',
            fontSize:9, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10,
            border:'1px solid rgba(16,185,129,0.25)' }}>
            ✦ ACCOMPLISHED
          </div>
          <h2 style={{ fontSize:20, fontWeight:900, color:T.textHeading,
            fontFamily: T.fontFamily, margin:'0 0 14px', lineHeight:1.3 }}>
            {project.project_name || project.title}
          </h2>
          {[
            project.completion_date && ['📅 Completed', new Date(project.completion_date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})],
            project.start_date && ['🚀 Started', new Date(project.start_date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})],
            project.location && ['📍 Location', project.location],
            project.budget && ['💰 Budget', `₱${parseFloat(project.budget).toLocaleString()}`],
            project.fund_source && ['🏦 Fund Source', project.fund_source],
            project.prepared_by && ['👤 Prepared by', project.prepared_by],
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:11, color:T.textMuted, width:105, flexShrink:0 }}>{label}</span>
              <span style={{ fontSize:12, color:T.text, fontWeight:600 }}>{val}</span>
            </div>
          ))}
          {project.description && (
            <div style={{ marginTop:16 }}>
              <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase',
                letterSpacing:'.8px', margin:'0 0 8px' }}>Description</p>
              <p style={{ fontSize:13, color:T.text, lineHeight:1.8, margin:0 }}>{project.description}</p>
            </div>
          )}
        </div>
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 22px', borderRadius:10,
            background:T.surface2, border:`1px solid ${T.border}`,
            color:T.text, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
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
          ev.location && ['📍 Venue', ev.location],
          ev.handler && ['👤 Handler', ev.handler],
        ].filter(Boolean).map(([label, val]) => (
          <div key={label} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:10, color:T.textMuted, width:80, flexShrink:0 }}>{label}</span>
            <span style={{ fontSize:11, color:T.text, fontWeight:500 }}>{val}</span>
          </div>
        ))}
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
  const date = p.completion_date||p.end_date||p.start_date||p.created_at

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
              background: isAccP(p) ? 'rgba(16,185,129,0.92)' : 'rgba(59,130,246,0.9)',
              color:'white', fontSize:9, fontWeight:800, letterSpacing:'1.5px',
              textTransform:'uppercase', backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,0.2)' }}>
              {isAccP(p) ? '✦ ACCOMPLISHED' : '⟳ '+(p.status||'UPCOMING').toUpperCase()}
            </div>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
              justifyContent:'flex-end', padding:isMobile?'16px 18px':'20px 24px' }}>
              <p style={{ fontSize:isMobile?16:20, fontWeight:900, color:'white',
                fontFamily: T.fontFamily, margin:'0 0 6px', lineHeight:1.25,
                textShadow:'0 2px 12px rgba(0,0,0,0.55)',
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {p.project_name||p.title}
              </p>
              {p.budget && <p style={{ fontSize:11, color:'rgba(255,255,255,0.8)', margin:'0 0 3px', fontWeight:600 }}>
                Budget: ₱{parseFloat(p.budget).toLocaleString()}
              </p>}
              {date && <p style={{ fontSize:11, color:'rgba(255,255,255,0.6)', margin:0 }}>
                Date: {fmtDate(date)}
              </p>}
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
                background: i===idx ? (dark?'#FBBF24':T.crimson) : (dark?'rgba(255,255,255,0.2)':'rgba(26,54,93,0.2)') }}/>
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
          <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20,
            fontSize:9, fontWeight:700, background:sc.bg, color:sc.color, textTransform:'capitalize' }}>
            {p.status||'upcoming'}
          </span>
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
function ProjectsPage({ projects, dark, isMobile, T, siteSettings, format, setSelectedProject, PageFooter }) {
  const isAccomplished = p => ['accomplished','completed','done'].includes((p.status||'').toLowerCase())
  const upcoming     = projects.filter(p => !isAccomplished(p))
  const accomplished = projects.filter(p => isAccomplished(p))

  return (
    <div style={{ animation:'fadeSlideIn .2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
      <section style={{ position:'relative', zIndex:2, flex:1, padding:isMobile?'28px 16px 48px':'48px 36px 60px' }}>

        {/* Page header */}
        <div style={{ textAlign:'center', marginBottom:isMobile?28:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 16px', borderRadius:30, marginBottom:14,
            background: dark ? 'rgba(96,165,250,0.1)' : 'rgba(26,54,93,0.06)',
            border: dark ? '1px solid rgba(96,165,250,0.18)' : '1px solid rgba(26,54,93,0.1)' }}>
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:'2px', textTransform:'uppercase',
              color:T.textHeading }}>SK Initiatives</span>
          </div>
          <h2 style={{ fontSize:isMobile?26:34, fontWeight:900, margin:'0 0 8px', color:T.textHeading,
            fontFamily: T.fontFamily, textTransform:'uppercase', letterSpacing:'1px' }}>Community Projects</h2>
          <p style={{ fontSize:14, color:T.textMuted, maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>
            Track all SK initiatives — from ongoing programs to accomplished milestones.
          </p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:14 }}>
            <div style={{ height:1, width:50, background:`${T.navy}30` }}/>
            <div style={{ width:7, height:7, borderRadius:'50%', background:T.crimson }}/>
            <div style={{ height:1, width:50, background:`${T.navy}30` }}/>
          </div>
        </div>

        {projects.length === 0 ? (
          <div style={{ maxWidth:460, margin:'0 auto', background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:16, textAlign:'center', padding:'48px 32px',
            boxShadow:T.shadow, color:T.textMuted }}>
            <p style={{ fontSize:36, margin:'0 0 12px' }}>📋</p>
            <p style={{ fontWeight:700, color:T.textHeading, marginBottom:6 }}>No projects yet</p>
            <p style={{ fontSize:13 }}>Projects will appear here once they are added by the SK team.</p>
          </div>
        ) : (
          <div style={{ maxWidth:1100, margin:'0 auto' }}>

            {/* Upcoming Projects */}
            <div style={{ marginBottom:isMobile?32:48 }}>
              <ProjectsSectionLabel text="Upcoming Projects" color={dark?'#60A5FA':'#1A365D'} icon="⟳" T={T}/>
              <div style={{ display:'flex', flexDirection:isMobile?'column':'row', gap:isMobile?16:24, alignItems:'flex-start' }}>
                <div style={{ flex:isMobile?'none':'7 0 0', minWidth:0, width:isMobile?'100%':undefined }}>
                  <ProjectsMainCarousel items={upcoming} label="Upcoming"
                    accentColor={dark?'linear-gradient(90deg,#60A5FA,#93C5FD)':'linear-gradient(90deg,#1D4ED8,#3B82F6)'}
                    dark={dark} isMobile={isMobile} siteSettings={siteSettings} setSelectedProject={setSelectedProject}/>
                </div>
                {!isMobile && (
                  <div style={{ flex:'3 0 0', minWidth:0 }}>
                    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16,
                      overflow:'hidden', boxShadow:T.shadow }}>
                      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`,
                        display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:3, height:14, borderRadius:2, background:dark?'#60A5FA':'#1A365D' }}/>
                        <span style={{ fontSize:10, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', color:T.textMuted }}>
                          All Upcoming ({upcoming.length})
                        </span>
                      </div>
                      <div style={{ padding:'12px', maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
                        {upcoming.length === 0
                          ? <p style={{ fontSize:12, color:T.textSubtle, margin:0, textAlign:'center', padding:'20px 0' }}>No upcoming projects.</p>
                          : upcoming.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} T={T} setSelectedProject={setSelectedProject}/>)
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {isMobile && upcoming.length > 0 && (
                <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:8 }}>
                  {upcoming.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} T={T} setSelectedProject={setSelectedProject}/>)}
                </div>
              )}
            </div>

            {/* Accomplished Projects */}
            <div>
              <ProjectsSectionLabel text="Accomplished Projects" color={dark?'#34D399':'#166534'} icon="✦" T={T}/>
              <div style={{ display:'flex', flexDirection:isMobile?'column':'row', gap:isMobile?16:24, alignItems:'flex-start' }}>
                {!isMobile && (
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
                        {accomplished.length === 0
                          ? <p style={{ fontSize:12, color:T.textSubtle, margin:0, textAlign:'center', padding:'20px 0' }}>No accomplished projects yet.</p>
                          : accomplished.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} T={T} setSelectedProject={setSelectedProject}/>)
                        }
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ flex:isMobile?'none':'7 0 0', minWidth:0, width:isMobile?'100%':undefined }}>
                  <ProjectsMainCarousel items={accomplished} label="Accomplished"
                    accentColor={dark?'linear-gradient(90deg,#34D399,#6EE7B7)':'linear-gradient(90deg,#059669,#34D399)'}
                    dark={dark} isMobile={isMobile} siteSettings={siteSettings} setSelectedProject={setSelectedProject}/>
                </div>
              </div>
              {isMobile && accomplished.length > 0 && (
                <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:8 }}>
                  {accomplished.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} T={T} setSelectedProject={setSelectedProject}/>)}
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
function AnnouncementsPage({ announcements, dark, isMobile, T, format, PageFooter }) {
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
      <section style={{ position:'relative', zIndex:2, flex:1, padding:isMobile?'32px 16px 48px':'52px 40px 60px' }}>

        {/* Page header */}
        <div style={{ textAlign:'center', marginBottom:isMobile?28:40 }}>
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
            const isOpen = expandedId === a.id
            return (
              <div key={a.id} onClick={() => setExpandedId(isOpen ? null : a.id)}
                style={{
                  position:'relative',
                  background: T.surface,
                  border:`1px solid ${isOpen ? T.borderHover : T.border}`,
                  borderRadius:14, overflow:'hidden', cursor:'pointer',
                  transition:'all .2s ease',
                  boxShadow: isOpen ? T.shadowLg : T.shadow,
                  transform: isOpen ? 'none' : undefined,
                }}
                onMouseEnter={e => { if(!isOpen){e.currentTarget.style.transform='translateX(2px)'; e.currentTarget.style.boxShadow=T.shadowLg}}}
                onMouseLeave={e => { if(!isOpen){e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=T.shadow}}}>
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
                  <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:isOpen?14:4 }}>
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

                  {!isOpen && a.content && (
                    <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.65, margin:'4px 0 6px',
                      display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {a.content}
                    </p>
                  )}

                  {isOpen && (
                    <div style={{ animation:'fadeSlideIn .18s ease' }}>
                      {a.content && (
                        <p style={{ fontSize:13, color:T.text, lineHeight:1.8, margin:'0 0 14px',
                          whiteSpace:'pre-wrap', borderTop:`1px solid ${T.border}`, paddingTop:12 }}>
                          {a.content}
                        </p>
                      )}
                      <div style={{ display:'flex', justifyContent:'flex-end' }}>
                        <span style={{ fontSize:10, color:T.textSubtle }}>
                          Posted {a.created_at ? format(new Date(a.created_at),'MMM d, yyyy') : '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isOpen && (
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                      <span style={{ fontSize:10, color:T.textSubtle }}>
                        {a.created_at ? format(new Date(a.created_at),'MMM d, yyyy') : ''}
                      </span>
                      <span style={{ fontSize:10, fontWeight:700, color:T.crimson,
                        display:'flex', alignItems:'center', gap:4 }}>
                        Tap to expand ↓
                      </span>
                    </div>
                  )}
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
  }
  const cat = ann.type || ann.category || 'General'
  const [cc, cbg] = catColors[cat] || catColors.General
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:9000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.surface, borderRadius:20, maxWidth:540, width:'100%', maxHeight:'85vh',
          overflow:'hidden', display:'flex', flexDirection:'column',
          boxShadow:'0 32px 80px rgba(0,0,0,0.25)', border:`1px solid ${T.border}`,
          animation:'fadeSlideIn .25s ease' }}>
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`,
          display:'flex', alignItems:'flex-start', gap:12,
          background: T.surface2 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ padding:'3px 10px', borderRadius:20, background:cbg, color:cc, fontSize:10,
                fontWeight:700, border:`1px solid ${cc}25` }}>{cat}</span>
              {ann.created_at && <span style={{ fontSize:10, color:T.textMuted }}>
                {new Date(ann.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
              </span>}
            </div>
            <h3 style={{ fontSize:17, fontWeight:800, color:T.textHeading, margin:0, lineHeight:1.3,
              fontFamily: T.fontFamily }}>{ann.title}</h3>
          </div>
          <button onClick={onClose} style={{ background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:8, width:30, height:30, cursor:'pointer', color:T.textMuted,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <X size={15}/>
          </button>
        </div>
        <div style={{ padding:'18px 22px', overflowY:'auto', flex:1 }}>
          {[ann.date_time && ['📅 Date', new Date(ann.date_time).toLocaleDateString('en-PH',{weekday:'short',month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})],
            ann.location && ['📍 Location', ann.location],
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:10, color:T.textMuted, width:80, flexShrink:0 }}>{label}</span>
              <span style={{ fontSize:12, color:T.text, fontWeight:500 }}>{val}</span>
            </div>
          ))}
          {ann.content && (
            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:13, color:T.text, lineHeight:1.8, margin:0, whiteSpace:'pre-wrap' }}>{ann.content}</p>
            </div>
          )}
        </div>
        <div style={{ padding:'14px 22px', borderTop:`1px solid ${T.border}`, display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={() => { onClose(); onViewAll() }}
            style={{ padding:'9px 18px', borderRadius:10, background:T.surface2,
              border:`1px solid ${T.border}`, color:T.textMuted, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            View All
          </button>
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

/* ─────────────────────── MAIN DASHBOARD ─────────────────────── */
export default function Dashboard() {
  const { user, profile, signOut, logAudit } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [dark, setDark] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
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
  const [evNotifDone, setEvNotifDone] = useState({})
  const [feedback, setFeedback] = useState({ subject:'', rating:'', message:'' })
  const [submitting, setSubmitting] = useState(false)
  const [settingsPw, setSettingsPw] = useState({ newpw:'', confirm:'', show:false })
  const [showSettings, setShowSettings] = useState(false)

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
      setIsMobile(mobile)
      if (!mobile) setMobileSidebar(false)
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

  useEffect(() => {
    if (!events.length) return
    const t = setInterval(() => {
      const now = new Date()
      events.forEach(ev => {
        if (!ev.start_date || (ev.status||'').toLowerCase() === 'cancelled') return
        const start = new Date(ev.start_date)
        const diffMs = start - now
        const key2d = ev.id+'_2d'; const key1h = ev.id+'_1h'
        if (diffMs>0 && diffMs<=2*86400000 && !evNotifDone[key2d]) {
          const days = Math.ceil(diffMs/86400000)
          toast(`🔔 Reminder: "${ev.title}" is in ${days} day${days>1?'s':''}!`,'info')
          setEvNotifDone(p=>({...p,[key2d]:true}))
        }
        if (diffMs>0 && diffMs<=3600000 && !evNotifDone[key1h]) {
          const mins = Math.ceil(diffMs/60000)
          toast(`⚡ Starting soon: "${ev.title}" in ${mins} min!`,'warning')
          setEvNotifDone(p=>({...p,[key1h]:true}))
        }
      })
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
      const { error } = await supabase.from('feedback').insert({ user_id:user.id, resident_name:profile?.name||user.email, subject:feedback.subject, rating:feedback.rating, message:feedback.message })
      if (error) throw error
      await logAudit('Submit','Feedback','Submitted resident feedback')
      toast('Thank you for your feedback!','success')
      setFeedback({ subject:'', rating:'', message:'' })
    } catch (err) { toast(err.message,'error') }
    finally { setSubmitting(false) }
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

      {/* ── MOBILE OVERLAY ── */}
      {isMobile && mobileSidebar && (
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
        /* Mobile: fixed drawer */
        ...(isMobile ? {
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
          {isMobile && (
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
            boxShadow:`0 2px 8px ${T.crimson}59` }}>
            {(profile?.name||user?.email||'R')[0].toUpperCase()}
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
                onClick={() => { setActivePage(page); if (isMobile) setMobileSidebar(false) }}
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

        <div style={{ flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>

          {/* ════════ HOME PAGE ════════ */}
          {activePage === 'home' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', height:'100%',
            overflow:'hidden', position:'relative', zIndex:1 }}>

            {/* Top strip */}
            <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center',
              justifyContent:'space-between', padding:'12px 20px 0', flexShrink:0 }}>
              {isMobile ? (
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
                <button onClick={() => setShowNotifs(n=>!n)}
                  style={{ width:40, height:40, borderRadius:12,
                    background: dark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
                    border:`1px solid ${T.border}`, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:T.text, backdropFilter:'blur(8px)',
                    transition:'all .15s', position:'relative',
                    boxShadow:T.shadow }}>
                  <Bell size={17}/>
                  {(() => {
                    const cnt = events.filter(ev => {
                      if (!ev.start_date||(ev.status||'').toLowerCase()==='cancelled') return false
                      const d=new Date(ev.start_date)-clock; return d>0&&d<=2*86400000
                    }).length + announcements.length
                    return cnt > 0 ? (
                      <span style={{ position:'absolute', top:-5, right:-5, minWidth:18, height:18,
                        background:'#EF4444', borderRadius:9, color:'white', fontSize:9, fontWeight:800,
                        display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px',
                        border:'2px solid white' }}>{Math.min(cnt,9)}</span>
                    ) : null
                  })()}
                </button>

                {showNotifs && (
                  <div style={{ position:'absolute', right:0, top:50, width:310,
                    background: dark ? 'rgba(30,41,59,0.98)' : 'rgba(255,255,255,0.98)',
                    border:`1px solid ${T.border}`, borderRadius:16,
                    boxShadow:'0 20px 60px rgba(0,0,0,0.2)', zIndex:500, overflow:'hidden',
                    backdropFilter:'blur(20px)' }}>
                    <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`,
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <p style={{ fontWeight:800, fontSize:13, color:T.textHeading, margin:0,
                        fontFamily: T.fontFamily }}>Notifications</p>
                      <button onClick={() => setShowNotifs(false)} style={{ background:'none', border:'none',
                        color:T.textMuted, cursor:'pointer', padding:2 }}><X size={14}/></button>
                    </div>
                    <div style={{ maxHeight:270, overflowY:'auto' }}>
                      {announcements.slice(0,5).map(a => (
                        <div key={a.id} onClick={() => { setShowNotifs(false); setSelectedAnn(a) }}
                          style={{ padding:'12px 18px', borderBottom:`1px solid ${T.border}`,
                            display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer', transition:'background .15s' }}
                          onMouseEnter={e => e.currentTarget.style.background=T.surface2}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <div style={{ width:30, height:30, borderRadius:8,
                            background:'rgba(214,158,46,0.1)', border:`1px solid ${T.border}`,
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>📢</div>
                          <p style={{ fontSize:12, fontWeight:600, color:T.text, margin:0, lineHeight:1.5,
                            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                            {a.title}
                          </p>
                        </div>
                      ))}
                      {announcements.length === 0 && <p style={{ padding:'22px', color:T.textSubtle,
                        fontSize:12, textAlign:'center', margin:0 }}>No new notifications.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3-column grid */}
            <div style={{ position:'relative', zIndex:5, flex:1, display:'flex', gap:0,
              overflow:'hidden', padding:'10px 18px 0', animation:'fadeSlideIn .35s ease' }}>

              {/* CENTER: main content */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16,
                overflowY:'auto', paddingRight:isMobile?0:16, paddingBottom:16, minWidth:0 }}>

                {/* Portal greeting */}
                <div style={{ paddingTop:4, flexShrink:0 }}>
                  <p style={{ fontSize:10, fontWeight:700,
                    color: dark ? 'rgba(251,191,36,0.8)' : 'rgba(214,158,46,0.95)',
                    letterSpacing:'3px', textTransform:'uppercase', margin:'0 0 5px' }}>
                    SANGGUNIANG KABATAAN — BAKAKENG CENTRAL
                  </p>
                  <h1 style={{ fontSize:isMobile?17:22, fontWeight:900,
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
                      if ((ev.status||'').toLowerCase() === 'cancelled') return false
                      if (!ev.start_date) return false
                      try { const d = new Date(ev.start_date); return d.getFullYear()===thisYear&&d.getMonth()===thisMonth } catch { return false }
                    })
                    const monthLabel = now.toLocaleDateString('en-US',{month:'long',year:'numeric'})

                    const sMapLight = { upcoming:{bg:'#FEF9E7',color:'#D97706',border:'rgba(245,158,11,0.25)',label:'Upcoming'}, ongoing:{bg:'#DCFCE7',color:'#166534',border:'rgba(16,185,129,0.25)',label:'Ongoing'}, finished:{bg:'#F3F4F6',color:'#718096',border:'rgba(100,116,139,0.2)',label:'Finished'}, planning:{bg:'#F5F3FF',color:'#5B21B6',border:'rgba(139,92,246,0.2)',label:'Planning'} }
                    const sMapDark  = { upcoming:{bg:'rgba(245,158,11,0.12)',color:'#FBBF24',border:'rgba(245,158,11,0.25)',label:'Upcoming'}, ongoing:{bg:'rgba(16,185,129,0.12)',color:'#34D399',border:'rgba(16,185,129,0.25)',label:'Ongoing'}, finished:{bg:'rgba(100,116,139,0.12)',color:'#94A3B8',border:'rgba(100,116,139,0.2)',label:'Finished'}, planning:{bg:'rgba(139,92,246,0.12)',color:'#A78BFA',border:'rgba(139,92,246,0.2)',label:'Planning'} }
                    const sMap = dark ? sMapDark : sMapLight

                    return (
                      <>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:3, height:16, borderRadius:2, background:T.gold, flexShrink:0 }}/>
                            <h3 style={{ fontSize:13, fontWeight:800, color:T.textHeading, margin:0,
                              fontFamily: T.fontFamily, textTransform:'uppercase', letterSpacing:'.8px' }}>
                              Events — {monthLabel}
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
                            No events scheduled for {monthLabel}.
                          </div>
                        ) : (
                          <div className="sk-events-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                            {monthEvents.map(ev => {
                              const sc = sMap[(ev.status||'').toLowerCase()] || sMap.upcoming
                              const imgUrl = ev.banner_url || siteSettings?.heroImage || '/Hero.png'
                              const startDate = ev.start_date ? new Date(ev.start_date) : null
                              return (
                                <div key={ev.id} className="sk-ev-card"
                                  onClick={() => { setActivePage('events'); setSelectedEv(ev) }}
                                  style={{
                                    borderRadius:14, overflow:'hidden',
                                    background: dark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.92)',
                                    border:`1px solid ${T.border}`,
                                    boxShadow: T.shadow,
                                  }}>
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

          {activePage === 'announcements' && <AnnouncementsPage announcements={announcements} dark={dark} isMobile={isMobile} T={T} format={format} PageFooter={PageFooter}/>}
          {activePage === 'projects' && <ProjectsPage projects={projects} dark={dark} isMobile={isMobile} T={T} siteSettings={siteSettings} format={format} setSelectedProject={setSelectedProject} PageFooter={PageFooter}/>}

          {/* ════════ EVENTS PAGE ════════ */}
          {activePage === 'events' && (
          <div style={{ animation:'fadeSlideIn .2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
            <section style={{ padding:'32px 36px', background:'transparent', flex:1 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
                <div>
                  <h2 style={{ fontSize:26, fontWeight:800, color:T.textHeading, textTransform:'uppercase',
                    letterSpacing:'1px', margin:'0 0 4px', fontFamily: T.fontFamily }}>Community Events</h2>
                  <p style={{ fontSize:13, color:T.textMuted, margin:0 }}>Stay updated with scheduled activities in Barangay Bakakeng Central.</p>
                </div>
                <div className="sk-card" style={{ padding:'10px 18px', textAlign:'right' }}>
                  <p style={{ fontSize:11, color:T.textMuted, margin:'0 0 2px' }}>
                    {clock.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
                  </p>
                  <p style={{ fontSize:18, fontWeight:800, color:T.textHeading, margin:0, letterSpacing:'1px' }}>
                    {clock.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                  </p>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:isMobile?'column':'row', gap:24, alignItems:'flex-start', maxWidth:1200, margin:'0 auto' }}>
                {/* Calendar */}
                <div style={{ flex:'2 1 0', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:8 }}>
                    <button onClick={() => setCalSlide(s=>Math.max(0,s-1))} disabled={calSlide===0}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9,
                        border:`1px solid ${T.border}`, background:T.surface, color:calSlide===0?T.textMuted:T.navy,
                        cursor:calSlide===0?'not-allowed':'pointer', fontSize:12, fontWeight:600,
                        opacity:calSlide===0?.45:1, boxShadow:T.shadow }}>
                      <ChevronLeft size={14}/> Prev
                    </button>
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontSize:14, fontWeight:800, color:T.textHeading, margin:0,
                        textTransform:'uppercase', letterSpacing:'.5px' }}>{SLIDE_LABELS[calSlide]}</p>
                      <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:6 }}>
                        {[0,1,2].map(i => <button key={i} onClick={() => setCalSlide(i)}
                          style={{ width:calSlide===i?20:8, height:8, borderRadius:4, border:'none', padding:0,
                            background:calSlide===i?T.navy:T.border, cursor:'pointer', transition:'all .2s' }}/>)}
                      </div>
                    </div>
                    <button onClick={() => setCalSlide(s=>Math.min(2,s+1))} disabled={calSlide===2}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9,
                        border:`1px solid ${T.border}`, background:T.surface, color:calSlide===2?T.textMuted:T.navy,
                        cursor:calSlide===2?'not-allowed':'pointer', fontSize:12, fontWeight:600,
                        opacity:calSlide===2?.45:1, boxShadow:T.shadow }}>
                      Next <ChevronRight size={14}/>
                    </button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)', gap:12 }}>
                    {months.map(m => <CalGrid key={m.toString()} month={m} events={events} T={T} selectedDate={selectedDate}
                      onDateClick={d => { setSelectedDate(d); const evs=eventsOnDate(d); setSelectedEv(evs[0]||null) }}/>)}
                  </div>
                </div>

                {/* Event detail/list */}
                <div style={{ flex:'0 0 300px', minWidth:isMobile?'100%':280, maxWidth:isMobile?'100%':320 }}>
                  {selectedEv ? (
                    <EventDetailPanel ev={selectedEv} clock={clock} evCountdown={evCountdown} T={T}
                      onClose={() => { setSelectedEv(null); setSelectedDate(null) }}/>
                  ) : (
                    <div className="sk-card" style={{ overflow:'hidden' }}>
                      <div style={{ padding:'14px 16px',
                        background:`linear-gradient(135deg,${T.navy},${T.navyLt})` }}>
                        <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.6)',
                          textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 2px' }}>All Events</p>
                        <p style={{ fontSize:15, fontWeight:800, color:'white', margin:0 }}>
                          {events.filter(ev=>(ev.status||'').toLowerCase()!=='completed').length} upcoming
                        </p>
                      </div>
                      <div style={{ maxHeight:isMobile?'none':480, overflowY:'auto' }}>
                        {events.filter(ev=>(ev.status||'').toLowerCase()!=='completed')
                          .sort((a,b)=>new Date(a.start_date||0)-new Date(b.start_date||0))
                          .map((ev,idx) => {
                            const cd = evCountdown(ev)
                            const sc = {
                              upcoming:{bg:dark?'rgba(59,130,246,0.1)':'#DBEAFE',color:dark?'#93C5FD':'#1D4ED8'},
                              ongoing:{bg:dark?'rgba(16,185,129,0.1)':'#DCFCE7',color:dark?'#6EE7B7':'#166534'},
                              planning:{bg:dark?'rgba(96,165,250,0.1)':'#EBF8FF',color:T.navy},
                              cancelled:{bg:dark?'rgba(197,48,48,0.1)':'#FEE2E2',color:dark?'#F87171':'#DC2626'},
                            }[(ev.status||'').toLowerCase()]||{bg:dark?'rgba(100,116,139,0.1)':'#F3F4F6',color:T.textMuted}
                            return (
                              <div key={ev.id} onClick={() => setSelectedEv(ev)}
                                style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, cursor:'pointer',
                                  background: idx%2===0 ? T.surface : T.surface2, transition:'background .15s' }}
                                onMouseEnter={e=>e.currentTarget.style.background=dark?'rgba(51,65,85,0.9)':'#F0F4F8'}
                                onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?T.surface:T.surface2}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                                  <p style={{ fontSize:11, fontWeight:600, color:T.textMuted, margin:0 }}>
                                    📅 {ev.start_date?new Date(ev.start_date).toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric',year:'numeric'}):'—'}
                                  </p>
                                  <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20,
                                    background:sc.bg, color:sc.color, textTransform:'capitalize' }}>{ev.status||'upcoming'}</span>
                                </div>
                                <p style={{ fontSize:13, fontWeight:700, color:T.textHeading, margin:'0 0 3px', lineHeight:1.3,
                                  fontFamily: T.fontFamily }}>{ev.title}</p>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                  {cd ? <span style={{ fontSize:10, fontWeight:600, color:cd.color }}>⏱ {cd.label}</span>
                                    : <span style={{ fontSize:10, color:T.textMuted }}>{ev.location?`📍 ${ev.location}`:''}</span>}
                                  <ChevronRight size={13} style={{ color:T.textSubtle }}/>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Rating</label>
                      <select
                        style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1px solid ${T.border}`,
                          background:T.surface2, color:T.text, fontSize:13, outline:'none' }}
                        value={feedback.rating} onChange={e=>setFeedback(f=>({...f,rating:e.target.value}))} required>
                        <option value="">How was your experience?</option>
                        <option value="good">Good ⭐⭐⭐⭐⭐</option>
                        <option value="average">Average ⭐⭐⭐</option>
                        <option value="bad">Bad ⭐</option>
                      </select>
                    </div>
                    <div style={{ marginBottom:22 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Message</label>
                      <textarea
                        style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1px solid ${T.border}`,
                          background:T.surface2, color:T.text, fontSize:13, outline:'none',
                          resize:'vertical', minHeight:90 }}
                        value={feedback.message} onChange={e=>setFeedback(f=>({...f,message:e.target.value}))}
                        placeholder="Your feedback..." required/>
                    </div>
                    <button type="submit" disabled={submitting}
                      style={{ width:'100%', padding:'13px', borderRadius:10, background:T.crimson,
                        color:'white', border:'none', cursor:submitting?'not-allowed':'pointer',
                        fontSize:14, fontWeight:700, letterSpacing:'.5px', display:'flex',
                        alignItems:'center', justifyContent:'center', gap:8,
                        boxShadow:'0 3px 12px rgba(197,48,48,0.3)', transition:'opacity .15s' }}
                      onMouseEnter={e=>{if(!submitting)e.currentTarget.style.opacity='.85'}}
                      onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      {submitting?<Loader2 size={16}/>:<Send size={15}/>} SEND FEEDBACK
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
      <a href="https://www.facebook.com/share/1D6aTWgdiR/" target="_blank" rel="noreferrer"
        title="Report a Website Concern"
        style={{ position:'fixed', bottom:24, left:isMobile?'auto':24, right:isMobile?88:'auto',
          width:50, height:50, borderRadius:'50%', background:T.crimson,
          border:'none', cursor:'pointer', color:'white', display:'flex',
          alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 20px rgba(197,48,48,0.4)', zIndex:8000,
          textDecoration:'none', transition:'transform .2s' }}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
        <Flag size={20}/>
      </a>

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

      {selectedProject && <ProjectDetailModal project={selectedProject} T={T} onClose={() => setSelectedProject(null)}/>}
      {selectedAnn && <AnnouncementModal ann={selectedAnn} T={T} onClose={() => setSelectedAnn(null)} onViewAll={() => setActivePage('announcements')}/>}

      <ConfirmDialog open={logoutOpen} onClose={() => setLogout(false)} onConfirm={handleLogout}
        title="Log Out?" message="Are you sure you want to log out?" danger/>
    </div>
  )
}
