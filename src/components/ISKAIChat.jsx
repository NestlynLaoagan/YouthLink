import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'

// Anthropic API Key
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''

// Theme defaults
const C_DEFAULT = {
  navy: '#0F2444', navyMid: '#1A365D', navyLt: '#2A4A7F',
  crimson: '#C53030', gold: '#D69E2E',
  white: '#FFFFFF', bg: '#F0F4F8', muted: '#718096', border: '#E2E8F0',
}
let C = { ...C_DEFAULT }

// Formatters
const fmtDate    = (d) => { try { return new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) } catch { return String(d) } }
const fmtTime    = (d) => { try { const t = new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }); return t === '12:00 AM' ? null : t } catch { return null } }
const fmtBudget  = (b) => { try { return b ? `\u20b1${parseFloat(b).toLocaleString('en-PH')}` : null } catch { return null } }
const fmtMsgTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''

// -----------------------------------------------------------------------
// BUILD SYSTEM PROMPT — compact version to stay within token limits
// -----------------------------------------------------------------------
function truncate(str, max = 120) {
  if (!str) return null
  const s = String(str).replace(/\s+/g, ' ').trim()
  return s.length > max ? s.slice(0, max) + '…' : s
}

function buildSystemPrompt(ann, events, projects) {
  const today = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })

  const serializeAnn = ann.length === 0 ? '(none)' : ann.slice(0, 20).map((a, i) => {
    const date = a.date_time || a.event_date || a.date || a.created_at
    const parts = [`A${i+1}. "${a.title || 'Untitled'}"`]
    if (a.status)      parts.push(`status:${a.status}`)
    if (date)          parts.push(`date:${fmtDate(date)}`)
    if (a.location)    parts.push(`loc:${truncate(a.location,60)}`)
    if (a.prepared_by) parts.push(`by:${truncate(a.prepared_by,60)}`)
    if (a.description) parts.push(`desc:${truncate(a.description)}`)
    else if (a.content) parts.push(`desc:${truncate(a.content)}`)
    return parts.join(' | ')
  }).join('\n')

  const serializeEv = events.length === 0 ? '(none)' : events.slice(0, 20).map((e, i) => {
    const parts = [`E${i+1}. "${e.title || 'Untitled'}"`]
    if (e.status)    parts.push(`status:${e.status}`)
    if (e.start_date) parts.push(`start:${fmtDate(e.start_date)}${fmtTime(e.start_date) ? ' '+fmtTime(e.start_date) : ''}`)
    if (e.end_date)   parts.push(`end:${fmtDate(e.end_date)}`)
    if (e.location)   parts.push(`loc:${truncate(e.location,60)}`)
    if (e.handler)    parts.push(`organizer:${truncate(e.handler,60)}`)
    if (e.prepared_by) parts.push(`by:${truncate(e.prepared_by,60)}`)
    if (e.budget)     parts.push(`budget:${fmtBudget(e.budget)}`)
    if (e.description) parts.push(`desc:${truncate(e.description)}`)
    return parts.join(' | ')
  }).join('\n')

  const serializeProj = projects.length === 0 ? '(none)' : projects.slice(0, 20).map((p, i) => {
    const name = p.project_name || p.name || p.title || 'Unnamed'
    const parts = [`P${i+1}. "${name}"`]
    if (p.status)       parts.push(`status:${p.status}`)
    if (p.start_date)   parts.push(`start:${fmtDate(p.start_date)}`)
    if (p.end_date)     parts.push(`end:${fmtDate(p.end_date)}`)
    if (p.budget)       parts.push(`budget:${fmtBudget(p.budget)}`)
    if (p.prepared_by)  parts.push(`by:${truncate(p.prepared_by,60)}`)
    if (p.location)     parts.push(`loc:${truncate(p.location,60)}`)
    if (p.participants) parts.push(`participants:${p.participants}`)
    if (p.fund_source)  parts.push(`fund:${truncate(p.fund_source,60)}`)
    if (p.purpose)      parts.push(`purpose:${truncate(p.purpose)}`)
    if (p.description)  parts.push(`desc:${truncate(p.description)}`)
    return parts.join(' | ')
  }).join('\n')

  return `You are ISKAI, AI assistant for Youth Link Portal, Barangay Bakakeng Central SK. Today: ${today}.
RULES: Only use data below. Never invent info. If not found say "Sorry, not available in system." If asked who you are: "I am ISKAI, an AI chatbot for this Youth Link Portal."
Respond in user's language (English/Filipino/Taglish). Use **bold** for key info. Add 1-2 follow-up suggestions after every answer.

ANNOUNCEMENTS:
${serializeAnn}

EVENTS:
${serializeEv}

PROJECTS:
${serializeProj}

STATIC INFO: Office hours Mon-Fri 8AM-5PM. Barangay Clearance: PHP50, bring valid ID, 1-2 days processing.`
}

