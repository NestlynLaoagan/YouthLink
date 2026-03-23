import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/* ─────────────────────────────────────────
   THEME
───────────────────────────────────────── */
const C = {
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

/* ─────────────────────────────────────────
   PREDEFINED RESPONSES
   Priority 1 – checked BEFORE DB FAQs
───────────────────────────────────────── */
const PREDEFINED = [
  {
    keys: ['announcement','announcements','balita','news','notice','bulletin'],
    answer: '📢 **Announcements**\n\nYou can view all barangay announcements in the **Announcements** section of this portal. Tap the "Announcements" menu item on the left sidebar to see the latest news, notices, and updates from Barangay Bakakeng Central.',
    action: { label: 'Go to Announcements', page: 'announcements' },
  },
  {
    keys: ['event','events','activity','activities','program','programs','liga','assembly'],
    answer: '📅 **Events**\n\nAll upcoming SK and barangay events are listed in the **Events** section. You can view event schedules, dates, and descriptions there. Tap the "Events" menu item to see what\'s coming up!',
    action: { label: 'Go to Events', page: 'events' },
  },
  {
    keys: ['project','projects','accomplishment','accomplished','initiative','infrastructure'],
    answer: '🏗️ **Projects**\n\nSee all completed and ongoing SK projects in the **Projects** section. Each project includes photos, descriptions, and completion details. Tap "Projects" on the sidebar to explore.',
    action: { label: 'View Projects', page: 'projects' },
  },
  {
    keys: ['feedback','comment','suggestion','complaint','concern','reklamo','opinion'],
    answer: '💬 **Feedback**\n\nWe value your voice! You can submit your feedback, suggestions, or concerns through the **Feedback** section. Go to Feedback in the sidebar and fill out the form — it only takes a minute.',
    action: { label: 'Submit Feedback', page: 'feedback' },
  },
  {
    keys: ['register','registration','sign up','signup','create account','new account','mag-register','mag-sign up'],
    answer: '📝 **Registration**\n\nTo register as a constituent:\n1. Click **Sign Up** on the login page\n2. Enter your email and create a password\n3. Fill out the **Profiling Form** with your personal details\n4. Upload a valid **Government ID** (front and back)\n5. Wait for admin verification (usually 1–2 business days)\n\nOnce verified, you\'ll have full access to all portal features!',
  },
  {
    keys: ['clearance','barangay clearance','cedula','community tax'],
    answer: '📋 **Barangay Clearance**\n\nTo get a Barangay Clearance:\n• Visit the **Barangay Hall** in person\n• Bring a **valid government ID**\n• Pay the clearance fee of **₱50**\n• Processing takes **1–2 working days**\n\n📍 Office hours: Monday–Friday, 8:00 AM – 5:00 PM',
  },
  {
    keys: ['office hour','office hours','open','bukas','oras','schedule','when'],
    answer: '🕐 **Office Hours**\n\nThe Barangay Bakakeng Central office is open:\n\n📅 **Monday – Friday**\n⏰ **8:00 AM – 5:00 PM**\n\nClosed on weekends and public holidays.',
  },
  {
    keys: ['sk voter','sk registration','sangguniang kabataan','youth voter','kabataan'],
    answer: '🗳️ **SK Voter Registration**\n\nTo register as an SK voter:\n• You must be **15–30 years old**\n• Visit the **COMELEC office** or **Barangay Hall** during registration period\n• Bring a **valid ID** or proof of age\n• Registration is **free**\n\nWatch for announcements about the next registration schedule!',
  },
  {
    keys: ['verify','verification','verified','pending','id upload','upload id','my id'],
    answer: '✅ **ID Verification**\n\nYour account verification status can be checked in your **Profile**. After uploading your ID:\n\n• **Pending** – Your ID is being reviewed by an admin\n• **Verified** – Full portal access granted\n• **Declined** – Re-upload with a clearer, valid ID\n\nVerification usually takes **1–2 business days**.',
  },
  {
    keys: ['password','forgot password','reset password','change password'],
    answer: '🔐 **Password Help**\n\n**Forgot your password?**\nOn the login page, click **"Forgot Password?"** and enter your email. We\'ll send a reset link.\n\n**Change your password:**\nGo to **Settings** (bottom of the sidebar) → Password section → enter your new password.\n\nNeed more help? Contact the barangay office.',
  },
  {
    keys: ['contact','phone','email','address','location','location','saan'],
    answer: '📞 **Contact Information**\n\n🏛️ **Barangay Bakakeng Central**\n📍 Bakakeng Central, Baguio City\n📅 Mon–Fri: 8:00 AM – 5:00 PM\n\nFor urgent concerns, visit the Barangay Hall in person or use the **Feedback** section to submit a concern online.',
  },
  {
    keys: ['hello','hi','hey','good morning','good afternoon','good evening','mabuhay','kumusta','kamusta'],
    answer: "👋 **Mabuhay!**\n\nHello! I'm **ISKAI**, the AI assistant for Barangay Bakakeng Central's YouthLink Portal.\n\nI can help you with:\n• 📢 Announcements\n• 📅 Events\n• 🏗️ Projects\n• 💬 Feedback\n• 📝 Registration\n• 🔐 Account help\n\nWhat can I assist you with today?",
  },
  {
    keys: [
      'issue','issues','problem','problems','bug','bugs','broken','not working','error',
      'report','report concern','website issue','site issue','website problem','page issue',
      'something wrong','mali','sira','hindi gumagana','gusto kong ireport','ireport',
      'broken link','flag','red button','red flag','concern about website',
    ],
    answer: '🚩 **Website Issue / Report a Concern**\n\nIf you\'re experiencing a problem with this website, please use the **red flag button** (🔴) located at the **bottom-left corner** of your screen.\n\nClicking it will take you directly to our Facebook page where you can send us a message about the issue.\n\n👉 Or go directly: **facebook.com/share/1D6aTWgdiR/**\n\nOur team will look into it as soon as possible. Salamat! 🙏',
  },
  {
    keys: ['thank','thanks','salamat','maraming salamat'],
    answer: "😊 You're very welcome! Is there anything else I can help you with? Don't hesitate to ask!",
  },
  {
    keys: ['bye','goodbye','paalam','see you','ingat'],
    answer: "👋 Goodbye! Have a wonderful day. Feel free to come back anytime you need help. Mabuhay! 🇵🇭",
  },
]

const DEFAULT_FAQS = [
  { question: 'What are the barangay office hours?', answer: 'The barangay office is open Monday to Friday, 8:00 AM to 5:00 PM.' },
  { question: 'How do I get a barangay clearance?', answer: 'Visit the barangay hall with a valid ID. The clearance fee is ₱50. Processing time is 1–2 working days.' },
  { question: 'How do I register as an SK voter?', answer: 'Visit the COMELEC office or barangay hall during voter registration period with a valid ID. You must be 15–30 years old.' },
]

/* ─────────────────────────────────────────
   TYPING DOTS ANIMATION
───────────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center', padding:'14px 16px' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:8, height:8, borderRadius:'50%',
          background: C.navyMid, opacity:0.4,
          animation:`iskDot 1.4s ease-in-out ${i*0.2}s infinite`,
        }}/>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   ACTION BUTTON (navigate to page)
───────────────────────────────────────── */
function ActionBtn({ action, onNavigate }) {
  if (!action) return null
  return (
    <button onClick={() => onNavigate(action.page)}
      style={{
        marginTop:8, padding:'7px 14px', borderRadius:20,
        background: C.navy, color:'white', border:'none',
        fontSize:12, fontWeight:700, cursor:'pointer',
        fontFamily:"'Inter',sans-serif",
        display:'inline-flex', alignItems:'center', gap:6,
        transition:'background .15s',
        boxShadow:'0 2px 8px rgba(15,36,68,0.3)',
      }}
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
            {parts.map((part, pi) =>
              pi % 2 === 1
                ? <strong key={pi}>{part}</strong>
                : <span key={pi}>{part}</span>
            )}
            {line === '' && <br/>}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────
   MAIN CHATBOT COMPONENT
───────────────────────────────────────── */
export default function ISKAIChat({ onNavigate }) {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [faqs,     setFaqs]     = useState([])
  const [typing,   setTyping]   = useState(false)
  const [unread,   setUnread]   = useState(0)
  const [shown,    setShown]    = useState(false)
  const [aiMode,   setAiMode]   = useState(false) // true when using AI
  const bottomRef = useRef()
  const inputRef  = useRef()

  /* Load DB FAQs + realtime sync */
  useEffect(() => {
    const loadFaqs = () => {
      supabase.from('faqs').select('*').order('created_at', { ascending:true })
        .then(({ data }) => setFaqs(data && data.length > 0 ? data : []))
        .catch(() => setFaqs([]))
    }
    loadFaqs()
    const channel = supabase.channel('iskai-faqs')
      .on('postgres_changes', { event:'*', schema:'public', table:'faqs' }, loadFaqs)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  /* Welcome message */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!shown) {
        setMessages([{
          role:'bot', text:"👋 Mabuhay! I'm **ISKAI**, your Barangay AI assistant.\n\nAsk me about announcements, events, projects, feedback, or registration!",
          time: new Date(), suggestions:['Announcements','Events','Projects','Feedback','Register'],
        }])
        setUnread(1)
        setShown(true)
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [shown])

  /* Scroll to bottom */
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior:'smooth' })
        inputRef.current?.focus()
      }, 100)
    }
  }, [open, messages])

  /* ── Step 1: Check predefined responses ── */
  const checkPredefined = useCallback((query) => {
    const q = query.toLowerCase()
    for (const item of PREDEFINED) {
      if (item.keys.some(k => q.includes(k))) return item
    }
    return null
  }, [])

  /* ── Step 2: Check DB FAQs ── */
  const checkFAQs = useCallback((query) => {
    const q = query.toLowerCase()
    const source = faqs.length > 0 ? faqs : DEFAULT_FAQS
    let best = null, bestScore = 0
    for (const f of source) {
      if (!f.question || !f.answer) continue
      const words = q.split(' ').filter(w => w.length > 2)
      const score = words.filter(w => f.question.toLowerCase().includes(w)).length
      if (score > bestScore) { bestScore = score; best = f }
    }
    return bestScore > 0 ? best.answer : null
  }, [faqs])

  /* ── Step 3: Call AI API (Anthropic) ── */
  const callAI = useCallback(async (userMessage, history) => {
    try {
      const systemPrompt = `You are ISKAI, the helpful AI assistant for Barangay Bakakeng Central's YouthLink SK (Sangguniang Kabataan) Constituent Portal in Baguio City, Philippines.

Your role: Help residents and youth (15-30 years old) navigate the portal and answer questions about barangay services.

Portal sections: Home, Announcements, Projects, Events, Feedback.
Key services: Barangay clearance (₱50, 1-2 days), SK voter registration (15-30 yrs old), profiling/verification, feedback submission.
Office hours: Monday-Friday, 8AM-5PM.

Guidelines:
- Be friendly, helpful, and concise
- Use simple English and occasional Filipino words (Mabuhay, Salamat, etc.)
- Keep responses under 150 words
- Format with bullet points when listing steps
- End with an offer to help further
- If unsure, suggest visiting the barangay hall
- If the user reports a website issue, bug, or problem with the portal, always tell them to press the red flag button (🔴) at the bottom-left corner of the screen to report it, or visit facebook.com/share/1D6aTWgdiR/`

      const conversationHistory = history.slice(-6).map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.text.replace(/\*\*/g, ''),
      }))

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: systemPrompt,
          messages: [
            ...conversationHistory,
            { role: 'user', content: userMessage }
          ],
        }),
      })

      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      return data.content?.[0]?.text || null
    } catch {
      return null
    }
  }, [])

  /* ── Main send handler ── */
  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')

    const userMsg = { role:'user', text:msg, time:new Date() }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)
    setAiMode(false)

    // Small delay for natural feel
    await new Promise(r => setTimeout(r, 300))

    /* Priority 1: Predefined responses */
    const predefined = checkPredefined(msg)
    if (predefined) {
      await new Promise(r => setTimeout(r, 400))
      setTyping(false)
      setMessages(prev => [...prev, {
        role:'bot', text:predefined.answer,
        action:predefined.action, time:new Date(), source:'predefined',
      }])
      if (!open) setUnread(n => n+1)
      return
    }

    /* Priority 2: DB FAQs */
    const faqAnswer = checkFAQs(msg)
    if (faqAnswer) {
      await new Promise(r => setTimeout(r, 500))
      setTyping(false)
      setMessages(prev => [...prev, {
        role:'bot', text:faqAnswer, time:new Date(), source:'faq',
      }])
      if (!open) setUnread(n => n+1)
      return
    }

    /* Priority 3: AI fallback */
    setAiMode(true)
    setMessages(prev => {
      const aiAnswer = null
      return prev // keep typing indicator showing
    })

    const currentHistory = messages.concat(userMsg)
    const aiResponse = await callAI(msg, currentHistory)

    setTyping(false)
    setAiMode(false)

    if (aiResponse) {
      setMessages(prev => [...prev, {
        role:'bot', text:aiResponse, time:new Date(), source:'ai',
      }])
    } else {
      setMessages(prev => [...prev, {
        role:'bot',
        text:"I'm sorry, I couldn't find an answer for that. Please visit the **Barangay Hall** or contact the office directly.\n\n📍 Bakakeng Central, Baguio City\n⏰ Mon–Fri, 8AM–5PM",
        time:new Date(), source:'fallback',
      }])
    }
    if (!open) setUnread(n => n+1)
  }, [input, messages, open, checkPredefined, checkFAQs, callAI])

  const handleNavigate = (page) => {
    setOpen(false)
    if (onNavigate) onNavigate(page)
  }

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH',{ hour:'2-digit', minute:'2-digit' }) : ''

  const lastMsg = messages[messages.length-1]
  const suggestions = lastMsg?.suggestions

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
        @keyframes iskSpin {
          to { transform:rotate(360deg); }
        }
        .isk-btn  { transition:all 0.2s ease !important; }
        .isk-btn:hover { transform:scale(1.06) !important; }
        .isk-chip { transition:all 0.15s ease !important; }
        .isk-chip:hover { background:${C.navy} !important; color:white !important; transform:translateY(-1px); }
        .isk-input:focus { outline:none; border-color:${C.navyMid} !important; box-shadow:0 0 0 3px rgba(26,54,93,0.12) !important; }
        .isk-send:hover  { background:${C.crimson} !important; transform:scale(1.05); }
        .isk-close:hover { background:rgba(255,255,255,0.2) !important; }
        .isk-scroll::-webkit-scrollbar { width:4px; }
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
            <div style={{
              background:`linear-gradient(135deg, ${C.navy} 0%, ${C.navyLt} 100%)`,
              padding:'14px 18px', flexShrink:0,
              boxShadow:'0 2px 12px rgba(0,0,0,0.15)',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:44, height:44, borderRadius:'50%',
                    background:`linear-gradient(135deg, ${C.gold}, #F6E05E)`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:22, border:'2px solid rgba(255,255,255,0.25)',
                    boxShadow:'0 2px 8px rgba(0,0,0,0.2)', flexShrink:0,
                  }}>🤖</div>
                  <div>
                    <p style={{ color:'white', fontWeight:700, fontSize:15, margin:0, letterSpacing:'0.3px' }}>ISKAI</p>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:'#68D391' }}/>
                      <p style={{ color:'rgba(255,255,255,0.7)', fontSize:11, margin:0 }}>
                        {aiMode ? '🧠 Thinking with AI…' : 'Online · Barangay SK Assistant'}
                      </p>
                    </div>
                  </div>
                </div>
                <button className="isk-close" onClick={() => setOpen(false)} style={{
                  background:'none', border:'none', cursor:'pointer',
                  color:'white', width:32, height:32, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18, transition:'background .15s', padding:0,
                }}>✕</button>
              </div>
              {/* Mode badge */}
              <div style={{ marginTop:8, display:'flex', gap:6 }}>
                <span style={{ fontSize:10, background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.8)', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(255,255,255,0.15)' }}>
                  ⚡ Predefined Responses
                </span>
                <span style={{ fontSize:10, background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.8)', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(255,255,255,0.15)' }}>
                  🧠 AI Fallback
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="isk-scroll" style={{
              flex:1, overflowY:'auto', padding:'14px 14px 8px',
              background:'#F8FAFC', display:'flex', flexDirection:'column', gap:10,
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{ animation:'iskSlideIn 0.25s ease', display:'flex', flexDirection:'column', alignItems:m.role==='user'?'flex-end':'flex-start' }}>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:7, flexDirection:m.role==='user'?'row-reverse':'row' }}>
                    {/* Avatar */}
                    {m.role === 'bot' && (
                      <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${C.gold},#F6E05E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, marginBottom:2 }}>🤖</div>
                    )}
                    {m.role === 'user' && (
                      <div style={{ width:30, height:30, borderRadius:'50%', background:C.crimson, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:11, fontWeight:700, flexShrink:0, marginBottom:2 }}>Me</div>
                    )}
                    {/* Bubble */}
                    <div style={{
                      maxWidth:'74%', padding:'10px 14px',
                      borderRadius:m.role==='user'?'16px 4px 16px 16px':'4px 16px 16px 16px',
                      background:m.role==='user' ? `linear-gradient(135deg, ${C.navyMid}, ${C.navyLt})` : 'white',
                      color:m.role==='user'?'white':C.navy,
                      fontSize:13, lineHeight:1.6,
                      boxShadow:m.role==='bot'?'0 2px 8px rgba(0,0,0,0.06)':'none',
                      border:m.role==='bot'?`1px solid ${C.border}`:'none',
                    }}>
                      <FormatText text={m.text}/>
                      {m.source === 'ai' && (
                        <div style={{ marginTop:6, fontSize:10, color:C.navyMid, opacity:0.6, display:'flex', alignItems:'center', gap:4 }}>
                          <span>🧠</span> AI-powered response
                        </div>
                      )}
                      {m.source === 'predefined' && (
                        <div style={{ marginTop:6, fontSize:10, color:'#48BB78', opacity:0.8, display:'flex', alignItems:'center', gap:4 }}>
                          <span>⚡</span> Instant response
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Timestamp */}
                  <p style={{ fontSize:10, color:'#A0AEC0', margin:'3px 38px 0', textAlign:m.role==='user'?'right':'left' }}>
                    {formatTime(m.time)}
                  </p>
                  {/* Action button */}
                  {m.action && (
                    <div style={{ marginLeft:38, marginTop:4 }}>
                      <ActionBtn action={m.action} onNavigate={handleNavigate}/>
                    </div>
                  )}
                  {/* Suggestion chips */}
                  {m.suggestions && i === messages.length-1 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8, marginLeft:38 }}>
                      {m.suggestions.map((s,si) => (
                        <button key={si} className="isk-chip" onClick={() => send(s)} style={{
                          padding:'5px 12px', borderRadius:20,
                          border:`1.5px solid ${C.navyMid}`,
                          background:'white', color:C.navyMid,
                          fontSize:11, fontWeight:600, cursor:'pointer',
                        }}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {typing && (
                <div style={{ animation:'iskSlideIn 0.2s ease', display:'flex', alignItems:'flex-end', gap:7 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${C.gold},#F6E05E)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>🤖</div>
                  <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:'4px 16px 16px 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                    {aiMode
                      ? <div style={{ padding:'10px 14px', fontSize:12, color:C.navyMid, display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ display:'inline-block', width:12, height:12, border:`2px solid ${C.navyMid}`, borderTopColor:'transparent', borderRadius:'50%', animation:'iskSpin .7s linear infinite' }}/>
                          Consulting AI…
                        </div>
                      : <TypingDots/>
                    }
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Quick replies */}
            <div style={{ padding:'8px 14px 4px', background:'white', borderTop:`1px solid ${C.border}`, display:'flex', gap:6, overflowX:'auto', flexShrink:0 }}>
              {['Hours','Clearance','Register','Events','Projects'].map(q => (
                <button key={q} className="isk-chip" onClick={() => send(q)} style={{
                  padding:'4px 10px', borderRadius:20,
                  border:`1.5px solid ${C.gold}`,
                  background:'white', color:C.navy,
                  fontSize:10, fontWeight:600, cursor:'pointer',
                  whiteSpace:'nowrap', flexShrink:0,
                }}>{q}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding:'10px 14px 14px', background:'white', flexShrink:0 }}>
              <div style={{
                display:'flex', gap:8, alignItems:'center',
                background:'#F7FAFC', borderRadius:26,
                border:`1.5px solid ${C.border}`, padding:'4px 4px 4px 14px',
                transition:'border .15s',
              }}>
                <input ref={inputRef} className="isk-input"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
                  placeholder="Ask me anything…"
                  style={{ flex:1, background:'none', border:'none', fontSize:13, color:C.navy, fontFamily:"'Inter',sans-serif", outline:'none', padding:'6px 0' }}
                />
                <button className="isk-send" onClick={() => send()} disabled={!input.trim()} style={{
                  width:38, height:38, borderRadius:'50%', border:'none',
                  background:input.trim() ? C.navyMid : C.border,
                  color:'white', cursor:input.trim()?'pointer':'not-allowed',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .15s', flexShrink:0, fontSize:16,
                }}>➤</button>
              </div>
              <p style={{ fontSize:10, color:'#A0AEC0', textAlign:'center', marginTop:6 }}>
                ISKAI · Hybrid AI · Barangay Bakakeng Central
              </p>
            </div>
          </div>
        )}

        {/* ── FAB BUTTON ── */}
        <button className="isk-btn" onClick={() => setOpen(o => !o)} style={{
          width:60, height:60, borderRadius:'50%', border:'none',
          background:open ? C.navy : `linear-gradient(135deg, ${C.navyMid} 0%, ${C.navyLt} 100%)`,
          color:'white', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:open?22:28,
          boxShadow:'0 6px 28px rgba(15,36,68,0.4)',
          animation:!open && unread > 0 ? 'iskPulse 2s ease infinite' : 'none',
          position:'relative', transition:'all .2s ease',
        }}>
          {open ? '✕' : '🤖'}
          {/* Unread badge */}
          {!open && unread > 0 && (
            <div style={{
              position:'absolute', top:-3, right:-3,
              width:20, height:20, borderRadius:'50%',
              background:C.crimson, border:'2px solid white',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'white', fontSize:10, fontWeight:700,
              animation:'iskBounce 1s ease infinite',
            }}>{unread}</div>
          )}
        </button>

        {/* Tooltip */}
        {!open && !shown && (
          <div style={{
            position:'absolute', bottom:70, right:0,
            background:C.navy, color:'white',
            padding:'8px 14px', borderRadius:10,
            fontSize:12, fontWeight:600, whiteSpace:'nowrap',
            boxShadow:'0 4px 16px rgba(0,0,0,0.2)',
          }}>
            💬 Ask ISKAI anything!
            <div style={{ position:'absolute', bottom:-6, right:18, width:0, height:0, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:`6px solid ${C.navy}` }}/>
          </div>
        )}
      </div>
    </>
  )
}
