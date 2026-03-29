import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'

/* ─────────────────────────────────────────
   BACKEND URL
   ─────────────────────────────────────────
   In development:  http://localhost:3000
   In production:   your Railway URL

   Set this in your .env file:
     VITE_CHATBOT_API_URL=https://your-backend.railway.app

   Vite exposes env vars with the VITE_ prefix.
   Never put API keys here — they stay on the backend.
───────────────────────────────────────── */
const BACKEND_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:3000'

/* ─────────────────────────────────────────
   THEME
───────────────────────────────────────── */
const C_DEFAULT = {
  navy:    '#0F2444',
  navyMid: '#1A365D',
  navyLt:  '#2A4A7F',
  crimson: '#C53030',
  gold:    '#D69E2E',
  white:   '#FFFFFF',
  bg:      '#F0F4F8',
  muted:   '#718096',
  border:  '#E2E8F0',
}
let C = { ...C_DEFAULT }

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return String(d) }
}
const fmtTime = (d) => {
  if (!d) return null
  try {
    return new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  } catch { return null }
}
const fmtBudget = (b) => {
  if (!b) return null
  try { return `₱${parseFloat(b).toLocaleString('en-PH')}` } catch { return String(b) }
}

// Tokenise a string into meaningful lowercase words (≥3 chars)
const tokens = (str) => (str || '').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length >= 3)

// Score how closely a query matches a target text (0–1)
const similarity = (queryTokens, targetText) => {
  if (!targetText) return 0
  const tgt = tokens(targetText)
  if (!tgt.length) return 0
  const hits = queryTokens.filter(qt =>
    tgt.some(tt =>
      tt === qt ||
      (qt.length >= 5 && tt.includes(qt)) ||
      (tt.length >= 5 && qt.includes(tt))
    )
  )
  return hits.length / Math.max(queryTokens.length, 1)
}