// -----------------------------------------------------------------------
// CALL AI — Claude via Anthropic API
// -----------------------------------------------------------------------
async function callAI(userQuery, ann, events, projects) {
  const systemPrompt = buildSystemPrompt(ann, events, projects)
  if (!GROQ_API_KEY) throw new Error('VITE_GROQ_API_KEY is not set in your .env file')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userQuery },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Groq API HTTP ${res.status}`)
  }
  const data = await res.json()
  const reply = data?.choices?.[0]?.message?.content
  if (!reply) throw new Error('Empty reply from Groq')
  return { reply, provider: 'groq' }
}

// -----------------------------------------------------------------------
// QUICK ANSWER
// Only handles broad "show all X" list queries and static info.
// ALL specific questions go directly to the AI with full portal context.
// -----------------------------------------------------------------------
function quickAnswer(query, ann, events, projects) {
  const q = (query || '').toLowerCase().trim()

  // Static: office hours
  if (/\b(hours?|oras|bukas|open time|closing time)\b/.test(q) && !/project|event|announce/.test(q)) {
    return {
      answer: '\ud83c\udfd9\ufe0f **Barangay Hall Hours**\n\n**Monday \u2013 Friday, 8:00 AM \u2013 5:00 PM**\nClosed on weekends and public holidays.',
      source: 'static',
    }
  }
  // Static: clearance
  if (/\bclearance\b/.test(q) && !/project|event/.test(q)) {
    return {
      answer: '\ud83d\udcc4 **Barangay Clearance**\n\n\ud83d\udcb0 Fee: **\u20b150**\n\ud83d\udccb Bring: valid government ID\n\u23f1\ufe0f Processing: **1\u20132 working days**\n\ud83d\udd50 Mon\u2013Fri, 8AM\u20135PM at the Barangay Hall.',
      source: 'static',
    }
  }

  // Broad list queries — ONLY exact single-category requests
  const broadAnn  = /^(announcements?|balita|anunsyo|news)$/.test(q) || /^(latest|show all|all|mga|show) (announcements?|balita|news)$/.test(q)
  const broadEv   = /^(events?|aktibidad|activities)$/.test(q)        || /^(upcoming|show all|all|mga|latest|show) (events?|aktibidad|activities)$/.test(q)
  const broadProj = /^(projects?|proyekto|programa)$/.test(q)         || /^(sk|show all|all|mga|latest|show) (projects?|proyekto|programa)$/.test(q)

  if (broadAnn) {
    if (!ann.length) return { answer: '\ud83d\udce2 Walang announcements ngayon. Check back soon!', source: 'data' }
    let txt = `\ud83d\udce2 **Latest Announcements** (${ann.length} total)\n\n`
    ann.slice(0, 6).forEach((a, i) => {
      txt += `**${i + 1}. ${a.title}**`
      if (a.status) txt += ` \u2022 ${a.status}`
      const dv = a.event_date || a.date_time || a.date
      if (dv) txt += `\n   \ud83d\udcc5 ${fmtDate(dv)}`
      if (a.location) txt += ` | \ud83d\udccd ${a.location}`
      txt += '\n\n'
    })
    if (ann.length > 6) txt += `_\u2026and ${ann.length - 6} more._`
    return { answer: txt.trim(), action: { label: 'View All Announcements', page: 'announcements' }, source: 'data' }
  }

  if (broadEv) {
    if (!events.length) return { answer: '\ud83d\udcc5 Walang events ngayon. Check back soon!', source: 'data' }
    const now = new Date()
    let list = events.filter(e => { try { return new Date(e.start_date) >= now && (e.status || '').toLowerCase() !== 'cancelled' } catch { return true } })
    if (!list.length) list = events.slice(0, 6)
    let txt = `\ud83d\udcc5 **Upcoming Events** (${list.length} found)\n\n`
    list.slice(0, 6).forEach((e, i) => {
      txt += `**${i + 1}. ${e.title}**`
      if (e.status) txt += ` \u2022 ${e.status}`
      if (e.start_date) txt += `\n   \ud83d\udcc5 ${fmtDate(e.start_date)}${fmtTime(e.start_date) ? ' at ' + fmtTime(e.start_date) : ''}`
      if (e.location) txt += ` | \ud83d\udccd ${e.location}`
      txt += '\n\n'
    })
    if (list.length > 6) txt += `_\u2026and ${list.length - 6} more._`
    return { answer: txt.trim(), action: { label: 'View All Events', page: 'events' }, source: 'data' }
  }

  if (broadProj) {
    if (!projects.length) return { answer: '\ud83c\udfd7\ufe0f Walang projects ngayon.', source: 'data' }
    let txt = `\ud83c\udfd7\ufe0f **SK Projects** (${projects.length} total)\n\n`
    projects.slice(0, 6).forEach((p, i) => {
      const name = p.project_name || p.name || 'Unnamed'
      txt += `**${i + 1}. ${name}**`
      if (p.status) txt += ` \u2022 ${p.status}`
      if (fmtBudget(p.budget)) txt += ` \u2022 ${fmtBudget(p.budget)}`
      if (p.start_date) txt += `\n   \ud83d\udcc5 ${fmtDate(p.start_date)}`
      if (p.description) txt += `\n   ${p.description.slice(0, 100)}${p.description.length > 100 ? '\u2026' : ''}`
      txt += '\n\n'
    })
    if (projects.length > 6) txt += `_\u2026and ${projects.length - 6} more._`
    return { answer: txt.trim(), action: { label: 'View All Projects', page: 'projects' }, source: 'data' }
  }

  // Everything else goes to AI
  return null
}

// -----------------------------------------------------------------------
// UI COMPONENTS
// -----------------------------------------------------------------------
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '14px 16px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: C.navyMid, opacity: 0.4, animation: `iskDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  )
}

