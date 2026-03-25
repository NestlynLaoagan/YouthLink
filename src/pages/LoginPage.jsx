import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle, User, Lock, Mail, ArrowLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

// ── Profiling helpers (mirrored from ProfilingForm) ──────────────────────────
const calcAge = (bday) => {
  if (!bday) return ''
  const d = new Date(bday), t = new Date()
  let a = t.getFullYear()-d.getFullYear()
  if (t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate())) a--
  return String(a)
}
const youthGroup = (age) => {
  const n = parseInt(age)
  if (n>=16&&n<=17) return '16-17 yrs old'
  if (n>=18&&n<=24) return '18-24 yrs old'
  if (n>=25&&n<=30) return '25-30 yrs old'
  return ''
}
const PROFILING_EMPTY = {
  last_name:'', given_name:'', middle_name:'',
  purok:'', street:'', barangay:'Bakakeng Central', city:'Baguio City',
  contact:'', birthday:'', age:'', gender:'',
  civil_status:'', work_status:'', youth_age_group:'',
  youth_classification:'', youth_spec:'', educational_background:'',
  registered_sk_voter:'', voted_last_election:'', national_voter:''
}
const pinp = { width:'100%', padding:'10px 13px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:13, fontFamily:'Inter,Georgia,sans-serif', outline:'none', color:'#2D3748', transition:'border .15s', boxSizing:'border-box' }
const pFocus = e => { e.target.style.borderColor='#1A365D'; e.target.style.background='white' }
const pBlur  = e => { e.target.style.borderColor='#E2E8F0'; e.target.style.background='#F8FAFC' }

const PSectionHeader = ({ num, title }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:8, borderBottom:'2px solid #D69E2E' }}>
    <div style={{ width:22, height:22, borderRadius:'50%', background:'#1A365D', color:'white', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 }}>{num}</div>
    <p style={{ fontSize:11, fontWeight:700, color:'#1A365D', textTransform:'uppercase', letterSpacing:'0.6px', margin:0 }}>{title}</p>
  </div>
)
const PLabel = ({ children, required }) => (
  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#4A5568', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:5 }}>
    {children}{required && <span style={{ color:'#C53030', marginLeft:2 }}>*</span>}
  </label>
)
const PField = ({ label, required, children }) => (
  <div style={{ marginBottom:12 }}>
    <PLabel required={required}>{label}</PLabel>
    {children}
  </div>
)

const pwCheck = (pw) => ({
  length: pw.length >= 8,
  upper:  /[A-Z]/.test(pw),
  lower:  /[a-z]/.test(pw),
  num:    /[0-9]/.test(pw),
})

function Dots() {
  return (
    <>
      <div style={{ position:'absolute', top:72,  left:52,  width:10, height:10, borderRadius:'50%', background:'#C53030', opacity:0.7 }}/>
      <div style={{ position:'absolute', top:140, left:220, width:8,  height:8,  borderRadius:'50%', background:'#1A365D', opacity:0.6 }}/>
      <div style={{ position:'absolute', top:200, left:80,  width:6,  height:6,  borderRadius:'50%', background:'#D69E2E', opacity:0.8 }}/>
      <div style={{ position:'absolute', top:88,  left:320, width:12, height:12, borderRadius:'50%', border:'2px solid #1A365D', background:'transparent', opacity:0.5 }}/>
      <div style={{ position:'absolute', bottom:180, left:60,  width:8, height:8, borderRadius:'50%', border:'2px solid #C53030', background:'transparent', opacity:0.6 }}/>
      <div style={{ position:'absolute', bottom:120, left:280, width:6, height:6, borderRadius:'50%', background:'#D69E2E', opacity:0.7 }}/>
      <div style={{ position:'absolute', top:160, left:170, fontSize:18, color:'#D69E2E', opacity:0.7, fontWeight:300 }}>+</div>
      <div style={{ position:'absolute', bottom:200, left:340, fontSize:14, color:'#1A365D', opacity:0.5, fontWeight:300 }}>+</div>
      <div style={{ position:'absolute', top:'38%', left:'28%', width:130, height:90, borderRadius:'50%', border:'2px dashed rgba(26,54,93,0.25)', transform:'rotate(-20deg)' }}/>
    </>
  )
}