/* ─────────────────────────────────────────
   PORTAL DATA INTELLIGENCE ENGINE
   Answers questions from live Supabase data
   — fast, free, no API call needed.
───────────────────────────────────────── */
function answerFromData(rawQuery, ann, events, projects) {
  const q   = (rawQuery || '').toLowerCase().trim()
  const qTk = tokens(q)

  if (!qTk.length) return null

  const has = (...words) => words.some(w => q.includes(w))
  const hasAny = (arr) => arr.some(w => q.includes(w))

  const isAboutAnn = hasAny([
    'announcement','announcements','balita','latest news','latest announcement',
    'notice','bulletin','anong balita','ano ang balita','recent update',
    'pinakabagong','mga balita','news',
  ])
  const isAboutEvents = hasAny([
    'event','events','activity','activities','scheduled','upcoming event',
    'community event','barangay event','assembly','anong event','mga event',
    'what event','any event',
  ])
  const isAboutProjects = hasAny([
    'project','projects','programa','sk project','initiative','infrastructure',
    'accomplishment','accomplished','completed project','ongoing project',
    'upcoming project','anong project','mga project','what project',
  ])

  const wantsDate   = hasAny(['when','date','kelan','kailan','kallan','schedule','what time','petsa','anong araw','anong oras'])
  const wantsWhere  = hasAny(['where','location','venue','lugar','saan','nasaan'])
  const wantsList   = hasAny(['list','all','lahat','show','mga','what are','anong mga'])
  const wantsBudget = hasAny(['budget','cost','price','magkano','how much','pera','fund'])

  const scoredAnn  = ann.map(a => ({
    item: a, score: similarity(qTk, `${a.title} ${a.content} ${a.type} ${a.location}`),
  })).sort((a,b) => b.score - a.score)
  const scoredEv   = events.map(e => ({
    item: e, score: similarity(qTk, `${e.title} ${e.description} ${e.location}`),
  })).sort((a,b) => b.score - a.score)
  const scoredProj = projects.map(p => ({
    item: p, score: similarity(qTk, `${p.project_name} ${p.description} ${p.fund_source} ${p.prepared_by}`),
  })).sort((a,b) => b.score - a.score)

  const bestAnn  = scoredAnn[0]
  const bestEv   = scoredEv[0]
  const bestProj = scoredProj[0]
  const SPECIFIC_THRESHOLD = 0.4

  /* ── ANNOUNCEMENTS ── */
  if (isAboutAnn || (bestAnn && bestAnn.score >= SPECIFIC_THRESHOLD && !isAboutEvents && !isAboutProjects)) {
    if (bestAnn && bestAnn.score >= SPECIFIC_THRESHOLD && !wantsList) {
      const a = bestAnn.item
      let txt = `📢 **${a.title}**\n\n`
      if (a.status)     txt += `📌 Status: **${a.status}**\n`
      if (a.type)       txt += `🏷️ Type: ${a.type}\n`
      if (a.event_date) txt += `📅 Date: **${fmtDate(a.event_date)}**\n`
      if (a.location)   txt += `📍 Location: ${a.location}\n`
      if (a.content)    txt += `\n${a.content}`
      return { answer: txt.trim(), action: { label: 'View All Announcements', page: 'announcements' }, source: 'data' }
    }
    if (ann.length === 0) return { answer: '📢 There are no announcements at the moment. Check back soon!', source: 'data' }
    const latest = ann.slice(0, 5)
    let txt = `📢 **Latest Announcements** (${ann.length} total)\n\n`
    latest.forEach((a, i) => {
      txt += `**${i + 1}. ${a.title}**`
      if (a.status)     txt += ` • ${a.status}`
      if (a.event_date) txt += `\n   📅 ${fmtDate(a.event_date)}`
      if (a.location)   txt += ` | 📍 ${a.location}`
      if (a.content)    txt += `\n   ${a.content.slice(0, 100)}${a.content.length > 100 ? '…' : ''}`
      txt += '\n\n'
    })
    if (ann.length > 5) txt += `_…and ${ann.length - 5} more. Tap below to see all._`
    return { answer: txt.trim(), action: { label: 'View All Announcements', page: 'announcements' }, source: 'data' }
  }

  /* ── EVENTS ── */
  if (isAboutEvents || (bestEv && bestEv.score >= SPECIFIC_THRESHOLD && !isAboutAnn && !isAboutProjects)) {
    const now = new Date()
    const upcomingEvs = events.filter(e => {
      if ((e.status || '').toLowerCase() === 'cancelled') return false
      try { return e.start_date ? new Date(e.start_date) >= now : true } catch { return true }
    })
    if (bestEv && bestEv.score >= SPECIFIC_THRESHOLD && !wantsList) {
      const e = bestEv.item
      let txt = `📅 **${e.title}**\n\n`
      if (e.status)      txt += `📌 Status: **${e.status}**\n`
      if (e.start_date)  txt += `📅 Date: **${fmtDate(e.start_date)}**`
      if (fmtTime(e.start_date)) txt += ` at ${fmtTime(e.start_date)}`
      if (e.start_date)  txt += '\n'
      if (e.end_date && e.end_date !== e.start_date) txt += `   Ends: ${fmtDate(e.end_date)}\n`
      if (e.location)    txt += `📍 Location: ${e.location}\n`
      if (e.description) txt += `\n${e.description}`
      return { answer: txt.trim(), action: { label: 'View All Events', page: 'events' }, source: 'data' }
    }
    if (events.length === 0) return { answer: '📅 No events are scheduled at the moment. Check back soon!', source: 'data' }
    const list = upcomingEvs.length > 0 ? upcomingEvs : events
    const listLabel = upcomingEvs.length > 0 ? 'Upcoming' : 'Recent'
    let txt = `📅 **${listLabel} Events** (${list.length} found)\n\n`
    list.slice(0, 5).forEach((e, i) => {
      txt += `**${i + 1}. ${e.title}**`
      if (e.status)      txt += ` • ${e.status}`
      if (e.start_date)  txt += `\n   📅 ${fmtDate(e.start_date)}`
      if (e.location)    txt += ` | 📍 ${e.location}`
      if (e.description) txt += `\n   ${e.description.slice(0, 100)}${e.description.length > 100 ? '…' : ''}`
      txt += '\n\n'
    })
    if (list.length > 5) txt += `_…and ${list.length - 5} more. Tap below to see all._`
    return { answer: txt.trim(), action: { label: 'View All Events', page: 'events' }, source: 'data' }
  }

  /* ── PROJECTS ── */
  if (isAboutProjects || (bestProj && bestProj.score >= SPECIFIC_THRESHOLD && !isAboutAnn && !isAboutEvents)) {
    const wantsCompleted = hasAny(['completed','accomplished','done','finished','tapos','natapos'])
    const wantsOngoing   = hasAny(['ongoing','current','active','kasalukuyan'])
    const wantsUpcoming  = hasAny(['upcoming','planned','planning','susunod','darating'])
    let filtered = projects
    let filterLabel = 'SK'
    if (wantsCompleted) { filtered = projects.filter(p => (p.status||'').toLowerCase() === 'completed'); filterLabel = 'Accomplished' }
    else if (wantsOngoing)  { filtered = projects.filter(p => (p.status||'').toLowerCase() === 'ongoing');   filterLabel = 'Ongoing' }
    else if (wantsUpcoming) { filtered = projects.filter(p => ['upcoming','planning'].includes((p.status||'').toLowerCase())); filterLabel = 'Upcoming' }
    if (wantsBudget && bestProj && bestProj.score >= SPECIFIC_THRESHOLD) {
      const p = bestProj.item
      if (fmtBudget(p.budget)) {
        return {
          answer: `💰 **${p.project_name}**\n\nBudget: **${fmtBudget(p.budget)}**${p.fund_source ? `\nFund Source: ${p.fund_source}` : ''}\nStatus: ${p.status || 'N/A'}`,
          action: { label: 'View All Projects', page: 'projects' }, source: 'data',
        }
      }
    }
    if (wantsDate && bestProj && bestProj.score >= SPECIFIC_THRESHOLD) {
      const p = bestProj.item
      let txt = `📅 **${p.project_name}**\n\n`
      if (p.start_date) txt += `Start: **${fmtDate(p.start_date)}**\n`
      if (p.end_date)   txt += `End: **${fmtDate(p.end_date)}**\n`
      txt += `Status: ${p.status || 'N/A'}`
      return { answer: txt, action: { label: 'View All Projects', page: 'projects' }, source: 'data' }
    }
    if (bestProj && bestProj.score >= SPECIFIC_THRESHOLD && !wantsList) {
      const p = bestProj.item
      let txt = `🏗️ **${p.project_name}**\n\n`
      if (p.status)      txt += `📌 Status: **${p.status}**\n`
      if (p.start_date)  txt += `📅 Start: ${fmtDate(p.start_date)}\n`
      if (p.end_date)    txt += `   End:   ${fmtDate(p.end_date)}\n`
      if (fmtBudget(p.budget)) txt += `💰 Budget: **${fmtBudget(p.budget)}**\n`
      if (p.fund_source) txt += `📂 Fund Source: ${p.fund_source}\n`
      if (p.prepared_by) txt += `👤 By: ${p.prepared_by}\n`
      if (p.description) txt += `\n${p.description}`
      return { answer: txt.trim(), action: { label: 'View All Projects', page: 'projects' }, source: 'data' }
    }
    if (projects.length === 0) return { answer: '🏗️ No projects found at the moment.', source: 'data' }
    const list = filtered.length > 0 ? filtered : projects
    let txt = `🏗️ **${filterLabel} Projects** (${list.length} found)\n\n`
    list.slice(0, 5).forEach((p, i) => {
      txt += `**${i + 1}. ${p.project_name}**`
      if (p.status) txt += ` • ${p.status}`
      if (fmtBudget(p.budget)) txt += ` • ${fmtBudget(p.budget)}`
      if (p.start_date) txt += `\n   📅 ${fmtDate(p.start_date)}`
      if (p.description) txt += `\n   ${p.description.slice(0, 100)}${p.description.length > 100 ? '…' : ''}`
      txt += '\n\n'
    })
    if (list.length > 5) txt += `_…and ${list.length - 5} more. Tap below to see all._`
    return { answer: txt.trim(), action: { label: 'View All Projects', page: 'projects' }, source: 'data' }
  }

  /* ── CROSS-CATEGORY: best match across all ── */
  const overallBest = [
    { type: 'ann',     scored: bestAnn  },
    { type: 'event',   scored: bestEv   },
    { type: 'project', scored: bestProj },
  ].filter(x => x.scored).sort((a,b) => (b.scored?.score||0) - (a.scored?.score||0))[0]

  if (overallBest && overallBest.scored && overallBest.scored.score >= SPECIFIC_THRESHOLD) {
    const { type, scored } = overallBest
    const item = scored.item
    if (type === 'ann') {
      const a = item
      if (wantsDate && a.event_date) return { answer: `📅 **${a.title}** is scheduled on **${fmtDate(a.event_date)}**${a.location ? ` at ${a.location}` : ''}.`, action: { label: 'View Announcements', page: 'announcements' }, source: 'data' }
      let txt = `📢 **${a.title}**\n\n`
      if (a.status)     txt += `📌 Status: **${a.status}**\n`
      if (a.type)       txt += `🏷️ Type: ${a.type}\n`
      if (a.event_date) txt += `📅 Date: **${fmtDate(a.event_date)}**\n`
      if (a.location)   txt += `📍 Location: ${a.location}\n`
      if (a.content)    txt += `\n${a.content}`
      return { answer: txt.trim(), action: { label: 'View Announcements', page: 'announcements' }, source: 'data' }
    }
    if (type === 'event') {
      const e = item
      if (wantsDate && e.start_date)  return { answer: `📅 **${e.title}** is on **${fmtDate(e.start_date)}**${e.location ? ` at ${e.location}` : ''}.`, action: { label: 'View Events', page: 'events' }, source: 'data' }
      if (wantsWhere && e.location)   return { answer: `📍 **${e.title}** will be held at **${e.location}**${e.start_date ? ` on ${fmtDate(e.start_date)}` : ''}.`, action: { label: 'View Events', page: 'events' }, source: 'data' }
      let txt = `📅 **${e.title}**\n\n`
      if (e.status)      txt += `📌 Status: **${e.status}**\n`
      if (e.start_date)  txt += `📅 Date: **${fmtDate(e.start_date)}**\n`
      if (e.location)    txt += `📍 Location: ${e.location}\n`
      if (e.description) txt += `\n${e.description}`
      return { answer: txt.trim(), action: { label: 'View Events', page: 'events' }, source: 'data' }
    }
    if (type === 'project') {
      const p = item
      if (wantsBudget && p.budget) return { answer: `💰 The budget for **${p.project_name}** is **${fmtBudget(p.budget)}**${p.fund_source ? ` (${p.fund_source})` : ''}.`, action: { label: 'View Projects', page: 'projects' }, source: 'data' }
      if (wantsDate && p.start_date) return { answer: `📅 **${p.project_name}** starts on **${fmtDate(p.start_date)}**${p.end_date ? ` and ends ${fmtDate(p.end_date)}` : ''}.`, action: { label: 'View Projects', page: 'projects' }, source: 'data' }
      let txt = `🏗️ **${p.project_name}**\n\n`
      if (p.status)      txt += `📌 Status: **${p.status}**\n`
      if (p.start_date)  txt += `📅 ${fmtDate(p.start_date)}\n`
      if (fmtBudget(p.budget)) txt += `💰 Budget: **${fmtBudget(p.budget)}**\n`
      if (p.fund_source) txt += `📂 Fund: ${p.fund_source}\n`
      if (p.description) txt += `\n${p.description}`
      return { answer: txt.trim(), action: { label: 'View Projects', page: 'projects' }, source: 'data' }
    }
  }

  return null // no data match — fall through to AI backend
}

