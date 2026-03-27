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

/* ─────────────────────── CACHE HELPERS ─────────────────────── */
// Stale-while-revalidate: seed state from localStorage instantly,
// then overwrite once the live Supabase fetch resolves.
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
    // Expire after 10 minutes so stale data doesn't linger forever
    if (Date.now() - ts > 10 * 60 * 1000) { localStorage.removeItem(key); return null }
    return Array.isArray(data) ? data : null
  } catch { return null }
}

function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch { /* quota exceeded — ignore */ }
}

/* ─────────────────────── GLOBAL CSS ─────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(212,175,55,.25); border-radius: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }

  @keyframes fadeSlideIn  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes carouselNext { from { opacity:0; transform:translateX(60px) scale(.97); } to { opacity:1; transform:none; } }
  @keyframes carouselPrev { from { opacity:0; transform:translateX(-60px) scale(.97); } to { opacity:1; transform:none; } }
  @keyframes carouselFade { from { opacity:0; transform:scale(.98); } to { opacity:1; transform:scale(1); } }
  @keyframes progressBar  { from { width:0; } to { width:100%; } }
  @keyframes pulseSlow    { 0%,100% { opacity:.4; } 50% { opacity:.9; } }
  @keyframes dotBounce    { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-5px);} }
  @keyframes sidebarIn    { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
  @keyframes shimmer      { from{background-position:-200% 0;} to{background-position:200% 0;} }

  /* ── Glassmorphism — applied globally to all surface containers ── */
  .sk-glass {
    backdrop-filter: blur(20px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
    background: rgba(255,255,255,0.14) !important;
    border: 1px solid rgba(255,255,255,0.30) !important;
  }

  /* Glass card base — works for BOTH light and dark mode */
  .sk-glass-card {
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.28);
    box-shadow: 0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18);
  }

  /* Sidebar always uses deep navy glass */
  .sk-sidebar-glass {
    backdrop-filter: blur(10px) saturate(180%);
    -webkit-backdrop-filter: blur(10px) saturate(180%);
  }

  /* Cross-fade carousel: IN = fade + scale 0.95→1, OUT = fade to 0 */
  @keyframes cfIn  { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:scale(1); } }
  @keyframes cfOut { from { opacity:1; transform:scale(1);   } to { opacity:0; transform:scale(1.02); } }

  .sk-nav-item { transition: all .2s cubic-bezier(.4,0,.2,1); }
  .sk-nav-item:hover { background: rgba(255,255,255,.1) !important; color: white !important; transform: translateX(2px); }

  .sk-ev-card { transition: all .22s cubic-bezier(.4,0,.2,1); cursor: pointer; }
  .sk-ev-card:hover { transform: translateY(-4px) !important; box-shadow: 0 20px 48px rgba(0,0,0,.55) !important; border-color: rgba(212,175,55,.4) !important; }

  .sk-ann-card { transition: all .18s ease; cursor: pointer; }
  .sk-ann-card:hover { transform: translateX(3px); background: rgba(255,255,255,.06) !important; }

  .sk-soc-btn { transition: all .2s ease; }
  .sk-soc-btn:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 12px 32px rgba(0,0,0,.5) !important; }

  .sk-bell-btn:hover { background: rgba(255,255,255,.15) !important; }
  .sk-hero-img { transition: transform .9s cubic-bezier(.4,0,.2,1); }
  .sk-hero-wrap:hover .sk-hero-img { transform: scale(1.04); }

  .sk-readmore { transition: color .15s; }
  .sk-readmore:hover { color: #F6CF56 !important; }

  .sk-skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 8px;
  }
  /* Tailwind animate-pulse equivalent for non-Tailwind surfaces */
  .animate-pulse { animation: pulseSlow 1.8s ease-in-out infinite; }

  /* Carousel skeleton — mirrors exact carousel dimensions */
  .sk-carousel-skeleton {
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    background: rgba(13,31,60,.85);
    border: 1px solid rgba(255,255,255,.07);
    flex-shrink: 0;
  }
  .sk-carousel-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.05) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: shimmer 1.8s infinite;
  }

  @media (max-width: 900px) {
    .sk-right-sidebar { display: none !important; }
  }
  @media (max-width: 640px) {
    .sk-events-grid { grid-template-columns: 1fr !important; }
  }
