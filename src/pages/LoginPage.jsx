import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle, User, Lock, Mail, ArrowLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import GoogleAuthButton from '../components/GoogleAuthButton'

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
  if (n>=15&&n<=17) return '15-17 yrs old'
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
  const [checks,setChecks] = useState({c1:false,c2:false})
  const termsAgreed = Object.values(checks).every(Boolean)
  // ── Multi-step signup: step 1 = credentials, step 2 = profiling ──
  const [signupStep,    setSignupStep]    = useState(1)
  const [profilingForm, setProfilingForm] = useState(PROFILING_EMPTY)
  const [birthdayErr,   setBirthdayErr]   = useState('')
  const [bdDay,   setBdDay]   = useState('')
  const [bdMonth, setBdMonth] = useState('')
  const [bdYear,  setBdYear]  = useState('')

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const validateBirthDate = (day, month, year) => {
    if (!day || !month || !year) { setBirthdayErr(''); return '' }
    const monthIdx = MONTHS.indexOf(month)
    if (monthIdx === -1) { setBirthdayErr('Please enter a valid date'); return '' }
    const d = parseInt(day), y = parseInt(year)
    if (isNaN(d) || d < 1 || d > 31 || isNaN(y) || y < 1900 || y > new Date().getFullYear()) {
      setBirthdayErr('Please enter a valid date'); return ''
    }
    // Check days in month
    const daysInMonth = new Date(y, monthIdx + 1, 0).getDate()
    if (d > daysInMonth) { setBirthdayErr('Please enter a valid date'); return '' }
    const dateStr = `${y}-${String(monthIdx+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const age = calcAge(dateStr)
    const n = parseInt(age)
    if (isNaN(n) || n < 15 || n > 30) {
      setBirthdayErr('Invalid age. Only residents aged 15–30 are eligible to register.')
      return dateStr
    }
    setBirthdayErr('')
    return dateStr
  }

  const handleBdChange = (field, value) => {
    const newDay   = field === 'day'   ? value : bdDay
    const newMonth = field === 'month' ? value : bdMonth
    const newYear  = field === 'year'  ? value : bdYear
    if (field === 'day')   setBdDay(value)
    if (field === 'month') setBdMonth(value)
    if (field === 'year')  setBdYear(value)
    const dateStr = validateBirthDate(newDay, newMonth, newYear)
    setProfilingForm(f => ({
      ...f,
      birthday: dateStr,
      age: dateStr ? calcAge(dateStr) : '',
      youth_age_group: dateStr ? youthGroup(calcAge(dateStr)) : '',
    }))
  }

  const setPF = (k, v) => {
    if (k === 'birthday') {
      const age = calcAge(v)
      const n   = parseInt(age)
      if (v && (isNaN(n) || n < 15 || n > 30)) {
        setBirthdayErr('Invalid age. Only residents aged 15–30 are eligible to register.')
      } else {
        setBirthdayErr('')
      }
    }
    setProfilingForm(f => ({
      ...f, [k]: v,
      ...(k==='birthday' ? { age: calcAge(v), youth_age_group: youthGroup(calcAge(v)) } : {}),
      ...(k==='age'      ? { youth_age_group: youthGroup(v) } : {}),
    }))
  }

  const { signIn, signUp, user, role, profile, isNewGoogleUser } = useAuth()
  const { toast } = useToast()
  const navigate      = useNavigate()
  const location      = useLocation()
  const [searchParams] = useSearchParams()
  // Optional deep-link redirect: /login?redirect=/dashboard?tab=events&event=<id>
  const redirectAfterLogin = searchParams.get('redirect') || null

  // ── Allowed email domains ─────────────────────────────────────────────────
  const ALLOWED_DOMAINS = ['gmail.com', 'yahoo.com']
  const isEmailDomainAllowed = (val) => {
    const domain = val.split('@')[1]?.toLowerCase()
    return !domain || ALLOWED_DOMAINS.includes(domain)
  }
  const emailDomainError = (val) => {
    const domain = val.split('@')[1]?.toLowerCase()
    if (domain && !ALLOWED_DOMAINS.includes(domain))
      return 'Only @gmail.com and @yahoo.com email addresses are accepted.'
    return ''
  }

  // ── Auto-switch to signup tab when navigated here with state.tab='signup' ──
  useEffect(() => {
    if (location.state?.tab === 'signup') {
      setTab('signup')
      // Clear the state so a page refresh doesn't re-trigger it
      window.history.replaceState({}, '')
    }
  }, [location.state])

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
    if (user && role !== null && role !== undefined) {
      const isAdmin = ['admin', 'super_admin', 'superadmin', 'super admin'].includes(
        (role || '').toLowerCase().trim()
      )
      if (isAdmin) {
        navigate('/admin/dashboard', { replace: true })
        return
      }
      // New Google OAuth user who hasn't completed their profile → profiling form
      if (isNewGoogleUser && (profile === null || profile === undefined || !profile?.profile_completed)) {
        navigate('/profile-setup', { replace: true })
        return
      }
      // If a ?redirect= param was provided (e.g. from an event invitation email),
      // send the user directly there after login.
      if (redirectAfterLogin) {
        navigate(redirectAfterLogin, { replace: true })
        return
      }
      // All other users (email/password login, returning Google users) → dashboard directly
      navigate('/dashboard', { replace: true })
    }
  }, [user, role, profile, isNewGoogleUser, navigate, redirectAfterLogin])

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

  const pwChecks = pwCheck(pw)
  const allValid = Object.values(pwChecks).every(Boolean)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!isEmailDomainAllowed(email)) { toast('Only @gmail.com and @yahoo.com email addresses are accepted.', 'error'); return }
    if (!cfToken) { toast('Please complete the CAPTCHA verification.', 'error'); return }
    setLoading(true)
    try { await signIn(email, pw) }
    catch (err) { toast(err.message || 'Login failed. Check your credentials.', 'error') }
    finally { setLoading(false) }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!isEmailDomainAllowed(email)) { toast('Only @gmail.com and @yahoo.com email addresses are accepted.', 'error'); return }
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
    setChecks({c1:true,c2:true})
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
    if (birthdayErr)  { toast('Invalid age. Only residents aged 15–30 are eligible to register.','error'); return }
    setLoading(true)
    try {
      // 1. Create the account
      const newUser = await signUp(email, pw, name)
      const uid = newUser?.user?.id || newUser?.id

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

      // 3. Save the profile — upsert by user_id if available, fall back to email
      const upsertPayload = { ...payload }
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert(upsertPayload, {
          onConflict: uid ? 'user_id' : 'email',
          ignoreDuplicates: false,
        })
      if (profileErr) throw profileErr

      // 4. If uid was resolved, ensure the row has user_id set (handles race where email row existed first)
      if (uid) {
        await supabase
          .from('profiles')
          .update({ user_id: uid })
          .eq('email', email.trim().toLowerCase())
          .is('user_id', null)
      }

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

  // ── Google OAuth handlers ─────────────────────────────────────────────────
  const handleGoogleSuccess = (googleUser) => {
    // Session is already set inside GoogleAuthButton via supabase.auth.setSession().
    // The AuthContext onAuthStateChange listener will fire automatically and
    // call loadUser → setUser + setRole, which triggers the redirect useEffect above.
    toast(`Welcome, ${googleUser.name || googleUser.email}!`, 'success')
  }

  const handleGoogleError = (message) => {
    toast(message || 'Google sign-in failed. Please try again.', 'error')
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
                  type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailErr(emailDomainError(e.target.value)) }}
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
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color: pwChecks[k] ? '#38A169' : '#A0AEC0' }}>
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
              <div style={{ marginBottom:14, padding:'12px 14px', borderRadius:10,
                border:`1.5px solid ${termsAgreed ? '#1A365D' : '#E8ECF0'}`,
                background: termsAgreed ? 'rgba(26,54,93,0.04)' : '#F7F8FA',
                transition:'all .2s' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#1A365D', margin:0, fontFamily:"'Montserrat','Inter',sans-serif" }}>
                    ☑️ User Agreement
                  </p>
                  <button type="button" onClick={e => { e.stopPropagation(); setTerms(true) }}
                    style={{ background:'none', border:'none', cursor:'pointer', padding:0,
                      color:'#1A365D', fontWeight:700, fontSize:11, textDecoration:'underline',
                      fontFamily:"'Inter',sans-serif" }}>
                    Read Full Terms
                  </button>
                </div>
                {[
                  { k:'c1', label: <span>I confirm that I meet the eligibility requirements and that the information I provided is true and correct</span> },
                  { k:'c2', label: <span>I have read and agree to the <button type="button" onClick={e => { e.stopPropagation(); e.preventDefault(); setTerms(true) }} style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'#1A365D', fontWeight:700, textDecoration:'underline', fontSize:'inherit', fontFamily:'inherit', lineHeight:'inherit' }}>Terms of Service and Privacy Policy</button>, including how my data will be collected and used for official SK purposes</span> },
                ].map(({k, label}) => (
                  <label key={k} style={{ display:'flex', alignItems:'flex-start', gap:9, cursor:'pointer', userSelect:'none', marginBottom:8 }}>
                    <div onClick={() => setChecks(p=>({...p,[k]:!p[k]}))} style={{
                      width:16, height:16, borderRadius:3, flexShrink:0, marginTop:2,
                      border:`2px solid ${checks[k] ? '#1A365D' : '#CBD5E0'}`,
                      background: checks[k] ? '#1A365D' : 'white',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      transition:'all .2s', cursor:'pointer',
                      boxShadow: checks[k] ? '0 0 0 3px rgba(26,54,93,0.12)' : 'none',
                    }}>
                      {checks[k] && (
                        <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize:11, color:'#4A5568', lineHeight:1.6 }}>{label}</span>
                  </label>
                ))}
                {!termsAgreed && (
                  <p style={{ fontSize:10, color:'#E53E3E', margin:'4px 0 0', fontStyle:'italic' }}>
                    ⚠ You must agree to all items before proceeding.
                  </p>
                )}
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

                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    {/* Birthday — takes most of the width */}
                    <div style={{ flex:'1 1 auto' }}>
                      <PField label="Birthday" required>
                        <div style={{ display:'grid', gridTemplateColumns:'72px 1fr 88px', gap:6 }}>
                          {/* Day */}
                          <fieldset style={{
                            border: `1.5px solid ${birthdayErr ? '#C53030' : '#CBD5E0'}`,
                            borderRadius:9, padding:'5px 10px 7px', margin:0,
                            background: birthdayErr ? '#FFF5F5' : '#F8FAFC',
                            transition:'border .15s, background .15s',
                          }}>
                            <legend style={{ fontSize:9, color: birthdayErr ? '#C53030' : '#4A5568', fontWeight:700, padding:'0 4px', letterSpacing:'0.4px', textTransform:'uppercase', lineHeight:1 }}>Day</legend>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={2}
                              placeholder="DD"
                              value={bdDay}
                              onChange={e => handleBdChange('day', e.target.value.replace(/\D/,''))}
                              onFocus={e => { e.target.closest('fieldset').style.borderColor = birthdayErr ? '#C53030' : '#1A365D'; e.target.closest('fieldset').style.background='white' }}
                              onBlur={e  => { e.target.closest('fieldset').style.borderColor = birthdayErr ? '#C53030' : '#CBD5E0'; e.target.closest('fieldset').style.background = birthdayErr ? '#FFF5F5' : '#F8FAFC' }}
                              style={{ border:'none', background:'transparent', outline:'none', width:'100%', fontSize:15, fontWeight:500, color:'#2D3748', fontFamily:'Inter,sans-serif', padding:0 }}
                            />
                          </fieldset>
                          {/* Month */}
                          <fieldset style={{
                            border: `1.5px solid ${birthdayErr ? '#C53030' : '#CBD5E0'}`,
                            borderRadius:9, padding:'5px 10px 7px', margin:0,
                            background: birthdayErr ? '#FFF5F5' : '#F8FAFC',
                            transition:'border .15s, background .15s', position:'relative',
                          }}>
                            <legend style={{ fontSize:9, color: birthdayErr ? '#C53030' : '#4A5568', fontWeight:700, padding:'0 4px', letterSpacing:'0.4px', textTransform:'uppercase', lineHeight:1 }}>Month</legend>
                            <select
                              value={bdMonth}
                              onChange={e => handleBdChange('month', e.target.value)}
                              onFocus={e => { e.target.closest('fieldset').style.borderColor = birthdayErr ? '#C53030' : '#1A365D'; e.target.closest('fieldset').style.background='white' }}
                              onBlur={e  => { e.target.closest('fieldset').style.borderColor = birthdayErr ? '#C53030' : '#CBD5E0'; e.target.closest('fieldset').style.background = birthdayErr ? '#FFF5F5' : '#F8FAFC' }}
                              style={{ border:'none', background:'transparent', outline:'none', width:'100%', fontSize:15, fontWeight:500, color: bdMonth ? '#2D3748' : '#A0AEC0', fontFamily:'Inter,sans-serif', padding:0, appearance:'none', cursor:'pointer' }}
                            >
                              <option value="">Month</option>
                              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-10%)', pointerEvents:'none', color:'#718096', fontSize:10 }}>▾</span>
                          </fieldset>
                          {/* Year */}
                          <fieldset style={{
                            border: `1.5px solid ${birthdayErr ? '#C53030' : '#CBD5E0'}`,
                            borderRadius:9, padding:'5px 10px 7px', margin:0,
                            background: birthdayErr ? '#FFF5F5' : '#F8FAFC',
                            transition:'border .15s, background .15s',
                          }}>
                            <legend style={{ fontSize:9, color: birthdayErr ? '#C53030' : '#4A5568', fontWeight:700, padding:'0 4px', letterSpacing:'0.4px', textTransform:'uppercase', lineHeight:1 }}>Year</legend>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={4}
                              placeholder="YYYY"
                              value={bdYear}
                              onChange={e => handleBdChange('year', e.target.value.replace(/\D/,''))}
                              onFocus={e => { e.target.closest('fieldset').style.borderColor = birthdayErr ? '#C53030' : '#1A365D'; e.target.closest('fieldset').style.background='white' }}
                              onBlur={e  => { e.target.closest('fieldset').style.borderColor = birthdayErr ? '#C53030' : '#CBD5E0'; e.target.closest('fieldset').style.background = birthdayErr ? '#FFF5F5' : '#F8FAFC' }}
                              style={{ border:'none', background:'transparent', outline:'none', width:'100%', fontSize:15, fontWeight:500, color:'#2D3748', fontFamily:'Inter,sans-serif', padding:0 }}
                            />
                          </fieldset>
                        </div>
                      </PField>
                    </div>
                    {/* Age — fixed narrow width */}
                    <div style={{ flex:'0 0 72px' }}>
                      <PField label="Age">
                        <input style={{ ...pinp, background:'#EDF2F7', color:'#4A5568', fontWeight:600, textAlign:'center', padding:'10px 6px' }} value={profilingForm.age} readOnly placeholder="—"/>
                      </PField>
                    </div>
                  </div>
                  {birthdayErr && (
                    <p style={{ fontSize:11, color:'#E53E3E', margin:'-4px 4px 8px',
                      display:'flex', alignItems:'center', gap:4, fontFamily:"'Inter',sans-serif" }}>
                      ⚠ {birthdayErr}
                    </p>
                  )}

                  <PField label="Gender" required>
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.gender} onChange={e => setPF('gender', e.target.value)} required>
                      <option value="">Select gender</option>
                      {['Male','Female','Non-binary','Prefer not to say'].map(g => <option key={g}>{g}</option>)}
                    </select>
                  </PField>

                  <PField label="Civil Status">
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.civil_status} onChange={e => setPF('civil_status', e.target.value)}>
                      <option value="">Select status</option>
                      {['Single','Married','Divorced','Widowed','Separated','Live-in'].map(s => <option key={s}>{s}</option>)}
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

                {/* SECTION 3 — Demographic Background */}
                <div style={{ background:'#F8FAFC', borderRadius:10, padding:16, marginBottom:12, border:'1px solid #E2E8F0' }}>
                  <PSectionHeader num="3" title="Demographic Background"/>
                  <PField label="Work Status">
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.work_status} onChange={e => setPF('work_status', e.target.value)}>
                      <option value="">Select status</option>
                      {['Employed','Unemployed','Self-employed','Student','Looking for a job'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </PField>
                  <PField label="Youth Age Group">
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.youth_age_group} onChange={e => setPF('youth_age_group', e.target.value)}>
                      <option value="">Select age group</option>
                      {['15-17 yrs old','18-24 yrs old','25-30 yrs old'].map(g => <option key={g}>{g}</option>)}
                    </select>
                  </PField>
                  <PField label="Educational Background">
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.educational_background} onChange={e => setPF('educational_background', e.target.value)}>
                      <option value="">Select level</option>
                      {['Elementary','Highschool','Senior Highschool','College','Vocational'].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </PField>
                  <PField label="Youth Classification">
                    <select style={pinp} onFocus={pFocus} onBlur={pBlur} value={profilingForm.youth_classification} onChange={e => setPF('youth_classification', e.target.value)}>
                      <option value="">Select classification</option>
                      {['In school youth','Out of school youth','Working youth','Youth with special needs'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </PField>
                  {profilingForm.youth_classification === 'Youth with special needs' && (
                    <PField label="Please specify">
                      <input style={pinp} onFocus={pFocus} onBlur={pBlur} placeholder="Describe condition…" value={profilingForm.youth_spec} onChange={e => setPF('youth_spec', e.target.value)}/>
                    </PField>
                  )}
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
              disabled={loading || (tab === 'signup' && signupStep === 1 && (!!nameErr || !!emailErr || checking.name || checking.email)) || (tab === 'signup' && signupStep === 2 && !!birthdayErr)}              style={{
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

            {/* ── Google Sign-In (login tab only) ── */}
            {tab === 'login' && (
              <>
                {/* OR divider */}
                <div style={{ display:'flex', alignItems:'center', gap:12, margin:'18px 0' }}>
                  <div style={{ flex:1, height:1, background:'#E8ECF0' }}/>
                  <span style={{ fontSize:12, color:'#A0AEC0', fontWeight:500, whiteSpace:'nowrap' }}>or continue with</span>
                  <div style={{ flex:1, height:1, background:'#E8ECF0' }}/>
                </div>

                <GoogleAuthButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  disabled={loading}
                />
              </>
            )}

            <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#A0AEC0' }}>
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setPw(''); setEmail(''); setName(''); setChecks({c1:false,c2:false}); setSignupStep(1); setProfilingForm(PROFILING_EMPTY) }}
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
                    Official SK Bakakeng Central Youth Portal · Last Updated: April 3, 2026
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

              {/* Intro */}
              <div style={{ padding:'12px 16px', borderRadius:10, background:'#EBF8FF', border:'1px solid #BEE3F8', marginBottom:20 }}>
                <p style={{ fontSize:13, margin:0, color:'#2B6CB0', fontWeight:600 }}>📌 Welcome to SK Bakakeng Central Youth Link Portal</p>
                <p style={{ fontSize:12, margin:'4px 0 0', color:'#2C5282' }}>Before continuing, please review and agree to the following terms, privacy policy, and user agreement.</p>
              </div>

              {[
                {
                  emoji:'✅', title:'1. Acceptance of Terms',
                  plain:'By accessing, registering, or using the SK Bakakeng Central Youth Link Portal, you acknowledge that you have read, understood, and agreed to be legally bound to the following terms, privacy policy, and user agreement.',
                  note:'If you do not agree, please refrain from using the platform.'
                },
                {
                  emoji:'⚖️', title:'2. Eligibility and Legal Basis',
                  sections:[
                    {
                      label:'Why this restriction exists:',
                      plain:'The portal ensures only eligible youth beneficiaries can access SK services, maintain an accurate and lawful youth database, and prevent misuse of public resources intended specifically for the youth sector. Allowing users outside this age range would violate national law, compromise profiling data integrity, and affect funding and program allocation.'
                    },
                    {
                      label:'Your responsibility:',
                      plain:'By registering, you certify that you meet these legal requirements. Misrepresentation of age may result in disqualification and account termination.'
                    },
                    {
                      label:'',
                      plain:'This portal is exclusively for individuals aged 15 to 30 years old, residing in Barangay Bakakeng Central, who are members of the Katipunan ng Kabataan (KK). This requirement is based on Republic Act No. 10742, which:'
                    },
                    {
                      label:'',
                      bullets:[
                        'Legally defines the Katipunan ng Kabataan as all Filipino youth aged 15–30',
                        'Establishes the official youth sector recognized by the government',
                        'Limits participation in SK programs, profiling, and benefits strictly within this age group',
                      ]
                    },
                  ]
                },
                {
                  emoji:'📝', title:'3. Account Registration and Responsibility',
                  intro:'You agree to:',
                  bullets:[
                    'Provide complete, truthful, and updated personal information',
                    'Maintain the confidentiality of your login credentials',
                    'Accept responsibility for all activities conducted under your account',
                  ],
                  note:'The SK Council reserves the right to verify submitted information through official records.'
                },
                {
                  emoji:'🔐', title:'4. Data Privacy and Use of Information',
                  intro:'All personal data is processed in accordance with the Data Privacy Act of 2012.',
                  sections:[
                    {
                      label:'Purpose of Data Collection',
                      plain:'Your personal information is collected and used for the following:',
                      items:[
                        ['Youth Profiling', 'To create and maintain an updated registry of KK members, helping the SK Council identify youth needs, plan targeted programs, and ensure fair participation.'],
                        ['Program Processing', 'To evaluate eligibility for programs, scholarships, trainings, and events; process applications and submissions; and monitor participation and outcomes.'],
                        ['Communication', 'To send announcements, event updates, and reminders; inform users about opportunities; and respond to inquiries.'],
                        ['Verification & Security', 'To confirm identity, prevent duplicate or fraudulent registrations, and protect the integrity of the system.'],
                        ['Government Reporting', 'To comply with reporting requirements to agencies such as the National Youth Commission and Department of the Interior and Local Government.'],
                      ]
                    },
                    {
                      label:'Data Collection Scope',
                      plain:'The portal may collect:',
                      bullets:[
                        'Personal identification details (name, birthdate, age, gender)',
                        'Contact and residency information',
                        'Educational and employment background',
                        'Uploaded documents and activity history',
                      ]
                    },
                    {
                      label:'Data Protection and User Rights',
                      bullets:[
                        'Data is stored securely and accessible only to authorized personnel',
                        'Data is retained only as necessary for official purposes',
                        'You have the right to access, correct, or request deletion of your data, subject to applicable laws',
                        'You may withdraw consent, subject to administrative and legal limitations',
                      ]
                    },
                  ]
                },
                {
                  emoji:'⚠️', title:'5. Acceptable Use and Code of Conduct',
                  intro:'You agree NOT to:',
                  bullets:[
                    'Provide false or misleading information',
                    'Engage in harassment, abuse, or harmful behavior',
                    'Attempt to disrupt or compromise system security',
                    'Use the platform for commercial or unauthorized purposes',
                  ]
                },
                {
                  emoji:'🛎️', title:'6. Use of Services',
                  intro:'This portal provides access to SK-related services and requests.',
                  bullets:[
                    'Submission does not guarantee approval',
                    'All requests are subject to validation and review',
                    'Additional documents may be required when necessary',
                  ]
                },
                {
                  emoji:'🤖', title:'7. AI Chatbot Disclaimer',
                  intro:'The portal may include an AI chatbot designed to assist users.',
                  bullets:[
                    'It provides general information only and does not replace official SK decisions or personnel',
                    'Responses are not official decisions or approvals',
                    'Users must verify critical information with authorized SK officials',
                  ]
                },
                {
                  emoji:'📚', title:'8. Intellectual Property',
                  plain:'All portal content — including logos, documents, and media — belongs to SK Bakakeng Central. Unauthorized use, reproduction, or distribution is strictly prohibited. Materials may be downloaded for personal, non-commercial use only.'
                },
                {
                  emoji:'⚡', title:'9. Limitation of Liability',
                  intro:'The SK Council does not guarantee uninterrupted or error-free service. It shall not be held liable for:',
                  bullets:[
                    'Technical issues, downtime, or system errors',
                    'Loss of data caused by user actions or external factors',
                    'Decisions made based on chatbot or informational content',
                  ]
                },
                {
                  emoji:'🔗', title:'10. External Links',
                  plain:'The portal may link to external government websites such as the National Youth Commission, TESDA, or DILG. The SK Council is not responsible for their content or data practices.'
                },
                {
                  emoji:'🚫', title:'11. Account Suspension or Termination',
                  intro:'Accounts may be suspended or terminated for:',
                  bullets:[
                    'Violations of these Terms and Conditions',
                    'Submission of false or misleading information',
                    'Misuse or harmful behavior on the platform',
                  ]
                },
                {
                  emoji:'🔄', title:'12. Changes to Terms',
                  plain:'These Terms may be updated at any time to reflect changes in laws, policies, or system features. Continued use of the portal constitutes acceptance of the updated Terms.'
                },
              ].map((s,i) => (
                <div key={i} style={{ marginBottom:22 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'#1A365D', margin:'0 0 8px',
                    fontFamily:"'Montserrat','Inter',sans-serif",
                    paddingBottom:5, borderBottom:'1px solid #EDF2F7', display:'flex', alignItems:'center', gap:6 }}>
                    <span>{s.emoji}</span> {s.title}
                  </h3>
                  {s.intro && <p style={{ fontSize:13, margin:'0 0 8px' }}>{s.intro}</p>}
                  {s.plain && <p style={{ fontSize:13, margin:'0 0 8px' }}>{s.plain}</p>}
                  {s.bullets && (
                    <ul style={{ margin:'0 0 8px 18px', padding:0 }}>
                      {s.bullets.map((b,j) => <li key={j} style={{ fontSize:13, marginBottom:4 }}>{b}</li>)}
                    </ul>
                  )}
                  {s.note && <p style={{ fontSize:12, fontStyle:'italic', color:'#718096', margin:'6px 0 0', paddingLeft:12, borderLeft:'3px solid #CBD5E0' }}>{s.note}</p>}
                  {s.sections && s.sections.map((sec,j) => (
                    <div key={j} style={{ marginBottom:12 }}>
                      {sec.label && <p style={{ fontSize:12, fontWeight:700, color:'#2D3748', margin:'0 0 4px' }}>{sec.label}</p>}
                      {sec.plain && <p style={{ fontSize:13, margin:'0 0 6px', color:'#4A5568' }}>{sec.plain}</p>}
                      {sec.bullets && (
                        <ul style={{ margin:'0 0 0 18px', padding:0 }}>
                          {sec.bullets.map((b,k) => <li key={k} style={{ fontSize:13, marginBottom:4 }}>{b}</li>)}
                        </ul>
                      )}
                      {sec.items && sec.items.map(([label,text],k) => (
                        <p key={k} style={{ fontSize:13, margin:'0 0 6px' }}>
                          <strong style={{ color:'#2D3748' }}>{label}:</strong> {text}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Footer */}
            <div style={{ padding:'14px 28px', borderTop:'1px solid #E8ECF0', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F7F8FA' }}>
              <p style={{ fontSize:11, color:'#A0AEC0', margin:0, fontFamily:"'Inter',sans-serif" }}>
                SK Bakakeng Central · Last Updated: April 3, 2026
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
