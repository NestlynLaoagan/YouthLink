import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const COLORS = {
  navy: '#1A365D',
  navyDark: '#0F2444',
  navyMid: '#2A4A7F',
  crimson: '#C53030',
  gold: '#D69E2E',
  softwhite: '#F7FAFC',
  charcoal: '#2D3748',
}

const GOOGLE_FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Inter:wght@400;500;600&display=swap');
`

const DEFAULT_FAQS = [
  { question: 'What are the barangay office hours?', answer: 'The barangay office is open Monday to Friday, 8:00 AM to 5:00 PM.' },
  { question: 'How do I get a barangay clearance?', answer: 'Visit the barangay hall with a valid ID. The clearance fee is ₱50. Processing time is 1–2 working days.' },
  { question: 'How do I register as an SK voter?', answer: 'Visit the COMELEC office or barangay hall during voter registration period with a valid ID. You must be 15–30 years old.' },
  { question: 'When is the next SK event?', answer: 'Check the Events section on this dashboard for the latest scheduled SK events and activities.' },
  { question: 'How do I report a concern?', answer: 'Click the red flag button at the bottom right of the page, or visit the barangay hall in person.' },
  { question: 'How do I update my profile?', answer: 'Click your profile avatar in the top right, then select "Profile Information" to update your details.' },
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '12px 16px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#CBD5E0',
          animation: `iskaiDot 1.2s ease-in-out ${i * 0.2}s infinite`
        }} />
      ))}
    </div>
  )
}

export default function ISKAIChat() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [faqs,     setFaqs]     = useState([])
  const [typing,   setTyping]   = useState(false)
  const [unread,   setUnread]   = useState(0)
  const [shown,    setShown]    = useState(false)
  const bottomRef = useRef()
  const inputRef  = useRef()

  useEffect(() => {
    // Load FAQs from Supabase
    const loadFaqs = () => {
      supabase.from('faqs').select('*').order('created_at', { ascending: true })
        .then(({ data }) => { setFaqs(data && data.length > 0 ? data : []) })
        .catch(() => setFaqs([]))
    }
    loadFaqs()

    // Realtime: reload FAQs whenever admin adds/edits/deletes
    const channel = supabase
      .channel('iskai-faqs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faqs' }, loadFaqs)
      .subscribe()

    // Welcome message after 2 seconds
    const t = setTimeout(() => {
      if (!shown) {
        setMessages([{
          role: 'bot',
          text: "Mabuhay! 👋 I'm **ISKAI**, your Barangay Bakakeng Central AI assistant. How can I help you today?",
          time: new Date(),
          suggestions: ['Office hours', 'Get clearance', 'SK events', 'Report concern']
        }])
        setUnread(1)
        setShown(true)
      }
    }, 2000)
    return () => { clearTimeout(t); supabase.removeChannel(channel) }
  }, [shown])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open, messages])

  const findAnswer = (q) => {
    const query = q.toLowerCase().trim()
    // Use DB faqs first; fall back to DEFAULT_FAQS only if DB returned nothing
    const source = faqs.length > 0 ? faqs : DEFAULT_FAQS

    // Best match: score by how many words match
    let bestMatch = null
    let bestScore = 0
    for (const f of source) {
      if (!f.question || !f.answer) continue
      const words = query.split(' ').filter(w => w.length > 2)
      const score = words.filter(w => f.question.toLowerCase().includes(w)).length
      if (score > bestScore) { bestScore = score; bestMatch = f }
    }
    if (bestMatch && bestScore > 0) return bestMatch.answer

    // Conversational shortcuts (always available)
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('mabuhay'))
      return "Hello! I'm ISKAI, your barangay AI assistant. You can ask me about office hours, barangay clearance, SK events, voter registration, and more. How can I help you?"
    if (query.includes('thank') || query.includes('salamat'))
      return "You're welcome! Is there anything else I can help you with? 😊"
    if (query.includes('bye') || query.includes('goodbye') || query.includes('paalam'))
      return "Goodbye! Don't hesitate to come back if you have more questions. Have a great day! 🙏"

    return "I'm sorry, I don't have a specific answer for that. Please visit the barangay hall or call our office directly for assistance. Is there anything else I can help you with?"
  }

  const send = (text) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')

    const userMsg = { role: 'user', text: msg, time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)

    // Simulate thinking delay
    setTimeout(() => {
      const answer = findAnswer(msg)
      setTyping(false)
      setMessages(prev => [...prev, {
        role: 'bot',
        text: answer,
        time: new Date(),
      }])
      if (!open) setUnread(n => n + 1)
    }, 800 + Math.random() * 600)
  }

  const formatText = (text) => {
    // Bold **text**
    return text.split('**').map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    )
  }

  const formatTime = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  }

  const suggestions = messages.length > 0 && messages[messages.length - 1]?.suggestions

  return (
    <>
      <style>{`
        ${GOOGLE_FONTS}
        .iskai-widget * { font-family: 'Inter', sans-serif !important; box-sizing: border-box; }
        .iskai-widget h1, .iskai-widget h2, .iskai-widget h3, .iskai-widget .iskai-heading {
          font-family: 'Poppins', sans-serif !important;
        }
        @keyframes iskaiDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes iskaiSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes iskaiBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes iskaiPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(197,48,48,0.5); }
          50% { box-shadow: 0 0 0 10px rgba(197,48,48,0); }
        }
        .iskai-btn:hover { transform: scale(1.05); }
        .iskai-msg-user { animation: iskaiSlideUp 0.25s ease; }
        .iskai-msg-bot  { animation: iskaiSlideUp 0.25s ease; }
        .iskai-input:focus { outline: none; border-color: ${COLORS.navy} !important; box-shadow: 0 0 0 3px rgba(26,54,93,0.12); }
        .iskai-chip:hover { background: ${COLORS.navy} !important; color: white !important; }
        .iskai-send:hover { background: #9B2C2C !important; }
        .iskai-close:hover { background: rgba(255,255,255,0.15) !important; }
        .iskai-scrollbar::-webkit-scrollbar { width: 4px; }
        .iskai-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }
      `}</style>

      <div className="iskai-widget" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9000 }}>

        {/* CHAT WINDOW */}
        {open && (
          <div style={{
            position: 'absolute', bottom: 72, right: 0,
            width: 360, height: 520,
            background: 'white', borderRadius: 20,
            boxShadow: '0 20px 60px rgba(26,54,93,0.2), 0 4px 20px rgba(0,0,0,0.1)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'iskaiSlideUp 0.3s ease',
            border: '1px solid rgba(26,54,93,0.1)'
          }}>

            {/* Header */}
            <div style={{
              background: `linear-gradient(135deg, ${COLORS.navyDark} 0%, ${COLORS.navy} 60%, ${COLORS.navyMid} 100%)`,
              padding: '16px 18px', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Bot avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${COLORS.gold}, #F6E05E)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, border: '2px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0
                  }}>🤖</div>
                  <div>
                    <p className="iskai-heading" style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2, margin: 0 }}>ISKAI</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#68D391' }} />
                      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: 0 }}>Online · Barangay AI Assistant</p>
                    </div>
                  </div>
                </div>
                <button className="iskai-close" onClick={() => setOpen(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'white',
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, transition: 'background 0.15s', padding: 0
                }}>✕</button>
              </div>
              {/* Tagline */}
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '8px 0 0', lineHeight: 1.4 }}>
                Powered by Barangay Bakakeng Central · Ask me anything!
              </p>
            </div>

            {/* Messages */}
            <div className="iskai-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'iskai-msg-user' : 'iskai-msg-bot'}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                    {/* Avatar */}
                    {m.role === 'bot' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${COLORS.gold},#F6E05E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginBottom: 2 }}>🤖</div>
                    )}
                    {m.role === 'user' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS.crimson, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0, marginBottom: 2 }}>Me</div>
                    )}
                    {/* Bubble */}
                    <div style={{
                      maxWidth: '72%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: m.role === 'user' ? COLORS.crimson : 'white',
                      color: m.role === 'user' ? 'white' : COLORS.charcoal,
                      fontSize: 13, lineHeight: 1.55,
                      boxShadow: m.role === 'bot' ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                      border: m.role === 'bot' ? '1px solid #E8EDF2' : 'none'
                    }}>
                      {formatText(m.text)}
                    </div>
                  </div>
                  <p style={{ fontSize: 10, color: '#A0AEC0', margin: '3px 36px 0', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                    {formatTime(m.time)}
                  </p>

                  {/* Suggestion chips */}
                  {m.suggestions && i === messages.length - 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, marginLeft: 36 }}>
                      {m.suggestions.map((s, si) => (
                        <button key={si} className="iskai-chip" onClick={() => send(s)}
                          style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${COLORS.navy}`, background: 'white', color: COLORS.navy, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {typing && (
                <div className="iskai-msg-bot" style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${COLORS.gold},#F6E05E)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🤖</div>
                  <div style={{ background: 'white', border: '1px solid #E8EDF2', borderRadius: '4px 16px 16px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Quick replies row */}
            <div style={{ padding: '8px 14px 4px', background: 'white', borderTop: '1px solid #F0F4F8', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
              {['Clearance', 'SK Events', 'Office Hours', 'Contact'].map(q => (
                <button key={q} className="iskai-chip" onClick={() => send(q)}
                  style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${COLORS.gold}`, background: 'white', color: COLORS.navyDark, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px 14px', background: 'white', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F7FAFC', borderRadius: 24, border: '1.5px solid #E2E8F0', padding: '4px 4px 4px 14px', transition: 'border 0.15s' }}>
                <input ref={inputRef} className="iskai-input"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Ask me anything…"
                  style={{ flex: 1, background: 'none', border: 'none', fontSize: 13, color: COLORS.charcoal, fontFamily: 'Inter, sans-serif', outline: 'none', padding: '6px 0' }}
                />
                <button className="iskai-send" onClick={() => send()}
                  disabled={!input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: input.trim() ? COLORS.crimson : '#E2E8F0',
                    color: 'white', cursor: input.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s', flexShrink: 0, fontSize: 15
                  }}>➤</button>
              </div>
              <p style={{ fontSize: 10, color: '#A0AEC0', textAlign: 'center', marginTop: 6 }}>
                ISKAI · Barangay Bakakeng Central AI
              </p>
            </div>
          </div>
        )}

        {/* FAB BUTTON */}
        <button onClick={() => setOpen(o => !o)} className="iskai-btn"
          style={{
            width: 58, height: 58, borderRadius: '50%', border: 'none',
            background: open
              ? COLORS.charcoal
              : `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
            color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: open ? 22 : 26,
            boxShadow: '0 6px 24px rgba(26,54,93,0.4)',
            transition: 'all 0.2s',
            animation: !open && unread > 0 ? 'iskaiPulse 2s ease infinite' : 'none',
            position: 'relative'
          }}>
          {open ? '✕' : '🤖'}

          {/* Unread badge */}
          {!open && unread > 0 && (
            <div style={{
              position: 'absolute', top: -3, right: -3,
              width: 20, height: 20, borderRadius: '50%',
              background: COLORS.crimson, border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 10, fontWeight: 700,
              animation: 'iskaiBounce 1s ease infinite'
            }}>{unread}</div>
          )}
        </button>

        {/* Tooltip on first load */}
        {!open && !shown && (
          <div style={{
            position: 'absolute', bottom: 68, right: 0,
            background: COLORS.navyDark, color: 'white',
            padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            fontFamily: 'Inter, sans-serif'
          }}>
            💬 Ask ISKAI anything!
            <div style={{ position: 'absolute', bottom: -6, right: 16, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${COLORS.navyDark}` }} />
          </div>
        )}
      </div>
    </>
  )
}