function ActionBtn({ action, onNavigate }) {
  if (!action) return null
  return (
    <button
      onClick={() => onNavigate(action.page)}
      style={{ marginTop: 8, padding: '7px 14px', borderRadius: 20, background: C.navy, color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif", display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .15s', boxShadow: '0 2px 8px rgba(15,36,68,0.3)' }}
      onMouseEnter={e => e.currentTarget.style.background = C.crimson}
      onMouseLeave={e => e.currentTarget.style.background = C.navy}
    >
      {action.label} &rarr;
    </button>
  )
}

function FormatText({ text }) {
  return (
    <div>
      {(text || '').split('\n').map((line, li, arr) => {
        const parts = line.split(/\*\*(.+?)\*\*/g)
        return (
          <div key={li} style={{ marginBottom: li < arr.length - 1 ? 3 : 0 }}>
            {parts.map((p, pi) => pi % 2 === 1 ? <strong key={pi}>{p}</strong> : <span key={pi}>{p}</span>)}
            {line === '' && <br />}
          </div>
        )
      })}
    </div>
  )
}

function SourceBadge({ source, provider }) {
  if (source === 'data')   return <div style={{ marginTop: 6, fontSize: 10, color: '#3182CE', display: 'flex', alignItems: 'center', gap: 4 }}>📡 From live portal data</div>
  if (source === 'static') return <div style={{ marginTop: 6, fontSize: 10, color: '#38A169', display: 'flex', alignItems: 'center', gap: 4 }}>⚡ Instant response</div>
  if (source === 'ai')  return <div style={{ marginTop: 6, fontSize: 10, color: '#2F855A', display: 'flex', alignItems: 'center', gap: 4 }}>✨ AI · powered by Groq</div>
  return null
}

// -----------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------
export default function ISKAIChat({ onNavigate }) {
  const { theme: liveTheme } = useTheme()
  C = {
    navy:    liveTheme.primaryColor   || C_DEFAULT.navy,
    navyMid: liveTheme.primaryColor   || C_DEFAULT.navyMid,
    navyLt:  (liveTheme.primaryColor  || C_DEFAULT.navyMid) + 'CC',
    crimson: liveTheme.secondaryColor || C_DEFAULT.crimson,
    gold:    liveTheme.accentColor    || C_DEFAULT.gold,
    white: '#FFFFFF',
    bg:    liveTheme.bgColor    || C_DEFAULT.bg,
    muted: liveTheme.mutedColor || C_DEFAULT.muted,
    border: liveTheme.borderColor || C_DEFAULT.border,
  }

  const [open,         setOpen]         = useState(false)
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [liveAnn,      setLiveAnn]      = useState([])
  const [liveEvents,   setLiveEvents]   = useState([])
  const [liveProjects, setLiveProjects] = useState([])
  const [typing,       setTyping]       = useState(false)
  const [unread,       setUnread]       = useState(0)
  const [shown,        setShown]        = useState(false)
  const bottomRef = useRef()
  const inputRef  = useRef()

  // Load ALL data from Supabase + live sync
  useEffect(() => {
    const load = async () => {
      try {
        const [aR, eR, pR] = await Promise.all([
          supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('events').select('*').order('start_date', { ascending: true }).limit(100),
          supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(100),
        ])
        if (aR.data) setLiveAnn(aR.data)
        if (eR.data) setLiveEvents(eR.data)
        if (pR.data) setLiveProjects(pR.data)
        if (aR.error) console.error('[ISKAI] ann:', aR.error)
        if (eR.error) console.error('[ISKAI] ev:', eR.error)
        if (pR.error) console.error('[ISKAI] proj:', pR.error)
      } catch (e) {
        console.error('[ISKAI] load error:', e)
      }
    }
    load()
    const ch = supabase.channel('iskai-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' },        load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' },      load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  // Welcome message
  useEffect(() => {
    const t = setTimeout(() => {
      if (!shown) {
        setMessages([{
          role: 'bot',
          text: "👋 Mabuhay! I'm **ISKAI**, your Barangay AI assistant.\n\nAsk me anything about announcements, events, projects, or barangay services!",
          time: new Date(),
          suggestions: ['Latest Announcements', 'Upcoming Events', 'SK Projects', 'Office Hours'],
        }])
        setUnread(1)
        setShown(true)
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [shown])

  // Auto-scroll
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 100)
    }
  }, [open, messages])

  // Send handler
  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg, time: new Date() }])
    setTyping(true)
    await new Promise(r => setTimeout(r, 300))

    // 1. Quick local answer (broad list queries + static info only)
    const quick = quickAnswer(msg, liveAnn, liveEvents, liveProjects)
    if (quick) {
      setTyping(false)
      setMessages(prev => [...prev, { role: 'bot', text: quick.answer, action: quick.action, time: new Date(), source: quick.source }])
      if (!open) setUnread(n => n + 1)
      return
    }

    // 2. AI — full portal data injected as system context
    try {
      const { reply, provider } = await callAI(msg, liveAnn, liveEvents, liveProjects)
      setTyping(false)
      setMessages(prev => [...prev, { role: 'bot', text: reply, time: new Date(), source: 'ai', provider }])
      if (!open) setUnread(n => n + 1)
      return
    } catch (err) {
      console.error('[ISKAI] AI error:', err.message)
      setTyping(false)
      setMessages(prev => [...prev, {
        role: 'bot',
        text: `⚠️ AI error: ${err.message}\n\nCheck **VITE_GROQ_API_KEY** in your .env file.`,
        time: new Date(),
        source: 'fallback',
      }])
      if (!open) setUnread(n => n + 1)
    }
  }, [input, open, liveAnn, liveEvents, liveProjects])

  const handleNavigate = (page) => {
    setOpen(false)
    if (onNavigate) onNavigate(page)
  }

  return (
    <>
      <style>{`
        @keyframes iskDot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
        @keyframes iskSlideUp{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes iskSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes iskPulse{0%,100%{box-shadow:0 0 0 0 rgba(197,48,48,.5)}50%{box-shadow:0 0 0 10px rgba(197,48,48,0)}}
        @keyframes iskBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        .isk-btn:hover{transform:scale(1.06)!important}
        .isk-chip{transition:all .15s ease!important}
        .isk-chip:hover{background:${C.navy}!important;color:white!important;transform:translateY(-1px)}
        .isk-send:hover{background:${C.crimson}!important;transform:scale(1.05)}
        .isk-close:hover{background:rgba(255,255,255,.2)!important}
        .isk-scroll::-webkit-scrollbar{width:4px}
        .isk-scroll::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:4px}
      `}</style>

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9000, fontFamily: "'Inter',sans-serif" }}>

        {open && (
          <div style={{ position: 'absolute', bottom: 76, right: 0, width: 370, height: 540, background: 'white', borderRadius: 20, boxShadow: '0 24px 80px rgba(15,36,68,.22),0 4px 24px rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'iskSlideUp .3s cubic-bezier(.34,1.56,.64,1)', border: `1px solid ${C.border}` }}>

            {/* Header */}
            <div style={{ background: `linear-gradient(135deg,${C.navy} 0%,${C.navyLt} 100%)`, padding: '14px 18px', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},#F6E05E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '2px solid rgba(255,255,255,.25)', flexShrink: 0 }}>🤖</div>
                  <div>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>ISKAI</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#68D391' }} />
                      <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, margin: 0 }}>Online · Barangay SK Assistant</p>
                    </div>
                  </div>
                </div>
                <button className="isk-close" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, padding: 0 }}>✕</button>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.8)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>📡 Live Portal Data</span>
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.8)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>📢 {liveAnn.length} Ann · 📅 {liveEvents.length} Ev · 🏗️ {liveProjects.length} Proj</span>
              </div>
            </div>

            {/* Messages */}
            <div className="isk-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ animation: 'iskSlideIn .2s ease', display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                    {m.role === 'bot'  && <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},#F6E05E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>}
                    {m.role === 'user' && <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${C.crimson},${C.crimson}CC)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>Me</div>}
                    <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: m.role === 'user' ? `linear-gradient(135deg,${C.navyMid},${C.navyLt})` : 'white', color: m.role === 'user' ? 'white' : C.navy, fontSize: 13, lineHeight: 1.6, boxShadow: m.role === 'bot' ? '0 2px 8px rgba(0,0,0,.06)' : 'none', border: m.role === 'bot' ? `1px solid ${C.border}` : 'none' }}>
                      <FormatText text={m.text} />
                      <SourceBadge source={m.source} provider={m.provider} />
                    </div>
                  </div>
                  <p style={{ fontSize: 10, color: '#A0AEC0', margin: '3px 38px 0', textAlign: m.role === 'user' ? 'right' : 'left' }}>{fmtMsgTime(m.time)}</p>
                  {m.action && <div style={{ marginLeft: 38, marginTop: 4 }}><ActionBtn action={m.action} onNavigate={handleNavigate} /></div>}
                  {m.suggestions && i === messages.length - 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, marginLeft: 38 }}>
                      {m.suggestions.map((s, si) => (
                        <button key={si} className="isk-chip" onClick={() => send(s)} style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${C.navyMid}`, background: 'white', color: C.navyMid, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {typing && (
                <div style={{ animation: 'iskSlideIn .2s ease', display: 'flex', alignItems: 'flex-end', gap: 7 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},#F6E05E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
                  <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '4px 16px 16px 16px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}><TypingDots /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick chips */}
            <div style={{ padding: '8px 14px 4px', background: 'white', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
              {['Announcements', 'Events', 'Projects', 'Clearance', 'Hours'].map(q => (
                <button key={q} className="isk-chip" onClick={() => send(q)} style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${C.gold}`, background: 'white', color: C.navy, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{q}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px 14px', background: 'white', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F7FAFC', borderRadius: 26, border: `1.5px solid ${C.border}`, padding: '4px 4px 4px 14px' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Ask about announcements, events, projects..."
                  style={{ flex: 1, background: 'none', border: 'none', fontSize: 13, color: C.navy, fontFamily: "'Inter',sans-serif", outline: 'none', padding: '6px 0' }}
                />
                <button
                  className="isk-send"
                  onClick={() => send()}
                  disabled={!input.trim()}
                  style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: input.trim() ? C.navyMid : C.border, color: 'white', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0, fontSize: 16 }}
                >&#x27A4;</button>
              </div>
              <p style={{ fontSize: 10, color: '#A0AEC0', textAlign: 'center', marginTop: 6 }}>ISKAI · Barangay Bakakeng Central · Live Data</p>
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          className="isk-btn"
          onClick={() => setOpen(o => !o)}
          style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', background: open ? C.navy : `linear-gradient(135deg,${C.navyMid} 0%,${C.navyLt} 100%)`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: open ? 22 : 28, boxShadow: '0 6px 28px rgba(15,36,68,.4)', animation: !open && unread > 0 ? 'iskPulse 2s ease infinite' : 'none', position: 'relative', transition: 'all .2s ease' }}
        >
          {open ? '✕' : '🤖'}
          {!open && unread > 0 && (
            <div style={{ position: 'absolute', top: -3, right: -3, width: 20, height: 20, borderRadius: '50%', background: C.crimson, border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, animation: 'iskBounce 1s ease infinite' }}>{unread}</div>
          )}
        </button>

        {!open && !shown && (
          <div style={{ position: 'absolute', bottom: 70, right: 0, background: C.navy, color: 'white', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
            💬 Ask ISKAI anything!
            <div style={{ position: 'absolute', bottom: -6, right: 18, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${C.navy}` }} />
          </div>
        )}
      </div>
    </>
  )
}