`

/* ─────────────────────── THEME ─────────────────────── */
const LIGHT = {
  bg:'rgba(240,244,248,0.0)', surface:'rgba(255,255,255,0.18)', surface2:'rgba(255,255,255,0.13)', border:'rgba(255,255,255,0.35)',
  text:'#0F1E36', textMuted:'#334466', navy:'#1A365D', gold:'#B8860B',
  crimson:'#C53030', sectionBg:'rgba(240,244,248,0.0)', calBg:'rgba(255,255,255,0.18)', calBorder:'rgba(255,255,255,0.3)',
  footerBg:'rgba(10,20,50,0.72)', footerText:'#FFFFFF',
}
const DARK = {
  bg:'rgba(5,13,30,0.0)', surface:'rgba(17,24,39,0.65)', surface2:'rgba(15,23,42,0.55)', border:'rgba(255,255,255,0.09)',
  text:'#F1F5F9', textMuted:'#94A3B8', navy:'#60A5FA', gold:'#FBBF24',
  crimson:'#F87171', sectionBg:'rgba(5,13,30,0.0)', calBg:'rgba(17,24,39,0.65)', calBorder:'rgba(255,255,255,0.08)',
  footerBg:'#070E1C', footerText:'#94A3B8',
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
        background: T.calBg, borderRadius: 14, padding: '14px 16px',
        border: `1px solid ${cardHover ? T.navy : T.calBorder}`,
        transform: cardHover ? 'scale(1.05) translateY(-3px)' : 'scale(1)',
        boxShadow: cardHover ? `0 16px 40px rgba(26,54,93,.18)` : '0 1px 4px rgba(0,0,0,.04)',
        transition: 'transform .25s, box-shadow .25s, border-color .2s',
        cursor: 'default',
      }}>
      <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: T.navy, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontFamily: 'Sora,sans-serif' }}>
        {format(month, 'MMMM yyyy')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', color: T.textMuted, fontWeight:700, paddingBottom:4, fontSize:9 }}>{d}</div>
        ))}
        {all.map((d, i) => {
          const ev = hasEv(d); const sel = isSelected(d); const tod = isToday(d); const hov = hoveredDay === i && d !== null
          let bg = 'transparent'
          if (sel) bg = '#F6AD55'
          else if (hov && ev) bg = T.navy
          else if (hov && !ev) bg = `${T.navy}14`
          else if (ev) bg = T.navy
          else if (tod) bg = `${T.gold}30`
          let col = T.text
          if (sel) col = 'white'
          else if (hov && ev) col = 'white'
          else if (hov && !ev) col = T.navy
          else if (ev) col = 'white'
          else if (tod && !hov) col = T.gold
          return (
            <div key={i} style={{ textAlign:'center', padding:'2px 0' }}>
              {d ? (
                <button onClick={() => onDateClick(d)}
                  onMouseEnter={() => setHoveredDay(i)}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{ width:22, height:22, borderRadius:'50%', background:bg, color:col, border: tod&&!sel&&!ev ? `1.5px solid ${T.gold}` : 'none', fontSize:10, fontWeight: (ev||sel||tod) ? 700 : 400, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', transition:'all .15s', padding:0 }}>
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
    center: { x: 0, opacity: 1, transition: { x: { type:'spring', stiffness:300, damping:30 }, opacity: { duration:.25 } } },
    exit: d => ({ x: d > 0 ? '-100%' : '100%', opacity: 0, transition: { x: { type:'spring', stiffness:300, damping:30 }, opacity: { duration:.2 } } }),
  }

  const goNext = useCallback(() => {
    const t = totalRef.current
    setDir(1)
    setCurrent(prev => (prev + 1) % t)
  }, [])

  useEffect(() => {
    if (paused || total < 2) return
    const t = setInterval(goNext, INTERVAL)
    return () => clearInterval(t)
  }, [paused, total, goNext])

  useEffect(() => { setCurrent(0) }, [projects.length])

  // ── SKELETON: show while loading, even if projects array is still empty ──
  if (isLoading) return (
    <div className="sk-carousel-skeleton animate-pulse" style={{ height: isMobile ? 220 : 300, background: dark ? 'rgba(13,31,60,.85)' : 'rgba(26,54,93,.06)', border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(26,54,93,.1)' }}>
      <div style={{ position:'absolute', inset:0, background: dark ? 'linear-gradient(160deg,rgba(255,255,255,.03),rgba(255,255,255,.06))' : 'linear-gradient(160deg,rgba(26,54,93,.04),rgba(26,54,93,.08))' }}/>
      <div style={{ position:'absolute', top:16, left:18, width:130, height:22, borderRadius:20, background: dark ? 'rgba(16,185,129,.15)' : 'rgba(16,185,129,.12)' }}/>
      <div style={{ position:'absolute', top:16, right:18, width:50, height:22, borderRadius:20, background: dark ? 'rgba(255,255,255,.06)' : 'rgba(26,54,93,.08)' }}/>
      <div style={{ position:'absolute', bottom:24, left:28, right:28 }}>
        <div className="sk-skeleton" style={{ width:'58%', height:26, marginBottom:12, borderRadius:10 }}/>
        <div className="sk-skeleton" style={{ width:'38%', height:14, marginBottom:10 }}/>
        <div className="sk-skeleton" style={{ width:'72%', height:12 }}/>
      </div>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background: dark ? 'rgba(255,255,255,.06)' : 'rgba(26,54,93,.08)' }}/>
    </div>
  )

  // ── EMPTY: only shown when we're certain there are truly no accomplished projects ──
  if (total === 0) return (
    <div style={{ borderRadius:20, background: dark ? 'rgba(255,255,255,.03)' : 'rgba(26,54,93,.04)', border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(26,54,93,.1)', height:280, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10, backdropFilter:'blur(12px)' }}>
      <span style={{ fontSize:48 }}>🏛️</span>
      <p style={{ color: dark ? 'rgba(255,255,255,.35)' : '#A0AEC0', fontSize:13, fontFamily:'Sora,sans-serif', margin:0 }}>No accomplished projects yet.</p>
    </div>
  )

  const p = projects[current]
  const imgSrc = (Array.isArray(p.images) && p.images[0]) || p.banner_url || siteSettings?.heroImage || '/Hero.png'
  const dateFinished = p.completion_date || p.end_date || p.updated_at || p.created_at
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) } catch { return '' } }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ userSelect:'none' }}>
      {/* Static outer frame */}
      <div style={{
        borderRadius: 20, overflow:'hidden', position:'relative',
        height: isMobile ? 220 : 300, flexShrink:0,
        boxShadow: dark ? '0 24px 64px rgba(0,0,0,.75)' : '0 12px 48px rgba(26,54,93,.22)',
        border: dark ? '1px solid rgba(212,175,55,.18)' : '1px solid rgba(26,54,93,.15)',
      }}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={`acc-${current}`}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            onClick={() => onSelect && onSelect(p)}
            style={{ position:'absolute', inset:0, cursor:'pointer', willChange:'transform,opacity' }}
          >
            <img className="sk-hero-img" src={imgSrc} alt={p.project_name || p.title || ''}
              onError={e => e.target.src = '/Hero.png'}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background: dark ? 'linear-gradient(to top,rgba(5,12,30,.97) 0%,rgba(5,12,30,.55) 55%,rgba(5,12,30,.1) 100%)' : 'linear-gradient(to top,rgba(26,54,93,.92) 0%,rgba(26,54,93,.5) 50%,rgba(26,54,93,.08) 100%)' }}/>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'40%', background: dark ? 'linear-gradient(to bottom,rgba(5,12,30,.4),transparent)' : 'linear-gradient(to bottom,rgba(26,54,93,.3),transparent)' }}/>
            <div style={{ position:'absolute', top:16, left:18, display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:'rgba(16,185,129,.9)', color:'white', fontSize:9, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,.2)', fontFamily:'Space Grotesk,sans-serif' }}>
              ✦ ACCOMPLISHED
            </div>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding: isMobile ? '16px 18px' : '24px 28px' }}>
              <h2 style={{ fontSize: isMobile ? 17 : 24, fontWeight:900, color:'white', fontFamily:'Sora,sans-serif', lineHeight:1.2, margin:'0 0 8px', textShadow:'0 2px 16px rgba(0,0,0,.6)' }}>
                {p.project_name || p.title}
              </h2>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                {dateFinished && <span style={{ fontSize:11, color:'rgba(255,255,255,.7)', display:'flex', alignItems:'center', gap:5, fontFamily:'Space Grotesk,sans-serif' }}><span style={{ color:'#F6CF56' }}>📅</span> {fmtDate(dateFinished)}</span>}
                {p.location && <span style={{ fontSize:11, color:'rgba(255,255,255,.6)', display:'flex', alignItems:'center', gap:4, fontFamily:'Space Grotesk,sans-serif' }}>📍 {p.location}</span>}
                {p.budget && <span style={{ fontSize:12, fontWeight:700, color:'#F6CF56', fontFamily:'Space Grotesk,sans-serif' }}>₱{parseFloat(p.budget).toLocaleString()}</span>}
              </div>
              {p.description && <p style={{ fontSize:11, color:'rgba(255,255,255,.6)', margin:'8px 0 0', fontFamily:'Space Grotesk,sans-serif', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', maxWidth:580 }}>{p.description}</p>}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Counter */}
        {total > 1 && (
          <div style={{ position:'absolute', top:16, right:18, zIndex:20, fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', background:'rgba(0,0,0,.4)', padding:'3px 10px', borderRadius:20, backdropFilter:'blur(4px)', fontFamily:'Space Grotesk,sans-serif', pointerEvents:'none' }}>
            {current + 1} / {total}
          </div>
        )}

        {/* Nav arrows */}
        {total > 1 && (<>
          <button onClick={e => { e.stopPropagation(); setDir(-1); setCurrent(prev => (prev - 1 + totalRef.current) % totalRef.current) }}
            style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.55)', border:'1.5px solid rgba(255,255,255,.2)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:20, transition:'all .15s', backdropFilter:'blur(4px)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,.8)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,.55)'}>
            <ChevronLeft size={18}/>
          </button>
          <button onClick={e => { e.stopPropagation(); setDir(1); setCurrent(prev => (prev + 1) % totalRef.current) }}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.55)', border:'1.5px solid rgba(255,255,255,.2)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:20, transition:'all .15s', backdropFilter:'blur(4px)' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,.8)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,.55)'}>
            <ChevronRight size={18}/>
          </button>
        </>)}

        {/* Progress bar */}
        {total > 1 && !paused && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,.12)', zIndex:20 }}>
            <div key={`pb-acc-${current}`} style={{ height:'100%', background: dark ? 'linear-gradient(90deg,#D4AF37,#F6CF56)' : 'linear-gradient(90deg,#C53030,#D69E2E)', animation:`progressBar ${INTERVAL}ms linear forwards` }}/>
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:12 }}>
          {projects.map((_, i) => (
            <button key={i} onClick={() => { setDir(i >= current ? 1 : -1); setCurrent(i) }}
              style={{ width: i === current ? 22 : 7, height:7, borderRadius:4, border:'none', padding:0, background: i === current ? (dark ? '#D4AF37' : '#1A365D') : (dark ? 'rgba(255,255,255,.2)' : 'rgba(26,54,93,.2)'), cursor:'pointer', transition:'all .35s cubic-bezier(.4,0,.2,1)' }}/>
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#0D1F3C', borderRadius:20, maxWidth:600, width:'100%', maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,.8)', border:'1px solid rgba(212,175,55,.15)', animation:'fadeSlideIn .25s ease' }}>
        {/* Image gallery */}
        {imgs.length > 0 && (
          <div style={{ position:'relative', height:240, overflow:'hidden', flexShrink:0 }}>
            <img src={imgs[galIdx]} alt={project.project_name} onError={e => e.target.src='/Hero.png'}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(13,31,60,.9), transparent 60%)' }}/>
            {imgs.length > 1 && (<>
              <button onClick={() => setGalIdx(i => (i - 1 + imgs.length) % imgs.length)}
                style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:34, height:34, borderRadius:'50%', background:'rgba(0,0,0,.55)', border:'1px solid rgba(255,255,255,.2)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                <ChevronLeft size={16}/>
              </button>
              <button onClick={() => setGalIdx(i => (i + 1) % imgs.length)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:34, height:34, borderRadius:'50%', background:'rgba(0,0,0,.55)', border:'1px solid rgba(255,255,255,.2)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                <ChevronRight size={16}/>
              </button>
              <div style={{ position:'absolute', bottom:12, left:0, right:0, display:'flex', justifyContent:'center', gap:5 }}>
                {imgs.map((_, i) => <button key={i} onClick={() => setGalIdx(i)} style={{ width: i===galIdx?16:6, height:6, borderRadius:3, border:'none', padding:0, background: i===galIdx?'#D4AF37':'rgba(255,255,255,.4)', cursor:'pointer', transition:'all .2s' }}/>)}
              </div>
            </>)}
            <button onClick={onClose} style={{ position:'absolute', top:12, right:12, width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,.6)', border:'1px solid rgba(255,255,255,.2)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
              <X size={16}/>
            </button>
          </div>
        )}
        {/* Content */}
        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>
          {imgs.length === 0 && (
            <button onClick={onClose} style={{ float:'right', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:8, color:'white', cursor:'pointer', padding:'4px 10px', fontSize:12 }}>✕ Close</button>
          )}
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 11px', borderRadius:20, background:'rgba(16,185,129,.15)', color:'#34D399', fontSize:9, fontWeight:800, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10, border:'1px solid rgba(16,185,129,.25)', fontFamily:'Space Grotesk,sans-serif' }}>
            ✦ ACCOMPLISHED
          </div>
          <h2 style={{ fontSize:20, fontWeight:900, color:'white', fontFamily:'Sora,sans-serif', margin:'0 0 12px', lineHeight:1.3 }}>{project.project_name || project.title}</h2>
          {[
            project.completion_date && ['📅 Completed', new Date(project.completion_date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})],
            project.start_date && ['🚀 Started', new Date(project.start_date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})],
            project.location && ['📍 Location', project.location],
            project.budget && ['💰 Budget', `₱${parseFloat(project.budget).toLocaleString()}`],
            project.fund_source && ['🏦 Fund Source', project.fund_source],
            project.prepared_by && ['👤 Prepared by', project.prepared_by],
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,.45)', width:100, flexShrink:0, fontFamily:'Space Grotesk,sans-serif' }}>{label}</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,.85)', fontFamily:'Space Grotesk,sans-serif', fontWeight:600 }}>{val}</span>
            </div>
          ))}
          {project.description && (
            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.8px', margin:'0 0 8px', fontFamily:'Space Grotesk,sans-serif' }}>Description</p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.75)', lineHeight:1.8, margin:0, fontFamily:'DM Sans,sans-serif' }}>{project.description}</p>
            </div>
          )}
        </div>
        <div style={{ padding:'12px 24px', borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 22px', borderRadius:10, background:'rgba(212,175,55,.15)', border:'1px solid rgba(212,175,55,.3)', color:'#D4AF37', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Space Grotesk,sans-serif' }}>
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
  const isCancelled = (ev.status||'').toLowerCase() === 'cancelled'
  const statusStyle = {
    upcoming:  { bg:'rgba(245,158,11,.15)', color:'#FBBF24', border:'rgba(245,158,11,.3)' },
    ongoing:   { bg:'rgba(16,185,129,.15)', color:'#34D399', border:'rgba(16,185,129,.3)' },
    finished:  { bg:'rgba(100,116,139,.15)', color:'#94A3B8', border:'rgba(100,116,139,.3)' },
    cancelled: { bg:'rgba(248,113,113,.12)', color:'#F87171', border:'rgba(248,113,113,.3)' },
    completed: { bg:'rgba(16,185,129,.15)', color:'#34D399', border:'rgba(16,185,129,.3)' },
  }
  const ss = statusStyle[(ev.status||'').toLowerCase()] || statusStyle.upcoming
  return (
    <div style={{ background:'rgba(13,31,60,.95)', borderRadius:16, border:'1px solid rgba(255,255,255,.08)', overflow:'hidden', animation:'fadeSlideIn .2s ease', backdropFilter:'blur(12px)' }}>
      {ev.banner_url && (
        <div style={{ height:140, overflow:'hidden', position:'relative' }}>
          <img src={ev.banner_url} alt={ev.title} onError={e=>e.target.src='/Hero.png'} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(13,31,60,.8), transparent)' }}/>
        </div>
      )}
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`, textTransform:'capitalize', fontFamily:'Space Grotesk,sans-serif' }}>{ev.status||'upcoming'}</span>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:7, width:26, height:26, cursor:'pointer', color:'rgba(255,255,255,.6)', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
        </div>
        <h3 style={{ fontSize:16, fontWeight:800, color:'white', margin:'0 0 10px', fontFamily:'Sora,sans-serif', lineHeight:1.3 }}>{ev.title}</h3>
        {cd && !isCancelled && (
          <div style={{ padding:'8px 12px', borderRadius:10, background:ss.bg, border:`1px solid ${ss.border}`, marginBottom:10 }}>
            <p style={{ fontSize:12, fontWeight:700, color:ss.color, margin:0, fontFamily:'Space Grotesk,sans-serif' }}>⏱ {cd.label}</p>
          </div>
        )}
        {[
          ev.start_date && ['📅 Date', new Date(ev.start_date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})],
          ev.start_date && ['🕐 Time', new Date(ev.start_date).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})],
          ev.location && ['📍 Venue', ev.location],
          ev.handler && ['👤 Handler', ev.handler],
          ev.participants_count && ['👥 Participants', ev.participants_count],
        ].filter(Boolean).map(([label, val]) => (
          <div key={label} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.4)', width:80, flexShrink:0, fontFamily:'Space Grotesk,sans-serif' }}>{label}</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.8)', fontFamily:'Space Grotesk,sans-serif', fontWeight:500 }}>{val}</span>
          </div>
        ))}
        {ev.description && (
          <p style={{ fontSize:12, color:'rgba(255,255,255,.55)', marginTop:10, lineHeight:1.7, fontFamily:'DM Sans,sans-serif' }}>{ev.description}</p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── PROJECTS PAGE HELPERS ─────────────────────── */
// NOTE: These are defined at module level (NOT inside ProjectsPage) so React
// preserves their identity across renders. Defining components inside a parent
// component causes them to be re-created on every render, which unmounts/remounts
// them and kills all animation + state — including Framer Motion AnimatePresence.

const PROJECTS_AUTOPLAY_INTERVAL = 3000  // 3 s

const PROJECTS_STATUS_COLORS = {
  light: {
    upcoming:     { bg: '#DBEAFE', color: '#1D4ED8' },
    ongoing:      { bg: '#DCFCE7', color: '#166534' },
    'on hold':    { bg: '#FEF9E7', color: '#7B4800' },
    planning:     { bg: '#EBF8FF', color: '#0369A1' },
    completed:    { bg: '#F0FFF4', color: '#276749' },
    accomplished: { bg: '#F0FFF4', color: '#276749' },
    done:         { bg: '#F0FFF4', color: '#276749' },
  },
  dark: {
    upcoming:     { bg: 'rgba(59,130,246,.18)',  color: '#93C5FD' },
    ongoing:      { bg: 'rgba(34,197,94,.15)',   color: '#6EE7B7' },
    'on hold':    { bg: 'rgba(251,191,36,.12)',  color: '#FCD34D' },
    planning:     { bg: 'rgba(96,165,250,.12)',  color: '#7DD3FC' },
    completed:    { bg: 'rgba(52,211,153,.12)',  color: '#6EE7B7' },
    accomplished: { bg: 'rgba(52,211,153,.12)',  color: '#6EE7B7' },
    done:         { bg: 'rgba(52,211,153,.12)',  color: '#6EE7B7' },
  },
}

/* ─────────────────────────────────────────────────────────────
   MAIN AUTOPLAY CAROUSEL (70% column) — Framer Motion slide
   Slides left/right with AnimatePresence + custom direction.
   Autoplays every 3s. Pauses on hover. Loops infinitely.
───────────────────────────────────────────────────────────── */
function ProjectsMainCarousel({ items, label, accentColor, dark, isMobile, siteSettings, setSelectedProject }) {
    const [idx, setIdx]     = React.useState(0)
    const [dir, setDir]     = React.useState(1)   // 1 = forward (→), -1 = backward (←)
    const [paused, setPaused] = React.useState(false)
    const total             = items.length
    const totalRef          = React.useRef(total)
    const idxRef            = React.useRef(idx)
    React.useEffect(() => { totalRef.current = total }, [total])
    React.useEffect(() => { idxRef.current = idx }, [idx])

    // ── Slide variants: custom = direction (1 or -1) ──
    const variants = {
      enter: (d) => ({
        x: d > 0 ? '100%' : '-100%',
        opacity: 0,
      }),
      center: {
        x: 0,
        opacity: 1,
        transition: {
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.25, ease: 'easeOut' },
        },
      },
      exit: (d) => ({
        x: d > 0 ? '-100%' : '100%',
        opacity: 0,
        transition: {
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2, ease: 'easeIn' },
        },
      }),
    }

    // ── Navigate ──
    const go = React.useCallback((nextIdx, nextDir) => {
      const t = totalRef.current
      const safe = ((nextIdx % t) + t) % t
      setDir(nextDir)
      setIdx(safe)
    }, [])

    const goNext = React.useCallback(() => {
      go((idxRef.current + 1) % totalRef.current, 1)
    }, [go])

    const goPrev = React.useCallback(() => {
      const t = totalRef.current
      go((idxRef.current - 1 + t) % t, -1)
    }, [go])

    // ── Autoplay — 3 s, pauses on hover ──
    React.useEffect(() => {
      if (paused || total < 2) return
      const t = setInterval(goNext, PROJECTS_AUTOPLAY_INTERVAL)
      return () => clearInterval(t)
    }, [paused, total, goNext])

    React.useEffect(() => { setIdx(0) }, [items.length])

    // ── Helpers ──
    const fmtDate     = d => { try { return new Date(d).toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' }) } catch { return '' } }
    const getImg      = p => (Array.isArray(p.images) && p.images.filter(Boolean)[0]) || p.banner_url || siteSettings?.heroImage || '/Hero.png'
    const getSc       = p => (dark ? PROJECTS_STATUS_COLORS.dark : PROJECTS_STATUS_COLORS.light)[(p.status||'').toLowerCase()] || { bg: dark ? 'rgba(148,163,184,.12)' : '#F3F4F6', color: dark ? '#94A3B8' : '#718096' }
    const isAccP      = p => ['accomplished','completed','done'].includes((p.status||'').toLowerCase())
    const barColor    = accentColor || (dark ? 'linear-gradient(90deg,#D4AF37,#F6CF56)' : 'linear-gradient(90deg,#C53030,#D69E2E)')

    // ── Empty state ──
    if (total === 0) return (
      <div style={{
        borderRadius:18, height: isMobile ? 220 : 320,
        display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10,
        backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
        background: dark ? 'rgba(30,41,59,.5)' : 'rgba(255,255,255,.7)',
        border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(255,255,255,.9)',
        boxShadow: dark ? '0 8px 32px rgba(0,0,0,.3)' : '0 4px 20px rgba(26,54,93,.08)',
      }}>
        <span style={{ fontSize:42 }}>🏗️</span>
        <p style={{ color: dark ? 'rgba(255,255,255,.3)' : '#A0AEC0', fontSize:13, margin:0, fontFamily:'Sora,sans-serif' }}>
          No {label.toLowerCase()} projects yet.
        </p>
      </div>
    )

    const p  = items[idx]
    const sc = getSc(p)
    const date = p.completion_date || p.end_date || p.start_date || p.created_at

    return (
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{ userSelect:'none' }}
      >
        {/* ── Static outer frame — overflow:hidden clips the sliding cards ── */}
        <div style={{
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          height: isMobile ? 220 : 320,
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          background: dark ? 'rgba(15,23,42,.60)' : 'rgba(255,255,255,.70)',
          border: dark ? '1px solid rgba(255,255,255,.10)' : '1px solid rgba(255,255,255,.95)',
          boxShadow: dark ? '0 20px 56px rgba(0,0,0,.65)' : '0 10px 40px rgba(26,54,93,.16)',
        }}>

          {/* ── AnimatePresence: one slide in, one slide out, both rendered simultaneously ── */}
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={`${label}-${idx}`}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              onClick={() => setSelectedProject(p)}
              style={{
                position: 'absolute',
                inset: 0,
                cursor: 'pointer',
                willChange: 'transform, opacity',
              }}
            >
              {/* Image */}
              <img
                src={getImg(p)}
                alt={p.project_name || ''}
                onError={e => e.target.src = '/Hero.png'}
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
              />
              {/* Gradient overlay */}
              <div style={{ position:'absolute', inset:0, background: dark
                ? 'linear-gradient(to top, rgba(5,12,30,.97) 0%, rgba(5,12,30,.55) 55%, rgba(5,12,30,.08) 100%)'
                : 'linear-gradient(to top, rgba(15,23,42,.90) 0%, rgba(15,23,42,.48) 50%, rgba(15,23,42,.04) 100%)' }}/>
              {/* Status badge */}
              <div style={{
                position:'absolute', top:14, left:16,
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'4px 12px', borderRadius:20,
                background: isAccP(p) ? 'rgba(16,185,129,.9)' : 'rgba(59,130,246,.88)',
                color:'white', fontSize:9, fontWeight:800, letterSpacing:'1.5px',
                textTransform:'uppercase', backdropFilter:'blur(4px)',
                border:'1px solid rgba(255,255,255,.2)', fontFamily:'Space Grotesk,sans-serif',
              }}>
                {isAccP(p) ? '✦ ACCOMPLISHED' : '⟳ ' + (p.status || 'UPCOMING').toUpperCase()}
              </div>
              {/* Text content — slides as one unit with the image */}
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding: isMobile ? '16px 18px' : '22px 26px' }}>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:'1.2px', textTransform:'uppercase', color:'rgba(255,255,255,.52)', fontFamily:'Space Grotesk,sans-serif', marginBottom:5 }}>
                  Status: <span style={{ color: sc.color }}>{p.status || 'upcoming'}</span>
                </span>
                <p style={{ fontSize: isMobile ? 16 : 20, fontWeight:900, color:'white', fontFamily:"'Sora',sans-serif", margin:'0 0 6px', lineHeight:1.25, textShadow:'0 2px 14px rgba(0,0,0,.55)', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {p.project_name || p.title}
                </p>
                {p.budget && (
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.75)', margin:'0 0 2px', fontFamily:'Space Grotesk,sans-serif', fontWeight:600 }}>
                    Budget: ₱{parseFloat(p.budget).toLocaleString()}
                  </p>
                )}
                {p.prepared_by && (
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.68)', margin:'0 0 2px', fontFamily:'Space Grotesk,sans-serif' }}>
                    Prepared by: {p.prepared_by}
                  </p>
                )}
                {date && (
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.55)', margin:0, fontFamily:'Space Grotesk,sans-serif' }}>
                    Date: {fmtDate(date)}
                  </p>
                )}
                <div style={{ marginTop:10 }}>
                  <span style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    fontSize:10, fontWeight:700,
                    color: dark ? 'rgba(246,207,86,.9)' : 'rgba(255,220,100,.95)',
                    fontFamily:'Space Grotesk,sans-serif', letterSpacing:'.5px',
                    padding:'4px 10px', borderRadius:8,
                    background:'rgba(0,0,0,.25)', backdropFilter:'blur(4px)',
                    border:'1px solid rgba(255,255,255,.12)',
                  }}>
                    View Details →
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Counter — sits above the sliding layer ── */}
          {total > 1 && (
            <div style={{
              position:'absolute', top:14, right:14, zIndex:20,
              fontSize:10, fontWeight:700, color:'rgba(255,255,255,.65)',
              background:'rgba(0,0,0,.42)', padding:'3px 10px', borderRadius:20,
              backdropFilter:'blur(4px)', fontFamily:'Space Grotesk,sans-serif',
              pointerEvents:'none',
            }}>
              {idx + 1} / {total}
            </div>
          )}

          {/* ── Left / Right chevron buttons ── */}
          {total > 1 && (<>
            <button
              onClick={e => { e.stopPropagation(); goPrev() }}
              style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.52)', border:'1.5px solid rgba(255,255,255,.2)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:20, backdropFilter:'blur(4px)', transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,.82)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,.52)'}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); goNext() }}
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,.52)', border:'1.5px solid rgba(255,255,255,.2)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:20, backdropFilter:'blur(4px)', transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,.82)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,.52)'}
            >
              <ChevronRight size={16} />
            </button>
          </>)}

          {/* ── Progress bar ── */}
          {total > 1 && !paused && (
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,.12)', zIndex:20 }}>
              <div
                key={`pb-${label}-${idx}`}
                style={{ height:'100%', background: barColor, animation:`progressBar ${PROJECTS_AUTOPLAY_INTERVAL}ms linear forwards` }}
              />
            </div>
          )}
        </div>

        {/* ── Dot indicators ── */}
        {total > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:12 }}>
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i, i >= idx ? 1 : -1)}
                style={{
                  width: i === idx ? 22 : 6, height:6, borderRadius:3,
                  border:'none', padding:0, cursor:'pointer',
                  transition:'width 0.35s cubic-bezier(.4,0,.2,1), background 0.35s cubic-bezier(.4,0,.2,1)',
                  background: i === idx
                    ? (dark ? '#FBBF24' : '#C53030')
                    : (dark ? 'rgba(255,255,255,.2)' : 'rgba(26,54,93,.2)'),
                }}
              />
            ))}
          </div>
        )}
      </div>
    )
}