/* ─────────────────────────────────────────
   STATIC BARANGAY KNOWLEDGE (sent to AI as context)
───────────────────────────────────────── */
const BARANGAY_KNOWLEDGE = `
=== BARANGAY BAKAKENG CENTRAL — STATIC INFO ===

CONTACT & LOCATION:
- Name: Barangay Bakakeng Central
- City: Baguio City, Benguet, Philippines
- Office Hours: Monday–Friday, 8:00 AM – 5:00 PM
- Closed on weekends and public holidays
- Facebook: facebook.com/share/1D6aTWgdiR/

BARANGAY CLEARANCE:
- Visit Barangay Hall in person
- Bring a valid government ID
- Fee: ₱50
- Processing time: 1–2 working days
- Available Mon–Fri, 8AM–5PM

SK VOTER REGISTRATION:
- Age requirement: 15–30 years old
- Visit COMELEC office or Barangay Hall during registration period
- Bring a valid ID or proof of age
- Registration is free

PORTAL REGISTRATION (online account):
- Click "Sign Up" on the login page
- Enter email and create a password
- Fill out the Profiling Form with personal details
- Submit — account activated automatically
- Full access to portal features after registration

PORTAL PASSWORD HELP:
- Forgot password: click "Forgot Password?" on login page → enter email → check inbox for reset link
- Change password: Settings in the sidebar → Password section

FEEDBACK / CONCERNS:
- Use the Feedback section in the sidebar of the portal
- Or visit the Barangay Hall in person

REPORT WEBSITE ISSUES:
- Use the red flag button (🔴) at the bottom-left corner of the screen
- Or message on Facebook: facebook.com/share/1D6aTWgdiR/
`

