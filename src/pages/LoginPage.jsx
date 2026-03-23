import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle, User, Lock, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

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
  const [captcha,  setCaptcha]= useState(false)
  const [loading,  setLoading]= useState(false)
  const [forgot,   setForgot] = useState(false)
  const [fEmail,   setFEmail] = useState('')
  const [fSent,    setFSent]  = useState(false)

  const { signIn, signUp, user, role } = useAuth()
  const { toast } = useToast()
  const navigate  = useNavigate()

  useEffect(() => {
    if (user && role)
      navigate(role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/dashboard')
  }, [user, role, navigate])

  const checks   = pwCheck(pw)
  const allValid = Object.values(checks).every(Boolean)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!captcha) { toast('Please verify you are not a robot.', 'error'); return }
    setLoading(true)
    try { await signIn(email, pw) }
    catch (err) { toast(err.message || 'Login failed. Check your credentials.', 'error') }
    finally { setLoading(false) }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!captcha)  { toast('Please verify you are not a robot.', 'error'); return }
    if (!allValid) { toast('Password does not meet all requirements.', 'error'); return }
    setLoading(true)
    try {
      await signUp(email, pw, name)
      toast('Account created! Please complete your profile.', 'success')
      navigate('/profile-setup')
    }
    catch (err) { toast(err.message || 'Sign up failed.', 'error') }
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

      {/* Logo */}
      <div style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:4, zIndex:10 }}>
        <img src="/SK_Logo.png" alt="SK Logo" style={{ width:52, height:52, objectFit:'contain' }}/>
        <p style={{ fontSize:10, fontWeight:700, color:'#1A365D', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:"'Montserrat','Inter',sans-serif", margin:0 }}>YouthLink</p>
      </div>

      {/* Card */}
      <div style={{ display:'flex', flexDirection:'column', width:'100%', maxWidth:900, background:'white', borderRadius:24, boxShadow:'0 8px 48px rgba(0,0,0,0.12)', overflow:'hidden', minHeight:'auto', marginTop:56 }}
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
          <Illustration/>
          <p style={{ fontSize:13, color:'#718096', lineHeight:1.7, maxWidth:220, textAlign:'center', marginTop:24, position:'relative', zIndex:1 }}>
            Secure access to the Barangay Bakakeng Central SK Portal
          </p>
        </div>

        {/* RIGHT */}
        <div className="login-right" style={{ flex:1, padding:'44px', display:'flex', flexDirection:'column', justifyContent:'center' }}>

          <div style={{ marginBottom:28 }}>
            <div style={{ width:36, height:3, background:'#1A365D', borderRadius:2, marginBottom:14 }}/>
            <h2 style={{ fontSize:22, fontWeight:800, color:'#1A365D', margin:'0 0 4px', fontFamily:"'Montserrat','Inter',sans-serif" }}>
              {tab === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ fontSize:13, color:'#A0AEC0', margin:0 }}>
              {tab === 'login' ? 'Login as a community member' : 'Join Barangay Bakakeng Central'}
            </p>
          </div>

          <form onSubmit={tab === 'login' ? handleLogin : handleSignup}>

            {tab === 'signup' && (
              <div style={{ position:'relative', marginBottom:14 }}>
                <User size={15} style={iconStyle}/>
                <input style={fieldStyle} onFocus={onFocus} onBlur={onBlur}
                  value={name} onChange={e => setName(e.target.value)}
                  required placeholder="Full name"/>
              </div>
            )}

            <div style={{ position:'relative', marginBottom:14 }}>
              <Mail size={15} style={iconStyle}/>
              <input style={fieldStyle} onFocus={onFocus} onBlur={onBlur}
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="Email address"/>
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

            <div style={{ border:'1px solid #E8ECF0', borderRadius:10, padding:'10px 14px', marginBottom:18, display:'flex', alignItems:'center', justifyContent:'space-between', background:'#F7F8FA' }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', color:'#2D3748' }}>
                <input type="checkbox" checked={captcha} onChange={e => setCaptcha(e.target.checked)}
                  style={{ accentColor:'#1A365D', width:15, height:15 }}/>
                I'm not a robot
              </label>
              <span style={{ fontSize:18 }}>🤖</span>
            </div>

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'14px', borderRadius:50, border:'none',
              background: loading ? '#718096' : '#1A365D',
              color:'white', fontSize:13, fontWeight:700,
              fontFamily:"'Montserrat','Inter',sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              letterSpacing:'2px', textTransform:'uppercase',
              transition:'background .15s, transform .1s',
              boxShadow:'0 4px 16px rgba(26,54,93,0.3)',
            }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background='#0F2444'; e.currentTarget.style.transform='translateY(-1px)' }}}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.background='#1A365D'; e.currentTarget.style.transform='translateY(0)' }}}>
              {loading && <Loader2 size={16} className="spinner"/>}
              {tab === 'login' ? 'Login' : 'Sign Up'}
            </button>

            <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#A0AEC0' }}>
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setPw(''); setEmail(''); setName('') }}
                style={{ color:'#1A365D', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:13, padding:0 }}>
                {tab === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>

            <p style={{ textAlign:'center', marginTop:14, fontSize:11, color:'#CBD5E0' }}>
              Terms of use. Privacy policy
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

      <style>{"@keyframes spin { to { transform: rotate(360deg); } } .spinner { animation: spin 0.8s linear infinite; }"}</style>
    </div>
  )
}
