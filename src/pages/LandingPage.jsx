import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/* ══════════════════════════════════════════════════════
   LANDING PAGE — YouthLink / Barangay Bakakeng Central
   Aesthetic: Cyber-Translucency · Dark Glassmorphism
══════════════════════════════════════════════════════ */

/* ── Global keyframes injected once ── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Sora:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #020817; }
  ::-webkit-scrollbar-thumb { background: rgba(96,165,250,0.3); border-radius: 3px; }

  .light-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
  .light-scrollbar::-webkit-scrollbar-thumb { background: rgba(37,99,235,0.25); }
    background: rgba(255,255,255,0.92) !important;
    border: 1px solid rgba(99,102,241,0.15) !important;
    box-shadow: 0 2px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9) !important;
    backdrop-filter: blur(12px);
  }
  .light-glass:hover {
    border-color: rgba(99,102,241,0.3) !important;
    box-shadow: 0 6px 28px rgba(0,0,0,0.1), 0 0 0 1px rgba(99,102,241,0.15) !important;
    background: rgba(248,250,255,0.98) !important;
  }
  .light-glass-static {
    background: rgba(255,255,255,0.92) !important;
    border: 1px solid rgba(99,102,241,0.15) !important;
    box-shadow: 0 2px 16px rgba(0,0,0,0.07) !important;
    border-radius: 16px;
    backdrop-filter: blur(12px);
  }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
  @keyframes slideL    { from { opacity:0; transform:translateX(-30px) } to { opacity:1; transform:translateX(0) } }
  @keyframes slideR    { from { opacity:0; transform:translateX(30px) } to { opacity:1; transform:translateX(0) } }
  @keyframes glow      { 0%,100% { box-shadow: 0 0 20px rgba(96,165,250,.25) } 50% { box-shadow: 0 0 40px rgba(96,165,250,.55) } }
  @keyframes orbPulse  { 0%,100% { transform:scale(1) } 50% { transform:scale(1.12) } }
  @keyframes scan      { 0% { background-position:0 0 } 100% { background-position:0 100vh } }
  @keyframes spin      { to { transform:rotate(360deg) } }
  @keyframes shimmer   { 0% { background-position:200% center } 100% { background-position:-200% center } }
  @keyframes float     { 0%,100% { transform:translateY(0px) } 50% { transform:translateY(-12px) } }
  @keyframes blink     { 0%,100% { opacity:1 } 50% { opacity:0 } }
  @keyframes calPop    { from { opacity:0; transform:translateY(8px) scale(.96) } to { opacity:1; transform:translateY(0) scale(1) } }
  @keyframes gradShift { 0% { background-position:0% 50% } 50% { background-position:100% 50% } 100% { background-position:0% 50% } }
  @keyframes projBar { from { width:0% } to { width:100% } }

  .glass {
    background: rgba(15,23,42,0.65);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(96,165,250,0.14);
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04);
    transition: border-color .3s, box-shadow .3s, background .3s;
  }
  .glass:hover {
    border-color: rgba(96,165,250,0.35);
    box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(96,165,250,0.12), inset 0 1px 0 rgba(255,255,255,0.07);
    background: rgba(30,41,59,0.72);
  }
  .glass-static {
    background: rgba(15,23,42,0.65);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(96,165,250,0.14);
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .nav-link {
    color: rgba(148,163,184,0.75);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 8px;
    transition: color .2s, background .2s;
    font-family: 'Sora', sans-serif;
  }
  .nav-link:hover { color: #E2E8F0; background: rgba(96,165,250,0.08); }

  .cta-red {
    background: linear-gradient(135deg, #DC2626, #F87171);
    color: white;
    border: none;
    cursor: pointer;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    transition: all .25s;
    box-shadow: 0 0 24px rgba(248,113,113,0.45), 0 4px 16px rgba(0,0,0,0.3);
  }
  .cta-red:hover {
    transform: translateY(-3px);
    box-shadow: 0 0 40px rgba(248,113,113,0.65), 0 8px 28px rgba(0,0,0,0.4);
  }
  .cta-blue {
    background: rgba(96,165,250,0.12);
    color: #60A5FA;
    border: 1.5px solid rgba(96,165,250,0.45);
    cursor: pointer;
    font-family: 'Sora', sans-serif;
    font-weight: 600;
    backdrop-filter: blur(8px);
    transition: all .25s;
    box-shadow: 0 0 16px rgba(96,165,250,0.2);
  }
  .cta-blue:hover {
    background: rgba(96,165,250,0.22);
    transform: translateY(-3px);
    box-shadow: 0 0 28px rgba(96,165,250,0.4);
  }
  .search-glow:focus {
    border-color: rgba(96,165,250,0.6) !important;
    box-shadow: 0 0 0 3px rgba(96,165,250,0.15), 0 0 32px rgba(96,165,250,0.2) !important;
    outline: none;
  }
  input::placeholder { color: rgba(100,116,139,0.7) !important; font-family:'Sora',sans-serif; }
  .cal-day { border-radius: 8px; cursor: default; transition: all .18s; font-size: 12px; text-align:center; padding: 5px 2px; font-family:'Sora',sans-serif; }
  .cal-day.has-event { cursor: pointer; }
  .cal-day.has-event:hover { background: rgba(96,165,250,0.22) !important; }
  .stat-num { font-family:'Orbitron',monospace; font-weight:700; }
`

/* ── Animated night-city background ── */
function NightBg() {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      {/* Base gradient — deep night */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(175deg,#010b1e 0%,#030d22 30%,#050f28 60%,#0a0820 100%)' }}/>

      {/* City glow pools */}
      <div style={{ position:'absolute', bottom:'5%', left:'50%', transform:'translateX(-50%)', width:'160%', height:'55%',
        background:'radial-gradient(ellipse at center bottom, rgba(30,58,138,0.18) 0%, rgba(14,30,64,0.09) 45%, transparent 70%)'
      }}/>
      <div style={{ position:'absolute', top:'30%', right:'-10%', width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 65%)' }}/>
      <div style={{ position:'absolute', top:'10%', left:'-5%', width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 65%)' }}/>
      <div style={{ position:'absolute', bottom:'25%', right:'20%', width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(248,113,113,0.04) 0%, transparent 65%)' }}/>

      {/* Grid mesh */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.035 }}>
        <defs>
          <pattern id="pg" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M56 0L0 0 0 56" fill="none" stroke="#60A5FA" strokeWidth="0.6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pg)"/>
      </svg>

      {/* Diagonal accent line */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04 }}>
        <line x1="0" y1="100%" x2="100%" y2="0" stroke="#60A5FA" strokeWidth="1"/>
        <line x1="-20%" y1="100%" x2="80%" y2="0" stroke="#FBBF24" strokeWidth="0.5"/>
      </svg>

      {/* Stars */}
      {Array.from({length:60},(_,i)=>(
        <div key={i} style={{
          position:'absolute',
          left:`${(i*37+11)%100}%`,
          top:`${(i*53+7)%65}%`,
          width: i%5===0 ? 2 : 1,
          height: i%5===0 ? 2 : 1,
          borderRadius:'50%',
          background:'white',
          opacity: 0.15 + (i%4)*0.08,
          animation:`blink ${2+(i%4)*0.7}s ease-in-out ${i*0.3}s infinite`,
        }}/>
      ))}

      {/* Scan lines overlay */}
      <div style={{ position:'absolute', inset:0,
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 4px)',
      }}/>
    </div>
  )
}

/* ── Section label ── */
function SectionLabel({ icon, label, color='#60A5FA', dark=true }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
      <div style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:14, background:`${color}18`, border:`1px solid ${color}30` }}>
        {icon}
      </div>
      <span style={{ fontSize:11, fontWeight:700, color, textTransform:'uppercase',
        letterSpacing:'2.5px', fontFamily:'Orbitron,monospace' }}>
        {label}
      </span>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${color}40,transparent)` }}/>
    </div>
  )
}

/* ── Announcement card ── */
const TYPE_META = {
  'Sports':             { icon:'🏃', color:'#F87171' },
  'Assembly':           { icon:'📢', color:'#60A5FA' },
  'General':            { icon:'📋', color:'#FBBF24' },
  'Seminar':            { icon:'🎓', color:'#A78BFA' },
  'Training & Workshop':{ icon:'🔧', color:'#34D399' },
}
const STATUS_COLOR = {
  upcoming:'#60A5FA', ongoing:'#34D399', finished:'#64748B', cancelled:'#F87171'
}

function AnnCard({ a, idx, dark=true }) {
  const { icon, color } = TYPE_META[a.type] || { icon:'📌', color:'#FBBF24' }
  const sc = STATUS_COLOR[(a.status||'').toLowerCase()] || '#64748B'
  const cardStyle = dark
    ? { padding:'14px 16px', cursor:'default', animation:`slideL .5s ease ${idx*0.1}s both` }
    : { padding:'14px 16px', cursor:'default', animation:`slideL .5s ease ${idx*0.1}s both`,
        background:'rgba(255,255,255,0.95)', border:'1px solid rgba(203,213,225,0.7)',
        boxShadow:'0 2px 10px rgba(0,0,0,0.05)', borderRadius:16 }
  return (
    <div className={dark ? 'glass' : ''} style={cardStyle}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
          background:`${color}1a`, border:`1px solid ${color}35`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
          {icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6, marginBottom:4 }}>
            <p style={{ fontSize:13, fontWeight:700, color: dark ? '#E2E8F0' : '#0f172a', margin:0,
              fontFamily:'Sora,sans-serif', lineHeight:1.3, flex:1 }}>
              {a.title}
            </p>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, flexShrink:0,
              background:`${sc}1a`, color:sc, border:`1px solid ${sc}35`,
              textTransform:'capitalize', whiteSpace:'nowrap' }}>
              {a.status||'upcoming'}
            </span>
          </div>
          <p style={{ fontSize:11, color: dark ? '#64748B' : '#475569', margin:'0 0 6px', lineHeight:1.55,
            fontFamily:'Sora,sans-serif',
            overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {a.content}
          </p>
          {(a.date_time || a.created_at) && (
            <p style={{ fontSize:10, color:`${color}${dark?'80':'cc'}`, margin:0,
              display:'flex', alignItems:'center', gap:5, fontFamily:'Sora,sans-serif' }}>
              <span>📅</span>
              {new Date(a.date_time || a.created_at).toLocaleDateString('en-PH',
                { month:'short', day:'numeric', year:'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Project Carousel (mirrors Dashboard ProjectsCarousel) ── */
function ProjCarousel({ projects, label, color, goLogin }) {
  const [cur,    setCur]    = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const [dir,    setDir]    = React.useState('next')
  const total = projects.length

  const go = React.useCallback((idx, d='next') => {
    setDir(d)
    setCur((idx + total) % total)
  }, [total])

  React.useEffect(() => { setCur(0) }, [total])

  React.useEffect(() => {
    if (paused || total < 2) return
    const t = setInterval(() => go((cur+1)%total,'next'), 2000)
    return () => clearInterval(t)
  }, [cur, paused, total, go])

  if (total === 0) return null

  const p    = projects[cur]
  const imgs = (p.images||[]).filter(Boolean)
  const done = (p.status||'').toLowerCase() === 'completed'
  const STATUS_C = {
    upcoming: '#60A5FA', ongoing:'#34D399', planning:'#A78BFA', completed:'#34D399'
  }
  const sc = STATUS_C[(p.status||'').toLowerCase()] || '#64748B'

  return (
    <div onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}
      style={{ userSelect:'none' }}>
      {/* Main slide card */}
      <div key={`proj-${cur}`}
        style={{ background:'rgba(15,23,42,0.75)', borderRadius:14,
          border:`1px solid ${color}25`, overflow:'hidden', cursor:'default',
          boxShadow:`0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${color}10`,
          animation:`${dir==='next'?'slideR':'slideL'} 0.38s cubic-bezier(.4,0,.2,1) both` }}>
        {/* Image */}
        <div style={{ position:'relative', width:'100%', paddingBottom:'48%',
          background:'#040d1e', overflow:'hidden' }}>
          {imgs.length > 0
            ? <img src={imgs[0]} alt={p.project_name} key={`img-${cur}`}
                style={{ position:'absolute', inset:0, width:'100%', height:'100%',
                  objectFit:'cover', animation:'fadeIn .4s ease' }}/>
            : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:48,
                background:`linear-gradient(135deg,${color}12,rgba(251,191,36,0.08))` }}>🏗️</div>}
          {/* Gradient overlay */}
          <div style={{ position:'absolute', inset:0,
            background:'linear-gradient(0deg,rgba(2,8,23,.75) 0%,transparent 55%)' }}/>
          {/* Progress bar */}
          {total > 1 && !paused && (
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3,
              background:'rgba(255,255,255,0.08)' }}>
              <div key={`bar-${cur}`} style={{ height:'100%', background:color,
                animation:'projBar 2s linear forwards',
                boxShadow:`0 0 6px ${color}` }}/>
            </div>
          )}
          {/* Nav arrows */}
          {total > 1 && (<>
            <button onClick={()=>go(cur-1,'prev')}
              style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.55)',
                border:`1px solid ${color}40`, color:'white', fontSize:18,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                zIndex:2, transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.8)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.55)'}>‹</button>
            <button onClick={()=>go(cur+1,'next')}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.55)',
                border:`1px solid ${color}40`, color:'white', fontSize:18,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                zIndex:2, transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.8)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.55)'}>›</button>
          </>)}
          {/* Counter */}
          {total > 1 && (
            <div style={{ position:'absolute', top:10, right:10,
              background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)',
              borderRadius:20, padding:'2px 10px', fontSize:10, fontWeight:700,
              color:'white', fontFamily:'Orbitron,monospace' }}>
              {cur+1}/{total}
            </div>
          )}
        </div>
        {/* Info */}
        <div style={{ padding:'14px 16px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:8, flexWrap:'wrap', gap:6 }}>
            <span style={{ fontSize:9, fontWeight:800, padding:'3px 12px', borderRadius:20,
              background:`${sc}18`, color:sc, border:`1px solid ${sc}30`,
              textTransform:'capitalize', fontFamily:'Orbitron,monospace',
              boxShadow:`0 0 8px ${sc}30` }}>
              {p.status||'upcoming'}
            </span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {p.budget && <span style={{ fontSize:12, fontWeight:700, color:'#FBBF24',
                fontFamily:'Sora,sans-serif' }}>₱{parseFloat(p.budget).toLocaleString()}</span>}
              {p.fund_source && (
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20,
                  background:'rgba(251,191,36,0.12)', color:'#FBBF24',
                  border:'1px solid rgba(251,191,36,0.25)', fontFamily:'Sora,sans-serif' }}>
                  {p.fund_source}
                </span>
              )}
            </div>
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:'#E2E8F0', margin:'0 0 6px',
            fontFamily:'Orbitron,monospace', lineHeight:1.3 }}>{p.project_name}</p>
          {p.description && (
            <p style={{ fontSize:11, color:'#64748B', margin:'0 0 12px', lineHeight:1.6,
              fontFamily:'Sora,sans-serif',
              overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
              {p.description}
            </p>
          )}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', gap:12, fontSize:10, color:'#475569', flexWrap:'wrap' }}>
              {p.prepared_by && <span style={{ fontFamily:'Sora,sans-serif' }}>👤 {p.prepared_by}</span>}
              {p.start_date && <span style={{ fontFamily:'Sora,sans-serif' }}>
                📅 {new Date(p.start_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
              </span>}
            </div>
            <button onClick={goLogin}
              style={{ fontSize:11, fontWeight:700, padding:'7px 16px', borderRadius:8,
                background:color, color:'white', border:'none', cursor:'pointer',
                fontFamily:'Sora,sans-serif', boxShadow:`0 0 12px ${color}50`,
                transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 0 20px ${color}70`}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=`0 0 12px ${color}50`}}>
              View Details →
            </button>
          </div>
        </div>
      </div>
      {/* Dot indicators */}
      {total > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:12 }}>
          {projects.map((_,i) => (
            <button key={i} onClick={()=>go(i, i>=cur?'next':'prev')}
              style={{ width:i===cur?20:7, height:7, borderRadius:4, border:'none', padding:0,
                background:i===cur?color:'rgba(255,255,255,0.12)', cursor:'pointer',
                transition:'all .3s', boxShadow:i===cur?`0 0 8px ${color}`:'' }}/>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Interactive Calendar ── */
function Calendar({ events, dark=true }) {
  const today = new Date()
  const [vm, setVm] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [tooltip, setTooltip] = useState(null) // { day, evs }

  const year = vm.getFullYear(), month = vm.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()

  const evOnDay = d => events.filter(ev => {
    try {
      const d2 = new Date(ev.start_date || ev.created_at)
      return d2.getFullYear()===year && d2.getMonth()===month && d2.getDate()===d
    } catch { return false }
  })

  const handleDayClick = (d, e) => {
    const evs = evOnDay(d)
    if (!evs.length) return
    setTooltip(prev => prev?.day === d ? null : { day:d, evs })
  }

  useEffect(() => {
    if (!tooltip) return
    const close = () => setTooltip(null)
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [tooltip])

  const monthLabel = vm.toLocaleDateString('en-PH',{month:'long',year:'numeric'}).toUpperCase()

  return (
    <div className={dark ? 'glass-static' : 'light-glass-static'} style={{ padding:'16px 14px', position:'relative' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <button onClick={() => setVm(new Date(year,month-1,1))}
          style={{ width:28, height:28, borderRadius:8,
            border: dark ? '1px solid rgba(96,165,250,0.25)' : '1px solid rgba(37,99,235,0.25)',
            background: dark ? 'rgba(96,165,250,0.08)' : 'rgba(37,99,235,0.07)',
            color: dark ? '#60A5FA' : '#2563eb', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
            transition:'background .15s' }}
          onMouseEnter={e=>e.currentTarget.style.background= dark?'rgba(96,165,250,0.18)':'rgba(37,99,235,0.15)'}
          onMouseLeave={e=>e.currentTarget.style.background= dark?'rgba(96,165,250,0.08)':'rgba(37,99,235,0.07)'}>‹</button>
        <span style={{ fontSize:11, fontWeight:700, color: dark?'#60A5FA':'#1e40af', letterSpacing:'2px',
          fontFamily:'Orbitron,monospace' }}>{monthLabel}</span>
        <button onClick={() => setVm(new Date(year,month+1,1))}
          style={{ width:28, height:28, borderRadius:8,
            border: dark ? '1px solid rgba(96,165,250,0.25)' : '1px solid rgba(37,99,235,0.25)',
            background: dark ? 'rgba(96,165,250,0.08)' : 'rgba(37,99,235,0.07)',
            color: dark ? '#60A5FA' : '#2563eb', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
            transition:'background .15s' }}
          onMouseEnter={e=>e.currentTarget.style.background= dark?'rgba(96,165,250,0.18)':'rgba(37,99,235,0.15)'}
          onMouseLeave={e=>e.currentTarget.style.background= dark?'rgba(96,165,250,0.08)':'rgba(37,99,235,0.07)'}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:9, fontWeight:700,
            color: dark ? 'rgba(96,165,250,0.45)' : '#94a3b8',
            paddingBottom:6, fontFamily:'Sora,sans-serif' }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {Array(firstDay).fill(null).map((_,i) => <div key={`b${i}`}/>)}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d => {
          const evs = evOnDay(d)
          const isToday = d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear()
          const hasEv = evs.length > 0
          return (
            <div key={d} style={{ position:'relative' }}>
              <div className={`cal-day${hasEv?' has-event':''}`}
                onClick={hasEv ? e=>handleDayClick(d,e) : undefined}
                style={{
                  background: isToday
                    ? (dark ? 'rgba(248,113,113,0.25)' : 'rgba(220,38,38,0.12)')
                    : hasEv
                    ? (dark ? 'rgba(96,165,250,0.15)' : 'rgba(37,99,235,0.1)')
                    : 'transparent',
                  color: isToday
                    ? '#F87171'
                    : hasEv ? (dark ? '#93C5FD' : '#2563eb')
                    : (dark ? '#475569' : '#64748b'),
                  fontWeight: isToday||hasEv ? 700 : 400,
                  border: isToday ? '1px solid rgba(248,113,113,0.5)'
                        : hasEv  ? (dark ? '1px solid rgba(96,165,250,0.28)' : '1px solid rgba(37,99,235,0.3)')
                        : '1px solid transparent',
                  boxShadow: isToday ? '0 0 8px rgba(248,113,113,0.3)'
                           : hasEv  ? (dark ? '0 0 6px rgba(96,165,250,0.18)' : 'none') : 'none',
                }}>
                {d}
              </div>
              {hasEv && (
                <div style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)',
                  width:3, height:3, borderRadius:'50%', background: dark ? '#FBBF24' : '#f59e0b',
                  boxShadow: dark ? '0 0 5px rgba(251,191,36,0.9)' : 'none' }}/>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
        {[
          { color:'#F87171', label:'Today' },
          { color: dark ? '#60A5FA' : '#2563eb', label:'Event' },
          { color: dark ? '#FBBF24' : '#f59e0b', label:'Marker' },
        ].map(({color,label})=>(
          <div key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color,
              boxShadow: dark ? `0 0 4px ${color}` : 'none' }}/>
            <span style={{ fontSize:9, color: dark ? '#475569' : '#64748b', fontFamily:'Sora,sans-serif' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Inline Event Preview Panel */}
      {tooltip && (
        <div onClick={e=>e.stopPropagation()}
          style={{ marginTop:14, animation:'calPop .2s ease both' }}>
          <div style={{
            background: dark ? 'rgba(10,18,38,0.85)' : 'rgba(255,255,255,0.98)',
            backdropFilter:'blur(20px)',
            border: dark ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(99,102,241,0.2)',
            borderRadius:12, padding:'12px 14px',
            boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(167,139,250,0.1)' : '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            {/* Panel header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:10, fontWeight:700, color: dark ? '#A78BFA' : '#7c3aed',
                fontFamily:'Orbitron,monospace', letterSpacing:'1px' }}>
                📅 {new Date(year,month,tooltip.day).toLocaleDateString('en-PH',{month:'long',day:'numeric'})}
              </span>
              <button onClick={()=>setTooltip(null)}
                style={{ background: dark ? 'rgba(96,165,250,0.08)' : 'rgba(0,0,0,0.05)',
                  border: dark ? '1px solid rgba(96,165,250,0.2)' : '1px solid rgba(0,0,0,0.1)',
                  borderRadius:6, cursor:'pointer', color: dark ? '#64748B' : '#94a3b8', fontSize:13,
                  lineHeight:1, padding:'2px 7px', transition:'all .15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(248,113,113,0.15)'; e.currentTarget.style.color='#F87171' }}
                onMouseLeave={e=>{ e.currentTarget.style.background= dark?'rgba(96,165,250,0.08)':'rgba(0,0,0,0.05)'; e.currentTarget.style.color= dark?'#64748B':'#94a3b8' }}>
                ×
              </button>
            </div>
            {/* Event list */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {tooltip.evs.map((ev,i)=>{
                const STATUS_C = {
                  upcoming:'#60A5FA', ongoing:'#34D399', planning:'#A78BFA',
                  completed:'#34D399', cancelled:'#F87171', finished:'#64748B'
                }
                const sc = STATUS_C[(ev.status||'').toLowerCase()] || '#64748B'
                return (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
                    padding:'8px 10px', borderRadius:8,
                    background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: dark ? '1px solid rgba(96,165,250,0.08)' : '1px solid rgba(0,0,0,0.06)',
                    borderLeft:`3px solid ${sc}`,
                  }}>
                    <p style={{ fontSize:12, fontWeight:600, color: dark ? '#E2E8F0' : '#0f172a', margin:0,
                      fontFamily:'Sora,sans-serif', lineHeight:1.3, flex:1,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {ev.title}
                    </p>
                    <span style={{ fontSize:9, fontWeight:700, padding:'3px 9px', borderRadius:20,
                      background:`${sc}18`, color:sc, border:`1px solid ${sc}35`,
                      textTransform:'capitalize', fontFamily:'Sora,sans-serif',
                      whiteSpace:'nowrap', flexShrink:0,
                      boxShadow: dark ? `0 0 6px ${sc}30` : 'none' }}>
                      {ev.status||'upcoming'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate()
  const [anns,    setAnns]    = useState([])
  const [projs,   setProjs]   = useState([])
  const [events,  setEvents]  = useState([])
  const [mobile,  setMobile]  = useState(window.innerWidth < 768)
  const [dark,    setDark]    = useState(true)

  useEffect(() => {
    const r = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])

  useEffect(() => {
    // ── Initial load — exact same queries as Dashboard.jsx ──────────────
    const load = async () => {
      const [a, p, e] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at',{ascending:false}),
        supabase.from('projects').select('*').order('created_at',{ascending:false}),
        supabase.from('events').select('*').order('start_date',{ascending:true}),
      ])
      if (a.data) setAnns(a.data)
      if (p.data) setProjs(p.data)
      if (e.data) setEvents(e.data)
    }
    load()

    // ── Realtime subscriptions — auto-sync when admin changes data ──────
    const annCh = supabase.channel('landing-anns')
      .on('postgres_changes',{ event:'*', schema:'public', table:'announcements' }, () => {
        supabase.from('announcements').select('*').order('created_at',{ascending:false})
          .then(({data}) => { if (data) setAnns(data) })
      }).subscribe()

    const projCh = supabase.channel('landing-projs')
      .on('postgres_changes',{ event:'*', schema:'public', table:'projects' }, () => {
        supabase.from('projects').select('*').order('created_at',{ascending:false})
          .then(({data}) => { if (data) setProjs(data) })
      }).subscribe()

    const evCh = supabase.channel('landing-evs')
      .on('postgres_changes',{ event:'*', schema:'public', table:'events' }, () => {
        supabase.from('events').select('*').order('start_date',{ascending:true})
          .then(({data}) => { if (data) setEvents(data) })
      }).subscribe()

    return () => {
      supabase.removeChannel(annCh)
      supabase.removeChannel(projCh)
      supabase.removeChannel(evCh)
    }
  }, [])

  const goLogin = () => navigate('/login')



  const F = 'Sora, sans-serif'
  const M = 'Orbitron, monospace'

  // ── Theme tokens ──
  const bg       = dark ? '#010b1e'                  : '#f4f6fb'
  const navBg    = dark ? 'rgba(1,11,30,0.92)'       : 'rgba(255,255,255,0.97)'
  const navBorder= dark ? 'rgba(96,165,250,0.1)'     : 'rgba(203,213,225,0.8)'
  const textMain = dark ? '#E2E8F0'                  : '#0f172a'
  const textSub  = dark ? '#94A3B8'                  : '#475569'
  const textMuted= dark ? '#64748B'                  : '#64748B'
  const cardBg   = dark ? 'rgba(15,23,42,0.65)'      : 'rgba(255,255,255,0.95)'
  const cardBdr  = dark ? 'rgba(96,165,250,0.14)'    : 'rgba(203,213,225,0.7)'
  const cardShadow= dark? '0 4px 24px rgba(0,0,0,0.45)' : '0 2px 12px rgba(0,0,0,0.06)'
  const glassClass= dark ? 'glass'                   : 'light-glass'
  const glassStaticClass = dark ? 'glass-static'     : 'light-glass-static'
  const accentBlue= dark ? '#60A5FA'                 : '#3B82F6'
  const sectionBg = dark ? 'transparent'             : 'linear-gradient(175deg,#eef2ff 0%,#f4f6fb 40%,#eff6ff 100%)'

  return (
    <div style={{ minHeight:'100vh', fontFamily:F, position:'relative', overflowX:'hidden', background:bg, transition:'background .3s' }}>
      <style>{GLOBAL_CSS}</style>
      {dark && <NightBg/>}

      {/* ── NAVBAR ── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:60,
        background:navBg, backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${navBorder}`,
        boxShadow: dark ? 'none' : '0 1px 16px rgba(0,0,0,0.08)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 28px', transition:'background .3s, border-color .3s, box-shadow .3s' }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <img src="/SK_Logo.png" alt="SK" style={{ width:36, height:36, objectFit:'contain' }}
            onError={e => { e.target.style.display='none' }}/>
          <div>
            <p style={{ fontSize:18, fontWeight:800, color: dark ? '#60A5FA' : '#1e3a8a', margin:0, fontFamily:M, letterSpacing:'1px' }}>
              YouthLink
            </p>
            <p style={{ fontSize:8, color: dark ? 'rgba(96,165,250,0.7)' : '#3b82f6', margin:0,
              textTransform:'uppercase', letterSpacing:'1.8px', fontFamily:F, fontWeight:700 }}>
              Bakakeng Central SK Portal
            </p>
          </div>
        </div>

        {/* Auth buttons + theme toggle */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          {/* Dark/Light toggle */}
          <button onClick={() => setDark(d => !d)}
            title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              width:38, height:38, borderRadius:10,
              border:`1px solid ${dark ? 'rgba(96,165,250,0.35)' : 'rgba(203,213,225,0.9)'}`,
              background: dark ? 'rgba(96,165,250,0.1)' : 'rgba(241,245,249,0.9)',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:17, transition:'all .25s', backdropFilter:'blur(8px)',
              boxShadow: dark ? '0 0 12px rgba(96,165,250,0.2)' : '0 1px 4px rgba(0,0,0,0.08)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(96,165,250,0.22)' : 'rgba(226,232,240,1)'}
            onMouseLeave={e => e.currentTarget.style.background = dark ? 'rgba(96,165,250,0.1)' : 'rgba(241,245,249,0.9)'}>
            {dark ? '☀️' : '🌙'}
          </button>
          <button className="cta-blue" onClick={goLogin}
            style={{ padding:'8px 20px', borderRadius:9, fontSize:12,
              ...(dark ? {} : { background:'#2563EB', color:'white', border:'none',
                boxShadow:'0 2px 12px rgba(37,99,235,0.3)', fontWeight:700 }) }}>
            Log In
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:'relative', zIndex:1, paddingTop:100, paddingBottom:40,
        background: sectionBg, transition:'background .3s' }}>
        <div style={{ maxWidth:1160, margin:'0 auto', padding:'0 20px' }}>

          {/* Badge */}
          <div style={{ textAlign:'center', marginBottom:20, animation:'fadeUp .6s ease both' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 18px',
              borderRadius:20,
              background: dark ? 'rgba(96,165,250,0.08)' : 'rgba(37,99,235,0.08)',
              border: dark ? '1px solid rgba(96,165,250,0.22)' : '1px solid rgba(37,99,235,0.2)',
              marginBottom:22 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#34D399',
                boxShadow:'0 0 8px rgba(52,211,153,0.9)', display:'block', flexShrink:0 }}/>
              <span style={{ fontSize:10, color: accentBlue, fontWeight:700,
                letterSpacing:'2.5px', textTransform:'uppercase', fontFamily:M }}>
                Official Digital Portal · Public Access
              </span>
            </div>

            {/* Headline */}
            <h1 style={{ fontFamily:M, fontWeight:900,
              fontSize: mobile ? 'clamp(20px,6vw,32px)' : 'clamp(26px,4vw,46px)',
              lineHeight:1.15, color: textMain, marginBottom:8,
              textShadow: dark ? '0 0 40px rgba(96,165,250,0.2)' : 'none',
              transition:'color .3s' }}>
              Welcome to the Official Portal of
            </h1>
            {/* SK name */}
            {dark ? (
              <p style={{ fontFamily:M, fontWeight:800,
                fontSize: mobile ? 'clamp(16px,5vw,24px)' : 'clamp(18px,2.8vw,32px)',
                lineHeight:1.2, marginBottom:6,
                background:'linear-gradient(90deg,#60A5FA,#A78BFA,#38BDF8,#60A5FA)',
                backgroundSize:'300% auto',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                backgroundClip:'text',
                animation:'gradShift 4s ease infinite',
              }}>
                Sangguniang Kabataan,
              </p>
            ) : (
              <p style={{ fontFamily:M, fontWeight:800,
                fontSize: mobile ? 'clamp(16px,5vw,24px)' : 'clamp(18px,2.8vw,32px)',
                lineHeight:1.2, marginBottom:6,
                color:'#2563eb',
              }}>
                Sangguniang Kabataan,
              </p>
            )}
            {/* Barangay name */}
            <p style={{ fontFamily:M, fontWeight:700,
              fontSize: mobile ? 'clamp(13px,4vw,19px)' : 'clamp(15px,2.2vw,24px)',
              lineHeight:1.3, marginBottom:18,
              color: dark ? 'rgba(96,165,250,0.75)' : '#1e40af',
              letterSpacing:'0.5px', transition:'color .3s',
            }}>
              Barangay Bakakeng Central
            </p>

            <p style={{ fontSize:mobile?12:14, color: textMuted, maxWidth:480, margin:'0 auto 28px',
              lineHeight:1.75, fontFamily:F }}>
              Your hyper-connected, transparency hub for community news, projects, and events —
              empowering the youth of Bakakeng Central.
            </p>

            {/* CTA row */}
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:26 }}>
              <button className="cta-red" onClick={goLogin}
                style={{ padding:'13px 36px', borderRadius:12, fontSize:13 }}>
                Register Now
              </button>
              <button onClick={goLogin}
                style={{ padding:'13px 32px', borderRadius:12, fontSize:13, cursor:'pointer',
                  fontFamily:F, fontWeight:600, transition:'all .25s',
                  ...(dark
                    ? { background:'rgba(96,165,250,0.12)', color:'#60A5FA',
                        border:'1.5px solid rgba(96,165,250,0.45)', backdropFilter:'blur(8px)',
                        boxShadow:'0 0 16px rgba(96,165,250,0.2)' }
                    : { background:'white', color:'#1e40af',
                        border:'1.5px solid rgba(37,99,235,0.35)',
                        boxShadow:'0 2px 12px rgba(37,99,235,0.12)' }) }}>
                Learn More About Us
              </button>
            </div>
          </div>

          {/* ── 2×2 GRID: Announcements | Calendar / Upcoming Projects | Accomplished ── */}
          <div style={{ display:'grid',
            gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
            gap:20, alignItems:'start', marginTop:8 }}>

            {/* ─── TOP-LEFT: Announcements ─── */}
            <div id="announcements">
              <SectionLabel icon="🔔" label="Latest Announcements" color={dark ? "#FBBF24" : "#d97706"} dark={dark}/>
              {anns.length === 0 ? (
                <div className={glassStaticClass} style={{ padding:'28px', textAlign:'center' }}>
                  <p style={{ color: textMuted, fontSize:12, fontFamily:F }}>
                    No announcements yet.
                  </p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {anns.slice(0,3).map((a,i) => <AnnCard key={a.id} a={a} idx={i} dark={dark}/>)}
                </div>
              )}
              <button onClick={goLogin}
                style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none',
                  cursor:'pointer', color: dark ? 'rgba(251,191,36,0.65)' : '#d97706',
                  fontSize:12, fontWeight:700, marginTop:12, padding:'6px 0', fontFamily:F, transition:'color .15s' }}
                onMouseEnter={e=>e.currentTarget.style.color= dark ? '#FBBF24' : '#b45309'}
                onMouseLeave={e=>e.currentTarget.style.color= dark ? 'rgba(251,191,36,0.65)' : '#d97706'}>
                View All Announcements ›
              </button>
            </div>

            {/* ─── TOP-RIGHT: Calendar ─── */}
            <div id="events">
              <SectionLabel icon="📅" label="Community Calendar at a Glance" color={dark ? "#A78BFA" : "#7c3aed"} dark={dark}/>
              <Calendar events={events.filter(ev => (ev.status||'').toLowerCase() !== 'cancelled')} dark={dark}/>
            </div>

            {/* ─── BOTTOM-LEFT: Upcoming Projects ─── */}
            <div id="upcoming-projects">
              {(() => {
                const upcoming = projs.filter(p => (p.status||'').toLowerCase() !== 'completed')
                return upcoming.length > 0 ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                      <SectionLabel icon="🚀" label="Upcoming Projects" color={dark?"#60A5FA":"#2563eb"} dark={dark}/>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:20,
                        background: dark?'rgba(96,165,250,0.12)':'rgba(37,99,235,0.1)',
                        color: dark?'#60A5FA':'#2563eb',
                        border: dark?'1px solid rgba(96,165,250,0.25)':'1px solid rgba(37,99,235,0.25)' }}>
                        {upcoming.length}
                      </span>
                    </div>
                    <ProjCarousel projects={upcoming} label="Upcoming" color={dark?"#60A5FA":"#2563eb"} goLogin={goLogin}/>
                    <button onClick={goLogin}
                      style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none',
                        cursor:'pointer', color: dark?'rgba(96,165,250,0.5)':'#2563eb',
                        fontSize:10, fontWeight:700, marginTop:10, padding:'4px 0', fontFamily:F, transition:'color .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.color= dark?'#60A5FA':'#1d4ed8'}
                      onMouseLeave={e=>e.currentTarget.style.color= dark?'rgba(96,165,250,0.5)':'#2563eb'}>
                      View All Projects ›
                    </button>
                  </div>
                ) : (
                  <div>
                    <SectionLabel icon="🚀" label="Upcoming Projects" color={dark?"#60A5FA":"#2563eb"} dark={dark}/>
                    <div className={glassStaticClass} style={{ padding:'28px', textAlign:'center' }}>
                      <p style={{ fontSize:24, margin:'0 0 8px' }}>🏗️</p>
                      <p style={{ color: textMuted, fontSize:12, fontFamily:F }}>No upcoming projects yet.</p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* ─── BOTTOM-RIGHT: Accomplished Projects ─── */}
            <div id="accomplished-projects">
              {(() => {
                const accomplished = projs.filter(p => (p.status||'').toLowerCase() === 'completed')
                return accomplished.length > 0 ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                      <SectionLabel icon="✅" label="Accomplished" color={dark?"#34D399":"#059669"} dark={dark}/>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:20,
                        background: dark?'rgba(52,211,153,0.12)':'rgba(5,150,105,0.1)',
                        color: dark?'#34D399':'#059669',
                        border: dark?'1px solid rgba(52,211,153,0.25)':'1px solid rgba(5,150,105,0.25)' }}>
                        {accomplished.length}
                      </span>
                    </div>
                    <ProjCarousel projects={accomplished} label="Accomplished" color={dark?"#34D399":"#059669"} goLogin={goLogin}/>
                    <button onClick={goLogin}
                      style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none',
                        cursor:'pointer', color: dark?'rgba(52,211,153,0.5)':'#059669',
                        fontSize:10, fontWeight:700, marginTop:10, padding:'4px 0', fontFamily:F, transition:'color .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.color= dark?'#34D399':'#047857'}
                      onMouseLeave={e=>e.currentTarget.style.color= dark?'rgba(52,211,153,0.5)':'#059669'}>
                      View All Accomplished ›
                    </button>
                  </div>
                ) : (
                  <div>
                    <SectionLabel icon="✅" label="Accomplished" color={dark?"#34D399":"#059669"} dark={dark}/>
                    <div className={glassStaticClass} style={{ padding:'28px', textAlign:'center' }}>
                      <p style={{ fontSize:24, margin:'0 0 8px' }}>✅</p>
                      <p style={{ color: textMuted, fontSize:12, fontFamily:F }}>No completed projects yet.</p>
                    </div>
                  </div>
                )
              })()}
            </div>

          </div>

          {/* ── FOOTER BAR ── */}
          <div style={{ marginTop:20, paddingBottom:32, animation:'fadeUp .7s ease .45s both' }}>
            <div style={{
              background: dark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.95)',
              backdropFilter:'blur(18px)', borderRadius:16,
              border: dark ? '1px solid rgba(96,165,250,0.18)' : '1px solid rgba(203,213,225,0.7)',
              boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.45)' : '0 2px 12px rgba(0,0,0,0.06)',
              padding:'18px 28px', transition:'background .3s, border-color .3s'
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                flexWrap:'wrap', gap:14 }}>
                {/* Brand */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <img src="/SK_Logo.png" alt="SK" style={{ width:32, height:32, objectFit:'contain' }}
                    onError={e=>e.target.style.display='none'}/>
                  <div>
                    <p style={{ fontSize:13, fontWeight:800, color: dark?'#60A5FA':'#1e3a8a', margin:0, fontFamily:M, letterSpacing:'1px' }}>
                      YouthLink
                    </p>
                    <p style={{ fontSize:10, color: textSub, margin:0, fontFamily:F, fontWeight:700 }}>
                      © 2026 Barangay Bakakeng Central · Baguio City
                    </p>
                  </div>
                </div>
                {/* Links */}
                <div style={{ display:'flex', gap:22, flexWrap:'wrap', alignItems:'center' }}>
                  {[
                    { href:'mailto:skbakakengcentral90@gmail.com', label:'📧 skbakakengcentral90@gmail.com' },
                    { href:'https://www.facebook.com/share/1D6aTWgdiR/', label:'📘 Facebook', target:'_blank' },
                    { href:'https://www.google.com/maps/place/Bakakeng+Central,+Baguio,+Benguet/@16.3960839,120.5819894,19.15z/data=!4m6!3m5!1s0x3391a108bceb3ed1:0x23955f79dc2dec62!8m2!3d16.3952949!4d120.5811515!16s%2Fg%2F11fyxdbcf7?entry=ttu&g_ep=EgoyMDI2MDMxOC4xIKXMDSoASAFQAw%3D%3D', label:'📍 Bakakeng Central, Baguio City', target:'_blank' },
                  ].map(({href, label, target}) => (
                    <a key={href} href={href} target={target} rel="noreferrer"
                      style={{ fontSize:12, color: textSub, display:'flex', alignItems:'center', gap:6,
                        fontFamily:F, fontWeight:700, textDecoration:'none', transition:'color .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.color= dark?'#60A5FA':'#1d4ed8'}
                      onMouseLeave={e=>e.currentTarget.style.color=textSub}>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>


    </div>
  )
}