/* ─────────────────────────────────────────
   BUILD THE AI PROMPT WITH LIVE DATA
   (sent to the backend — API key stays safe)
───────────────────────────────────────── */
function buildAIMessage(userMsg, ann, events, projects) {
  const contextBlocks = [BARANGAY_KNOWLEDGE]

  if (ann.length > 0) {
    contextBlocks.push('=== LIVE ANNOUNCEMENTS (' + ann.length + ' total) ===\n' +
      ann.map(a => {
        const dateVal = a.event_date || a.date || a.created_at
        const lines = ['- Title: ' + (a.title || 'Untitled')]
        if (a.type)     lines.push('  Type: ' + a.type)
        if (a.status)   lines.push('  Status: ' + a.status)
        if (dateVal)    lines.push('  Date: ' + new Date(dateVal).toLocaleString('en-PH'))
        if (a.location) lines.push('  Location: ' + a.location)
        if (a.content)  lines.push('  Content: ' + a.content)
        return lines.join('\n')
      }).join('\n\n')
    )
  }

  if (events.length > 0) {
    contextBlocks.push('=== LIVE EVENTS (' + events.length + ' total) ===\n' +
      events.map(e => {
        const lines = ['- Title: ' + (e.title || 'Untitled')]
        if (e.status)      lines.push('  Status: ' + e.status)
        if (e.start_date)  lines.push('  Start: ' + new Date(e.start_date).toLocaleString('en-PH'))
        if (e.end_date)    lines.push('  End: ' + new Date(e.end_date).toLocaleString('en-PH'))
        if (e.location)    lines.push('  Location: ' + e.location)
        if (e.description) lines.push('  Description: ' + e.description)
        return lines.join('\n')
      }).join('\n\n')
    )
  }

  if (projects.length > 0) {
    contextBlocks.push('=== LIVE SK PROJECTS (' + projects.length + ' total) ===\n' +
      projects.map(p => {
        const name = p.project_name || p.name || p.title || 'Unnamed Project'
        const lines = ['- Name: ' + name]
        if (p.status)      lines.push('  Status: ' + p.status)
        if (p.start_date)  lines.push('  Start: ' + new Date(p.start_date).toLocaleDateString('en-PH'))
        if (p.end_date)    lines.push('  End: ' + new Date(p.end_date).toLocaleDateString('en-PH'))
        if (p.budget)      lines.push('  Budget: ₱' + parseFloat(p.budget).toLocaleString('en-PH'))
        if (p.fund_source) lines.push('  Fund Source: ' + p.fund_source)
        if (p.prepared_by) lines.push('  Prepared By: ' + p.prepared_by)
        if (p.description) lines.push('  Description: ' + p.description)
        return lines.join('\n')
      }).join('\n\n')
    )
  }

  // Combine context + user question into one message
  // The backend already has a system prompt, so we prepend context here
  const fullMessage =
    'You are ISKAI, the friendly AI assistant for Barangay Bakakeng Central, Baguio City, Philippines.\n\n' +
    'You have access to the following information:\n\n' +
    contextBlocks.join('\n\n') +
    '\n\nGUIDELINES:\n' +
    '- Answer questions about barangay services, announcements, events, and SK projects accurately.\n' +
    '- Support English, Filipino/Tagalog, and mixed language (Taglish) questions naturally.\n' +
    '- Understand informal Filipino spellings: "kallan/kailan" = when, "saan" = where, "ano/anong" = what, "magkano" = how much, "libre" = free, "tuli" = circumcision, "linis" = cleanup, etc.\n' +
    '- Be warm, concise, and helpful. Use relevant emojis sparingly.\n' +
    '- Use **bold** for important details like dates, locations, prices.\n' +
    '- For greetings, respond warmly and tell what you can help with.\n' +
    '- For questions about things NOT in the data, say so clearly and suggest visiting the barangay hall.\n' +
    '- Today is ' + new Date().toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) + '.\n\n' +
    'USER QUESTION: ' + userMsg

  return fullMessage
}