/* ── Dense list card — module-level so identity is stable across renders ── */
function ProjectsDenseCard({ p, dark, setSelectedProject }) {
  const [hov, setHov] = React.useState(false)
  const sc = (dark ? PROJECTS_STATUS_COLORS.dark : PROJECTS_STATUS_COLORS.light)[(p.status||'').toLowerCase()] || { bg: dark ? 'rgba(148,163,184,.12)' : '#F3F4F6', color: dark ? '#94A3B8' : '#718096' }
  const categoryIcons = { Technology:'\ud83d\udcbb', Health:'\ud83c\udfe5', Sports:'\u26bd', Education:'\ud83d\udcda', Environment:'\ud83c\udf3f', Livelihood:'\ud83d\udcbc', Governance:'\ud83c\udfd9\ufe0f', Social:'\ud83e\udd1d', Infrastructure:'\ud83c\udfd7\ufe0f', Training:'\ud83c\udf93' }
  const icon = categoryIcons[p.category] || '\ud83d\udccb'
  return (
    <div
      onClick={() => setSelectedProject(p)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
        background: hov
          ? dark ? 'rgba(30,41,59,.88)' : 'rgba(255,255,255,.94)'
          : dark ? 'rgba(30,41,59,.58)' : 'rgba(255,255,255,.70)',
        border: dark
          ? `1px solid rgba(255,255,255,${hov ? '.14' : '.06'})`
          : `1px solid rgba(255,255,255,${hov ? '1' : '.85'})`,
        borderRadius:14, padding:'12px 14px', cursor:'pointer',
        transition:'all .2s cubic-bezier(.34,1.56,.64,1)',
        transform: hov ? 'scale(1.02) translateY(-1px)' : 'none',
        boxShadow: hov
          ? dark ? '0 8px 28px rgba(0,0,0,.4)' : '0 6px 20px rgba(26,54,93,.14)'
          : dark ? '0 2px 10px rgba(0,0,0,.22)' : '0 1px 6px rgba(26,54,93,.06)',
      }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{
          width:34, height:34, borderRadius:9, flexShrink:0,
          background: dark ? 'rgba(251,191,36,.12)' : 'rgba(26,54,93,.08)',
          border: dark ? '1px solid rgba(251,191,36,.2)' : '1px solid rgba(26,54,93,.12)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
        }}>{icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3, gap:6 }}>
            <p style={{ fontSize:12, fontWeight:800, color: dark ? '#F1F5F9' : '#1A365D', margin:0, fontFamily:"'Sora',sans-serif", lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>
              {p.project_name || p.title}
            </p>
            {p.budget && <span style={{ fontSize:9, fontWeight:700, color: dark ? '#FBBF24' : '#D69E2E', flexShrink:0, fontFamily:'Space Grotesk,sans-serif' }}>\u20b1{parseFloat(p.budget).toLocaleString()}</span>}
          </div>
          {p.description && (
            <p style={{ fontSize:10, color: dark ? '#94A3B8' : '#4A5568', margin:'0 0 5px', lineHeight:1.5, fontFamily:'DM Sans,sans-serif', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {p.description}
            </p>
          )}
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:800, background:sc.bg, color:sc.color, textTransform:'capitalize', fontFamily:'Space Grotesk,sans-serif' }}>
            {p.status || 'upcoming'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Section label ── */
function ProjectsSectionLabel({ text, color, icon, dark }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
      <div style={{ width:3, height:20, borderRadius:2, background: color || (dark ? '#60A5FA' : '#1A365D'), flexShrink:0 }}/>
      <h3 style={{
        fontSize:12, fontWeight:900, letterSpacing:'2px', textTransform:'uppercase', margin:0,
        color: dark ? '#CBD5E1' : '#1A365D', fontFamily:'Space Grotesk,sans-serif',
        display:'flex', alignItems:'center', gap:6,
      }}>
        {icon && <span style={{ fontSize:14 }}>{icon}</span>}
        {text}
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

      <section style={{ position:'relative', zIndex:2, flex:1, padding: isMobile ? '28px 14px 48px' : '48px 36px 60px' }}>
        {/* Page header */}
        <div style={{ textAlign:'center', marginBottom: isMobile ? 28 : 40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 16px', borderRadius:30, marginBottom:14, background: dark ? 'rgba(96,165,250,.1)' : 'rgba(26,54,93,.07)', border: dark ? '1px solid rgba(96,165,250,.18)' : '1px solid rgba(26,54,93,.13)' }}>
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:'2px', textTransform:'uppercase', color: dark ? '#60A5FA' : '#1A365D', fontFamily:'Space Grotesk,sans-serif' }}>SK Initiatives</span>
          </div>
          <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight:900, margin:'0 0 8px', color: dark ? '#F1F5F9' : '#1A365D', fontFamily:"'Sora',sans-serif", textTransform:'uppercase', letterSpacing:'1.5px', textShadow: dark ? '0 2px 20px rgba(0,0,0,.5)' : '0 1px 4px rgba(26,54,93,.12)' }}>Community Projects</h2>
          <p style={{ fontSize:14, color: dark ? '#94A3B8' : '#4A5568', maxWidth:480, margin:'0 auto', fontFamily:"'DM Sans',sans-serif", lineHeight:1.7 }}>
            Track all SK initiatives — from ongoing programs to accomplished milestones.
          </p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:16 }}>
            <div style={{ height:1, width:50, background: dark ? 'rgba(96,165,250,.3)' : 'rgba(26,54,93,.2)' }}/>
            <div style={{ width:7, height:7, borderRadius:'50%', background: dark ? '#60A5FA' : '#C53030' }}/>
            <div style={{ height:1, width:50, background: dark ? 'rgba(96,165,250,.3)' : 'rgba(26,54,93,.2)' }}/>
          </div>
        </div>

        {projects.length === 0 ? (
          <div style={{ maxWidth:480, margin:'0 auto', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', background: dark ? 'rgba(30,41,59,.6)' : 'rgba(255,255,255,.72)', border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(255,255,255,.9)', borderRadius:16, textAlign:'center', padding:'48px 32px', color: dark ? '#94A3B8' : '#4A5568' }}>
            <p style={{ fontSize:36, margin:'0 0 12px' }}>📋</p>
            <p style={{ fontWeight:700, color: dark ? '#CBD5E1' : '#1A365D', marginBottom:6 }}>No projects yet</p>
            <p style={{ fontSize:13 }}>Projects will appear here once they are added by the SK team.</p>
          </div>
        ) : (
          <div style={{ maxWidth:1100, margin:'0 auto' }}>

            {/* ════════════════════════════════════════════════════
                ROW 1 — UPCOMING PROJECTS
                Layout: [70% Main Carousel] | [30% Static List]
            ════════════════════════════════════════════════════ */}
            <div style={{ marginBottom: isMobile ? 32 : 48 }}>
              {/* Row section header */}
              <ProjectsSectionLabel
                text="Upcoming Projects"
                color={dark ? '#60A5FA' : '#1A365D'}
                icon="⟳"
                dark={dark}
              />
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 16 : 24,
                alignItems: 'flex-start',
              }}>
                {/* ── 70%: Autoplay main carousel ── */}
                <div style={{ flex: isMobile ? 'none' : '7 0 0', minWidth: 0, width: isMobile ? '100%' : undefined }}>
                  <ProjectsMainCarousel
                    items={upcoming}
                    label="Upcoming"
                    accentColor={dark ? 'linear-gradient(90deg,#60A5FA,#93C5FD)' : 'linear-gradient(90deg,#1D4ED8,#3B82F6)'}
                    dark={dark}
                    isMobile={isMobile}
                    siteSettings={siteSettings}
                    setSelectedProject={setSelectedProject}
                  />
                </div>
                {/* ── 30%: Static project list (no autoplay) ── */}
                {!isMobile && (
                  <div style={{ flex: '3 0 0', minWidth: 0 }}>
                    <div style={{
                      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      background: dark ? 'rgba(15,23,42,.52)' : 'rgba(255,255,255,.68)',
                      border: dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(255,255,255,.9)',
                      borderRadius: 18, overflow: 'hidden',
                      boxShadow: dark ? '0 8px 32px rgba(0,0,0,.3)' : '0 4px 20px rgba(26,54,93,.08)',
                    }}>
                      <div style={{ padding: '12px 16px', borderBottom: dark ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(26,54,93,.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: dark ? '#60A5FA' : '#1A365D' }}/>
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: dark ? '#94A3B8' : '#4A5568', fontFamily: 'Space Grotesk,sans-serif' }}>
                          All Upcoming ({upcoming.length})
                        </span>
                      </div>
                      <div style={{ padding: '12px', maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {upcoming.length === 0
                          ? <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.3)' : '#A0AEC0', margin: 0, textAlign: 'center', padding: '20px 0', fontFamily: 'DM Sans,sans-serif' }}>No upcoming projects.</p>
                          : upcoming.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} setSelectedProject={setSelectedProject} />)
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Mobile: static list below carousel */}
              {isMobile && upcoming.length > 0 && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcoming.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} setSelectedProject={setSelectedProject} />)}
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════════════════
                ROW 2 — ACCOMPLISHED PROJECTS
                Layout: [30% Static List] | [70% Main Carousel]
            ════════════════════════════════════════════════════ */}
            <div>
              {/* Row section header */}
              <ProjectsSectionLabel
                text="Accomplished Projects"
                color={dark ? '#34D399' : '#166534'}
                icon="✦"
                dark={dark}
              />
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 16 : 24,
                alignItems: 'flex-start',
              }}>
                {/* ── 30%: Static project list (no autoplay) ── */}
                {!isMobile && (
                  <div style={{ flex: '3 0 0', minWidth: 0 }}>
                    <div style={{
                      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      background: dark ? 'rgba(15,23,42,.52)' : 'rgba(255,255,255,.68)',
                      border: dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(255,255,255,.9)',
                      borderRadius: 18, overflow: 'hidden',
                      boxShadow: dark ? '0 8px 32px rgba(0,0,0,.3)' : '0 4px 20px rgba(26,54,93,.08)',
                    }}>
                      <div style={{ padding: '12px 16px', borderBottom: dark ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(26,54,93,.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: dark ? '#34D399' : '#166534' }}/>
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: dark ? '#94A3B8' : '#4A5568', fontFamily: 'Space Grotesk,sans-serif' }}>
                          All Accomplished ({accomplished.length})
                        </span>
                      </div>
                      <div style={{ padding: '12px', maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {accomplished.length === 0
                          ? <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.3)' : '#A0AEC0', margin: 0, textAlign: 'center', padding: '20px 0', fontFamily: 'DM Sans,sans-serif' }}>No accomplished projects yet.</p>
                          : accomplished.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} setSelectedProject={setSelectedProject} />)
                        }
                      </div>
                    </div>
                  </div>
                )}
                {/* ── 70%: Autoplay main carousel ── */}
                <div style={{ flex: isMobile ? 'none' : '7 0 0', minWidth: 0, width: isMobile ? '100%' : undefined }}>
                  <ProjectsMainCarousel
                    items={accomplished}
                    label="Accomplished"
                    accentColor={dark ? 'linear-gradient(90deg,#34D399,#6EE7B7)' : 'linear-gradient(90deg,#059669,#34D399)'}
                    dark={dark}
                    isMobile={isMobile}
                    siteSettings={siteSettings}
                    setSelectedProject={setSelectedProject}
                  />
                </div>
              </div>
              {/* Mobile: static list below carousel */}
              {isMobile && accomplished.length > 0 && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {accomplished.map(p => <ProjectsDenseCard key={p.id} p={p} dark={dark} setSelectedProject={setSelectedProject} />)}
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
    upcoming:  { bg: dark ? 'rgba(59,130,246,.18)' : '#DBEAFE', color: dark ? '#60A5FA' : '#1D4ED8', border: dark ? 'rgba(96,165,250,.35)' : '#BFDBFE', dot:'#3B82F6', accentBar:'#3B82F6' },
    ongoing:   { bg: dark ? 'rgba(34,197,94,.15)'  : '#DCFCE7', color: dark ? '#4ADE80' : '#166534', border: dark ? 'rgba(74,222,128,.3)'  : '#A7F3D0', dot:'#22C55E', accentBar:'#22C55E' },
    cancelled: { bg: dark ? 'rgba(248,113,113,.15)': '#FEE2E2', color: dark ? '#F87171' : '#DC2626', border: dark ? 'rgba(248,113,113,.3)' : '#FECACA', dot:'#EF4444', accentBar:'#EF4444' },
    finished:  { bg: dark ? 'rgba(148,163,184,.12)': '#F3F4F6', color: dark ? '#94A3B8' : '#6B7280', border: dark ? 'rgba(148,163,184,.2)' : '#E5E7EB', dot:'#9CA3AF', accentBar: dark ? '#334155' : '#CBD5E0' },
  })[(s||'').toLowerCase()] || { bg: dark ? 'rgba(148,163,184,.12)': '#F3F4F6', color: dark ? '#94A3B8' : '#6B7280', border: dark ? 'rgba(148,163,184,.2)' : '#E5E7EB', dot:'#9CA3AF', accentBar: dark ? '#334155' : '#CBD5E0' }

  const typeStyle = t => ({
    'General':             { bg: dark ? 'rgba(96,165,250,.12)'  : 'rgba(26,54,93,.08)',  color: dark ? '#93C5FD' : '#1A365D', border: dark ? 'rgba(96,165,250,.25)'  : 'rgba(26,54,93,.2)',  icon:'📢' },
    'Event':               { bg: dark ? 'rgba(52,211,153,.12)'  : '#F0FFF4',             color: dark ? '#6EE7B7' : '#276749', border: dark ? 'rgba(52,211,153,.25)'  : '#A7F3D0',            icon:'📅' },
    'Emergency':           { bg: dark ? 'rgba(248,113,113,.15)' : '#FEE2E2',             color: dark ? '#FCA5A5' : '#DC2626', border: dark ? 'rgba(248,113,113,.3)'  : '#FECACA',            icon:'🚨' },
    'Notice':              { bg: dark ? 'rgba(251,191,36,.12)'  : '#FEF9E7',             color: dark ? '#FCD34D' : '#7B4800', border: dark ? 'rgba(251,191,36,.25)'  : '#FDE68A',            icon:'📋' },
    'Training & Workshop': { bg: dark ? 'rgba(192,132,252,.12)' : '#FAF5FF',             color: dark ? '#D8B4FE' : '#6B21A8', border: dark ? 'rgba(192,132,252,.25)' : '#E9D5FF',            icon:'🎓' },
    'Sports':              { bg: dark ? 'rgba(56,189,248,.12)'  : '#EFF6FF',             color: dark ? '#7DD3FC' : '#0369A1', border: dark ? 'rgba(56,189,248,.25)'  : '#BAE6FD',            icon:'⚽' },
    'Assembly':            { bg: dark ? 'rgba(167,139,250,.12)' : '#F5F3FF',             color: dark ? '#C4B5FD' : '#5B21B6', border: dark ? 'rgba(167,139,250,.25)' : '#DDD6FE',            icon:'🏛️' },
  })[t] || { bg: dark ? 'rgba(148,163,184,.1)' : '#F3F4F6', color: dark ? '#94A3B8' : '#718096', border: dark ? 'rgba(148,163,184,.2)' : '#E5E7EB', icon:'🔔' }

  return (
    <div style={{ animation:'fadeSlideIn .2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>

      <section style={{ position:'relative', zIndex:2, flex:1, padding: isMobile ? '32px 16px 48px' : '56px 40px 64px' }}>
        {/* Page header */}
        <div style={{ textAlign:'center', marginBottom: isMobile ? 28 : 40 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'5px 16px', borderRadius:30, marginBottom:14,
            background: dark ? 'rgba(96,165,250,.12)' : 'rgba(26,54,93,.08)',
            border: dark ? '1px solid rgba(96,165,250,.2)' : '1px solid rgba(26,54,93,.15)',
          }}>
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:'2px', textTransform:'uppercase',
              color: dark ? '#60A5FA' : '#1A365D', fontFamily:'Space Grotesk,sans-serif' }}>
              Community Board
            </span>
          </div>
          <h2 style={{
            fontSize: isMobile ? 28 : 38, fontWeight:900, margin:'0 0 10px',
            color: dark ? '#F1F5F9' : '#1A365D',
            fontFamily:"'Sora','Inter',sans-serif",
            textTransform:'uppercase', letterSpacing:'1.5px',
            textShadow: dark ? '0 2px 20px rgba(0,0,0,.5)' : '0 1px 4px rgba(26,54,93,.12)',
          }}>Latest Announcements</h2>
          <p style={{
            fontSize:14, color: dark ? '#94A3B8' : '#4A5568',
            maxWidth:460, margin:'0 auto',
            fontFamily:"'DM Sans',sans-serif", lineHeight:1.7,
          }}>Stay informed about important news and updates in our community.</p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:18 }}>
            <div style={{ height:1, width:60, background: dark ? 'rgba(96,165,250,.3)' : 'rgba(26,54,93,.2)' }}/>
            <div style={{ width:8, height:8, borderRadius:'50%', background: dark ? '#60A5FA' : '#C53030' }}/>
            <div style={{ height:1, width:60, background: dark ? 'rgba(96,165,250,.3)' : 'rgba(26,54,93,.2)' }}/>
          </div>
        </div>

        {/* Feed */}
        <div style={{ maxWidth:740, margin:'0 auto', display:'flex', flexDirection:'column', gap:14 }}>
          {announcements.length === 0 ? (
            <div style={{
              backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
              background: dark ? 'rgba(30,41,59,.6)' : 'rgba(255,255,255,.7)',
              border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(255,255,255,.9)',
              borderRadius:16, padding:'40px 32px', textAlign:'center',
              color: dark ? '#94A3B8' : '#4A5568', fontSize:14,
              boxShadow: dark ? '0 8px 32px rgba(0,0,0,.4)' : '0 4px 24px rgba(26,54,93,.08)',
            }}>
              <p style={{ fontSize:32, margin:'0 0 12px' }}>📭</p>
              <p style={{ fontWeight:700, color: dark ? '#CBD5E1' : '#1A365D', marginBottom:4 }}>No announcements yet</p>
              <p style={{ fontSize:12 }}>Check back soon for community news and updates.</p>
            </div>
          ) : announcements.map((a, idx) => {
            const ss = statusStyle(a.status)
            const ts = typeStyle(a.type || a.category)
            const isOpen = expandedId === a.id
            return (
              <div
                key={a.id}
                onClick={() => setExpandedId(isOpen ? null : a.id)}
                style={{
                  position:'relative',
                  backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
                  background: dark ? 'rgba(30,41,59,.60)' : 'rgba(255,255,255,.72)',
                  border: dark
                    ? `1px solid rgba(255,255,255,${isOpen ? '.12' : '.06'})`
                    : `1px solid rgba(255,255,255,${isOpen ? '1' : '.85'})`,
                  borderRadius:16, overflow:'hidden',
                  cursor:'pointer',
                  transition:'transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease, border-color .2s',
                  boxShadow: isOpen
                    ? dark ? '0 16px 48px rgba(0,0,0,.55)' : '0 12px 40px rgba(26,54,93,.18)'
                    : dark ? '0 4px 20px rgba(0,0,0,.35)'  : '0 2px 12px rgba(26,54,93,.08)',
                }}
                onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.transform='scale(1.01) translateY(-2px)'; e.currentTarget.style.boxShadow = dark ? '0 12px 40px rgba(0,0,0,.5)' : '0 8px 32px rgba(26,54,93,.15)' }}}
                onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow = dark ? '0 4px 20px rgba(0,0,0,.35)' : '0 2px 12px rgba(26,54,93,.08)' }}}
              >
                {/* Left accent bar */}
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:ss.accentBar, borderRadius:'16px 0 0 16px' }}/>

                <div style={{ padding: isMobile ? '14px 14px 14px 20px' : '18px 22px 18px 26px' }}>
                  {/* Title + badges */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{
                      fontWeight:800, fontSize: isMobile ? 14 : 15,
                      color: dark ? '#F1F5F9' : '#1A365D',
                      fontFamily:"'Sora','Inter',sans-serif",
                      flex:1, minWidth:0, lineHeight:1.35,
                    }}>{a.title}</span>
                    <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:5,
                        padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:800,
                        background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`,
                        whiteSpace:'nowrap', fontFamily:'Space Grotesk,sans-serif',
                      }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:ss.dot, flexShrink:0 }}/>
                        {a.status || 'general'}
                      </span>
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:4,
                        padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:800,
                        background:ts.bg, color:ts.color, border:`1px solid ${ts.border}`,
                        whiteSpace:'nowrap', fontFamily:'Space Grotesk,sans-serif',
                      }}>
                        <span style={{ fontSize:9 }}>{ts.icon}</span>
                        {a.type || a.category || 'General'}
                      </span>
                    </div>
                  </div>

                  {/* Meta: date + location */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom: isOpen ? 14 : 4 }}>
                    {a.date_time && (
                      <span style={{ fontSize:11, color: dark ? '#7DD3FC' : '#2B6CB0', display:'inline-flex', alignItems:'center', gap:4, fontFamily:'DM Sans,sans-serif' }}>
                        📅 {format(new Date(a.date_time),"MMM d, yyyy 'at' h:mm a")}
                      </span>
                    )}
                    {a.location && (
                      <span style={{ fontSize:11, color: dark ? '#86EFAC' : '#276749', display:'inline-flex', alignItems:'center', gap:4, fontFamily:'DM Sans,sans-serif' }}>
                        📍 {a.location}
                      </span>
                    )}
                  </div>

                  {/* Collapsed: preview */}
                  {!isOpen && a.content && (
                    <p style={{
                      fontSize:12, color: dark ? '#94A3B8' : '#4A5568',
                      lineHeight:1.65, margin:'4px 0 6px',
                      display:'-webkit-box', WebkitLineClamp:2,
                      WebkitBoxOrient:'vertical', overflow:'hidden',
                      fontFamily:'DM Sans,sans-serif',
                    }}>{a.content}</p>
                  )}

                  {/* Expanded: full content */}
                  {isOpen && (
                    <div style={{ animation:'fadeSlideIn .18s ease' }}>
                      {a.content && (
                        <p style={{
                          fontSize:13, color: dark ? '#CBD5E1' : '#2D3748',
                          lineHeight:1.8, margin:'0 0 14px',
                          fontFamily:'DM Sans,sans-serif', whiteSpace:'pre-wrap',
                          borderTop: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(26,54,93,.08)',
                          paddingTop:12,
                        }}>{a.content}</p>
                      )}
                      <div style={{ display:'flex', justifyContent:'flex-end' }}>
                        <span style={{ fontSize:10, color: dark ? '#475569' : '#A0AEC0', fontFamily:'Space Grotesk,sans-serif' }}>
                          Posted {a.created_at ? format(new Date(a.created_at),'MMM d, yyyy') : '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Collapsed footer */}
                  {!isOpen && (
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                      <span style={{ fontSize:10, color: dark ? '#475569' : '#A0AEC0', fontFamily:'Space Grotesk,sans-serif' }}>
                        {a.created_at ? format(new Date(a.created_at),'MMM d, yyyy') : ''}
                      </span>
                      <span style={{
                        fontSize:10, fontWeight:700, color: dark ? '#60A5FA' : '#C53030',
                        fontFamily:'Space Grotesk,sans-serif', letterSpacing:'.5px', textTransform:'uppercase',
                        display:'flex', alignItems:'center', gap:4,
                      }}>
                        Tap to expand <span style={{ fontSize:12 }}>↓</span>
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
    Advisory: ['#FBBF24','rgba(251,191,36,.12)'], News: ['#60A5FA','rgba(96,165,250,.12)'],
    Events: ['#34D399','rgba(52,211,153,.12)'], Event: ['#34D399','rgba(52,211,153,.12)'],
    Governance: ['#A78BFA','rgba(167,139,250,.12)'], General: ['#94A3B8','rgba(148,163,184,.12)'],
    Emergency: ['#F87171','rgba(248,113,113,.12)'], 'Training & Workshop': ['#C084FC','rgba(192,132,252,.12)'],
    Sports: ['#38BDF8','rgba(56,189,248,.12)'], Notice: ['#FCD34D','rgba(252,211,77,.12)'],
  }
  const cat = ann.type || ann.category || 'General'
  const [cc, cbg] = catColors[cat] || catColors.General
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#0D1F3C', borderRadius:20, maxWidth:540, width:'100%', maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,.8)', border:'1px solid rgba(212,175,55,.15)', animation:'fadeSlideIn .25s ease' }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'flex-start', gap:12, background:'linear-gradient(135deg, rgba(26,54,93,.9), rgba(10,25,60,.9))' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ padding:'3px 10px', borderRadius:20, background:cbg, color:cc, fontSize:10, fontWeight:800, fontFamily:'Space Grotesk,sans-serif', border:`1px solid ${cc}30` }}>{cat}</span>
              {ann.created_at && <span style={{ fontSize:10, color:'rgba(255,255,255,.35)', fontFamily:'Space Grotesk,sans-serif' }}>{new Date(ann.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>}
            </div>
            <h3 style={{ fontSize:17, fontWeight:800, color:'white', margin:0, lineHeight:1.3, fontFamily:'Sora,sans-serif' }}>{ann.title}</h3>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.1)', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><X size={15}/></button>
        </div>
        <div style={{ padding:'18px 22px', overflowY:'auto', flex:1 }}>
          {[ann.date_time && ['📅 Date', new Date(ann.date_time).toLocaleDateString('en-PH',{weekday:'short',month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})],
            ann.location && ['📍 Location', ann.location],
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
              <span style={{ fontSize:10, color:'rgba(255,255,255,.4)', width:80, flexShrink:0, fontFamily:'Space Grotesk,sans-serif' }}>{label}</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,.8)', fontFamily:'Space Grotesk,sans-serif' }}>{val}</span>
            </div>
          ))}
          {ann.content && (
            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.75)', lineHeight:1.8, margin:0, fontFamily:'DM Sans,sans-serif', whiteSpace:'pre-wrap' }}>{ann.content}</p>
            </div>
          )}
        </div>
        <div style={{ padding:'12px 22px', borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={() => { onClose(); onViewAll() }}
            style={{ padding:'9px 18px', borderRadius:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.7)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Space Grotesk,sans-serif' }}>
            View All
          </button>
          <button onClick={onClose}
            style={{ padding:'9px 22px', borderRadius:10, background:'rgba(212,175,55,.15)', border:'1px solid rgba(212,175,55,.3)', color:'#D4AF37', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Space Grotesk,sans-serif' }}>
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
  // ── Stale-while-revalidate: seed from localStorage for instant first paint ──
  const [announcements, setAnns]      = useState(() => readCache(CACHE_KEYS.announcements) ?? [])
  const [selectedAnn,   setSelectedAnn]   = useState(null)
  const [projects,      setProjects]   = useState(() => readCache(CACHE_KEYS.projects)      ?? [])
  const [selectedProject, setSelectedProject] = useState(null)
  const [events,        setEvents]     = useState(() => readCache(CACHE_KEYS.events)         ?? [])
  // If all three caches are warm, skip the skeleton immediately
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
  const BASE = dark ? DARK : LIGHT
  const T = {
    ...BASE,
    navy:   siteSettings.primaryColor || BASE.navy,
    gold:   siteSettings.accentColor  || BASE.gold,
    navyLt: siteSettings.primaryLt    || '#2A4A7F',
    footerBg: dark ? BASE.footerBg : (siteSettings.primaryColor || BASE.footerBg),
  }
  const SITE_LOGO = siteSettings.logoUrl || '/SK_Logo.png'

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
      supabase.from('projects').select('*').order('created_at', { ascending:false })
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
      .on('postgres_changes', { event:'*', schema:'public', table:'projects' }, () => {
        supabase.from('projects').select('*').order('completion_date',{ascending:false}).order('created_at',{ascending:false})
          .then(({ data }) => { if (data) { setProjects(data); writeCache(CACHE_KEYS.projects, data) } })
      }).subscribe()

    const annsSub = supabase.channel('dashboard-announcements')
      .on('postgres_changes', { event:'*', schema:'public', table:'announcements' }, () => {
        supabase.from('announcements').select('*').order('created_at',{ascending:false})
          .then(({ data }) => { if (data) { setAnns(data); writeCache(CACHE_KEYS.announcements, data) } })
      }).subscribe()

    const eventsSub = supabase.channel('dashboard-events')
      .on('postgres_changes', { event:'*', schema:'public', table:'events' }, () => {
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
      // Network failure — cached data already in state, just unblock the UI
      console.warn('[SK Portal] loadData error, using cache:', err)
    } finally {
      // Always mark as loaded so the UI never stays stuck on skeletons
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
        const key2d = ev.id + '_2d'; const key1h = ev.id + '_1h'
        if (diffMs > 0 && diffMs <= 2*86400000 && !evNotifDone[key2d]) {
          const days = Math.ceil(diffMs / 86400000)
          toast(`🔔 Reminder: "${ev.title}" is in ${days} day${days>1?'s':''}!`, 'info')
          setEvNotifDone(p => ({...p, [key2d]:true}))
        }
        if (diffMs > 0 && diffMs <= 3600000 && !evNotifDone[key1h]) {
          const mins = Math.ceil(diffMs / 60000)
          toast(`⚡ Starting soon: "${ev.title}" in ${mins} min!`, 'warning')
          setEvNotifDone(p => ({...p, [key1h]:true}))
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
      const { data: todayFb } = await supabase.from('feedback').select('id').eq('user_id', user.id)
        .gte('created_at', today+'T00:00:00').lte('created_at', today+'T23:59:59')
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
    if (end && clock >= end) return { label:'Event has ended', color:'#718096', bg:'#F7FAFC' }
    if (diffMs < 0) return { label:'Event is ongoing', color:'#166534', bg:'#F0FFF4' }
    const diffD = Math.floor(diffMs/86400000); const diffH = Math.floor(diffMs/3600000); const diffM = Math.floor(diffMs/60000)
    if (diffD===0&&diffH===0) return { label:`${diffM}m remaining`, color:'#C53030', bg:'#FFF5F5' }
    if (diffD===0) return { label:`${diffH}h remaining`, color:'#D97706', bg:'#FEF9E7' }
    if (diffD===1) return { label:'Tomorrow!', color:'#D97706', bg:'#FEF9E7' }
    if (diffD<=2) return { label:'Event is today!', color:'#C53030', bg:'#FFF5F5' }
    return { label:`${diffD} days remaining`, color:T.navy, bg:'#EBF8FF' }
  }

  const eventsOnDate = d => events.filter(ev => { try { return isSameDay(parseISO(ev.start_date||ev.created_at), d) } catch { return false } })

  const YEAR = new Date().getFullYear()
  const MONTHS = Array.from({length:12},(_,i) => new Date(YEAR,i,1))
  const SLIDES = [MONTHS.slice(0,4), MONTHS.slice(4,8), MONTHS.slice(8,12)]
  const SLIDE_LABELS = [`January – April ${YEAR}`, `May – August ${YEAR}`, `September – December ${YEAR}`]
  const months = SLIDES[calSlide] || SLIDES[0]
  const eventsInRange = events.filter(ev => { try { const d=parseISO(ev.start_date||ev.created_at); return months.some(m=>d.getFullYear()===m.getFullYear()&&d.getMonth()===m.getMonth()) } catch { return false } })

  const sty = {
    page: { height:'100vh', overflow:'hidden', background: dark ? '#050D1E' : '#0D1E3C', color:T.text, fontFamily:"'DM Sans',sans-serif", display:'flex' },
    section: { padding:'56px 32px', background: dark ? 'rgba(7,19,42,0.0)' : 'rgba(238,244,255,0.0)' },
    secAlt: { padding:'56px 32px', background: dark ? 'rgba(7,19,42,0.0)' : 'rgba(238,244,255,0.0)' },
    h2: { fontSize:28, fontWeight:800, color:T.navy, textAlign:'center', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8, fontFamily:'Sora,sans-serif' },
    sub: { fontSize:14, color:T.textMuted, textAlign:'center', maxWidth:480, margin:'0 auto' },
    card: { background:T.surface, backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:12, border:`1px solid ${T.border}`, padding:20 },
  }

  const NAV_ITEMS = [
    { label:'Home',          Icon:Home,          page:'home' },
    { label:'Announcements', Icon:Megaphone,      page:'announcements' },
    { label:'Projects',      Icon:FolderOpen,     page:'projects' },
    { label:'Events',        Icon:Calendar,       page:'events' },
    { label:'Feedback',      Icon:MessageSquare,  page:'feedback' },
  ]

  /* ── Shared page footer ── */
  const PageFooter = () => (
    <footer style={{
      flexShrink: 0,
      background: dark ? '#070E1C' : '#1A365D',
      borderTop: dark ? '1px solid rgba(212,175,55,.12)' : '1px solid rgba(255,255,255,.1)',
      padding: '20px 32px',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      {/* Left: logo + name */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <img src={SITE_LOGO} alt="SK Logo" style={{ width:32, height:32, objectFit:'contain', flexShrink:0 }}/>
        <div>
          <p style={{ margin:0, fontSize:11, fontWeight:800, color:'white', letterSpacing:'1px', textTransform:'uppercase', fontFamily:'Sora,sans-serif', lineHeight:1.2 }}>Bakakeng Central</p>
          <p style={{ margin:0, fontSize:9, color:'rgba(212,175,55,.55)', letterSpacing:'1px', textTransform:'uppercase', fontFamily:'Space Grotesk,sans-serif' }}>Sangguniang Kabataan</p>
        </div>
      </div>
      {/* Center: copyright */}
      <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.6px', fontFamily:'Space Grotesk,sans-serif', textAlign:'center' }}>
        © 2026 Barangay Bakakeng Central. All Rights Reserved.
      </p>
      {/* Right: socials */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <a href="https://facebook.com/SK.BakakengCentral" target="_blank" rel="noreferrer"
          style={{ width:30, height:30, borderRadius:8, background:'rgba(24,119,242,.15)', border:'1px solid rgba(24,119,242,.25)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', transition:'transform .15s' }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </a>
        <a href="mailto:skbakakengcentral@gmail.com"
          style={{ width:30, height:30, borderRadius:8, background:'rgba(234,67,53,.1)', border:'1px solid rgba(234,67,53,.2)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', transition:'transform .15s' }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          <svg width="14" height="11" viewBox="0 0 24 18" fill="none"><path d="M22 0H2C.9 0 0 .9 0 2v14c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2zm0 4l-10 6L2 4V2l10 6 10-6v2z" fill="#EA4335"/></svg>
        </a>
      </div>
    </footer>
  )

  /* ── STATIC ANNOUNCEMENT CARDS (right sidebar) ── */
  const STATIC_ANNS = [
    { id:'s1', type:'Advisory', icon:<Heart size={13}/>, color:'#FBBF24', bg:'rgba(251,191,36,.12)', bar:'#FBBF24', date:'Mar 2026', title:'Health Tips for the Community', content:'Free medical consultation every Saturday.' },
    { id:'s2', type:'News', icon:<Activity size={13}/>, color:'#60A5FA', bg:'rgba(96,165,250,.12)', bar:'#60A5FA', date:'Mar 2026', title:'Skills Training Program Now Open', content:'Register now for the livelihood training.' },
    { id:'s3', type:'Events', icon:<Award size={13}/>, color:'#34D399', bg:'rgba(52,211,153,.12)', bar:'#34D399', date:'Mar 2026', title:'Basketball League — Grand Finals', content:'Watch the championship game this weekend.' },
    { id:'s4', type:'Governance', icon:<Users size={13}/>, color:'#A78BFA', bg:'rgba(167,139,250,.12)', bar:'#A78BFA', date:'Mar 2026', title:'SK Budget Report Released', content:'Transparency report for Q1 2026 is now available.' },
  ]

  /* Merge: real announcements first (up to 4), fill with static if fewer than 4 */
  const annCards = dataLoaded
    ? announcements.slice(0, 4).length > 0
      ? announcements.slice(0, 4).map(a => ({
          id: a.id, type: a.type||a.category||'General', real: a,
          color: ({ Advisory:'#FBBF24', News:'#60A5FA', Events:'#34D399', Event:'#34D399', Governance:'#A78BFA', Emergency:'#F87171', Sports:'#38BDF8', General:'#94A3B8' }[a.type||a.category]||'#94A3B8'),
          bg: ({ Advisory:'rgba(251,191,36,.12)', News:'rgba(96,165,250,.12)', Events:'rgba(52,211,153,.12)', Event:'rgba(52,211,153,.12)', Governance:'rgba(167,139,250,.12)', Emergency:'rgba(248,113,113,.12)', Sports:'rgba(56,189,248,.12)', General:'rgba(148,163,184,.12)' }[a.type||a.category]||'rgba(148,163,184,.12)'),
          bar: ({ Advisory:'#FBBF24', News:'#60A5FA', Events:'#34D399', Event:'#34D399', Governance:'#A78BFA', Emergency:'#F87171', Sports:'#38BDF8', General:'#94A3B8' }[a.type||a.category]||'#94A3B8'),
          date: a.created_at ? new Date(a.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '',
          title: a.title, content: a.content,
          icon: <Megaphone size={13}/>,
        }))
      : STATIC_ANNS
    : null

  const accomplishedProjects = projects.filter(p => {
    const s = (p.status||'').toLowerCase().trim()
    return s==='accomplished'||s==='completed'||s==='done'
  })

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div style={sty.page}>
      <style>{GLOBAL_CSS}</style>

      {/* ── MOBILE OVERLAY ── */}
      {isMobile && mobileSidebar && (
        <div onClick={() => setMobileSidebar(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:299, backdropFilter:'blur(2px)' }}/>
      )}

      {/* ══════════ LEFT SIDEBAR (260px fixed) ══════════ */}
      <div style={{
        width: 260, flexShrink:0,
        background: dark
          ? 'linear-gradient(180deg, rgba(7,19,42,0.97) 0%, rgba(10,26,56,0.96) 60%, rgba(7,16,32,0.98) 100%)'
          : 'linear-gradient(180deg, rgba(7,19,42,0.82) 0%, rgba(10,26,56,0.78) 60%, rgba(7,16,32,0.85) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        display:'flex', flexDirection:'column',
        borderRight: '1px solid rgba(212,175,55,.12)',
        zIndex:300,
        position: isMobile ? 'fixed' : 'relative',
        top:0, left:0, bottom:0, height:'100vh',
        transform: isMobile ? (mobileSidebar ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        boxShadow: isMobile && mobileSidebar ? '8px 0 40px rgba(0,0,0,.5)' : '4px 0 24px rgba(0,0,0,0.3)',
      }}>
        {/* Logo area */}
        <div style={{ padding:'22px 20px 18px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, overflow:'hidden', flexShrink:0, background:'rgba(212,175,55,.1)', border:'1px solid rgba(212,175,55,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src={SITE_LOGO} alt="SK" style={{ width:34, height:34, objectFit:'contain' }}/>
            </div>
            <div>
              <p style={{ color:'white', fontSize:10, fontWeight:800, letterSpacing:'.8px', margin:0, fontFamily:'Sora,sans-serif', lineHeight:1.2 }}>BAKAKENG CENTRAL</p>
              <p style={{ color:'rgba(212,175,55,.6)', fontSize:8, letterSpacing:'1px', textTransform:'uppercase', margin:0, fontFamily:'Space Grotesk,sans-serif' }}>Sangguniang Kabataan</p>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setMobileSidebar(false)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.5)', padding:4 }}>
              <X size={18}/>
            </button>
          )}
        </div>

        {/* User chip */}
        <div style={{ margin:'14px 16px', padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#C53030,#9B2C2C)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, fontWeight:800, flexShrink:0, fontFamily:'Sora,sans-serif' }}>
            {(profile?.name||user?.email||'R')[0].toUpperCase()}
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ color:'white', fontSize:12, fontWeight:700, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'Sora,sans-serif' }}>{profile?.name||'Resident'}</p>
            <p style={{ color:'rgba(255,255,255,.35)', fontSize:9, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'Space Grotesk,sans-serif' }}>{user?.email}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, padding:'4px 12px', overflowY:'auto' }}>
          <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.25)', textTransform:'uppercase', letterSpacing:'1.5px', margin:'6px 4px 8px', fontFamily:'Space Grotesk,sans-serif' }}>Navigation</p>
          {NAV_ITEMS.map(({ label, Icon, page }) => {
            const isActive = activePage === page
            return (
              <button key={label} className="sk-nav-item"
                onClick={() => { setActivePage(page); if (isMobile) setMobileSidebar(false) }}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                  width:'100%', borderRadius:10, border: isActive ? '1px solid rgba(212,175,55,.2)' : '1px solid transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,.5)',
                  background: isActive ? 'linear-gradient(135deg,rgba(212,175,55,.15),rgba(212,175,55,.05))' : 'transparent',
                  fontSize:13, fontFamily:'DM Sans,sans-serif', fontWeight: isActive ? 700 : 400,
                  marginBottom:3, cursor:'pointer', textAlign:'left',
                  boxShadow: isActive ? '0 2px 12px rgba(212,175,55,.1)' : 'none',
                  transition: 'none',
                }}>
                <div style={{ width:30, height:30, borderRadius:8, background: isActive ? 'rgba(212,175,55,.15)' : 'rgba(255,255,255,.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={15} style={{ color: isActive ? '#D4AF37' : 'rgba(255,255,255,.5)' }}/>
                </div>
                <span>{label}</span>
                {isActive && <div style={{ marginLeft:'auto', width:5, height:5, borderRadius:'50%', background:'#D4AF37' }}/>}
              </button>
            )
          })}
        </nav>

        {/* Bottom controls */}
        <div style={{ padding:'12px 12px 20px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
          {/* Dark mode toggle */}
          <button onClick={() => setDark(d => !d)}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px', borderRadius:10, border:'none', background:'none', cursor:'pointer', color:'rgba(255,255,255,.45)', fontSize:12, fontFamily:'DM Sans,sans-serif', marginBottom:3, transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='white' }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='rgba(255,255,255,.45)' }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,.05)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {dark ? <Sun size={13}/> : <Moon size={13}/>}
            </div>
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* Settings */}
          <button onClick={() => navigate('/settings')}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px', borderRadius:10, border:'none', background:'none', cursor:'pointer', color:'rgba(255,255,255,.45)', fontSize:12, fontFamily:'DM Sans,sans-serif', marginBottom:3, transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='white' }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='rgba(255,255,255,.45)' }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,.05)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Settings size={13}/>
            </div>
            Settings
          </button>

          {/* Logout */}
          <button onClick={() => setLogout(true)}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px', borderRadius:10, border:'none', background:'none', cursor:'pointer', color:'rgba(239,68,68,.7)', fontSize:12, fontFamily:'DM Sans,sans-serif', transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.08)'; e.currentTarget.style.color='#F87171' }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='rgba(239,68,68,.7)' }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'rgba(239,68,68,.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <LogOut size={13}/>
            </div>
            Log Out
          </button>
        </div>
      </div>

      {/* ══════════ MAIN CONTENT AREA ══════════ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* ── Page switch ── */}
        <div style={{ flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>

          {/* ══ GLOBAL BACKGROUND — shared by ALL pages ══ */}
          <div style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none' }}>

            {/* ── DARK MODE ── */}
            {dark && <>
              <div style={{ position:'absolute', inset:0, background:'#050D1E' }}/>
              <div style={{
                position:'absolute', inset:0,
                backgroundImage:"url('/login-bg.png')",
                backgroundSize:'cover', backgroundPosition:'center',
                backgroundRepeat:'no-repeat',
                opacity: 0.55,
              }}/>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(5,13,30,0.82) 0%, rgba(8,20,48,0.72) 40%, rgba(5,12,28,0.86) 100%)' }}/>
              <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)' }}/>
            </>}

            {/* ── LIGHT MODE: bg image fully visible, thin overlay, glassmorphism cards ── */}
            {!dark && <>
              {/* Raw background image — no blur, full presence */}
              <div style={{
                position:'absolute', inset:0,
                backgroundImage:"url('/login-bg.png')",
                backgroundSize:'cover', backgroundPosition:'center',
                backgroundRepeat:'no-repeat',
                backgroundAttachment:'fixed',
              }}/>
              {/* Very thin dark navy tint — just enough to deepen contrast without hiding image */}
              <div style={{
                position:'absolute', inset:0,
                background:'linear-gradient(160deg, rgba(8,20,55,0.38) 0%, rgba(10,25,65,0.28) 50%, rgba(6,16,42,0.42) 100%)',
              }}/>
            </>}
          </div>

          {/* ════════ HOME PAGE ════════ */}
          {activePage === 'home' && (
          <div className={dark ? 'dark' : ''} style={{ flex:1, display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', position:'relative', zIndex:1, fontFamily:"'Sora','DM Sans',sans-serif" }}>

            {/* ── TOP STRIP: day/date left · bell right ── */}
            <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px 0', flexShrink:0 }}>

              {/* Left: mobile hamburger OR live day + date */}
              {isMobile ? (
                <button onClick={() => setMobileSidebar(o => !o)}
                  style={{ width:38, height:38, borderRadius:10, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.22)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white', backdropFilter:'blur(8px)' }}>
                  <Menu size={18}/>
                </button>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                  <p style={{ margin:0, fontSize:10, fontWeight:700, color:'rgba(251,191,36,.9)', letterSpacing:'2.5px', textTransform:'uppercase', fontFamily:'Space Grotesk,sans-serif', lineHeight:1, textShadow:'0 1px 4px rgba(0,0,0,0.4)' }}>
                    {clock.toLocaleDateString('en-US', { weekday:'long' })}
                  </p>
                  <p style={{ margin:0, fontSize:13, fontWeight:600, color:'rgba(255,255,255,.75)', fontFamily:'Space Grotesk,sans-serif', letterSpacing:'.3px', lineHeight:1.4, textShadow:'0 1px 4px rgba(0,0,0,0.4)' }}>
                    {clock.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                  </p>
                </div>
              )}

              {/* Bell notification */}
              <div ref={notifRef} style={{ position:'relative' }}>
                <button onClick={() => setShowNotifs(n => !n)}
                  style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.22)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white', backdropFilter:'blur(8px)', transition:'all .15s', position:'relative' }}>
                  <Bell size={17}/>
                  {(() => {
                    const cnt = events.filter(ev => { if (!ev.start_date||(ev.status||'').toLowerCase()==='cancelled') return false; const d=new Date(ev.start_date)-clock; return d>0&&d<=2*86400000 }).length + announcements.length
                    return cnt > 0 ? (
                      <span style={{ position:'absolute', top:-5, right:-5, minWidth:18, height:18, background:'#EF4444', borderRadius:9, color:'white', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', border:'2px solid rgba(0,0,0,0.3)' }}>{Math.min(cnt,9)}</span>
                    ) : null
                  })()}
                </button>

                {showNotifs && (
                  <div style={{ position:'absolute', right:0, top:50, width:310, background: dark ? 'rgba(15,23,42,.97)' : 'rgba(10,20,50,.88)', border:'1px solid rgba(255,255,255,.15)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,.6)', zIndex:500, overflow:'hidden', backdropFilter:'blur(24px) saturate(180%)' }}>
                    <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <p style={{ fontWeight:800, fontSize:13, color:'white', margin:0, fontFamily:'Sora,sans-serif' }}>Notifications</p>
                      <button onClick={() => setShowNotifs(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.5)', cursor:'pointer', padding:2 }}><X size={14}/></button>
                    </div>
                    <div style={{ maxHeight:270, overflowY:'auto' }}>
                      {announcements.slice(0,5).map(a => (
                        <div key={a.id}
                          onClick={() => { setShowNotifs(false); setSelectedAnn(a) }}
                          style={{ padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer', transition:'background .15s' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <div style={{ width:30, height:30, borderRadius:8, background: dark ? 'rgba(214,158,46,.12)' : 'rgba(214,158,46,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>📢</div>
                          <p style={{ fontSize:12, fontWeight:600, color: dark ? 'rgba(255,255,255,.85)' : '#2D3748', margin:0, lineHeight:1.5, fontFamily:'DM Sans,sans-serif', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.title}</p>
                        </div>
                      ))}
                      {announcements.length === 0 && <p style={{ padding:'22px', color: dark ? 'rgba(255,255,255,.3)' : '#A0AEC0', fontSize:12, textAlign:'center', margin:0 }}>No new notifications.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── 3-COLUMN GRID ── */}
            <div style={{ position:'relative', zIndex:5, flex:1, display:'flex', gap:0, overflow:'hidden', padding:'10px 18px 0', animation:'fadeSlideIn .35s ease' }}>

              {/* ═══ CENTER MAIN CONTENT ═══ */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16, overflowY:'auto', paddingRight: isMobile ? 0 : 16, paddingBottom:16, minWidth:0 }}>

                {/* ── Portal greeting header ── */}
                <div style={{ paddingTop:4, flexShrink:0 }}>
                  <p style={{ fontSize:10, fontWeight:700, color: dark ? 'rgba(251,191,36,.7)' : 'rgba(251,191,36,.9)', letterSpacing:'3px', textTransform:'uppercase', margin:'0 0 5px', fontFamily:'Space Grotesk,sans-serif', textShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,0.5)' }}>
                    SANGGUNIANG KABATAAN — BAKAKENG CENTRAL
                  </p>
                  <h1 style={{ fontSize: isMobile ? 17 : 22, fontWeight:900, color: 'white', margin:0, lineHeight:1.2, fontFamily:'Sora,sans-serif', textTransform:'uppercase', letterSpacing:'.3px', textShadow:'0 2px 12px rgba(0,0,0,0.5)' }}>
                    WELCOME TO THE SK PORTAL OF{' '}
                    <span style={{ color:'#F6CF56', textShadow:'0 0 40px rgba(246,207,86,.4)' }}>
                      BARANGAY BAKAKENG CENTRAL!
                    </span>
                  </h1>
                </div>

                {/* ── HERO: Accomplished Projects Carousel ── */}
                <AccomplishedCarousel
                  projects={accomplishedProjects}
                  onSelect={setSelectedProject}
                  isMobile={isMobile}
                  siteSettings={siteSettings}
                  isLoading={!dataLoaded}
                  dark={dark}
                />

                {/* ── EVENTS — Current Month, 2-col glassmorphism grid ── */}
                <div style={{ flexShrink:0 }}>
                  {(() => {
                    const now = new Date()
                    const thisYear = now.getFullYear(); const thisMonth = now.getMonth()

                    if (!dataLoaded) return (
                      <>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                          <div style={{ width:3, height:16, borderRadius:2, background: dark ? 'linear-gradient(#F6CF56,#D4AF37)' : 'linear-gradient(#D69E2E,#C53030)', flexShrink:0 }}/>
                          <div className="sk-skeleton" style={{ width:200, height:14 }}/>
                        </div>
                        <div className="sk-events-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                          {[0,1].map(i => <div key={i} className="sk-skeleton" style={{ borderRadius:14, height:160 }}/>)}
                        </div>
                      </>
                    )

                    const monthEvents = events.filter(ev => {
                      if ((ev.status||'').toLowerCase() === 'cancelled') return false
                      if (!ev.start_date) return false
                      try { const d = new Date(ev.start_date); return d.getFullYear()===thisYear && d.getMonth()===thisMonth } catch { return false }
                    })
                    const monthLabel = now.toLocaleDateString('en-US', { month:'long', year:'numeric' })

                    /* status colour maps — use bright colors for both modes over dark bg */
                    const sMapDark  = { upcoming:{bg:'rgba(245,158,11,.15)',color:'#FBBF24',border:'rgba(245,158,11,.3)',label:'Upcoming'}, ongoing:{bg:'rgba(16,185,129,.15)',color:'#34D399',border:'rgba(16,185,129,.3)',label:'Ongoing'}, finished:{bg:'rgba(100,116,139,.15)',color:'#94A3B8',border:'rgba(100,116,139,.3)',label:'Finished'}, planning:{bg:'rgba(139,92,246,.15)',color:'#A78BFA',border:'rgba(139,92,246,.3)',label:'Planning'} }
                    const sMapLight = { upcoming:{bg:'rgba(245,158,11,.2)',color:'#FCD34D',border:'rgba(245,158,11,.4)',label:'Upcoming'}, ongoing:{bg:'rgba(16,185,129,.2)',color:'#6EE7B7',border:'rgba(16,185,129,.35)',label:'Ongoing'}, finished:{bg:'rgba(148,163,184,.18)',color:'#E2E8F0',border:'rgba(148,163,184,.35)',label:'Finished'}, planning:{bg:'rgba(139,92,246,.18)',color:'#C4B5FD',border:'rgba(139,92,246,.35)',label:'Planning'} }
                    const sMap = dark ? sMapDark : sMapLight

                    return (
                      <>
                        {/* Section header */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:3, height:16, borderRadius:2, background:'linear-gradient(#F6CF56,#D4AF37)', flexShrink:0 }}/>
                            <h3 style={{ fontSize:13, fontWeight:800, color:'white', margin:0, fontFamily:'Sora,sans-serif', textTransform:'uppercase', letterSpacing:'1px', textShadow:'0 1px 6px rgba(0,0,0,0.4)' }}>
                              Events — {monthLabel}
                            </h3>
                            {monthEvents.length > 0 && (
                              <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:10, background:'rgba(246,207,86,.15)', color:'#F6CF56', border:'1px solid rgba(246,207,86,.3)' }}>
                                {monthEvents.length}
                              </span>
                            )}
                          </div>
                          <button onClick={() => setActivePage('events')}
                            style={{ fontSize:10, color:'rgba(246,207,86,.85)', background:'none', border:'none', cursor:'pointer', fontWeight:700, fontFamily:'Space Grotesk,sans-serif', letterSpacing:'.5px' }}>
                            VIEW ALL →
                          </button>
                        </div>

                        {monthEvents.length === 0 ? (
                          <div style={{ borderRadius:16, background: dark ? 'rgba(255,255,255,.03)' : 'rgba(26,54,93,.04)', border: dark ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(26,54,93,.1)', padding:'28px', textAlign:'center', color: dark ? 'rgba(255,255,255,.3)' : '#718096', fontSize:12, fontFamily:'DM Sans,sans-serif', backdropFilter:'blur(12px)' }}>
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
                                    borderRadius:16, overflow:'hidden',
                                    background: dark ? 'rgba(30,41,59,.60)' : 'rgba(255,255,255,.14)',
                                    border: dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(255,255,255,.32)',
                                    boxShadow: dark ? '0 4px 24px rgba(0,0,0,.35)' : '0 8px 32px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.2)',
                                    backdropFilter:'blur(18px) saturate(160%)',
                                    WebkitBackdropFilter:'blur(18px) saturate(160%)',
                                  }}>
                                  {/* Thumbnail */}
                                  <div style={{ height:110, position:'relative', overflow:'hidden' }}>
                                    <img src={imgUrl} alt={ev.title} onError={e=>e.target.src='/Hero.png'}
                                      style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.7)', display:'block' }}/>
                                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(5,12,30,.85),transparent 55%)' }}/>
                                    <span style={{ position:'absolute', top:8, left:10, padding:'3px 9px', borderRadius:20, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'1px', fontFamily:'Space Grotesk,sans-serif', backdropFilter:'blur(4px)' }}>
                                      {sc.label}
                                    </span>
                                  </div>
                                  {/* Body */}
                                  <div style={{ padding:'10px 13px 13px' }}>
                                    <p style={{ fontSize:13, fontWeight:700, color:'white', lineHeight:1.35, margin:'0 0 6px', fontFamily:'Sora,sans-serif', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', textShadow:'0 1px 4px rgba(0,0,0,0.4)' }}>{ev.title}</p>
                                    {startDate && (
                                      <p style={{ fontSize:10, color:'rgba(255,255,255,.65)', margin:'0 0 3px', fontFamily:'Space Grotesk,sans-serif', display:'flex', alignItems:'center', gap:4 }}>
                                        <span style={{ color:'#F6CF56' }}>📅</span>
                                        {startDate.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                                        {' · '}{startDate.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                                      </p>
                                    )}
                                    {ev.location && <p style={{ fontSize:10, color:'rgba(255,255,255,.5)', margin:0, fontFamily:'Space Grotesk,sans-serif', display:'flex', alignItems:'center', gap:4 }}>📍 {ev.location}</p>}
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

              {/* ═══ RIGHT SIDEBAR (320px) — glassmorphism ═══ */}
              <div className="sk-right-sidebar" style={{ width:320, flexShrink:0, display:'flex', flexDirection:'column', gap:14, overflowY:'auto', paddingBottom:16 }}>

                {/* Latest Announcements card */}
                <div style={{
                  background: dark ? 'rgba(30,41,59,.65)' : 'rgba(255,255,255,.15)',
                  borderRadius:18,
                  border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(255,255,255,.35)',
                  overflow:'hidden',
                  backdropFilter:'blur(20px) saturate(180%)',
                  WebkitBackdropFilter:'blur(20px) saturate(180%)',
                  flexShrink:0,
                  boxShadow: dark ? 'none' : '0 8px 32px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.25)',
                }}>
                  <div style={{ padding:'14px 18px', borderBottom: dark ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(255,255,255,.18)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:3, height:16, borderRadius:2, background: dark ? 'linear-gradient(#F6CF56,#D4AF37)' : 'linear-gradient(#F6CF56,#D4AF37)' }}/>
                      <h3 style={{ fontSize:13, fontWeight:800, color: dark ? 'white' : 'white', margin:0, fontFamily:'Sora,sans-serif', textShadow: dark ? 'none' : '0 1px 4px rgba(0,0,0,0.4)' }}>Latest Announcements</h3>
                    </div>
                    <button onClick={() => setActivePage('announcements')}
                      style={{ fontSize:9, color: dark ? 'rgba(246,207,86,.65)' : 'rgba(246,207,86,.9)', background:'none', border:'none', cursor:'pointer', fontWeight:700, letterSpacing:'1px', fontFamily:'Space Grotesk,sans-serif' }}>SEE ALL →</button>
                  </div>

                  <div>
                    {!annCards ? (
                      [0,1,2,3].map(i => (
                        <div key={i} style={{ padding:'13px 18px', borderBottom: dark ? '1px solid rgba(255,255,255,.04)' : '1px solid rgba(26,54,93,.06)', display:'flex', gap:12 }}>
                          <div style={{ width:4, borderRadius:2, background: dark ? 'rgba(255,255,255,.08)' : 'rgba(26,54,93,.1)', flexShrink:0, alignSelf:'stretch' }}/>
                          <div style={{ flex:1 }}>
                            <div className="sk-skeleton" style={{ width:80, height:13, marginBottom:8 }}/>
                            <div className="sk-skeleton" style={{ width:'90%', height:13, marginBottom:6 }}/>
                            <div className="sk-skeleton" style={{ width:'60%', height:10 }}/>
                          </div>
                        </div>
                      ))
                    ) : (
                      annCards.map((card, i) => (
                        <div key={card.id} className="sk-ann-card"
                          onClick={() => card.real ? setSelectedAnn(card.real) : null}
                          style={{ padding:'13px 0 13px 18px', borderBottom: i < annCards.length-1 ? (dark ? '1px solid rgba(255,255,255,.04)' : '1px solid rgba(26,54,93,.06)') : 'none', display:'flex', alignItems:'stretch', background:'transparent' }}>
                          {/* Color bar */}
                          <div style={{ width:4, borderRadius:2, background:card.bar, flexShrink:0, marginRight:14, alignSelf:'stretch' }}/>
                          <div style={{ flex:1, paddingRight:16, minWidth:0 }}>
                            {/* Category + date */}
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, background:card.bg, color:card.color, fontSize:9, fontWeight:800, fontFamily:'Space Grotesk,sans-serif', border:`1px solid ${card.color}30` }}>
                                {card.icon} {card.type}
                              </span>
                              <span style={{ fontSize:9, color:'rgba(255,255,255,.5)', fontFamily:'Space Grotesk,sans-serif' }}>{card.date}</span>
                            </div>
                            {/* Title */}
                            <p style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.92)', lineHeight:1.4, margin:'0 0 4px', fontFamily:'Sora,sans-serif', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', textShadow:'0 1px 3px rgba(0,0,0,0.3)' }}>{card.title}</p>
                            {/* Excerpt */}
                            <p style={{ fontSize:10, color:'rgba(255,255,255,.55)', lineHeight:1.55, margin:'0 0 7px', fontFamily:'DM Sans,sans-serif', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{card.content}</p>
                            {/* Read More */}
                            <button className="sk-readmore"
                              onClick={e => { e.stopPropagation(); card.real ? setSelectedAnn(card.real) : setActivePage('announcements') }}
                              style={{ background:'none', border:'none', cursor:'pointer', fontSize:10, fontWeight:700, color:'rgba(246,207,86,.8)', fontFamily:'Space Grotesk,sans-serif', padding:0, letterSpacing:'.5px' }}>
                              Read More →
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Connect With Us card */}
                <div style={{
                  background: dark ? 'rgba(30,41,59,.65)' : 'rgba(255,255,255,.15)',
                  borderRadius:18,
                  border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(255,255,255,.35)',
                  padding:'16px 18px',
                  backdropFilter:'blur(20px) saturate(180%)',
                  WebkitBackdropFilter:'blur(20px) saturate(180%)',
                  flexShrink:0,
                  boxShadow: dark ? 'none' : '0 8px 32px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.25)',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <div style={{ width:3, height:14, borderRadius:2, background: dark ? '#60A5FA' : '#F6CF56' }}/>
                    <h3 style={{ fontSize:12, fontWeight:800, color: dark ? 'white' : 'white', margin:0, fontFamily:'Sora,sans-serif', textTransform:'uppercase', letterSpacing:'1px', textShadow: dark ? 'none' : '0 1px 4px rgba(0,0,0,0.4)' }}>Connect With Us</h3>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {/* Facebook */}
                    <a href="https://facebook.com/SK.BakakengCentral" target="_blank" rel="noreferrer" className="sk-soc-btn"
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:14, background: dark ? 'rgba(24,119,242,.1)' : 'rgba(24,119,242,.08)', border: dark ? '1px solid rgba(24,119,242,.22)' : '1px solid rgba(24,119,242,.2)', textDecoration:'none', boxShadow: dark ? '0 4px 16px rgba(0,0,0,.2)' : '0 2px 12px rgba(24,119,242,.1)' }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:'#1877F2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(24,119,242,.35)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:800, color:'white', margin:0, fontFamily:'Sora,sans-serif', textShadow:'0 1px 3px rgba(0,0,0,0.3)' }}>Facebook</p>
                        <p style={{ fontSize:10, color: dark ? 'rgba(255,255,255,.45)' : '#718096', margin:0, fontFamily:'Space Grotesk,sans-serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>/SK.BakakengCentral</p>
                      </div>
                      <ChevronRight size={14} style={{ color: dark ? 'rgba(255,255,255,.3)' : '#A0AEC0', marginLeft:'auto', flexShrink:0 }}/>
                    </a>
                    {/* Gmail */}
                    <a href="mailto:skbakakengcentral@gmail.com" className="sk-soc-btn"
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:14, background: dark ? 'rgba(234,67,53,.08)' : 'rgba(234,67,53,.06)', border: dark ? '1px solid rgba(234,67,53,.2)' : '1px solid rgba(234,67,53,.18)', textDecoration:'none', boxShadow: dark ? '0 4px 16px rgba(0,0,0,.2)' : '0 2px 12px rgba(234,67,53,.08)' }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#EA4335,#FBBC04)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(234,67,53,.3)' }}>
                        <svg width="18" height="14" viewBox="0 0 24 18" fill="white"><path d="M0 0h24v18H0z" fill="none"/><path d="M22 0H2C.9 0 0 .9 0 2v14c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2zm0 4l-10 6L2 4V2l10 6 10-6v2z"/></svg>
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:800, color:'white', margin:0, fontFamily:'Sora,sans-serif', textShadow:'0 1px 3px rgba(0,0,0,0.3)' }}>Gmail</p>
                        <p style={{ fontSize:10, color: dark ? 'rgba(255,255,255,.45)' : '#718096', margin:0, fontFamily:'Space Grotesk,sans-serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>skbakakengcentral@gmail.com</p>
                      </div>
                      <ChevronRight size={14} style={{ color: dark ? 'rgba(255,255,255,.3)' : '#A0AEC0', marginLeft:'auto', flexShrink:0 }}/>
                    </a>
                  </div>
                </div>

              </div>{/* end right sidebar */}
            </div>{/* end 3-col grid */}

            {/* ── Full-width footer ── */}
            <div style={{ position:'relative', zIndex:10, flexShrink:0 }}>
              <PageFooter/>
            </div>

          </div>
          )}{/* end home page */}


          {/* ════════ ANNOUNCEMENTS PAGE ════════ */}
          {activePage === 'announcements' && <AnnouncementsPage announcements={announcements} dark={dark} isMobile={isMobile} T={T} format={format} PageFooter={PageFooter}/>}
          {activePage === 'projects' && <ProjectsPage projects={projects} dark={dark} isMobile={isMobile} T={T} siteSettings={siteSettings} format={format} setSelectedProject={setSelectedProject} PageFooter={PageFooter}/>}

                    {/* ════════ EVENTS PAGE ════════ */}
          {activePage === 'events' && (
          <div style={{ animation:'fadeSlideIn .2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
            <section style={{ padding:'32px 36px', background:'transparent', flex:1 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
                <div>
                  <h2 style={{ fontSize:28, fontWeight:800, color:T.navy, textTransform:'uppercase', letterSpacing:'1px', margin:'0 0 4px', fontFamily:'Sora,sans-serif' }}>Community Events</h2>
                  <p style={{ fontSize:13, color:T.textMuted, margin:0 }}>Stay updated with scheduled activities in Barangay Bakakeng Central.</p>
                </div>
                <div style={{ background:T.surface2, backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:12, padding:'10px 18px', border:`1px solid ${T.border}`, textAlign:'right' }}>
                  <p style={{ fontSize:11, color:T.textMuted, margin:'0 0 2px' }}>{clock.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p>
                  <p style={{ fontSize:20, fontWeight:800, color:T.navy, margin:0, letterSpacing:'1px' }}>{clock.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</p>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection: isMobile?'column':'row', gap:24, alignItems:'flex-start', maxWidth:1200, margin:'0 auto' }}>
                {/* Calendar */}
                <div style={{ flex:'2 1 0', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:8 }}>
                    <button onClick={() => setCalSlide(s => Math.max(0,s-1))} disabled={calSlide===0}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9, border:`1.5px solid ${T.border}`, background:calSlide===0?T.surface2:T.surface, color:calSlide===0?T.textMuted:T.navy, cursor:calSlide===0?'not-allowed':'pointer', fontSize:12, fontWeight:700, transition:'all .15s', opacity:calSlide===0?.45:1 }}>
                      <ChevronLeft size={14}/> Prev
                    </button>
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontSize:14, fontWeight:800, color:T.navy, margin:0, textTransform:'uppercase', letterSpacing:'.5px' }}>{SLIDE_LABELS[calSlide]}</p>
                      <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:6 }}>
                        {[0,1,2].map(i => <button key={i} onClick={() => setCalSlide(i)} style={{ width:calSlide===i?20:8, height:8, borderRadius:4, border:'none', padding:0, background:calSlide===i?T.navy:T.border, cursor:'pointer', transition:'all .2s' }}/>)}
                      </div>
                    </div>
                    <button onClick={() => setCalSlide(s => Math.min(2,s+1))} disabled={calSlide===2}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9, border:`1.5px solid ${T.border}`, background:calSlide===2?T.surface2:T.surface, color:calSlide===2?T.textMuted:T.navy, cursor:calSlide===2?'not-allowed':'pointer', fontSize:12, fontWeight:700, transition:'all .15s', opacity:calSlide===2?.45:1 }}>
                      Next <ChevronRight size={14}/>
                    </button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(2,1fr)', gap:12, overflow:'visible' }}>
                    {months.map(m => <CalGrid key={m.toString()} month={m} events={events} T={T} selectedDate={selectedDate} onDateClick={d => { setSelectedDate(d); const evs=eventsOnDate(d); setSelectedEv(evs[0]||null) }}/>)}
                  </div>
                </div>

                {/* Event detail/list */}
                <div style={{ flex:'0 0 300px', minWidth: isMobile?'100%':280, maxWidth: isMobile?'100%':320 }}>
                  {selectedEv ? (
                    <EventDetailPanel ev={selectedEv} clock={clock} evCountdown={evCountdown} T={T} onClose={() => { setSelectedEv(null); setSelectedDate(null) }}/>
                  ) : (
                    <div style={{ background:T.surface, backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:16, border:`1px solid ${T.border}`, overflow:'hidden' }}>
                      <div style={{ padding:'14px 16px', background:`linear-gradient(135deg,${T.navy},#2A4A7F)` }}>
                        <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 2px' }}>All Events</p>
                        <p style={{ fontSize:15, fontWeight:800, color:'white', margin:0 }}>{events.filter(ev=>(ev.status||'').toLowerCase()!=='completed').length} upcoming</p>
                      </div>
                      <div style={{ maxHeight: isMobile?'none':480, overflowY:'auto' }}>
                        {events.filter(ev=>(ev.status||'').toLowerCase()!=='completed').sort((a,b)=>new Date(a.start_date||0)-new Date(b.start_date||0)).map((ev,idx) => {
                          const cd = evCountdown(ev)
                          const sc = {upcoming:{bg:'#DBEAFE',color:'#1D4ED8'},ongoing:{bg:'#DCFCE7',color:'#166534'},planning:{bg:'#EBF8FF',color:T.navy},cancelled:{bg:'#FEE2E2',color:'#DC2626'}}[(ev.status||'').toLowerCase()]||{bg:'#F3F4F6',color:'#718096'}
                          return (
                            <div key={ev.id} onClick={() => setSelectedEv(ev)}
                              style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, cursor:'pointer', transition:'background .15s', background:idx%2===0?T.surface:T.surface2 }}
                              onMouseEnter={e=>e.currentTarget.style.background=`${T.navy}10`}
                              onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?T.surface:T.surface2}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                                <p style={{ fontSize:11, fontWeight:700, color:T.textMuted, margin:0 }}>📅 {ev.start_date?new Date(ev.start_date).toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric',year:'numeric'}):'—'}</p>
                                <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:20, ...sc, textTransform:'capitalize' }}>{ev.status||'upcoming'}</span>
                              </div>
                              <p style={{ fontSize:13, fontWeight:700, color:T.navy, margin:'0 0 3px', lineHeight:1.3 }}>{ev.title}</p>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                {cd?<span style={{ fontSize:10, fontWeight:600, color:cd.color }}>⏱ {cd.label}</span>:<span style={{ fontSize:10, color:T.textMuted }}>{ev.location?`📍 ${ev.location}`:''}</span>}
                                <ChevronRight size={13} style={{ color:T.textMuted }}/>
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
            <section style={{ flex:1, padding: isMobile?'28px 18px':'56px 32px', background:'transparent' }}>
              <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', flexDirection: isMobile?'column':'row', gap: isMobile?24:48, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ flex:'1 1 260px', position:'relative', minHeight:320, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:260, height:260, borderRadius:'50%', background:T.surface2, position:'absolute', overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,.12)' }}>
                    <img src="/feedback.png" alt="Feedback illustration" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
                  </div>
                  <div style={{ position:'absolute', top:20, left:10, background:T.surface, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:`1px solid ${T.border}`, borderRadius:14, padding:'12px 16px', maxWidth:200, boxShadow:'0 4px 20px rgba(0,0,0,.1)' }}>
                    <div style={{ display:'flex', gap:2, marginBottom:5 }}>{[...Array(5)].map((_,i)=><Star key={i} size={11} fill={T.gold} color={T.gold}/>)}</div>
                    <p style={{ fontSize:12, color:T.text, lineHeight:1.5, fontStyle:'italic' }}>"Great service! Very responsive team."</p>
                  </div>
                  <div style={{ position:'absolute', bottom:20, right:10, background:T.navy, borderRadius:14, padding:'12px 16px', maxWidth:200, boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
                    <p style={{ fontSize:12, color:'white', lineHeight:1.5, fontStyle:'italic' }}>"Love the new digital portal. Easy to use!"</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginTop:4, fontWeight:600 }}>— Resident</p>
                  </div>
                </div>
                <div style={{ flex:'1 1 320px', minWidth:0, background:T.surface, backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:20, border:`1px solid ${T.border}`, padding:'28px 28px 24px', boxShadow: dark ? '0 8px 40px rgba(0,0,0,.45)' : '0 8px 40px rgba(26,54,93,.12)' }}>
                  <h2 style={{ ...sty.h2, textAlign:'left', marginBottom:6 }}>Share Your Feedback</h2>
                  <p style={{ fontSize:14, color:T.textMuted, marginBottom:24, lineHeight:1.6 }}>We value your opinion. Let us know how we can improve our services.</p>
                  <form onSubmit={handleFeedback}>
                    {[['Subject','text',feedback.subject,v=>setFeedback(f=>({...f,subject:v})),'What is this about?'],].map(([label,type,val,onChange,ph])=>(
                      <div key={label} style={{ marginBottom:14 }}>
                        <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>{label}</label>
                        <input type={type} style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1px solid ${T.border}`, background:T.surface2, color:T.text, fontSize:13, outline:'none' }} value={val} onChange={e=>onChange(e.target.value)} placeholder={ph}/>
                      </div>
                    ))}
                    <div style={{ marginBottom:14 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Rating</label>
                      <select style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1px solid ${T.border}`, background:T.surface2, color:T.text, fontSize:13, outline:'none' }} value={feedback.rating} onChange={e=>setFeedback(f=>({...f,rating:e.target.value}))} required>
                        <option value="">How was your experience?</option>
                        <option value="good">Good ⭐⭐⭐⭐⭐</option>
                        <option value="average">Average ⭐⭐⭐</option>
                        <option value="bad">Bad ⭐</option>
                      </select>
                    </div>
                    <div style={{ marginBottom:20 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>Message</label>
                      <textarea style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1px solid ${T.border}`, background:T.surface2, color:T.text, fontSize:13, outline:'none', resize:'vertical', minHeight:90 }} value={feedback.message} onChange={e=>setFeedback(f=>({...f,message:e.target.value}))} placeholder="Your feedback..." required/>
                    </div>
                    <button type="submit" disabled={submitting}
                      style={{ width:'100%', padding:'14px', borderRadius:8, background:T.crimson, color:'white', border:'none', cursor:submitting?'not-allowed':'pointer', fontSize:14, fontWeight:700, letterSpacing:'.5px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'opacity .15s' }}
                      onMouseEnter={e=>{if(!submitting)e.currentTarget.style.opacity='.85'}} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      {submitting?<Loader2 size={16}/>:<Send size={15}/>} SEND FEEDBACK
                    </button>
                    <p style={{ fontSize:11, color:T.textMuted, textAlign:'center', marginTop:8 }}>Your feedback is associated with your account for administrative purposes.</p>
                  </form>
                </div>
              </div>
            </section>
            <PageFooter/>
          </div>
          )}

        </div>{/* end page switch */}
      </div>{/* end main content */}

      {/* ══ ISK AI Chatbot ══ */}
      <ISKAIChat onNavigate={setActivePage}/>

      {/* ══ Report Concern FAB ══ */}
      <a href="https://www.facebook.com/share/1D6aTWgdiR/" target="_blank" rel="noreferrer"
        title="Report a Website Concern"
        style={{ position:'fixed', bottom:24, left:isMobile?'auto':24, right:isMobile?88:'auto', width:50, height:50, borderRadius:'50%', background:T.crimson, border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(197,48,48,.45)', zIndex:8000, textDecoration:'none', transition:'transform .2s' }}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
        <Flag size={20}/>
      </a>

      {/* ══ MODALS ══ */}
      <Modal open={showProfile} onClose={() => setShowProfile(false)} title="Profile Information" size="lg">
        <ProfilingForm isUpdate/>
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Account Settings">
        <form onSubmit={handlePasswordUpdate}>
          <FormField label="New Password" required>
            <div style={{ position:'relative' }}>
              <input className="input-field" type={settingsPw.show?'text':'password'} value={settingsPw.newpw} onChange={e=>setSettingsPw(p=>({...p,newpw:e.target.value}))} required minLength={8} style={{ paddingRight:40 }}/>
              <button type="button" onClick={() => setSettingsPw(p=>({...p,show:!p.show}))} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A0AEC0' }}>
                {settingsPw.show?<EyeOff size={15}/>:<Eye size={15}/>}
              </button>
            </div>
          </FormField>
          <FormField label="Confirm Password" required>
            <input className="input-field" type={settingsPw.show?'text':'password'} value={settingsPw.confirm} onChange={e=>setSettingsPw(p=>({...p,confirm:e.target.value}))} required/>
          </FormField>
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <button type="button" onClick={() => setShowSettings(false)} className="btn-ghost" style={{ flex:1 }}>Cancel</button>
            <button type="submit" className="btn-navy" style={{ flex:1 }}>Update Password</button>
          </div>
        </form>
      </Modal>

      {selectedProject && (
        <ProjectDetailModal project={selectedProject} T={T} onClose={() => setSelectedProject(null)}/>
      )}

      {selectedAnn && (
        <AnnouncementModal ann={selectedAnn} T={T} onClose={() => setSelectedAnn(null)} onViewAll={() => setActivePage('announcements')}/>
      )}

      <ConfirmDialog open={logoutOpen} onClose={() => setLogout(false)} onConfirm={handleLogout} title="Log Out?" message="Are you sure you want to log out?" danger/>
    </div>
  )
}