function Illustration() {
  return (
    <div style={{ position:'relative', width:280, height:260 }}>
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:220, height:220, borderRadius:'50%', background:'rgba(214,158,46,0.12)' }}/>
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:170, height:170, borderRadius:'50%', background:'rgba(26,54,93,0.08)' }}/>
      <div style={{ position:'absolute', bottom:30, left:'50%', transform:'translateX(-50%)', width:190, height:130, borderRadius:12, background:'white', border:'3px solid #1A365D', overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.12)' }}>
        <div style={{ background:'#EBF8FF', height:80, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'#F9A8D4', border:'3px solid white', margin:'0 auto 4px', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:'#EC4899' }}/>
            </div>
            <div style={{ width:40, height:24, borderRadius:'50% 50% 0 0', background:'#F9A8D4', margin:'0 auto', position:'relative' }}>
              <div style={{ position:'absolute', bottom:-8, right:-8, width:20, height:20, borderRadius:4, background:'#D69E2E', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:8, height:10, borderRadius:2, background:'#7B4800', position:'relative' }}>
                  <div style={{ position:'absolute', top:-5, left:'50%', transform:'translateX(-50%)', width:6, height:6, borderRadius:'50%', border:'2px solid #7B4800', background:'transparent' }}/>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ background:'#48BB78', height:28, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <div style={{ width:30, height:4, borderRadius:2, background:'rgba(255,255,255,0.7)' }}/>
          <div style={{ width:20, height:4, borderRadius:2, background:'rgba(255,255,255,0.5)' }}/>
        </div>
      </div>
      <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', width:40, height:16, background:'#718096', borderRadius:'0 0 6px 6px' }}/>
      <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', width:70, height:6, background:'#4A5568', borderRadius:4 }}/>
      <div style={{ position:'absolute', top:40, right:30, width:64, height:72, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="64" height="72" viewBox="0 0 64 72">
          <path d="M32 2 L60 14 L60 38 Q60 58 32 70 Q4 58 4 38 L4 14 Z" fill="#1A365D"/>
          <path d="M32 6 L56 17 L56 38 Q56 56 32 66 Q8 56 8 38 L8 17 Z" fill="#2A4A7F"/>
          <circle cx="32" cy="36" r="12" fill="none" stroke="white" strokeWidth="2.5"/>
          <path d="M26 36 L30 40 L38 32" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [tab,      setTab]    = useState('login')
  const [email,    setEmail]  = useState('')
  const [pw,       setPw]     = useState('')
  const [name,     setName]   = useState('')
  const [showPw,   setShowPw] = useState(false)
  const [remember, setRemem]  = useState(false)
  const [cfToken,  setCfToken]= useState('')   // Cloudflare Turnstile token
  const [loading,  setLoading]= useState(false)
  const [forgot,   setForgot] = useState(false)
  const [fEmail,   setFEmail] = useState('')
  const [fSent,    setFSent]  = useState(false)
  const [termsOpen,setTerms]  = useState(false)
  const [termsAgreed,setAgreed]= useState(false)
  // ── Multi-step signup: step 1 = credentials, step 2 = profiling ──
  const [signupStep,    setSignupStep]    = useState(1)
  const [profilingForm, setProfilingForm] = useState(PROFILING_EMPTY)
  const setPF = (k, v) => setProfilingForm(f => ({
    ...f, [k]: v,
    ...(k==='birthday' ? { age: calcAge(v), youth_age_group: youthGroup(calcAge(v)) } : {}),
    ...(k==='age'      ? { youth_age_group: youthGroup(v) } : {}),
  }))

  const { signIn, signUp, user, role } = useAuth()
  const { toast } = useToast()
  const navigate  = useNavigate()

  const turnstileRef = useRef(null)
  const widgetIdRef  = useRef(null)

  // ── Load Turnstile script, then render widget whenever tab changes ──
  useEffect(() => {
    const SITEKEY = '0x4AAAAAACvR3xoqFuJTbJtp'

    const renderWidget = () => {
      if (!turnstileRef.current || !window.turnstile) return
      // Remove old widget if any
      if (widgetIdRef.current !== null) {
        try { window.turnstile.remove(widgetIdRef.current) } catch(_) {}
        widgetIdRef.current = null
      }
      // Clear previous children
      turnstileRef.current.innerHTML = ''
      setCfToken('')
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: SITEKEY,
        theme: 'light',
        callback: (token) => setCfToken(token),
        'expired-callback': () => setCfToken(''),
        'error-callback':   () => setCfToken(''),
      })
    }

    // If script already loaded, render immediately
    if (window.turnstile) {
      renderWidget()
      return
    }

    // Otherwise inject script and render on load
    if (!document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script')
      s.id    = 'cf-turnstile-script'
      s.src   = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = renderWidget
      document.head.appendChild(s)
    } else {
      // Script tag exists but may still be loading — poll until ready
      const poll = setInterval(() => {
        if (window.turnstile) { clearInterval(poll); renderWidget() }
      }, 100)
      return () => clearInterval(poll)
    }
  }, [tab])  // re-render widget on every tab switch

  useEffect(() => {
    // Only redirect once role is fully resolved (not null).
    // role starts as null, then becomes the actual role string after fetchRole completes.
    // Without this guard, the redirect fires with role=null before fetchRole finishes,
    // causing admins to land on /dashboard instead of /admin/dashboard.
    if (user && role !== null && role !== undefined)
      navigate(role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
  }, [user, role, navigate])

  const [emailErr, setEmailErr] = useState('')
  const [nameErr,  setNameErr]  = useState('')
  const [checking, setChecking] = useState({ email: false, name: false })

  // ── Real-time duplicate email check — queries BOTH profiles and user_roles ──
  useEffect(() => {
    if (tab !== 'signup' || !email) { setEmailErr(''); return }
    const t = setTimeout(async () => {
      setChecking(c => ({ ...c, email: true }))
      try {
        // Check profiles table
        const { data: p } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle()
        // Also check user_roles (always populated on every signup)
        const { data: r } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle()
        setEmailErr((p || r) ? 'This email is already registered. Please use a different one.' : '')
      } catch(_) {}
      finally { setChecking(c => ({ ...c, email: false })) }
    }, 500)
    return () => clearTimeout(t)
  }, [email, tab])

  // ── Real-time duplicate name check ──
  useEffect(() => {
    if (tab !== 'signup' || !name) { setNameErr(''); return }
    const t = setTimeout(async () => {
      setChecking(c => ({ ...c, name: true }))
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .ilike('name', name.trim())
          .maybeSingle()
        setNameErr(data ? 'This name is already taken. Please use your full name or a variation.' : '')
      } catch(_) {}
      finally { setChecking(c => ({ ...c, name: false })) }
    }, 500)
    return () => clearTimeout(t)
  }, [name, tab])

  // ── Final hard duplicate check before advancing to step 2 ──
  const checkDuplicatesFinal = async () => {
    // Email — check both tables
    const [{ data: ep }, { data: er }] = await Promise.all([
      supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle(),
      supabase.from('user_roles').select('user_id').eq('email', email.trim().toLowerCase()).maybeSingle(),
    ])
    if (ep || er) {
      setEmailErr('This email is already registered. Please use a different one.')
      return false
    }
    // Name — check profiles
    const { data: np } = await supabase.from('profiles').select('id').ilike('name', name.trim()).maybeSingle()
    if (np) {
      setNameErr('This name is already taken. Please use your full name or a variation.')
      return false
    }
    return true
  }

  const checks   = pwCheck(pw)
  const allValid = Object.values(checks).every(Boolean)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!cfToken) { toast('Please complete the CAPTCHA verification.', 'error'); return }
    setLoading(true)
    try { await signIn(email, pw) }
    catch (err) { toast(err.message || 'Login failed. Check your credentials.', 'error') }
    finally { setLoading(false) }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (nameErr)   { toast('Please fix the name issue before signing up.', 'error'); return }
    if (emailErr)  { toast('Please fix the email issue before signing up.', 'error'); return }
    if (!cfToken)  { toast('Please complete the CAPTCHA verification.', 'error'); return }
    if (!allValid) { toast('Password does not meet all requirements.', 'error'); return }
    // If terms not yet agreed, pop open the modal instead of a toast
    if (!termsAgreed){ setTerms(true); return }
    // Final hard duplicate gate before advancing to step 2
    setLoading(true)
    try {
      const ok = await checkDuplicatesFinal()
      if (!ok) return
      setSignupStep(2)
    } catch(_) {
      toast('Could not verify your details. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Called from the Terms modal "I Agree & Close" button
  const handleAgreeAndProceed = async (e) => {
    e.stopPropagation()
    setAgreed(true)
    setTerms(false)
    // If all credentials are already valid, run final check and auto-advance
    if (!nameErr && !emailErr && !checking.name && !checking.email && cfToken && allValid) {
      setLoading(true)
      try {
        const ok = await checkDuplicatesFinal()
        if (ok) setSignupStep(2)
      } catch(_) {
        toast('Could not verify your details. Please try again.', 'error')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleProfilingSubmit = async (e) => {
    e.preventDefault()
    const pf = profilingForm
    if (!pf.given_name.trim() || !pf.last_name.trim()) { toast('Full name is required.','error'); return }
    if (!pf.gender)   { toast('Please select your gender.','error'); return }
    if (!pf.birthday) { toast('Birthday is required.','error'); return }
    setLoading(true)
    try {
      // 1. Create the account
      const newUser = await signUp(email, pw, name)
      const uid = newUser?.id

      // 2. Build the profile payload
      const fullName = [pf.given_name, pf.middle_name, pf.last_name].filter(Boolean).join(' ')
      const payload = {
        ...(uid ? { user_id: uid } : {}),
        name: fullName,
        last_name:   pf.last_name,
        given_name:  pf.given_name,
        middle_name: pf.middle_name,
        email: email.trim().toLowerCase(),
        address: [
          pf.purok   ? `Purok ${pf.purok}`   : '',
          pf.street  ? `Street ${pf.street}` : '',
          pf.barangay, pf.city
        ].filter(Boolean).join(', '),
        contact_number:         pf.contact ? `+639${pf.contact}` : null,
        birthday:               pf.birthday  || null,
        age:                    parseInt(pf.age) || null,
        gender:                 pf.gender,
        civil_status:           pf.civil_status,
        work_status:            pf.work_status,
        youth_age_group:        pf.youth_age_group,
        youth_classification:   pf.youth_classification + (pf.youth_spec ? `: ${pf.youth_spec}` : ''),
        educational_background: pf.educational_background,
        registered_sk_voter:    pf.registered_sk_voter === 'yes',
        voted_last_election:    pf.voted_last_election  === 'yes',
        national_voter:         pf.national_voter       === 'yes',
        verification_status:    'Verified',
        profile_completed:      true,
        updated_at:             new Date().toISOString(),
      }

      // 3. Save the profile (upsert by email since user_id may resolve async)
      const { error: profileErr } = await supabase.from('profiles').upsert(payload)
      if (profileErr) throw profileErr

      toast('Account created! Welcome to YouthLink.', 'success')
      // Navigation handled by useEffect watching user+role
    }
    catch (err) {
      // If auth says already registered, bounce back to step 1 with email error
      const msg = err.message || ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('user already')) {
        setEmailErr('This email is already registered. Please use a different one.')
        setSignupStep(1)
        toast('This email is already registered. Please use a different email.', 'error')
      } else {
        toast(msg || 'Sign up failed.', 'error')
      }
    }
    finally { setLoading(false) }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(fEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setFSent(true)
    } catch (err) { toast(err.message, 'error') }
  }

  const fieldStyle = {
    width:'100%', padding:'13px 16px 13px 44px',
    borderRadius:50, border:'1.5px solid #E8ECF0',
    background:'#F7F8FA', fontSize:14,
    fontFamily:"'Inter',sans-serif", color:'#2D3748',
    outline:'none', boxSizing:'border-box',
    transition:'border-color .15s, box-shadow .15s',
  }
  const iconStyle = {
    position:'absolute', left:16, top:'50%',
    transform:'translateY(-50%)', color:'#A0AEC0',
    pointerEvents:'none',
  }
  const onFocus = e => { e.target.style.borderColor='#1A365D'; e.target.style.boxShadow='0 0 0 3px rgba(26,54,93,0.10)'; e.target.style.background='white' }
  const onBlur  = e => { e.target.style.borderColor='#E8ECF0'; e.target.style.boxShadow='none'; e.target.style.background='#F7F8FA' }

  return (
    <div style={{ minHeight:'100vh', background:'#EEF0F8', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',sans-serif", padding:20 }}>

      {/* Card */}
      <div style={{ display:'flex', flexDirection:'column', width:'100%', maxWidth:900, background:'white', borderRadius:24, boxShadow:'0 8px 48px rgba(0,0,0,0.12)', overflow:'hidden', minHeight:'auto' }}
        className="login-card">
        <style>{`
          @media (min-width: 640px) {
            .login-card { flex-direction: row !important; min-height: 520px !important; }
            .login-left  { display: flex !important; }
            .login-right { padding: 44px !important; }
          }
          @media (max-width: 639px) {
            .login-left  { display: none !important; }
            .login-right { padding: 28px 20px !important; }
          }
        `}</style>

        {/* LEFT — hidden on mobile */}
        <div className="login-left" style={{ flex:'0 0 46%', background:'#F8FAFF', borderRight:'1px solid #EEF2F8', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 32px', position:'relative', overflow:'hidden' }}>
          <Dots/>

          {/* Logo + Brand inside left panel */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, marginBottom:28, position:'relative', zIndex:1 }}>
            <img src="/SK_Logo.png" alt="SK Logo" style={{ width:64, height:64, objectFit:'contain', filter:'drop-shadow(0 4px 12px rgba(26,54,93,0.20))' }}/>
            <p style={{ fontSize:11, fontWeight:800, color:'#1A365D', letterSpacing:'2px', textTransform:'uppercase', fontFamily:"'Montserrat','Inter',sans-serif", margin:0 }}>YouthLink</p>
          </div>

          <Illustration/>
          <p style={{ fontSize:13, color:'#718096', lineHeight:1.7, maxWidth:220, textAlign:'center', marginTop:24, position:'relative', zIndex:1 }}>
            Secure access to the Barangay Bakakeng Central SK Portal
          </p>
        </div>

        {/* RIGHT */}
        <div className="login-right" style={{ flex:1, padding:'44px', display:'flex', flexDirection:'column', justifyContent:'center' }}>

          <div style={{ marginBottom:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              {tab === 'signup' && signupStep === 2 && (
                <button type="button" onClick={() => setSignupStep(1)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#718096', padding:0, display:'flex', alignItems:'center' }}>
                  <ArrowLeft size={18}/>
                </button>
              )}
              <div style={{ width:36, height:3, background:'#1A365D', borderRadius:2 }}/>
            </div>
            <h2 style={{ fontSize:22, fontWeight:800, color:'#1A365D', margin:'0 0 4px', fontFamily:"'Montserrat','Inter',sans-serif" }}>
              {tab === 'login' ? 'Welcome Back' : signupStep === 1 ? 'Create Account' : 'Complete Your Profile'}
            </h2>
            <p style={{ fontSize:13, color:'#A0AEC0', margin:0 }}>
              {tab === 'login'
                ? 'Login as a community member'
                : signupStep === 1
                  ? 'Join Barangay Bakakeng Central'
                  : 'Step 2 of 2 — Your profile info'}
            </p>
            {tab === 'signup' && signupStep === 1 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
                <div style={{ width:28, height:4, borderRadius:2, background:'#1A365D' }}/>
                <div style={{ width:28, height:4, borderRadius:2, background:'#E2E8F0' }}/>
                <span style={{ fontSize:11, color:'#A0AEC0', marginLeft:4 }}>Step 1 of 2</span>
              </div>
            )}
            {tab === 'signup' && signupStep === 2 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
                <div style={{ width:28, height:4, borderRadius:2, background:'#1A365D' }}/>
                <div style={{ width:28, height:4, borderRadius:2, background:'#1A365D' }}/>
                <span style={{ fontSize:11, color:'#A0AEC0', marginLeft:4 }}>Step 2 of 2</span>
              </div>
            )}
          </div>

          <form onSubmit={tab === 'login' ? handleLogin : signupStep === 1 ? handleSignup : handleProfilingSubmit}>

            {/* ── Step 1: Credentials (hidden on step 2) ── */}
            {(tab === 'login' || signupStep === 1) && (<>

            {tab === 'signup' && (
              <div style={{ marginBottom: nameErr ? 6 : 14 }}>
                <div style={{ position:'relative' }}>
                  <User size={15} style={iconStyle}/>
                  <input style={{ ...fieldStyle, borderColor: nameErr ? '#E53E3E' : undefined }}
                    onFocus={onFocus} onBlur={onBlur}
                    value={name} onChange={e => { setName(e.target.value); setNameErr('') }}
                    required placeholder="Full name"/>
                  {checking.name && (
                    <div style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)',
                      width:14, height:14, borderRadius:'50%',
                      border:'2px solid #CBD5E0', borderTopColor:'#1A365D',
                      animation:'spin .6s linear infinite' }}/>
                  )}
                  {!checking.name && name && !nameErr && (
                    <svg style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)' }}
                      width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <circle cx="7.5" cy="7.5" r="7" fill="#38A169"/>
                      <path d="M4 7.5L6.5 10L11 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                {nameErr && (
                  <p style={{ fontSize:11, color:'#E53E3E', margin:'5px 4px 10px',
                    display:'flex', alignItems:'center', gap:4, fontFamily:"'Inter',sans-serif" }}>
                    ⚠ {nameErr}
                  </p>
                )}
              </div>
            )}

            <div style={{ marginBottom: emailErr ? 6 : 14 }}>
              <div style={{ position:'relative' }}>
                <Mail size={15} style={iconStyle}/>
                <input style={{ ...fieldStyle, borderColor: emailErr ? '#E53E3E' : undefined }}
                  onFocus={onFocus} onBlur={onBlur}
                  type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailErr('') }}
                  required placeholder="Email address"/>
                {tab === 'signup' && checking.email && (
                  <div style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)',
                    width:14, height:14, borderRadius:'50%',
                    border:'2px solid #CBD5E0', borderTopColor:'#1A365D',
                    animation:'spin .6s linear infinite' }}/>
                )}
                {tab === 'signup' && !checking.email && email && !emailErr && (
                  <svg style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)' }}
                    width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="7" fill="#38A169"/>
                    <path d="M4 7.5L6.5 10L11 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {emailErr && (
                <p style={{ fontSize:11, color:'#E53E3E', margin:'5px 4px 10px',
                  display:'flex', alignItems:'center', gap:4, fontFamily:"'Inter',sans-serif" }}>
                  ⚠ {emailErr}
                </p>
              )}
            </div>

            <div style={{ position:'relative', marginBottom: tab === 'login' ? 6 : 14 }}>
              <Lock size={15} style={iconStyle}/>
              <input style={{ ...fieldStyle, paddingRight:44 }}
                onFocus={onFocus} onBlur={onBlur}
                type={showPw ? 'text' : 'password'}
                value={pw} onChange={e => setPw(e.target.value)}
                required placeholder="Password"/>
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A0AEC0', display:'flex', alignItems:'center', padding:0 }}>
                {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>

            {tab === 'signup' && pw && (
              <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:3 }}>
                {[['length','At least 8 characters'],['upper','One uppercase letter'],['lower','One lowercase letter'],['num','One number']].map(([k,l]) => (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color: checks[k] ? '#38A169' : '#A0AEC0' }}>
                    <CheckCircle size={10}/>{l}
                  </div>
                ))}
              </div>
            )}

            {tab === 'login' && (
              <div style={{ textAlign:'right', marginBottom:12 }}>
                <button type="button" onClick={() => setForgot(true)}
                  style={{ fontSize:12, color:'#A0AEC0', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  Forget your password?{' '}
                  <span style={{ color:'#1A365D', fontWeight:700 }}>Get help Signed in.</span>
                </button>
              </div>
            )}

            {tab === 'login' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', color:'#718096', userSelect:'none' }}>
                  <div onClick={() => setRemem(r => !r)} style={{ width:18, height:18, borderRadius:4, border:`2px solid ${remember ? '#1A365D' : '#CBD5E0'}`, background: remember ? '#1A365D' : 'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s', cursor:'pointer' }}>
                    {remember && <div style={{ width:8, height:8, borderRadius:1, background:'white' }}/>}
                  </div>
                  Remember me
                </label>
              </div>
            )}

            </> /* end step-1 credentials */ )}

            {/* ── Terms agreement (signup step 1 only) ── */}
            {tab === 'signup' && signupStep === 1 && (
              <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:10,
                border:`1.5px solid ${termsAgreed ? '#1A365D' : '#E8ECF0'}`,
                background: termsAgreed ? 'rgba(26,54,93,0.04)' : '#F7F8FA',
                transition:'all .2s' }}>
                <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', userSelect:'none' }}>
                  <div onClick={() => setAgreed(a => !a)} style={{
                    width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                    border:`2px solid ${termsAgreed ? '#1A365D' : '#CBD5E0'}`,
                    background: termsAgreed ? '#1A365D' : 'white',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .2s', cursor:'pointer',
                    boxShadow: termsAgreed ? '0 0 0 3px rgba(26,54,93,0.12)' : 'none',
                  }}>
                    {termsAgreed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize:12, color:'#4A5568', lineHeight:1.6 }}>
                    I have read and agree to the{' '}
                    <button type="button" onClick={e => { e.stopPropagation(); setTerms(true) }}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:0,
                        color:'#1A365D', fontWeight:700, fontSize:12, textDecoration:'underline',
                        fontFamily:"'Inter',sans-serif" }}>
                      Terms and Conditions
                    </button>
                    {' '}of the SK Bakakeng Central Youth Portal.
                  </span>
                </label>
              </div>
            )}

            {/* ── Cloudflare Turnstile CAPTCHA (step 1 only) ── */}
            {(tab === 'login' || signupStep === 1) && (
              <div style={{ marginBottom:18, display:'flex', justifyContent:'center' }}>
                <div ref={turnstileRef} />
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                SIGNUP STEP 2 — Profiling Form (inline)
            ══════════════════════════════════════════════════════ */}
            {tab === 'signup' && signupStep === 2 && (
              <div style={{ maxHeight:'52vh', overflowY:'auto', paddingRight:4, marginBottom:16 }}>

                {/* SECTION 1 — Personal Information */}
                <div style={{ background:'#F8FAFC', borderRadius:10, padding:16, marginBottom:12, border:'1px solid #E2E8F0' }}>
                  <PSectionHeader num="1" title="Personal Information"/>

                  <PField label="Full Name" required>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                      <div>
                        <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:600 }}>Last Name</label>
                        <input style={pinp} onFocus={pFocus} onBlur={pBlur} placeholder="Last" value={profilingForm.last_name} onChange={e => setPF('last_name', e.target.value)} required/>
                      </div>
                      <div>
                        <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:600 }}>Given Name</label>
                        <input style={pinp} onFocus={pFocus} onBlur={pBlur} placeholder="Given" value={profilingForm.given_name} onChange={e => setPF('given_name', e.target.value)} required/>
                      </div>
                      <div>
                        <label style={{ display:'block', fontSize:10, color:'#718096', marginBottom:3, fontWeight:600 }}>Middle Name</label>
                        <input style={pinp} onFocus={pFocus} onBlur={pBlur} placeholder="Middle" value={profilingForm.middle_name} onChange={e => setPF('middle_name', e.target.value)}/>
                      </div>
                    </div>
                  </PField>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <PField label="Birthday" required>
                      <input style={pinp} onFocus={pFocus} onBlur={pBlur} type="date" value={profilingForm.birthday} onChange={e => setPF('birthday', e.target.value)} required/>
                    </PField>
                    <PField label="Age">
                      <input style={{ ...pinp, background:'#EDF2F7', color:'#718096' }} value={profilingForm.age} readOnly placeholder="Auto-calculated"/>
                    </PField>
                  </div>

                  <PField label="Gender" required>
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.gender} onChange={e => setPF('gender', e.target.value)} required>
                      <option value="">Select gender</option>
                      {['Male','Female','Non-binary','Prefer not to say'].map(g => <option key={g}>{g}</option>)}
                    </select>
                  </PField>

                  <PField label="Civil Status">
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.civil_status} onChange={e => setPF('civil_status', e.target.value)}>
                      <option value="">Select status</option>
                      {['Single','Married','Widowed','Separated','Annulled'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </PField>

                  <PField label="Contact Number">
                    <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                      <span style={{ padding:'10px 10px', background:'#EDF2F7', borderRadius:'8px 0 0 8px', border:'1.5px solid #E2E8F0', borderRight:'none', fontSize:13, color:'#4A5568', whiteSpace:'nowrap' }}>+63 9</span>
                      <input style={{ ...pinp, borderRadius:'0 8px 8px 0' }} onFocus={pFocus} onBlur={pBlur} type="tel" maxLength={9} placeholder="XXXXXXXXX" value={profilingForm.contact} onChange={e => setPF('contact', e.target.value.replace(/\D/g,''))}/>
                    </div>
                  </PField>
                </div>

                {/* SECTION 2 — Address */}
                <div style={{ background:'#F8FAFC', borderRadius:10, padding:16, marginBottom:12, border:'1px solid #E2E8F0' }}>
                  <PSectionHeader num="2" title="Address"/>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <PField label="Purok">
                      <input style={pinp} onFocus={pFocus} onBlur={pBlur} placeholder="e.g. 5" value={profilingForm.purok} onChange={e => setPF('purok', e.target.value)}/>
                    </PField>
                    <PField label="Street">
                      <input style={pinp} onFocus={pFocus} onBlur={pBlur} placeholder="Street name" value={profilingForm.street} onChange={e => setPF('street', e.target.value)}/>
                    </PField>
                  </div>
                  <PField label="Barangay">
                    <input style={{ ...pinp, background:'#EDF2F7', color:'#718096' }} value={profilingForm.barangay} readOnly/>
                  </PField>
                  <PField label="City">
                    <input style={{ ...pinp, background:'#EDF2F7', color:'#718096' }} value={profilingForm.city} readOnly/>
                  </PField>
                </div>

                {/* SECTION 3 — Background */}
                <div style={{ background:'#F8FAFC', borderRadius:10, padding:16, marginBottom:12, border:'1px solid #E2E8F0' }}>
                  <PSectionHeader num="3" title="Background Information"/>
                  <PField label="Work Status">
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.work_status} onChange={e => setPF('work_status', e.target.value)}>
                      <option value="">Select status</option>
                      {['Employed','Unemployed','Self-employed','Student','OFW'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </PField>
                  <PField label="Educational Background">
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.educational_background} onChange={e => setPF('educational_background', e.target.value)}>
                      <option value="">Select level</option>
                      {['Elementary','High School','Senior High School','Vocational','College','Post-Graduate','No Formal Education'].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </PField>
                  <PField label="Youth Classification">
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.youth_classification} onChange={e => setPF('youth_classification', e.target.value)}>
                      <option value="">Select classification</option>
                      {['In-school Youth','Out-of-school Youth','Working Youth','Youth with disability','Children in conflict with law','Indigenous People'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </PField>
                </div>

                {/* SECTION 4 — Voter Info */}
                <div style={{ background:'#F8FAFC', borderRadius:10, padding:16, border:'1px solid #E2E8F0' }}>
                  <PSectionHeader num="4" title="Voter Information"/>
                  {[
                    ['registered_sk_voter','Registered SK Voter?'],
                    ['voted_last_election','Voted in Last SK Election?'],
                    ['national_voter','Registered National Voter?'],
                  ].map(([key, label]) => (
                    <PField key={key} label={label}>
                      <div style={{ display:'flex', gap:12 }}>
                        {['yes','no'].map(val => (
                          <label key={val} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', color:'#4A5568' }}>
                            <input type="radio" name={key} value={val} checked={profilingForm[key]===val} onChange={() => setPF(key, val)} style={{ accentColor:'#1A365D' }}/>
                            {val.charAt(0).toUpperCase()+val.slice(1)}
                          </label>
                        ))}
                      </div>
                    </PField>
                  ))}
                </div>
              </div>
            )}

            <button type="submit"
              disabled={loading || (tab === 'signup' && signupStep === 1 && (!!nameErr || !!emailErr || checking.name || checking.email))}
              style={{
              width:'100%', padding:'14px', borderRadius:50, border:'none',
              background: (loading || (tab === 'signup' && signupStep === 1 && (!!nameErr || !!emailErr || checking.name || checking.email))) ? '#718096' : '#1A365D',
              cursor: (loading || (tab === 'signup' && signupStep === 1 && (!!nameErr || !!emailErr || checking.name || checking.email))) ? 'not-allowed' : 'pointer',
              color:'white', fontSize:13, fontWeight:700,
              fontFamily:"'Montserrat','Inter',sans-serif",
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              letterSpacing:'2px', textTransform:'uppercase',
              transition:'background .15s, transform .1s',
              boxShadow:'0 4px 16px rgba(26,54,93,0.3)',
            }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background='#0F2444'; e.currentTarget.style.transform='translateY(-1px)' }}}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.background='#1A365D'; e.currentTarget.style.transform='translateY(0)' }}}>
              {loading && <Loader2 size={16} className="spinner"/>}
              {tab === 'login' ? 'Login' : signupStep === 1 ? (<>Next — Complete Profile <ChevronRight size={15}/></>) : 'Create Account'}
            </button>

            <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#A0AEC0' }}>
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setPw(''); setEmail(''); setName(''); setAgreed(false); setSignupStep(1); setProfilingForm(PROFILING_EMPTY) }}
                style={{ color:'#1A365D', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:13, padding:0 }}>
                {tab === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>

            <p style={{ textAlign:'center', marginTop:14, fontSize:11 }}>
              <button type="button" onClick={() => setTerms(true)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:11,
                  color:'#A0AEC0', textDecoration:'underline', padding:0,
                  fontFamily:"'Inter',sans-serif", transition:'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color='#1A365D'}
                onMouseLeave={e => e.currentTarget.style.color='#A0AEC0'}>
                Terms and Conditions · Privacy Policy
              </button>
            </p>
          </form>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {forgot && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:20, padding:36, maxWidth:400, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize:20, fontWeight:800, color:'#1A365D', marginBottom:6, fontFamily:"'Montserrat','Inter',sans-serif" }}>Reset Password</h3>
            {fSent ? (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <CheckCircle size={48} style={{ color:'#38A169', margin:'0 auto 14px', display:'block' }}/>
                <p style={{ fontSize:14, color:'#718096', lineHeight:1.6 }}>Password reset link sent!<br/>Please check your email inbox.</p>
                <button onClick={() => { setForgot(false); setFSent(false) }}
                  style={{ marginTop:20, padding:'11px 28px', borderRadius:50, background:'#1A365D', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:13, letterSpacing:'1px' }}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <p style={{ fontSize:13, color:'#718096', marginBottom:20, lineHeight:1.6 }}>
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <div style={{ position:'relative', marginBottom:20 }}>
                  <Mail size={15} style={iconStyle}/>
                  <input style={fieldStyle} onFocus={onFocus} onBlur={onBlur}
                    type="email" value={fEmail} onChange={e => setFEmail(e.target.value)}
                    required placeholder="Email address"/>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" onClick={() => setForgot(false)}
                    style={{ flex:1, padding:'11px', borderRadius:50, border:'1px solid #E2E8F0', background:'white', cursor:'pointer', fontSize:13, fontWeight:600, color:'#718096' }}>
                    Cancel
                  </button>
                  <button type="submit"
                    style={{ flex:1, padding:'11px', borderRadius:50, border:'none', background:'#C53030', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                    Send Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── TERMS & CONDITIONS MODAL ── */}
      {termsOpen && (
        <div onClick={() => setTerms(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
          zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center',
          padding:20, backdropFilter:'blur(4px)'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'white', borderRadius:20, width:'100%', maxWidth:680,
            maxHeight:'88vh', display:'flex', flexDirection:'column',
            boxShadow:'0 24px 64px rgba(0,0,0,0.25)', overflow:'hidden'
          }}>
            {/* Header */}
            <div style={{ padding:'24px 28px 16px', borderBottom:'1px solid #E8ECF0', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div>
                  <h2 style={{ fontSize:20, fontWeight:800, color:'#1A365D', margin:'0 0 4px', fontFamily:"'Montserrat','Inter',sans-serif" }}>
                    Terms and Conditions
                  </h2>
                  <p style={{ fontSize:12, color:'#A0AEC0', margin:0, fontFamily:"'Inter',sans-serif" }}>
                    Official SK Bakakeng Central Youth Portal · Last Updated: March 24, 2026
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setTerms(false) }} style={{
                  background:'#F7F8FA', border:'1px solid #E8ECF0', borderRadius:8,
                  width:32, height:32, cursor:'pointer', fontSize:16, color:'#718096',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                }}>✕</button>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY:'auto', padding:'20px 28px 28px', flex:1, fontFamily:"'Inter',sans-serif", lineHeight:1.75, color:'#4A5568' }}>
              <p style={{ fontSize:13, marginBottom:20 }}>
                Welcome to the Official SK Bakakeng Central Youth Portal. By accessing, logging in, or creating an account, you (the "User") agree to be bound by these Terms and Conditions. If you do not agree, please refrain from using the platform.
              </p>

              {[
                {
                  num:'1', title:'Eligibility & Registration',
                  items:[
                    ['Membership', 'This portal is strictly for residents of Barangay Bakakeng Central aged 15 to 30 years old, who constitute the Katipunan ng Kabataan (KK).'],
                    ['Account Accuracy', 'You agree to provide true, accurate, and updated information. Using a false identity or registering for someone else is strictly prohibited and may result in disqualification from SK programs.'],
                    ['Minor Consent', 'Users aged 15–17 confirm that they have informed their parents or legal guardians regarding their participation in this portal.'],
                  ]
                },
                {
                  num:'2', title:'Data Privacy & Security',
                  items:[
                    ['Data Protection', 'All personal data is processed in accordance with the Data Privacy Act of 2012. Information collected is used solely for official SK profiling, program applications, and government reporting.'],
                    ['Account Security', 'You are responsible for safeguarding your login credentials, including passwords and verification codes (e.g., OTP). The SK Council shall not be liable for unauthorized access resulting from your failure to secure your account.'],
                  ]
                },
                {
                  num:'3', title:'Code of Conduct',
                  intro:'To maintain a safe and respectful environment, you agree NOT to:',
                  bullets:[
                    'Post content that is defamatory, obscene, abusive, or misleading',
                    'Upload malicious software or attempt to disrupt system security',
                    'Use the platform for commercial advertisements or spam',
                    'Impersonate SK officials, barangay personnel, or other users',
                  ]
                },
                {
                  num:'4', title:'Use of Services',
                  intro:'This portal allows users to submit requests, applications, and inquiries.',
                  bullets:[
                    'Submission of a request does not guarantee approval',
                    'All requests are subject to verification and approval by the SK Council',
                    'Processing times may vary depending on the nature of the request',
                  ]
                },
                {
                  num:'5', title:'AI Chatbot Disclaimer',
                  intro:'This portal may include an AI-powered chatbot to assist users.',
                  bullets:[
                    'The chatbot provides general guidance only',
                    'Responses are not official decisions or approvals',
                    'Users are advised to verify important information with SK officials',
                  ]
                },
                {
                  num:'6', title:'Intellectual Property',
                  plain:'All official content, including logos, documents (reports), and media, are the property of SK Bakakeng Central. Materials may be downloaded for personal, non-commercial use only. Unauthorized reproduction or distribution is prohibited.'
                },
                {
                  num:'7', title:'Limitation of Liability',
                  intro:'The SK Council strives to provide accurate and timely information; however:',
                  bullets:[
                    'The portal may experience temporary downtime or errors',
                    'Information may be updated without prior notice',
                    'The SK Council shall not be held liable for any damages arising from the use or inability to use the platform.',
                  ]
                },
                {
                  num:'8', title:'External Links',
                  plain:'This portal may include links to external government websites such as the National Youth Commission (NYC), TESDA, or DILG. The SK Council is not responsible for their content or policies.'
                },
                {
                  num:'9', title:'Termination of Account',
                  intro:'The SK Council reserves the right to suspend or terminate accounts that:',
                  bullets:[
                    'Violate these Terms and Conditions',
                    'Provide false or misleading information',
                    'Engage in harmful or abusive behavior',
                  ]
                },
                {
                  num:'10', title:'Changes to Terms',
                  plain:'These Terms may be updated to reflect changes in policies, laws, or system features. Continued use of the portal constitutes acceptance of the updated Terms.'
                },
                {
                  num:'11', title:'User Acknowledgment',
                  plain:'By clicking "I Agree" or by accessing this portal, you confirm that you have read, understood, and agreed to these Terms and Conditions, along with the Privacy Policy.'
                },
              ].map(s => (
                <div key={s.num} style={{ marginBottom:20 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'#1A365D', margin:'0 0 8px',
                    fontFamily:"'Montserrat','Inter',sans-serif",
                    paddingBottom:4, borderBottom:'1px solid #EDF2F7' }}>
                    {s.num}. {s.title}
                  </h3>
                  {s.items && s.items.map(([label, text]) => (
                    <p key={label} style={{ fontSize:13, margin:'0 0 8px' }}>
                      <strong style={{ color:'#2D3748' }}>{label}:</strong> {text}
                    </p>
                  ))}
                  {s.intro && <p style={{ fontSize:13, margin:'0 0 6px' }}>{s.intro}</p>}
                  {s.bullets && (
                    <ul style={{ margin:'0 0 0 18px', padding:0 }}>
                      {s.bullets.map((b,i) => (
                        <li key={i} style={{ fontSize:13, marginBottom:4 }}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {s.plain && <p style={{ fontSize:13, margin:0 }}>{s.plain}</p>}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 28px', borderTop:'1px solid #E8ECF0', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F7F8FA' }}>
              <p style={{ fontSize:11, color:'#A0AEC0', margin:0, fontFamily:"'Inter',sans-serif" }}>
                SK Bakakeng Central · Last Updated: March 24, 2026
              </p>
              <button onClick={handleAgreeAndProceed} style={{
                padding:'10px 28px', borderRadius:50, border:'none',
                background:'#1A365D', color:'white', cursor:'pointer',
                fontSize:13, fontWeight:700, letterSpacing:'1px',
                fontFamily:"'Montserrat','Inter',sans-serif",
                boxShadow:'0 4px 12px rgba(26,54,93,0.3)'
              }}>
                I Agree & Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{"@keyframes spin { to { transform: rotate(360deg); } } .spinner { animation: spin 0.8s linear infinite; }"}</style>
    </div>
  )
}