/* ─────────────────────────────────────────
   CALL THE BACKEND /chat ENDPOINT
   ─────────────────────────────────────────
   This replaces the old direct Anthropic API call.
   API keys live ONLY on the server — never in the browser.
   The backend will try OpenAI first, then fall back to Claude.
───────────────────────────────────────── */
async function callBackend(message) {
  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Backend error: ${response.status}`)
  }

  const data = await response.json()
  // data = { reply: "...", provider: "openai" | "claude" }
  return data
}

/* ─────────────────────────────────────────
   TYPING DOTS
───────────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center', padding:'14px 16px' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:C.navyMid, opacity:0.4, animation:`iskDot 1.4s ease-in-out ${i*0.2}s infinite` }}/>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   ACTION BUTTON
───────────────────────────────────────── */
function ActionBtn({ action, onNavigate }) {
  if (!action) return null
  return (
    <button onClick={() => onNavigate(action.page)}
      style={{ marginTop:8, padding:'7px 14px', borderRadius:20, background:C.navy, color:'white', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Inter',sans-serif", display:'inline-flex', alignItems:'center', gap:6, transition:'background .15s', boxShadow:'0 2px 8px rgba(15,36,68,0.3)' }}
      onMouseEnter={e => e.currentTarget.style.background=C.crimson}
      onMouseLeave={e => e.currentTarget.style.background=C.navy}>
      {action.label} →
    </button>
  )
}

/* ─────────────────────────────────────────
   FORMAT TEXT (bold **text**, newlines)
───────────────────────────────────────── */
function FormatText({ text }) {
  const lines = text.split('\n')
  return (
    <div>
      {lines.map((line, li) => {
        const parts = line.split(/\*\*(.+?)\*\*/g)
        return (
          <div key={li} style={{ marginBottom: li < lines.length-1 ? 3 : 0 }}>
            {parts.map((part, pi) => pi % 2 === 1 ? <strong key={pi}>{part}</strong> : <span key={pi}>{part}</span>)}
            {line === '' && <br/>}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────
   PROVIDER BADGE
   Shows which AI model answered (openai/claude)
───────────────────────────────────────── */
function ProviderBadge({ provider }) {
  if (!provider) return null
  const isOpenAI = provider === 'openai'
  return (
    <div style={{ marginTop:6, fontSize:10, color: isOpenAI ? '#2F855A' : '#805AD5', display:'flex', alignItems:'center', gap:4 }}>
      <span>{isOpenAI ? '⚡' : '🤖'}</span>
      {isOpenAI ? 'AI · powered by OpenAI' : 'AI · powered by Claude'}
    </div>
  )
}

/* ─────────────────────────────────────────
   MAIN CHATBOT COMPONENT
───────────────────────────────────────── */
export default function ISKAIChat({ onNavigate }) {
  const { theme: liveTheme } = useTheme()
  C = {
    navy:    liveTheme.primaryColor   || C_DEFAULT.navy,
    navyMid: liveTheme.primaryColor   || C_DEFAULT.navyMid,
    navyLt:  (liveTheme.primaryColor || C_DEFAULT.navyMid) + 'CC',
    crimson: liveTheme.secondaryColor || C_DEFAULT.crimson,
    gold:    liveTheme.accentColor    || C_DEFAULT.gold,
    white:   '#FFFFFF',
    bg:      liveTheme.bgColor        || C_DEFAULT.bg,
    muted:   liveTheme.mutedColor     || C_DEFAULT.muted,
    border:  liveTheme.borderColor    || C_DEFAULT.border,
  }

  const [open,         setOpen]        = useState(false)
  const [messages,     setMessages]    = useState([])
  const [input,        setInput]       = useState('')
  const [liveAnn,      setLiveAnn]     = useState([])
  const [liveEvents,   setLiveEvents]  = useState([])
  const [liveProjects, setLiveProjects]= useState([])
  const [typing,       setTyping]      = useState(false)
  const [unread,       setUnread]      = useState(0)
  const [shown,        setShown]       = useState(false)
  const bottomRef = useRef()
  const inputRef  = useRef()

  /* ── Load live portal data + realtime sync ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [aR, eR, pR] = await Promise.all([
          supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('events').select('*').order('start_date', { ascending: true }).limit(50),
          supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(50),
        ])
        if (aR.data)  setLiveAnn(aR.data)
        if (eR.data)  setLiveEvents(eR.data)
        if (pR.data)  setLiveProjects(pR.data)
        if (aR.error) console.error('ISKAI ann error:', aR.error)
        if (eR.error) console.error('ISKAI ev error:', eR.error)
        if (pR.error) console.error('ISKAI proj error:', pR.error)
      } catch (e) { console.error('ISKAI load:', e) }
    }
    load()
    const ch = supabase.channel('iskai-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'announcements' }, load)
      .on('postgres_changes', { event:'*', schema:'public', table:'events' },        load)
      .on('postgres_changes', { event:'*', schema:'public', table:'projects' },      load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  /* ── Welcome message ── */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!shown) {
        setMessages([{
          role: 'bot',
          text: "👋 Mabuhay! I'm **ISKAI**, your Barangay AI assistant.\n\nAsk me anything about our announcements, events, projects, or barangay services!",
          time: new Date(),
          suggestions: ['Latest Announcements', 'Upcoming Events', 'SK Projects', 'Office Hours'],
        }])
        setUnread(1)
        setShown(true)
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [shown])

  /* ── Scroll to bottom ── */
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 100)
    }
  }, [open, messages])

  /* ── Main send handler ── */
  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')

    const userMsg = { role: 'user', text: msg, time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)

    await new Promise(r => setTimeout(r, 500))

    /* ── Priority 1: Broad category list requests (local engine — instant) ── */
    const qLower = msg.toLowerCase().trim()
    const isBroadCategory =
      /^(events?|announcements?|projects?|activities|mga event|mga project|mga announcement|lahat ng event|lahat ng project)$/.test(qLower) ||
      /^(show |list |all |latest |upcoming |recent )?(announcements?|events?|projects?|activities)$/.test(qLower)

    if (isBroadCategory) {
      const dataResult = answerFromData(msg, liveAnn, liveEvents, liveProjects)
      if (dataResult) {
        setTyping(false)
        setMessages(prev => [...prev, {
          role: 'bot', text: dataResult.answer, action: dataResult.action,
          time: new Date(), source: 'data',
        }])
        if (!open) setUnread(n => n+1)
        return
      }
    }

    /* ── Priority 2: Local data engine for specific questions ── */
    {
      const dataResult = answerFromData(msg, liveAnn, liveEvents, liveProjects)
      if (dataResult) {
        setTyping(false)
        setMessages(prev => [...prev, {
          role: 'bot', text: dataResult.answer, action: dataResult.action,
          time: new Date(), source: dataResult.source || 'data',
        }])
        if (!open) setUnread(n => n+1)
        return
      }
    }

    /* ── Priority 3: Backend AI (OpenAI → Claude fallback, API keys stay safe) ── */
    try {
      // Build a message that includes barangay context + live data + the user's question
      const fullMessage = buildAIMessage(msg, liveAnn, liveEvents, liveProjects)

      // Call our backend — never the AI API directly from the browser
      const { reply, provider } = await callBackend(fullMessage)

      if (reply && reply.trim()) {
        setTyping(false)
        setMessages(prev => [...prev, {
          role: 'bot',
          text: reply.trim(),
          time: new Date(),
          source: 'ai',
          provider, // 'openai' or 'claude' — shown in the badge
        }])
        if (!open) setUnread(n => n+1)
        return
      }
    } catch (aiErr) {
      console.error('ISKAI backend error:', aiErr.message)
      // Fall through to hard fallback below
    }

    /* ── Priority 4: Hard fallback if backend also fails ── */
    setTyping(false)
    setMessages(prev => [...prev, {
      role: 'bot',
      text: "I don't have specific information about that right now. You can:\n\n• 📢 Ask about **announcements** or **latest news**\n• 📅 Ask about **upcoming events**\n• 🏗️ Ask about **SK projects**\n• 📞 Visit the **Barangay Hall** (Mon–Fri, 8AM–5PM)\n• 💬 Use the **Feedback** section to send a message",
      time: new Date(), source: 'fallback',
    }])
    if (!open) setUnread(n => n+1)
  }, [input, open, liveAnn, liveEvents, liveProjects])

  const handleNavigate = (page) => {
    setOpen(false)
    if (onNavigate) onNavigate(page)
  }

  const fmtMsgTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' }) : ''

  return (
    <>
      <style>{`
        @keyframes iskDot {
          0%,80%,100% { transform:scale(0.6); opacity:0.4; }
          40%          { transform:scale(1);   opacity:1; }
        }
        @keyframes iskSlideUp {
          from { opacity:0; transform:translateY(20px) scale(0.96); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
        @keyframes iskSlideIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes iskPulse {
          0%,100% { box-shadow:0 0 0 0 rgba(197,48,48,0.5); }
          50%     { box-shadow:0 0 0 10px rgba(197,48,48,0); }
        }
        @keyframes iskBounce {
          0%,100% { transform:scale(1); }
          50%     { transform:scale(1.1); }
        }
        .isk-btn:hover   { transform:scale(1.06) !important; }
        .isk-chip        { transition:all 0.15s ease !important; }
        .isk-chip:hover  { background:${C.navy} !important; color:white !important; transform:translateY(-1px); }
        .isk-send:hover  { background:${C.crimson} !important; transform:scale(1.05); }
        .isk-close:hover { background:rgba(255,255,255,0.2) !important; }
        .isk-scroll::-webkit-scrollbar       { width:4px; }
        .isk-scroll::-webkit-scrollbar-thumb { background:#CBD5E0; border-radius:4px; }
      `}</style>

      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9000, fontFamily:"'Inter',sans-serif" }}>

        {/* ── CHAT WINDOW ── */}
        {open && (
          <div style={{
            position:'absolute', bottom:76, right:0,
            width:370, height:540,
            background:'white', borderRadius:20,
            boxShadow:'0 24px 80px rgba(15,36,68,0.22), 0 4px 24px rgba(0,0,0,0.08)',
            display:'flex', flexDirection:'column', overflow:'hidden',
            animation:'iskSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            border:`1px solid ${C.border}`,
          }}>

            {/* Header */}
            <div style={{ background:`linear-gradient(135deg, ${C.navy} 0%, ${C.navyLt} 100%)`, padding:'14px 18px', flexShrink:0, boxShadow:'0 2px 12px rgba(0,0,0,0.15)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:`linear-gradient(135deg,${C.gold},#F6E05E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:'2px solid rgba(255,255,255,0.25)', boxShadow:'0 2px 8px rgba(0,0,0,0.2)', flexShrink:0 }}>🤖</div>
                  <div>
                    <p style={{ color:'white', fontWeight:700, fontSize:15, margin:0, letterSpacing:'0.3px' }}>ISKAI</p>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:'#68D391' }}/>
                      <p style={{ color:'rgba(255,255,255,0.7)', fontSize:11, margin:0 }}>Online · Barangay SK Assistant</p>
                    </div>
                  </div>
                </div>
                <button className="isk-close" onClick={() => setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'white', width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, transition:'background .15s', padding:0 }}>✕</button>
              </div>
              <div style={{ marginTop:8, display:'flex', gap:6 }}>
                <span style={{ fontSize:10, background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.8)', padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
                  📡 Live Portal Data
                </span>
                <span style={{ fontSize:10, background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.8)', padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
                  📢 {liveAnn.length} Ann · 📅 {liveEvents.length} Ev · 🏗️ {liveProjects.length} Proj
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="isk-scroll" style={{ flex:1, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ animation:'iskSlideIn 0.2s ease', display:'flex', flexDirection:'column', alignItems: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:7, flexDirection: m.role==='user' ? 'row-reverse' : 'row' }}>
                    {m.role === 'bot' && (
                      <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${C.gold},#F6E05E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>🤖</div>
                    )}
                    {m.role === 'user' && (
                      <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${C.crimson},${C.crimson}CC)`, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:11, fontWeight:800, flexShrink:0 }}>Me</div>
                    )}
                    <div style={{
                      maxWidth:'78%', padding:'10px 14px', borderRadius: m.role==='user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: m.role==='user' ? `linear-gradient(135deg,${C.navyMid},${C.navyLt})` : 'white',
                      color: m.role==='user' ? 'white' : C.navy,
                      fontSize:13, lineHeight:1.6,
                      boxShadow: m.role==='bot' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      border: m.role==='bot' ? `1px solid ${C.border}` : 'none',
                    }}>
                      <FormatText text={m.text}/>
                      {/* Source badges */}
                      {m.source === 'data' && (
                        <div style={{ marginTop:6, fontSize:10, color:'#3182CE', display:'flex', alignItems:'center', gap:4 }}>
                          <span>📡</span> From live portal data
                        </div>
                      )}
                      {m.source === 'ai' && (
                        // Shows which AI provider actually answered (openai or claude)
                        <ProviderBadge provider={m.provider} />
                      )}
                      {m.source === 'predefined' && (
                        <div style={{ marginTop:6, fontSize:10, color:'#38A169', display:'flex', alignItems:'center', gap:4 }}>
                          <span>⚡</span> Instant response
                        </div>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize:10, color:'#A0AEC0', margin:'3px 38px 0', textAlign: m.role==='user' ? 'right' : 'left' }}>
                    {fmtMsgTime(m.time)}
                  </p>
                  {m.action && (
                    <div style={{ marginLeft:38, marginTop:4 }}>
                      <ActionBtn action={m.action} onNavigate={handleNavigate}/>
                    </div>
                  )}
                  {m.suggestions && i === messages.length-1 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8, marginLeft:38 }}>
                      {m.suggestions.map((s, si) => (
                        <button key={si} className="isk-chip" onClick={() => send(s)} style={{ padding:'5px 12px', borderRadius:20, border:`1.5px solid ${C.navyMid}`, background:'white', color:C.navyMid, fontSize:11, fontWeight:600, cursor:'pointer' }}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {typing && (
                <div style={{ animation:'iskSlideIn 0.2s ease', display:'flex', alignItems:'flex-end', gap:7 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${C.gold},#F6E05E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>🤖</div>
                  <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:'4px 16px 16px 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                    <TypingDots/>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Quick replies */}
            <div style={{ padding:'8px 14px 4px', background:'white', borderTop:`1px solid ${C.border}`, display:'flex', gap:6, overflowX:'auto', flexShrink:0 }}>
              {['Announcements','Events','Projects','Clearance','Hours'].map(q => (
                <button key={q} className="isk-chip" onClick={() => send(q)} style={{ padding:'4px 10px', borderRadius:20, border:`1.5px solid ${C.gold}`, background:'white', color:C.navy, fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>{q}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding:'10px 14px 14px', background:'white', flexShrink:0 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', background:'#F7FAFC', borderRadius:26, border:`1.5px solid ${C.border}`, padding:'4px 4px 4px 14px', transition:'border .15s' }}>
                <input ref={inputRef}
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
                  placeholder="Ask about announcements, events, projects…"
                  style={{ flex:1, background:'none', border:'none', fontSize:13, color:C.navy, fontFamily:"'Inter',sans-serif", outline:'none', padding:'6px 0' }}
                />
                <button className="isk-send" onClick={() => send()} disabled={!input.trim()} style={{ width:38, height:38, borderRadius:'50%', border:'none', background:input.trim() ? C.navyMid : C.border, color:'white', cursor:input.trim()?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', flexShrink:0, fontSize:16 }}>➤</button>
              </div>
              <p style={{ fontSize:10, color:'#A0AEC0', textAlign:'center', marginTop:6 }}>
                ISKAI · Barangay Bakakeng Central · Live Data
              </p>
            </div>
          </div>
        )}

        {/* ── FAB BUTTON ── */}
        <button className="isk-btn" onClick={() => setOpen(o => !o)} style={{
          width:60, height:60, borderRadius:'50%', border:'none',
          background:open ? C.navy : `linear-gradient(135deg,${C.navyMid} 0%,${C.navyLt} 100%)`,
          color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:open?22:28, boxShadow:'0 6px 28px rgba(15,36,68,0.4)',
          animation:!open && unread > 0 ? 'iskPulse 2s ease infinite' : 'none',
          position:'relative', transition:'all .2s ease',
        }}>
          {open ? '✕' : '🤖'}
          {!open && unread > 0 && (
            <div style={{ position:'absolute', top:-3, right:-3, width:20, height:20, borderRadius:'50%', background:C.crimson, border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:10, fontWeight:700, animation:'iskBounce 1s ease infinite' }}>{unread}</div>
          )}
        </button>

        {/* Tooltip */}
        {!open && !shown && (
          <div style={{ position:'absolute', bottom:70, right:0, background:C.navy, color:'white', padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:600, whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
            💬 Ask ISKAI anything!
            <div style={{ position:'absolute', bottom:-6, right:18, width:0, height:0, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:`6px solid ${C.navy}` }}/>
          </div>
        )}
      </div>
    </>
  )
}
