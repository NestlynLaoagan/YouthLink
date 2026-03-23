import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Bell, Sun, Moon, LogOut, User, Settings, Flag, Send, Menu, Search,
  ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, X, Star,
  Home, Megaphone, FolderOpen, Calendar, MessageSquare
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

// Sidebar tooltip hover CSS
const sidebarCSS = `
  button:hover .sidebar-tooltip { opacity: 1 !important; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #CBD5E0; border-radius: 3px; }
  @keyframes pageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes sidebarSlide { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
  @keyframes fadeLabel { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }
`

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
function CalGrid({ month, events, T, selectedDate, onDateClick }) {
  const start  = startOfMonth(month)
  const days   = eachDayOfInterval({ start, end: endOfMonth(month) })
  const blanks = Array(getDay(start)).fill(null)
  const all    = [...blanks, ...days]
  const today  = new Date()
  const [hoveredDay, setHoveredDay] = React.useState(null)
  const [cardHover,  setCardHover]  = React.useState(false)

  const hasEv = d => d && events.some(ev => {
    try { return isSameDay(parseISO(ev.start_date || ev.created_at), d) } catch { return false }
  })
  const isToday    = d => d && isSameDay(d, today)
  const isSelected = d => d && selectedDate && isSameDay(d, selectedDate)

  return (
    <div
      onMouseEnter={() => setCardHover(true)}
      onMouseLeave={() => { setCardHover(false); setHoveredDay(null) }}
      style={{
        background: T.calBg, borderRadius:14, padding:'14px 16px',
        border:`1px solid ${cardHover ? T.navy : T.calBorder}`,
        position:'relative',
        zIndex: cardHover ? 10 : 1,
        transform: cardHover ? 'scale(1.06) translateY(-4px)' : 'scale(1) translateY(0)',
        boxShadow: cardHover
          ? `0 16px 40px rgba(26,54,93,0.18), 0 4px 12px rgba(26,54,93,0.10)`
          : '0 1px 4px rgba(0,0,0,0.04)',
        transition:'transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s, border-color .2s, z-index 0s',
        cursor:'default',
      }}>
      {/* Month name — highlight on card hover */}
      <p style={{
        textAlign:'center', fontSize: cardHover ? 14 : 13, fontWeight:800,
        color: T.navy,
        textTransform:'uppercase', letterSpacing: cardHover ? '1.2px' : '0.8px',
        marginBottom:8, fontFamily:'Inter,sans-serif',
        opacity: cardHover ? 1 : 0.80,
        transition:'font-size .2s, opacity .2s, letter-spacing .2s',
      }}>
        {format(month,'MMMM yyyy')}
      </p>

      {/* Day-of-week headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', color:T.textMuted, fontWeight:700,
            paddingBottom:4, fontSize:9 }}>{d}</div>
        ))}

        {/* Day cells */}
        {all.map((d, i) => {
          const ev    = hasEv(d)
          const sel   = isSelected(d)
          const tod   = isToday(d)
          const hov   = hoveredDay === i && d !== null
          const key   = `day-${i}`

          // Background priority: selected > hovered-with-event > hovered > event > today > default
          let bg = 'transparent'
          if      (sel)        bg = '#F6AD55'
          else if (hov && ev)  bg = T.navy
          else if (hov && !ev) bg = `${T.navy}14`
          else if (ev)         bg = T.navy
          else if (tod)        bg = `${T.gold}30`

          let col = T.text
          if      (sel)             col = 'white'
          else if (hov && ev)       col = 'white'
          else if (hov && !ev)      col = T.navy
          else if (ev)              col = 'white'
          else if (tod && !hov)     col = T.gold

          let bdr = 'none'
          if      (tod && !sel && !ev && !hov) bdr = `1.5px solid ${T.gold}`
          else if (hov && !ev && !sel)         bdr = `1.5px solid ${T.navy}40`

          return (
            <div key={key} style={{ textAlign:'center', padding:'2px 0' }}>
              {d ? (
                <span
                  onClick={() => ev && onDateClick && onDateClick(d)}
                  onMouseEnter={() => setHoveredDay(i)}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    width:24, height:24, borderRadius:'50%', fontSize:10,
                    cursor: ev ? 'pointer' : 'default',
                    fontWeight: tod || ev || hov ? 700 : 400,
                    background: bg, color: col, border: bdr,
                    transform: hov ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: hov && ev ? `0 2px 8px ${T.navy}50` : 'none',
                    transition:'all .15s cubic-bezier(.4,0,.2,1)',
                  }}>
                  {format(d,'d')}
                </span>
              ) : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Projects Carousel — responsive, autoplay 2s ── */
function ProjectsCarousel({ projects, T, onSelectProject, autoInterval=2000, isMobile=false }) {
  const [current, setCurrent] = React.useState(0)
  const [paused,  setPaused]  = React.useState(false)
  const [dir,     setDir]     = React.useState('next')
  const total = projects.length

  const go = React.useCallback((idx, d='next') => {
    setDir(d)
    setCurrent((idx + total) % total)
  }, [total])

  React.useEffect(() => {
    if (paused || total < 2) return
    const t = setInterval(() => go((current + 1) % total, 'next'), autoInterval)
    return () => clearInterval(t)
  }, [current, paused, total, go, autoInterval])

  // Reset to 0 when projects list changes
  React.useEffect(() => { setCurrent(0) }, [projects.length])

  if (total === 0) return null
  const p = projects[current]
  const imgs = (p.images || []).filter(Boolean)
  const statusColors = {
    upcoming:  { bg:'#DBEAFE', color:'#1D4ED8' },
    ongoing:   { bg:'#DCFCE7', color:'#166534' },
    planning:  { bg:'#EBF8FF', color:T.navy },
    completed: { bg:'#F0FFF4', color:'#276749' },
  }
  const sc = statusColors[(p.status||'').toLowerCase()] || { bg:'#F3F4F6', color:'#718096' }

  return (
    <div style={{ userSelect:'none', marginBottom:32 }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <style>{`
        @keyframes slideNext { from { opacity:0; transform:translateX(50px) scale(0.97); } to { opacity:1; transform:translateX(0) scale(1); } }
        @keyframes slidePrev { from { opacity:0; transform:translateX(-50px) scale(0.97); } to { opacity:1; transform:translateX(0) scale(1); } }
        @keyframes projFadeIn   { from { opacity:0; transform:scale(1.01); } to { opacity:1; transform:scale(1); } }
        @keyframes projProgress { from { width:0%; } to { width:100%; } }
        @keyframes modalSlideIn { from { opacity:0; transform:translateY(24px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes galFadeIn    { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* Main card */}
      <div key={`proj-${current}`}
        style={{ background:T.surface, borderRadius: isMobile ? 14 : 20, border:`1px solid ${T.border}`,
          overflow:'hidden', cursor:'pointer', boxShadow:'0 4px 28px rgba(0,0,0,0.09)',
          maxWidth:860, margin:'0 auto',
          animation: `${dir==='next'?'slideNext':'slidePrev'} 0.42s cubic-bezier(0.4,0,0.2,1) both` }}
        onClick={() => onSelectProject && onSelectProject(p)}>

        {/* Image — height responsive */}
        <div style={{ position:'relative', width:'100%', paddingBottom: isMobile ? '58%' : '42%',
          background:'#111', overflow:'hidden' }}>
          {imgs.length > 0
            ? <img src={imgs[0]} alt={p.project_name} key={`img-${current}`}
                style={{ position:'absolute', inset:0, width:'100%', height:'100%',
                  objectFit:'cover', animation:'projFadeIn 0.5s ease' }}/>
            : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:64,
                background:`linear-gradient(135deg,${T.navy}22,${T.gold}22)` }}>🏗️</div>}

          {/* Progress bar */}
          {total > 1 && !paused && (
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:4,
              background:'rgba(255,255,255,0.15)' }}>
              <div key={`bar-${current}`} style={{ height:'100%', background:T.gold,
                animation:`projProgress ${autoInterval}ms linear forwards` }}/>
            </div>
          )}

          {/* Nav buttons */}
          {total > 1 && (<>
            <button onClick={e => { e.stopPropagation(); go(current - 1, 'prev') }}
              style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                width:38, height:38, borderRadius:'50%', background:'rgba(0,0,0,0.45)',
                border:'1.5px solid rgba(255,255,255,0.3)', color:'white', fontSize:22,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                zIndex:2, transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.72)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.45)'}>‹</button>
            <button onClick={e => { e.stopPropagation(); go(current + 1, 'next') }}
              style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                width:38, height:38, borderRadius:'50%', background:'rgba(0,0,0,0.45)',
                border:'1.5px solid rgba(255,255,255,0.3)', color:'white', fontSize:22,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                zIndex:2, transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.72)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.45)'}>›</button>
          </>)}

          {/* Slide counter */}
          {total > 1 && (
            <div style={{ position:'absolute', top:14, right:14, background:'rgba(0,0,0,0.52)',
              backdropFilter:'blur(6px)', borderRadius:20, padding:'3px 12px',
              fontSize:11, fontWeight:700, color:'white' }}>
              {current + 1} / {total}
            </div>
          )}
        </div>

        {/* Info section */}
        <div style={{ padding: isMobile ? '14px 16px 18px' : '20px 24px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:8, flexWrap:'wrap', gap:6 }}>
            <span style={{ fontSize:10, fontWeight:800, padding:'3px 12px', borderRadius:20,
              background:sc.bg, color:sc.color, textTransform:'capitalize' }}>
              {p.status||'upcoming'}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {p.budget && <span style={{ fontSize: isMobile ? 12 : 13, fontWeight:700, color:T.gold }}>₱{parseFloat(p.budget).toLocaleString()}</span>}
              {p.fund_source && (
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                  background:`${T.gold}18`, color:T.gold, border:`1px solid ${T.gold}40` }}>
                  {p.fund_source}
                </span>
              )}
            </div>
          </div>
          <p style={{ fontSize: isMobile ? 16 : 19, fontWeight:800, color:T.navy, margin:'0 0 6px',
            fontFamily:"'Montserrat','Inter',sans-serif", lineHeight:1.3 }}>
            {p.project_name}
          </p>
          {p.description && (
            <p style={{ fontSize: isMobile ? 12 : 13, color:T.textMuted, lineHeight:1.6,
              margin:'0 0 12px' }}>
              {p.description.length > (isMobile ? 100 : 160)
                ? p.description.slice(0, isMobile ? 100 : 160)+'…'
                : p.description}
            </p>
          )}
          <div style={{ display:'flex', alignItems:'center',
            justifyContent: isMobile ? 'flex-end' : 'space-between',
            flexWrap:'wrap', gap:8 }}>
            {!isMobile && (
              <div style={{ display:'flex', alignItems:'center', gap:12, fontSize:11, color:T.textMuted }}>
                {p.prepared_by && <span>👤 {p.prepared_by}</span>}
                {p.start_date && <span>📅 {new Date(p.start_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</span>}
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); onSelectProject && onSelectProject(p) }}
              style={{ display:'inline-flex', alignItems:'center', gap:6,
                padding: isMobile ? '7px 16px' : '8px 20px',
                borderRadius:8, background:T.navy, color:'white', border:'none',
                cursor:'pointer', fontSize: isMobile ? 11 : 12,
                fontWeight:700, fontFamily:'Inter,sans-serif' }}
              onMouseEnter={e=>e.currentTarget.style.background=T.navyLt}
              onMouseLeave={e=>e.currentTarget.style.background=T.navy}>
              View Details →
            </button>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:7, marginTop:16 }}>
          {projects.map((_, i) => (
            <button key={i} onClick={() => go(i, i >= current ? 'next' : 'prev')}
              style={{ width:i===current?24:8, height:8, borderRadius:4, border:'none', padding:0,
                background:i===current?T.navy:T.border, cursor:'pointer',
                transition:'all 0.3s ease' }}/>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Project Cards Row ── */
function ProjectCards({ projects, T, onSelect }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:18, maxWidth:900, margin:'36px auto 0' }}>
      {projects.slice(0,3).map(p => (
        <div key={p.id} onClick={() => onSelect(p)}
          style={{ background:T.surface, borderRadius:14, border:`1px solid ${T.border}`, overflow:'hidden', cursor:'pointer', boxShadow:'0 2px 12px rgba(0,0,0,.06)', transition:'all .22s' }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.boxShadow='0 14px 36px rgba(0,0,0,0.13)'}}
          onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.06)'}}>
          <div style={{ height:140, overflow:'hidden', background:`linear-gradient(135deg,${T.navy}22,${T.gold}22)`, position:'relative' }}>
            {p.images?.[0]
              ? <img src={p.images[0]} alt={p.project_name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>🏗️</div>}
            <div style={{ position:'absolute', top:8, right:8, background:'rgba(26,54,93,0.82)', borderRadius:20, padding:'3px 10px', fontSize:10, fontWeight:700, color:'white' }}>✅ Completed</div>
          </div>
          <div style={{ padding:'14px 16px' }}>
            <p style={{ fontWeight:700, fontSize:14, color:T.navy, margin:'0 0 6px', fontFamily:"'Montserrat','Inter',sans-serif", lineHeight:1.3 }}>{p.project_name}</p>
            <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.6, margin:'0 0 10px' }}>{(p.description||'').slice(0,80)}{p.description?.length>80?'…':''}</p>
            <span style={{ fontSize:11, fontWeight:700, color:T.navy, background:`${T.navy}10`, border:`1px solid ${T.navy}25`, borderRadius:6, padding:'4px 11px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Learn more →</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Project Detail Modal (user-facing) ── */
function ProjectDetailModal({ project, T, onClose }) {
  const [galIdx, setGalIdx] = React.useState(0)
  const imgs = (project?.images || []).filter(Boolean)

  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  if (!project) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.62)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}
      onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:660, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 28px 80px rgba(0,0,0,0.28)', animation:'modalSlideIn .28s ease' }}>
        <div style={{ padding:'20px 24px 16px', background:`linear-gradient(135deg,${T.navy},${T.navyLt})`, flexShrink:0, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 4px', fontFamily:'Inter,sans-serif' }}>Accomplished Project</p>
            <h2 style={{ fontSize:20, fontWeight:800, color:'white', margin:0, fontFamily:"'Montserrat','Inter',sans-serif", lineHeight:1.3, maxWidth:480 }}>{project.project_name}</h2>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, width:32, height:32, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:12, fontSize:16 }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', padding:'20px 24px', flex:1 }}>
          {imgs.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ position:'relative', borderRadius:14, overflow:'hidden', paddingBottom:'52%', background:'#111' }}>
                <img key={galIdx} src={imgs[galIdx]} alt={project.project_name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', animation:'galFadeIn .3s ease' }}/>
                {imgs.length > 1 && (
                  <>
                    <button onClick={() => setGalIdx(i => (i-1+imgs.length)%imgs.length)} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.55)', border:'none', color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
                    <button onClick={() => setGalIdx(i => (i+1)%imgs.length)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.55)', border:'none', color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
                    <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6 }}>
                      {imgs.map((_,i) => <button key={i} onClick={() => setGalIdx(i)} style={{ width:i===galIdx?20:7, height:7, borderRadius:4, border:'none', padding:0, background:i===galIdx?'white':'rgba(255,255,255,0.4)', cursor:'pointer', transition:'all .25s' }}/>)}
                    </div>
                  </>
                )}
              </div>
              {imgs.length > 1 && (
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  {imgs.map((url,i) => <img key={i} src={url} alt="" onClick={() => setGalIdx(i)} style={{ width:60, height:44, objectFit:'cover', borderRadius:7, cursor:'pointer', border:i===galIdx?`2px solid ${T.navy}`:'2px solid transparent', opacity:i===galIdx?1:.65, transition:'all .2s' }}/>)}
                </div>
              )}
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              ['📅 Date Conducted', [project.start_date && new Date(project.start_date).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'}), project.end_date && new Date(project.end_date).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})].filter(Boolean).join(' — ') || '—'],
              ['💰 Budget', project.budget ? `₱${parseFloat(project.budget).toLocaleString()}` : '—'],
              ['🏦 Fund Source', project.fund_source || 'SK ABYIP'],
              ['👤 Prepared By', project.prepared_by || 'Barangay Central SK'],
            ].map(([label, value]) => (
              <div key={label} style={{ background:'#F7FAFC', borderRadius:10, padding:'12px 14px', border:'1px solid #E2E8F0' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'.5px', margin:'0 0 4px', fontFamily:'Inter,sans-serif' }}>{label}</p>
                <p style={{ fontSize:13, fontWeight:600, color:'#2D3748', margin:0, fontFamily:'Inter,sans-serif' }}>{value}</p>
              </div>
            ))}
          </div>
          {project.description && (
            <div style={{ background:'#F7FAFC', borderRadius:12, padding:'14px 16px', border:'1px solid #E2E8F0' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#718096', textTransform:'uppercase', letterSpacing:'.5px', margin:'0 0 8px', fontFamily:'Inter,sans-serif' }}>Description / Purpose</p>
              <p style={{ fontSize:13, color:'#2D3748', lineHeight:1.85, margin:0, fontFamily:'Inter,sans-serif' }}>{project.description}</p>
            </div>
          )}
        </div>
        <div style={{ padding:'14px 24px', borderTop:'1px solid #E2E8F0', background:'#FAFBFC', flexShrink:0, textAlign:'right' }}>
          <button onClick={onClose} style={{ padding:'9px 24px', borderRadius:9, background:T.navy, color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'Inter,sans-serif' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ── Event Detail Panel (user-facing) ── */
function EventDetailPanel({ ev, clock, evCountdown, T, onClose }) {
  if (!ev) return null
  const cd = evCountdown(ev)
  const isCancelled = (ev.status||'').toLowerCase() === 'cancelled'

  const statusStyle = {
    upcoming:  { bg:'#DBEAFE', color:'#1D4ED8' },
    ongoing:   { bg:'#DCFCE7', color:'#166534' },
    completed: { bg:'#F0FFF4', color:'#276749' },
    cancelled: { bg:'#FEE2E2', color:'#DC2626' },
    planning:  { bg:'#EBF8FF', color:T.navy },
  }
  const ss = statusStyle[(ev.status||'').toLowerCase()] || { bg:'#F3F4F6', color:'#718096' }

  return (
    <div style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.border}`, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,.08)', animation:'pageIn .2s ease' }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', background:`linear-gradient(135deg,${T.navy},${T.navyLt})`, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 3px', fontFamily:'Inter,sans-serif' }}>Event Details</p>
          <h3 style={{ fontSize:16, fontWeight:800, color:'white', margin:0, fontFamily:"'Montserrat','Inter',sans-serif", lineHeight:1.3 }}>{ev.title}</h3>
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:7, width:28, height:28, cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:10, fontSize:14 }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ padding:'16px 18px' }}>
        {/* Status + countdown row */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          <span style={{ padding:'3px 12px', borderRadius:20, fontSize:11, fontWeight:700, background:ss.bg, color:ss.color }}>{ev.status||'Upcoming'}</span>
          {cd && !isCancelled && (
            <span style={{ padding:'3px 12px', borderRadius:20, fontSize:11, fontWeight:700, background:cd.bg, color:cd.color }}>⏱ {cd.label}</span>
          )}
        </div>

        {/* Info rows */}
        {[
          ['📅 Start',    ev.start_date ? new Date(ev.start_date).toLocaleDateString('en-PH',{weekday:'short',month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'],
          ['🏁 End',      ev.end_date   ? new Date(ev.end_date).toLocaleDateString('en-PH',{weekday:'short',month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'],
          ['📍 Location', ev.location || '—'],
          ['👤 Handler',  ev.handler  || '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.4px', width:90, flexShrink:0, fontFamily:'Inter,sans-serif', paddingTop:2 }}>{label}</span>
            <span style={{ fontSize:12, color:T.text, fontFamily:'Inter,sans-serif', lineHeight:1.5 }}>{value}</span>
          </div>
        ))}

        {/* Cancellation reason */}
        {isCancelled && ev.cancel_reason && (
          <div style={{ marginTop:12, padding:'10px 14px', background:'#FFF5F5', borderRadius:9, border:'1px solid #FC8181' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#C53030', textTransform:'uppercase', letterSpacing:'.5px', margin:'0 0 5px', fontFamily:'Inter,sans-serif' }}>❌ Reason for Cancellation</p>
            <p style={{ fontSize:12, color:'#7B1A1A', margin:0, fontFamily:'Inter,sans-serif', lineHeight:1.6 }}>{ev.cancel_reason}</p>
          </div>
        )}

        {/* Description */}
        {ev.description && (
          <div style={{ marginTop:12 }}>
            <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.5px', margin:'0 0 6px', fontFamily:'Inter,sans-serif' }}>Description</p>
            <p style={{ fontSize:12, color:T.text, lineHeight:1.7, fontFamily:'Inter,sans-serif', background:T.surface2, padding:'10px 12px', borderRadius:9, margin:0 }}>{ev.description}</p>
          </div>
        )}

        {/* External link */}
        {ev.external_link && (
          <a href={ev.external_link} target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:8, marginTop:14, padding:'10px 14px', borderRadius:10, background:`${T.navy}12`, border:`1px solid ${T.navy}30`, textDecoration:'none', transition:'all .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background=`${T.navy}20`}
            onMouseLeave={e=>e.currentTarget.style.background=`${T.navy}12`}>
            <span style={{ fontSize:18 }}>🔗</span>
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:T.navy, margin:'0 0 1px', fontFamily:'Inter,sans-serif' }}>Join / View Event</p>
              <p style={{ fontSize:10, color:'#718096', margin:0, fontFamily:'Inter,sans-serif', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.external_link}</p>
            </div>
          </a>
        )}
      </div>
    </div>
  )
}


export default function Dashboard() {
  const { user, profile, signOut, role, logAudit } = useAuth()
  const { toast } = useToast()
  const navigate  = useNavigate()

  const [dark,         setDark]        = useState(false)
  const [sidebarOpen,  setSidebar]     = useState(true)
  const [isMobile,     setIsMobile]    = useState(window.innerWidth < 768)
  const [mobileSidebar,setMobileSidebar]= useState(false)
  const [activePage,   setActivePage]  = useState('home')
  const [profileMenu,  setMenu]        = useState(false)
  const [logoutOpen,   setLogout]      = useState(false)
  const [showProfile,  setShowProfile] = useState(false)
  const [showNotifs,   setShowNotifs]  = useState(false)
  const notifRef = useRef()
  const [showSettings, setShowSettings]= useState(false)
  const [announcements,setAnns]        = useState([])
  const [projects,     setProjects]    = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [events,       setEvents]      = useState([])
  const [calSlide,    setCalSlide]     = useState(0)  // 0=Jan-Apr, 1=May-Aug, 2=Sep-Dec
  const [clock,        setClock]       = useState(new Date())
  const [selectedDate, setSelectedDate]= useState(null)
  const [selectedEv,   setSelectedEv]  = useState(null)
  const [evNotifDone,  setEvNotifDone] = useState({})
  const [feedback,     setFeedback]    = useState({ subject:'', rating:'', message:'' })
  const [submitting,   setSubmitting]  = useState(false)
  const [settingsPw,   setSettingsPw]  = useState({ newpw:'', confirm:'', show:false })
  const menuRef = useRef()

  const { settings: siteSettings } = useSiteSettings()
  const BASE = dark ? DARK : LIGHT
  // Merge site-wide color settings from admin panel
  const T = {
    ...BASE,
    navy:     siteSettings.primaryColor || BASE.navy,
    gold:     siteSettings.accentColor  || BASE.gold,
    navyLt:   siteSettings.primaryLt    || BASE.navyLt || '#2A4A7F',
    footerBg: dark ? BASE.footerBg : (siteSettings.primaryColor || BASE.footerBg),
    heroText: dark ? BASE.heroText : (siteSettings.primaryColor || BASE.heroText),
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

  /* Reload projects fresh every time user navigates to the projects page */
  useEffect(() => {
    if (activePage === 'projects') {
      supabase.from('projects').select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setProjects(data) })
    }
  }, [activePage])

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
      supabase.from('projects').select('*').order('created_at',{ascending:false}).order('completion_date',{ascending:false}),
      supabase.from('events').select('*').order('start_date',{ascending:true}),
    ])
    if (a.data) setAnns(a.data)
    if (p.data) setProjects(p.data)
    if (e.data) setEvents(e.data)
  }

  /* real-time clock */
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  /* event notifications: 2 days before and 1 hour before */
  useEffect(() => {
    if (!events.length) return
    const t = setInterval(() => {
      const now = new Date()
      events.forEach(ev => {
        if (!ev.start_date || (ev.status||'').toLowerCase() === 'cancelled') return
        const start = new Date(ev.start_date)
        const diffMs = start - now
        const key2d  = ev.id + '_2d'
        const key1h  = ev.id + '_1h'
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

  /* event countdown */
  const evCountdown = (ev) => {
    const start = ev.start_date ? new Date(ev.start_date) : null
    const end   = ev.end_date   ? new Date(ev.end_date)   : null
    if (!start || isNaN(start)) return null
    const diffMs = start - clock
    if (end && clock >= end)   return { label:'Event has ended',   color:'#718096', bg:'#F7FAFC' }
    if (diffMs < 0)             return { label:'Event is ongoing',  color:'#166534', bg:'#F0FFF4' }
    const diffD = Math.floor(diffMs / 86400000)
    const diffH = Math.floor(diffMs / 3600000)
    const diffM = Math.floor(diffMs / 60000)
    if (diffD === 0 && diffH === 0) return { label:`${diffM}m remaining`, color:'#C53030', bg:'#FFF5F5' }
    if (diffD === 0) return { label:`${diffH}h remaining`, color:'#D97706', bg:'#FEF9E7' }
    if (diffD === 1) return { label:'Tomorrow!', color:'#D97706', bg:'#FEF9E7' }
    if (diffD <= 2) return { label:`Event is today!`, color:'#C53030', bg:'#FFF5F5' }
    return { label:`${diffD} days remaining`, color:T.navy, bg:'#EBF8FF' }
  }

  /* events on a selected date */
  const eventsOnDate = (d) => events.filter(ev => {
    try { return isSameDay(parseISO(ev.start_date || ev.created_at), d) } catch { return false }
  })

  /* months for calendar — 4 months per slide */
  const YEAR = new Date().getFullYear()
  const MONTHS = Array.from({length:12},(_,i) => new Date(YEAR,i,1))
  const SLIDES = [ MONTHS.slice(0,4), MONTHS.slice(4,8), MONTHS.slice(8,12) ]
  const SLIDE_LABELS = [
    `January – April ${YEAR}`,
    `May – August ${YEAR}`,
    `September – December ${YEAR}`,
  ]
  const months = SLIDES[calSlide] || SLIDES[0]

  const eventsInRange = events.filter(ev => {
    try {
      const d = parseISO(ev.start_date || ev.created_at)
      return months.some(m => d.getFullYear()===m.getFullYear() && d.getMonth()===m.getMonth())
    } catch { return false }
  })

  const annStatusStyle = s => ({
    upcoming:  { bg:'#DBEAFE', color:'#1D4ED8', border:'#BFDBFE', dot:'#3B82F6',  leftBorder:'#3B82F6' },
    ongoing:   { bg:'#DCFCE7', color:'#166534', border:'#A7F3D0', dot:'#22C55E',  leftBorder:'#22C55E' },
    cancelled: { bg:'#FEE2E2', color:'#DC2626', border:'#FECACA', dot:'#EF4444',  leftBorder:'#EF4444' },
    finished:  { bg:'#F3F4F6', color:'#6B7280', border:'#E5E7EB', dot:'#9CA3AF',  leftBorder:'#9CA3AF' },
  }[(s||'').toLowerCase()] || { bg:'#F3F4F6', color:'#6B7280', border:'#E5E7EB', dot:'#9CA3AF', leftBorder:T.border })

  const annTypeStyle = t => ({
    'General':             { bg:`${T.navy}12`, color:T.navy,    border:`${T.navy}30`, icon:'📢' },
    'Event':               { bg:'#F0FFF4',     color:'#276749', border:'#A7F3D0',     icon:'📅' },
    'Emergency':           { bg:'#FEE2E2',     color:'#DC2626', border:'#FECACA',     icon:'🚨' },
    'Notice':              { bg:'#FEF9E7',     color:'#7B4800', border:'#FDE68A',     icon:'📋' },
    'Training & Workshop': { bg:'#EDE9FE',     color:'#5B21B6', border:'#C4B5FD',     icon:'🎓' },
    'Sports':              { bg:'#D1FAE5',     color:'#065F46', border:'#6EE7B7',     icon:'⚽' },
    'Assembly':            { bg:'#DBEAFE',     color:'#1D4ED8', border:'#BFDBFE',     icon:'🏛️' },
  }[t] || { bg:'#F3F4F6', color:'#718096', border:'#E5E7EB', icon:'🔔' })

  const annBorderColor = s => annStatusStyle(s).leftBorder

  /* ratingBadge */
  const ratingToStars = r => r==='good'?5:r==='average'?3:1

  const SW = isMobile ? 0 : (sidebarOpen ? 220 : 64)
  const sty = {
    page:    { height:'100vh', overflow:'hidden', background: T.bg, color: T.text, fontFamily:'Inter, Georgia, sans-serif', transition:'background .3s, color .3s', display:'flex' },
    section: { padding:'56px 32px', background: T.sectionBg },
    secAlt:  { padding:'56px 32px', background: T.surface },
    h2:      { fontSize:28, fontWeight:800, color: T.navy, textAlign:'center', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8, fontFamily:'Inter, sans-serif' },
    sub:     { fontSize:14, color: T.textMuted, textAlign:'center', maxWidth:480, margin:'0 auto' },
    card:    { background: T.surface, borderRadius:12, border:`1px solid ${T.border}`, padding:20 },
  }

  const NAV_ITEMS = [
    { label:'Home',          Icon:Home,          page:'home' },
    { label:'Announcements', Icon:Megaphone,      page:'announcements' },
    { label:'Projects',      Icon:FolderOpen,     page:'projects' },
    { label:'Events',        Icon:Calendar,       page:'events' },
    { label:'Feedback',      Icon:MessageSquare,  page:'feedback' },
  ]

  return (
    <div style={sty.page}>

      {/* ══ MOBILE SIDEBAR OVERLAY ══ */}
      {isMobile && mobileSidebar && (
        <div onClick={() => setMobileSidebar(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.52)',
            zIndex:299, backdropFilter:'blur(2px)' }}/>
      )}

      {/* ══ SIDEBAR ══ */}
      <div style={{
        /* Desktop: inline collapsible. Mobile: fixed overlay drawer */
        width:        isMobile ? 260 : SW,
        flexShrink:   0,
        background:   T.navy,
        display:      'flex',
        flexDirection:'column',
        transition:   'width 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        overflow:     'hidden',
        zIndex:       300,
        /* Mobile: fixed, slides in/out */
        position:     isMobile ? 'fixed'    : 'relative',
        top:          isMobile ? 0          : 'auto',
        left:         isMobile ? 0          : 'auto',
        bottom:       isMobile ? 0          : 'auto',
        height:       isMobile ? '100vh'    : 'auto',
        transform:    isMobile ? (mobileSidebar ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        boxShadow:    isMobile && mobileSidebar ? '6px 0 32px rgba(0,0,0,0.35)' : 'none',
      }}>
        {/* Top: toggle + logo */}
        <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)',
          display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          {/* Desktop collapse toggle */}
          {!isMobile && (
            <button onClick={() => setSidebar(o => !o)}
              style={{ background:'none', border:'none', cursor:'pointer',
                color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center',
                justifyContent:'center', padding:4, borderRadius:6, flexShrink:0, transition:'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color='white'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.7)'}>
              <Menu size={20}/>
            </button>
          )}
          {/* Mobile close button */}
          {isMobile && (
            <button onClick={() => setMobileSidebar(false)}
              style={{ background:'none', border:'none', cursor:'pointer',
                color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center',
                justifyContent:'center', padding:4, borderRadius:6, flexShrink:0 }}>
              <X size={20}/>
            </button>
          )}
          {(sidebarOpen || isMobile) && (
            <div style={{ display:'flex', alignItems:'center', gap:8, overflow:'hidden' }}>
              <img src={SITE_LOGO} alt="SK" style={{ width:34, height:34, objectFit:'contain', flexShrink:0 }}/>
              <div style={{ minWidth:0 }}>
                <p style={{ color:'white', fontSize:10, fontWeight:700, letterSpacing:'0.5px',
                  whiteSpace:'nowrap', fontFamily:"'Montserrat','Inter',sans-serif" }}>BAKAKENG CENTRAL</p>
                <p style={{ color:'rgba(255,255,255,0.45)', fontSize:8, textTransform:'uppercase',
                  letterSpacing:'0.5px', whiteSpace:'nowrap' }}>Sangguniang Kabataan</p>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        {(sidebarOpen || isMobile) ? (
          <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.08)',
              borderRadius:8, padding:'7px 12px' }}>
              <Search size={13} style={{ color:'rgba(255,255,255,0.4)', flexShrink:0 }}/>
              <input placeholder="Search…" style={{ background:'none', border:'none', outline:'none',
                color:'rgba(255,255,255,0.7)', fontSize:12, fontFamily:'Inter,sans-serif', width:'100%' }}/>
            </div>
          </div>
        ) : (
          <div style={{ padding:'12px 0', display:'flex', justifyContent:'center',
            borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <Search size={16} style={{ color:'rgba(255,255,255,0.45)', cursor:'pointer' }}/>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex:1, padding:'8px 8px', overflowY:'auto' }}>
          {NAV_ITEMS.map(({ label, Icon, page }) => {
            const isActive = activePage === page
            return (
              <button key={label}
                onClick={() => { setActivePage(page); if (isMobile) setMobileSidebar(false) }}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding: (sidebarOpen || isMobile) ? '11px 14px' : '11px 0',
                  justifyContent: (sidebarOpen || isMobile) ? 'flex-start' : 'center',
                  width:'100%', borderRadius:9, textDecoration:'none',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.60)',
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  fontSize:13, fontFamily:'Inter,sans-serif', marginBottom:3,
                  transition:'all .2s cubic-bezier(.4,0,.2,1)',
                  border: isActive ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                  cursor:'pointer', position:'relative', flexShrink:0,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='white' }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.60)' }}}>
                <Icon size={18} style={{ flexShrink:0, filter: isActive ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' : 'none' }}/>
                {(sidebarOpen || isMobile) && (
                  <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    fontWeight: isActive ? 700 : 400, letterSpacing: isActive ? '0.2px' : 0,
                    fontSize:14 }}>{label}</span>
                )}
                {isActive && (sidebarOpen || isMobile) && (
                  <div style={{ position:'absolute', right:12, width:6, height:6, borderRadius:'50%',
                    background:'white', opacity:0.8 }}/>
                )}
                {/* Tooltip when desktop-collapsed */}
                {!sidebarOpen && !isMobile && (
                  <span style={{
                    position:'absolute', left:52, background:'white', color:T.navy,
                    fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:7,
                    whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,0.18)',
                    opacity:0, pointerEvents:'none', transition:'opacity .15s',
                    zIndex:9999, border:'1px solid #E2E8F0',
                  }} className="sidebar-tooltip">{label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: user + controls */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', padding:'10px 8px', flexShrink:0 }}>
          <button onClick={() => setDark(d => !d)}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%',
              padding: (sidebarOpen || isMobile) ? '8px 12px' : '8px 0',
              justifyContent: (sidebarOpen || isMobile) ? 'flex-start' : 'center',
              borderRadius:8, border:'none', background:'none', cursor:'pointer',
              color:'rgba(255,255,255,0.55)', fontSize:12, fontFamily:'Inter,sans-serif',
              marginBottom:2, transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='white' }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='rgba(255,255,255,0.55)' }}>
            {dark ? <Sun size={15} style={{ flexShrink:0 }}/> : <Moon size={15} style={{ flexShrink:0 }}/>}
            {(sidebarOpen || isMobile) && (dark ? 'Light Mode' : 'Dark Mode')}
          </button>
          <button onClick={() => navigate('/settings')}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%',
              padding: (sidebarOpen || isMobile) ? '8px 12px' : '8px 0',
              justifyContent: (sidebarOpen || isMobile) ? 'flex-start' : 'center',
              borderRadius:8, border:'none', background:'none', cursor:'pointer',
              color:'rgba(255,255,255,0.55)', fontSize:12, fontFamily:'Inter,sans-serif',
              marginBottom:2, transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='white' }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='rgba(255,255,255,0.55)' }}>
            <Settings size={15} style={{ flexShrink:0 }}/>
            {(sidebarOpen || isMobile) && 'Settings'}
          </button>
          <button onClick={() => setLogout(true)}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%',
              padding: (sidebarOpen || isMobile) ? '8px 12px' : '8px 0',
              justifyContent: (sidebarOpen || isMobile) ? 'flex-start' : 'center',
              borderRadius:8, border:'none', background:'none', cursor:'pointer',
              color:'#FC8181', fontSize:12, fontFamily:'Inter,sans-serif', transition:'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            <LogOut size={15} style={{ flexShrink:0 }}/>
            {(sidebarOpen || isMobile) && 'Log Out'}
          </button>

          {/* User info */}
          {(sidebarOpen || isMobile) ? (
            <div ref={menuRef} style={{ marginTop:8, padding:'10px 12px',
              background:'rgba(255,255,255,0.06)', borderRadius:10,
              display:'flex', alignItems:'center', gap:8, cursor:'pointer', position:'relative' }}
              onClick={() => setMenu(m => !m)}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#C53030',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontSize:12, fontWeight:700, flexShrink:0 }}>
                {(profile?.name || user?.email || 'R')[0].toUpperCase()}
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <p style={{ color:'white', fontSize:12, fontWeight:600, overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>
                  {profile?.name || 'Resident'}
                </p>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{user?.email}</p>
              </div>
              {profileMenu && (
                <div className="animate-fade-in" style={{ position:'absolute', bottom:54, left:0, right:0,
                  background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
                  boxShadow:'0 8px 32px rgba(0,0,0,0.15)', overflow:'hidden', zIndex:300 }}>
                  {[
                    { label:'Profile Information', icon:<User size={13}/>, action:()=>{ setShowProfile(true); setMenu(false) } },
                    { label:'Settings',             icon:<Settings size={13}/>, action:()=>{ navigate('/settings'); setMenu(false) } },
                    { label:'Log Out',              icon:<LogOut size={13}/>, action:()=>{ setLogout(true); setMenu(false) }, danger:true },
                  ].map(({ label, icon, action, danger }) => (
                    <button key={label} onClick={action}
                      style={{ display:'flex', alignItems:'center', gap:9, width:'100%',
                        padding:'11px 16px', background:'none', border:'none', cursor:'pointer',
                        fontSize:13, color: danger ? T.crimson : T.text,
                        fontFamily:'Inter,sans-serif', textAlign:'left' }}
                      onMouseEnter={e => e.currentTarget.style.background=T.surface2}
                      onMouseLeave={e => e.currentTarget.style.background='none'}>
                      {icon}{label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#C53030',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}
                onClick={() => setSidebar(true)}>
                {(profile?.name || user?.email || 'R')[0].toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MAIN CONTENT AREA ══ */}      {/* ══ MAIN CONTENT AREA ══ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Top bar */}
        <div style={{ height:52, background: T.navBg, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding: isMobile ? '0 14px' : '0 24px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Hamburger — always present on mobile */}
            {isMobile && (
              <button onClick={() => setMobileSidebar(o => !o)}
                style={{ background:'none', border:'none', cursor:'pointer', color:T.textMuted,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:6, borderRadius:8, flexShrink:0,
                  transition:'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background=T.surface2}
                onMouseLeave={e => e.currentTarget.style.background='none'}>
                <Menu size={22} strokeWidth={2}/>
              </button>
            )}
            {/* Logo on mobile topbar */}
            {isMobile && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <img src={SITE_LOGO} alt="SK" style={{ width:28, height:28, objectFit:'contain' }}/>
                <span style={{ fontSize:11, fontWeight:700, color:T.navy, fontFamily:"'Montserrat','Inter',sans-serif", letterSpacing:'0.5px' }}>BAKAKENG</span>
              </div>
            )}
            {!isMobile && (
              <p style={{ fontSize:13, color: T.textMuted, fontFamily:'Inter,sans-serif' }}>
                {new Date().toLocaleDateString('en-PH',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
              </p>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Bell */}
            <div ref={notifRef} style={{ position:'relative' }}>
              <button onClick={() => setShowNotifs(n => !n)}
                style={{ background:'none', border:'none', cursor:'pointer', color: T.textMuted, position:'relative', padding:4, display:'flex', alignItems:'center' }}>
                <Bell size={18}/>
                {(() => {
                  const remCount = events.filter(ev => {
                    if (!ev.start_date || (ev.status||'').toLowerCase()==='cancelled') return false
                    const diff = new Date(ev.start_date) - clock
                    return diff > 0 && diff <= 2*86400000
                  }).length + announcements.length
                  return remCount > 0 ? (
                    <span style={{ position:'absolute', top:-2, right:-2, minWidth:16, height:16, background:T.crimson, borderRadius:8, color:'white', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>
                      {Math.min(remCount, 9)}
                    </span>
                  ) : null
                })()}
              </button>
              {showNotifs && (
                <div className="animate-fade-in" style={{ position:'absolute', right:0, top:38, width:320, background: T.surface, border:`1px solid ${T.border}`, borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', zIndex:300, overflow:'hidden' }}>
                  <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontWeight:700, fontSize:14, color:T.navy }}>Notifications</p>
                  </div>
                  <div style={{ maxHeight:280, overflowY:'auto' }}>
                    {events.filter(ev => {
                      if (!ev.start_date||(ev.status||'').toLowerCase()==='cancelled') return false
                      return (new Date(ev.start_date) - clock) > 0 && (new Date(ev.start_date) - clock) <= 2*86400000
                    }).slice(0,3).map(ev => {
                      const diff = new Date(ev.start_date) - clock
                      const diffD = Math.ceil(diff/86400000)
                      const diffH = Math.ceil(diff/3600000)
                      const label = diffH < 24 ? `in ${diffH}h` : `in ${diffD} day${diffD>1?'s':''}`
                      return (
                        <div key={ev.id} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:10, alignItems:'flex-start' }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.surface2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ width:32, height:32, borderRadius:8, background:`${T.gold}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>🔔</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13, fontWeight:600, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</p>
                            <p style={{ fontSize:11, color:T.gold, marginTop:1, fontWeight:700 }}>Starting {label}</p>
                          </div>
                        </div>
                      )
                    })}
                    {announcements.slice(0,3).map(a => (
                      <div key={a.id} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:10, alignItems:'flex-start' }}
                        onMouseEnter={e => e.currentTarget.style.background=T.surface2} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <div style={{ width:32, height:32, borderRadius:8, background:`${T.navy}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>📢</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:13, fontWeight:600, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                          <div style={{ display:'flex', gap:5, marginTop:3, flexWrap:'wrap' }}>
                            {(() => { const ss=annStatusStyle(a.status); return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}` }}><span style={{ width:5, height:5, borderRadius:'50%', background:ss.dot }}/>{a.status}</span> })()}
                            {(() => { const ts=annTypeStyle(a.type); return <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700, background:ts.bg, color:ts.color, border:`1px solid ${ts.border}` }}><span style={{ fontSize:8 }}>{ts.icon}</span>{a.type}</span> })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content — switches based on activePage */}
        <div style={{ flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>

      {/* ══ PAGE: HOME ══ */}
      {activePage === 'home' && <div style={{ animation:'pageIn 0.2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column' }}>
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
      <section id="home" style={{ background: T.surface, padding: isMobile ? '28px 18px 36px' : '48px 40px 56px', position:'relative', overflow:'hidden', flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', maxWidth:1200, margin:'0 auto', gap:40 }}>
          {/* Left content */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, background:'rgba(214,158,46,0.15)', border:`1px solid ${T.gold}`, fontSize:11, fontWeight:700, color: T.gold, textTransform:'uppercase', letterSpacing:'1px', marginBottom:20 }}>
              Official Portal
            </div>
            <h1 style={{ fontSize: isMobile ? 28 : 48, fontWeight:900, lineHeight:1.1, marginBottom:20, fontFamily:'Inter, sans-serif', textTransform:'uppercase' }}>
              <span style={{ color: T.text }}>{siteSettings.heroTitle || 'WELCOME TO BARANGAY'}</span><br/>
              <span style={{ color: T.gold }}>{siteSettings.heroSubtitle || 'BAKAKENG CENTRAL'}</span>
            </h1>
            <p style={{ fontSize:14, color: T.textMuted, lineHeight:1.8, marginBottom:28, maxWidth:420 }}>
              {siteSettings.heroTagline || 'Stay connected, informed, and engaged with your community. Explore projects, events, and services all in one place.'}
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button onClick={() => setActivePage('events')}
                style={{ padding:'12px 28px', borderRadius:8, background: T.crimson, color:'white', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, fontFamily:'Inter,sans-serif', transition:'opacity .15s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                {siteSettings.btn1Label || 'View Events'}
              </button>
              <button onClick={() => setActivePage('projects')}
                style={{ padding:'12px 28px', borderRadius:8, background:'transparent', color: T.text, border:`2px solid ${T.border}`, cursor:'pointer', fontSize:14, fontWeight:700, fontFamily:'Inter,sans-serif', transition:'all .15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.navy; e.currentTarget.style.color=T.navy }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.text }}>
                {siteSettings.btn2Label || 'Explore Projects'}
              </button>
            </div>
          </div>

          {/* Right — Barangay Hall photo */}
          {!isMobile && (
          <div style={{ flexShrink:0, width:440, borderRadius:18, overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,0.18)', border:`2px solid ${T.border}` }}>
            <img src={siteSettings.heroImage || '/Hero.png'} alt="Bakakeng Central Barangay Hall"
              style={{ width:'100%', height:300, objectFit:'cover', display:'block', transition:'transform .4s ease' }}
              onError={e => { e.target.src = '/Hero.png' }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
          </div>
          )}
        </div>
      </section>
            <footer style={{ background: T.footerBg, padding:'20px 32px', textAlign:'center', borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:4 }}>
          <img src={SITE_LOGO} alt="SK Logo" style={{ width:32, height:32, objectFit:'contain' }}/>
          <p style={{ fontWeight:700, fontSize:12, color: T.footerText, fontFamily:'Inter,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>BAKAKENG CENTRAL</p>
        </div>
        <p style={{ fontSize:10, color: dark ? '#64748B' : 'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
          © 2026 Barangay Bakakeng Central. All Rights Reserved.
        </p>
      </footer>
      </div>}{/* end home page */}

      {/* ══ PAGE: ANNOUNCEMENTS ══ */}
      {activePage === 'announcements' && <div style={{ animation:'pageIn 0.2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column' }}>
      <section id="announcements" style={{ ...sty.section, padding: isMobile ? '28px 18px' : sty.section.padding, background: T.sectionBg, flex:1 }}>
        <h2 style={sty.h2}>Latest Announcements</h2>
        <p style={{ ...sty.sub, marginBottom:28 }}>Stay informed about important news and updates in our community.</p>
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          {announcements.length === 0 ? (
            <div style={{ ...sty.card, textAlign:'center', padding:'32px', color: T.textMuted, fontSize:14 }}>
              No recent announcements found.
            </div>
          ) : announcements.map(a => {
            const ss = annStatusStyle(a.status)
            const ts = annTypeStyle(a.type)
            return (
            <div key={a.id} style={{ ...sty.card, marginBottom:14, borderLeft:`4px solid ${ss.leftBorder}`, borderRadius:'0 12px 12px 0', padding:'16px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                <span style={{ fontWeight:700, fontSize:14, color: T.navy, fontFamily:'Inter,sans-serif', flex:1, minWidth:0 }}>{a.title}</span>
                {/* Status badge */}
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`, whiteSpace:'nowrap', flexShrink:0 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:ss.dot, flexShrink:0 }}/>
                  {a.status}
                </span>
                {/* Type badge */}
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:ts.bg, color:ts.color, border:`1px solid ${ts.border}`, whiteSpace:'nowrap', flexShrink:0 }}>
                  <span style={{ fontSize:9 }}>{ts.icon}</span>
                  {a.type}
                </span>
              </div>
              {a.date_time && <p style={{ fontSize:12, color: T.textMuted, marginBottom:4 }}>📅 {format(new Date(a.date_time),"MMM d, yyyy 'at' h:mm a")}</p>}
              {a.location   && <p style={{ fontSize:12, color: T.textMuted, marginBottom:6 }}>📍 {a.location}</p>}
              <p style={{ fontSize:13, color: T.text, lineHeight:1.7 }}>{a.content}</p>
              <p style={{ fontSize:11, color: T.textMuted, textAlign:'right', marginTop:8 }}>{a.created_at ? format(new Date(a.created_at),'MMM d, yyyy') : ''}</p>
            </div>
            )
          })}
        </div>
      </section>
            <footer style={{ background: T.footerBg, padding:'20px 32px', textAlign:'center', borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:4 }}>
          <img src={SITE_LOGO} alt="SK Logo" style={{ width:32, height:32, objectFit:'contain' }}/>
          <p style={{ fontWeight:700, fontSize:12, color: T.footerText, fontFamily:'Inter,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>BAKAKENG CENTRAL</p>
        </div>
        <p style={{ fontSize:10, color: dark ? '#64748B' : 'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
          © 2026 Barangay Bakakeng Central. All Rights Reserved.
        </p>
      </footer>
      </div>}{/* end announcements page */}

      {/* ══ PAGE: PROJECTS ══ */}
      {activePage === 'projects' && <div style={{ animation:'pageIn 0.2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column' }}>
      <section id="projects" style={{ ...sty.secAlt, padding: isMobile ? '20px 14px 32px' : sty.secAlt.padding, background: T.surface, flex:1 }}>

        {/* Page header */}
        <h2 style={sty.h2}>Community Projects</h2>
        <p style={{ ...sty.sub, marginBottom:40 }}>Track all SK initiatives — from ongoing programs to accomplished milestones.</p>

        {projects.length === 0 ? (
          <div style={{ maxWidth:480, margin:'0 auto', ...sty.card, textAlign:'center', padding:'40px 32px', color: T.textMuted, fontSize:14 }}>
            <p style={{ fontSize:32, margin:'0 0 12px' }}>📋</p>
            <p style={{ fontWeight:700, color:T.navy, marginBottom:6 }}>No projects yet</p>
            <p style={{ fontSize:12 }}>Projects will appear here once they are added by the SK team.</p>
          </div>
        ) : (() => {
          const upcoming   = projects.filter(p => (p.status||'').toLowerCase() !== 'completed')
          const accomplished = projects.filter(p => (p.status||'').toLowerCase() === 'completed')
          const statusColors = {
            upcoming:  { bg:'#DBEAFE', color:'#1D4ED8' },
            ongoing:   { bg:'#DCFCE7', color:'#166534' },
            'on hold': { bg:'#FEF9E7', color:'#7B4800' },
            planning:  { bg:'#EBF8FF', color:T.navy },
            completed: { bg:'#F0FFF4', color:'#276749' },
          }
          const StatusBadge = ({ status }) => {
            const s = (status||'upcoming').toLowerCase()
            const sc = statusColors[s] || { bg:'#F3F4F6', color:'#718096' }
            return (
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:20,
                background:sc.bg, color:sc.color, textTransform:'capitalize', whiteSpace:'nowrap' }}>
                {status||'upcoming'}
              </span>
            )
          }
          const ProjectCard = ({ p, onSelect }) => (
            <div onClick={() => onSelect(p)} style={{ ...sty.card, cursor:'pointer', transition:'all .18s',
              display:'flex', flexDirection:'column', gap:12, overflow:'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 28px rgba(0,0,0,.12)`; e.currentTarget.style.borderColor=T.navy }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=''; e.currentTarget.style.borderColor=T.border }}>
              {/* Image */}
              {(p.images||[]).filter(Boolean).length > 0 ? (
                <div style={{ margin:'-20px -20px 0', height: isMobile ? 160 : 140,
                  overflow:'hidden', borderRadius:'12px 12px 0 0' }}>
                  <img src={p.images[0]} alt={p.project_name}
                    style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
              ) : (
                <div style={{ margin:'-20px -20px 0', height: isMobile ? 100 : 80,
                  borderRadius:'12px 12px 0 0',
                  background:`linear-gradient(135deg,${T.navy}15,${T.gold}15)`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>
                  🏗️
                </div>
              )}
              {/* Content */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <StatusBadge status={p.status}/>
                  {p.budget && (
                    <span style={{ fontSize:11, fontWeight:700, color:T.gold }}>
                      ₱{parseFloat(p.budget).toLocaleString()}
                    </span>
                  )}
                </div>
                <p style={{ fontSize:14, fontWeight:800, color:T.navy, margin:'0 0 6px',
                  fontFamily:"'Montserrat','Inter',sans-serif", lineHeight:1.3 }}>
                  {p.project_name}
                </p>
                {p.description && (
                  <p style={{ fontSize:12, color:T.textMuted, margin:'0 0 8px', lineHeight:1.6 }}>
                    {p.description.length > 100 ? p.description.slice(0,100)+'…' : p.description}
                  </p>
                )}
                <div style={{ display:'flex', gap:12, fontSize:11, color:T.textMuted }}>
                  {p.fund_source && (
                    <span style={{ padding:'2px 8px', borderRadius:20, background:`${T.gold}15`,
                      color:T.gold, fontWeight:700, fontSize:10 }}>
                      {p.fund_source}
                    </span>
                  )}
                  {p.prepared_by && <span>👤 {p.prepared_by}</span>}
                </div>
              </div>
            </div>
          )
          return (
            <>
              {/* ── Upcoming / Ongoing ── */}
              {upcoming.length > 0 && (
                <div style={{ marginBottom:48 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:T.navy, flexShrink:0 }}/>
                    <h3 style={{ fontSize:18, fontWeight:800, color:T.navy, margin:0,
                      fontFamily:"'Montserrat','Inter',sans-serif", textTransform:'uppercase', letterSpacing:'0.5px' }}>
                      Upcoming Projects
                    </h3>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20,
                      background:`${T.navy}12`, color:T.navy }}>
                      {upcoming.length}
                    </span>
                  </div>
                  <ProjectsCarousel projects={upcoming} T={T}
                    onSelectProject={setSelectedProject} autoInterval={2000} isMobile={isMobile}/>
                </div>
              )}

              {/* ── Accomplished ── */}
              {accomplished.length > 0 && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:'#276749', flexShrink:0 }}/>
                    <h3 style={{ fontSize:18, fontWeight:800, color:'#276749', margin:0,
                      fontFamily:"'Montserrat','Inter',sans-serif", textTransform:'uppercase', letterSpacing:'0.5px' }}>
                      Accomplished Projects
                    </h3>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20,
                      background:'#F0FFF4', color:'#276749' }}>
                      {accomplished.length}
                    </span>
                  </div>
                  {/* Carousel for accomplished projects */}
                  <ProjectsCarousel projects={accomplished} T={T}
                    onSelectProject={setSelectedProject} autoInterval={2000} isMobile={isMobile}/>
                </div>
              )}

              {/* Both empty */}
              {upcoming.length === 0 && accomplished.length === 0 && (
                <div style={{ maxWidth:480, margin:'0 auto', ...sty.card, textAlign:'center', padding:'40px 32px', color: T.textMuted, fontSize:14 }}>
                  <p style={{ fontSize:32, margin:'0 0 12px' }}>📋</p>
                  <p style={{ fontWeight:700, color:T.navy, marginBottom:6 }}>No projects yet</p>
                  <p style={{ fontSize:12 }}>Projects will appear here once they are added by the SK team.</p>
                </div>
              )}
            </>
          )
        })()}
      </section>
            <footer style={{ background: T.footerBg, padding:'20px 32px', textAlign:'center', borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:4 }}>
          <img src={SITE_LOGO} alt="SK Logo" style={{ width:32, height:32, objectFit:'contain' }}/>
          <p style={{ fontWeight:700, fontSize:12, color: T.footerText, fontFamily:'Inter,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>BAKAKENG CENTRAL</p>
        </div>
        <p style={{ fontSize:10, color: dark ? '#64748B' : 'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
          © 2026 Barangay Bakakeng Central. All Rights Reserved.
        </p>
      </footer>
      </div>}{/* end projects page */}

      {/* ══ PAGE: EVENTS ══ */}
      {activePage === 'events' && <div style={{ animation:'pageIn 0.2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column' }}>
      <section style={{ padding:'32px 36px', background:T.surface, flex:1 }}>

        {/* Header with real-time clock */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ fontSize:28, fontWeight:800, color:T.navy, textTransform:'uppercase', letterSpacing:'1px', margin:'0 0 4px', fontFamily:'Inter,sans-serif' }}>Community Events</h2>
            <p style={{ fontSize:13, color:T.textMuted, margin:0 }}>Stay updated with the scheduled activities and events in Barangay Bakakeng Central.</p>
          </div>
          <div style={{ background:T.surface2, borderRadius:12, padding:'10px 18px', border:`1px solid ${T.border}`, textAlign:'right' }}>
            <p style={{ fontSize:12, color:T.textMuted, margin:'0 0 2px', fontFamily:'Inter,sans-serif' }}>
              {clock.toLocaleDateString('en-PH',{ weekday:'long', month:'long', day:'numeric', year:'numeric' })}
            </p>
            <p style={{ fontSize:20, fontWeight:800, color:T.navy, margin:0, fontFamily:'Inter,sans-serif', letterSpacing:'1px' }}>
              {clock.toLocaleTimeString('en-PH',{ hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </p>
          </div>
        </div>

        {/* Reminder strip */}
        {events.filter(ev => {
          if (!ev.start_date || (ev.status||'').toLowerCase()==='cancelled') return false
          const diff = new Date(ev.start_date) - clock
          return diff > 0 && diff <= 2*86400000
        }).length > 0 && (
          <div style={{ background:`${T.gold}12`, border:`1px solid ${T.gold}40`, borderRadius:12, padding:'10px 18px', marginBottom:22 }}>
            {events.filter(ev => {
              if (!ev.start_date || (ev.status||'').toLowerCase()==='cancelled') return false
              const diff = new Date(ev.start_date) - clock
              return diff > 0 && diff <= 2*86400000
            }).map(ev => {
              const cd = evCountdown(ev)
              return (
                <div key={ev.id} onClick={() => setSelectedEv(ev)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:`1px solid ${T.gold}20`, cursor:'pointer' }}>
                  <span style={{ fontSize:16 }}>🔔</span>
                  <span style={{ fontSize:13, color:T.text, fontFamily:'Inter,sans-serif' }}>
                    <strong>Reminder:</strong> <em>{ev.title}</em> is{' '}
                    <strong style={{ color:cd?.color }}>{cd?.label}</strong>
                  </span>
                  <ChevronRight size={14} style={{ marginLeft:'auto', color:T.gold }}/>
                </div>
              )
            })}
          </div>
        )}

        {/* Calendar + Event List layout */}
        <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:24, alignItems:'flex-start', maxWidth:1200, margin:'0 auto' }}>

          {/* LEFT: 4-month calendar grid with prev/next navigation */}
          <div style={{ flex:'2 1 0', minWidth:0 }}>

            {/* Slide navigation */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:8 }}>
              <button onClick={() => setCalSlide(s => Math.max(0, s-1))} disabled={calSlide===0}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9,
                  border:`1.5px solid ${T.border}`, background: calSlide===0 ? T.surface2 : T.surface,
                  color: calSlide===0 ? T.textMuted : T.navy, cursor: calSlide===0 ? 'not-allowed' : 'pointer',
                  fontSize:12, fontWeight:700, transition:'all .15s', opacity: calSlide===0 ? 0.45 : 1 }}>
                <ChevronLeft size={14}/> Prev
              </button>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:14, fontWeight:800, color:T.navy, margin:0, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  {SLIDE_LABELS[calSlide]}
                </p>
                <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:6 }}>
                  {[0,1,2].map(i => (
                    <button key={i} onClick={() => setCalSlide(i)}
                      style={{ width: calSlide===i ? 20 : 8, height:8, borderRadius:4, border:'none', padding:0,
                        background: calSlide===i ? T.navy : T.border, cursor:'pointer', transition:'all .2s' }}/>
                  ))}
                </div>
              </div>
              <button onClick={() => setCalSlide(s => Math.min(2, s+1))} disabled={calSlide===2}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9,
                  border:`1.5px solid ${T.border}`, background: calSlide===2 ? T.surface2 : T.surface,
                  color: calSlide===2 ? T.textMuted : T.navy, cursor: calSlide===2 ? 'not-allowed' : 'pointer',
                  fontSize:12, fontWeight:700, transition:'all .15s', opacity: calSlide===2 ? 0.45 : 1 }}>
                Next <ChevronRight size={14}/>
              </button>
            </div>

            {/* 4-month grid — 2×2 */}
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap:12, overflow:'visible' }}>
              {months.map(m => (
                <CalGrid key={m.toString()} month={m} events={events} T={T}
                  selectedDate={selectedDate}
                  onDateClick={d => { setSelectedDate(d); const evs = eventsOnDate(d); setSelectedEv(evs[0]||null) }}/>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display:'flex', gap:16, marginTop:14, flexWrap:'wrap' }}>
              {[
                { bg:T.navy,        border:'none',                    label:'Has events' },
                { bg:'transparent', border:`1.5px solid ${T.gold}`,  label:'Today' },
                { bg:'#F6AD55',     border:'none',                    label:'Selected date' },
              ].map(({bg,border,label}) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:14, height:14, borderRadius:'50%', background:bg, border, display:'inline-block', flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:T.textMuted, fontFamily:'Inter,sans-serif' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: event list or detail panel */}
          <div style={{ flex:'0 0 300px', minWidth: isMobile ? '100%' : 280, maxWidth: isMobile ? '100%' : 320 }}>

            {selectedEv ? (
              /* ── Detail view ── */
              <EventDetailPanel ev={selectedEv} clock={clock} evCountdown={evCountdown} T={T}
                onClose={() => { setSelectedEv(null); setSelectedDate(null) }}/>
            ) : (
              /* ── Event list ── */
              <div style={{ background:T.surface, borderRadius:16, border:`1px solid ${T.border}`, overflow:'hidden' }}>
                {/* List header */}
                <div style={{ padding:'14px 16px', background:`linear-gradient(135deg,${T.navy},${T.navyLt})` }}>
                  <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 2px', fontFamily:'Inter,sans-serif' }}>
                    {selectedDate
                      ? `Events on ${new Date(selectedDate).toLocaleDateString('en-PH',{month:'long',day:'numeric'})}`
                      : 'All Events'}
                  </p>
                  <p style={{ fontSize:15, fontWeight:800, color:'white', margin:0, fontFamily:"'Montserrat','Inter',sans-serif" }}>
                    {selectedDate ? eventsOnDate(selectedDate).length : events.filter(ev => (ev.status||'').toLowerCase() !== 'completed').length} event{(selectedDate ? eventsOnDate(selectedDate).length : events.filter(ev => (ev.status||'').toLowerCase() !== 'completed').length) !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Scrollable event list */}
                <div style={{ maxHeight: isMobile ? 'none' : 480, overflowY:'auto' }}>
                  {(() => {
                    const listEvs = selectedDate
                      ? eventsOnDate(selectedDate)
                      : events.filter(ev => (ev.status||'').toLowerCase() !== 'completed')
                            .sort((a,b) => new Date(a.start_date||0) - new Date(b.start_date||0))

                    if (listEvs.length === 0) return (
                      <div style={{ padding:'32px 16px', textAlign:'center' }}>
                        <p style={{ fontSize:28, margin:'0 0 8px' }}>📭</p>
                        <p style={{ fontSize:13, color:T.textMuted, fontFamily:'Inter,sans-serif' }}>
                          {selectedDate ? 'No events on this date.' : 'No upcoming events.'}
                        </p>
                      </div>
                    )
                    return listEvs.map((ev, idx) => {
                      const cd = evCountdown(ev)
                      const isCancelled = (ev.status||'').toLowerCase() === 'cancelled'
                      const statusColors = {
                        upcoming:  { bg:'#DBEAFE', color:'#1D4ED8' },
                        ongoing:   { bg:'#DCFCE7', color:'#166534' },
                        planning:  { bg:'#EBF8FF', color:T.navy },
                        cancelled: { bg:'#FEE2E2', color:'#DC2626' },
                        completed: { bg:'#F0FFF4', color:'#276749' },
                      }
                      const sc = statusColors[(ev.status||'').toLowerCase()] || { bg:'#F3F4F6', color:'#718096' }
                      return (
                        <div key={ev.id}
                          onClick={() => setSelectedEv(ev)}
                          style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`,
                            cursor:'pointer', transition:'background .15s',
                            background: idx % 2 === 0 ? T.surface : T.surface2 }}
                          onMouseEnter={e => e.currentTarget.style.background=`${T.navy}10`}
                          onMouseLeave={e => e.currentTarget.style.background = idx%2===0 ? T.surface : T.surface2}>
                          {/* Date row */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                            <p style={{ fontSize:11, fontWeight:700, color:T.textMuted, margin:0, fontFamily:'Inter,sans-serif' }}>
                              📅 {ev.start_date
                                ? new Date(ev.start_date).toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric',year:'numeric'})
                                : '—'}
                            </p>
                            <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:20,
                              background:sc.bg, color:sc.color, textTransform:'capitalize' }}>
                              {ev.status||'upcoming'}
                            </span>
                          </div>
                          {/* Title row */}
                          <p style={{ fontSize:13, fontWeight:700, color:T.navy, margin:'0 0 3px',
                            fontFamily:"'Montserrat','Inter',sans-serif", lineHeight:1.3 }}>
                            {ev.title}
                          </p>
                          {/* Countdown + chevron */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            {cd && !isCancelled
                              ? <span style={{ fontSize:10, fontWeight:600, color:cd.color }}>⏱ {cd.label}</span>
                              : <span style={{ fontSize:10, color:T.textMuted }}>
                                  {ev.location ? `📍 ${ev.location}` : ev.handler ? `👤 ${ev.handler}` : ''}
                                </span>}
                            <ChevronRight size={13} style={{ color:T.textMuted, flexShrink:0 }}/>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>

                {/* Footer hint */}
                <div style={{ padding:'10px 16px', background:T.surface2, borderTop:`1px solid ${T.border}` }}>
                  <p style={{ fontSize:10, color:T.textMuted, margin:0, fontFamily:'Inter,sans-serif', textAlign:'center' }}>
                    Tap any event to view details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <footer style={{ background:T.footerBg, padding:'20px 32px', textAlign:'center', borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:4 }}>
          <img src={SITE_LOGO} alt="SK Logo" style={{ width:32, height:32, objectFit:'contain' }}/>
          <p style={{ fontWeight:700, fontSize:12, color:T.footerText, fontFamily:'Inter,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>BAKAKENG CENTRAL</p>
        </div>
        <p style={{ fontSize:10, color:dark?'#64748B':'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
          © 2026 Barangay Bakakeng Central. All Rights Reserved.
        </p>
      </footer>
      </div>}{/* end events page */}

      {/* ══ PAGE: FEEDBACK ══ */}
      {activePage === 'feedback' && <div style={{ animation:'pageIn 0.2s ease', flex:1, overflowY:'auto', height:'100%', display:'flex', flexDirection:'column' }}>
      <section id="feedback" style={{ ...sty.secAlt, padding: isMobile ? '28px 18px' : sty.secAlt.padding, background: T.surface, flex:1 }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 24 : 48, alignItems:'center', flexWrap:'wrap' }}>
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

            <footer style={{ background: T.footerBg, padding:'20px 32px', textAlign:'center', borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:4 }}>
          <img src={SITE_LOGO} alt="SK Logo" style={{ width:32, height:32, objectFit:'contain' }}/>
          <p style={{ fontWeight:700, fontSize:12, color: T.footerText, fontFamily:'Inter,sans-serif', letterSpacing:'1px', textTransform:'uppercase' }}>BAKAKENG CENTRAL</p>
        </div>
        <p style={{ fontSize:10, color: dark ? '#64748B' : 'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
          © 2026 Barangay Bakakeng Central. All Rights Reserved.
        </p>
      </footer>
      </div>}{/* end feedback page */}


      {/* ══ ISKAI CHATBOT (bottom-right) ══ */}
      <ISKAIChat onNavigate={setActivePage}/>

      {/* ══ REPORT CONCERN FAB (bottom-left) ══ */}
      <a href="https://www.facebook.com/share/1D6aTWgdiR/" target="_blank" rel="noreferrer"
        title="Report a Website Concern"
        style={{ position:'fixed', bottom:24, left:24, width:52, height:52, borderRadius:'50%', background: T.crimson, border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(197,48,48,0.45)', zIndex:8000, textDecoration:'none' }}>
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

      {selectedProject && (
        <ProjectDetailModal project={selectedProject} T={T} onClose={() => setSelectedProject(null)} />
      )}

      <ConfirmDialog open={logoutOpen} onClose={() => setLogout(false)} onConfirm={handleLogout}
        title="Log Out?" message="Are you sure you want to log out?" danger/>
        </div>{/* end scrollable content */}
      </div>{/* end main content area */}
      <style>{sidebarCSS}</style>
    </div>
  )
}
