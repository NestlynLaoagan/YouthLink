import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

const pwCheck = (pw) => ({
  length: pw.length >= 8,
  upper:  /[A-Z]/.test(pw),
  lower:  /[a-z]/.test(pw),
  num:    /[0-9]/.test(pw),
})

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

  const checks = pwCheck(pw)
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

  /* shared input style matching the reference */
  const inp = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    background: '#F8FAFC',
    fontSize: 14,
    fontFamily: 'Inter, Georgia, sans-serif',
    color: '#2D3748',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  const onFocus = (e) => {
    e.target.style.borderColor = '#1A365D'
    e.target.style.boxShadow   = '0 0 0 3px rgba(26,54,93,0.1)'
    e.target.style.background  = 'white'
  }
  const onBlur = (e) => {
    e.target.style.borderColor = '#E2E8F0'
    e.target.style.boxShadow   = 'none'
    e.target.style.background  = '#F8FAFC'
  }

  const Label = ({ children }) => (
    <label style={{ display:'block', fontSize:14, fontWeight:600, color:'#2D3748', marginBottom:6, fontFamily:"'Inter',sans-serif" }}>
      {children}
    </label>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:"'Inter',sans-serif" }}>

      {/* ══════ LEFT — real barangay hall photo ══════ */}
      <div style={{ flex:'0 0 50%', position:'relative', overflow:'hidden' }}>
        {/* Actual photo */}
        <img
          src="/login-bg.png"
          alt="Bakakeng Central Barangay Hall"
          style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%',
            objectFit:'cover', objectPosition:'center top',
          }}
        />
        {/* Black overlay — 50% opacity */}
        <div style={{
          position:'absolute', inset:0,
          background:'rgba(0,0,0,0.50)',
        }}/>

        {/* Bottom text block — matches reference */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'36px 44px',
        }}>
          <h1 style={{
            color:'white', fontWeight:800,
            fontSize:32, lineHeight:1.2, marginBottom:14,
            fontFamily:"'Montserrat','Inter',sans-serif",
            textShadow:'0 2px 16px rgba(0,0,0,0.4)',
          }}>
            Barangay Bakakeng Central — Your one-stop portal for community engagement.
          </h1>
          <p style={{
            color:'rgba(255,255,255,0.75)',
            fontSize:14, lineHeight:1.7,
            textShadow:'0 1px 8px rgba(0,0,0,0.3)',
          }}>
            Connecting our community through digital innovation and transparent governance.
          </p>
        </div>
      </div>

      {/* ══════ RIGHT — form panel ══════ */}
      <div style={{
        flex:'0 0 50%',
        background:'#F0F2F5',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'40px 32px',
        overflowY:'auto',
      }}>

        {/* Tab switcher — outside the card, just like the reference */}
        <div style={{
          display:'flex',
          background:'#E4E7EB',
          borderRadius:14,
          padding:4,
          width:'100%', maxWidth:420,
          marginBottom:22,
        }}>
          {[['login','Log In'],['signup','Sign Up']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:'10px', borderRadius:10, border:'none',
              cursor:'pointer', fontSize:14,
              fontFamily:"'Inter',sans-serif",
              fontWeight: tab === t ? 700 : 400,
              background: tab === t ? 'white' : 'transparent',
              color:       tab === t ? '#1A365D' : '#718096',
              boxShadow:   tab === t ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
              transition:'all 0.2s',
            }}>{label}</button>
          ))}
        </div>

        {/* White card */}
        <div style={{
          background:'white',
          borderRadius:16,
          padding:'36px 36px 30px',
          width:'100%', maxWidth:420,
          boxShadow:'0 4px 32px rgba(0,0,0,0.08)',
        }}>
          {/* Card heading */}
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <h2 style={{
              fontSize:26, fontWeight:800, color:'#1A365D',
              fontFamily:"'Montserrat','Inter',sans-serif", marginBottom:6,
            }}>
              {tab === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ fontSize:14, color:'#718096', lineHeight:1.5 }}>
              {tab === 'login'
                ? 'Enter your credentials to access your dashboard'
                : 'Join the Barangay Bakakeng Central community'}
            </p>
          </div>

          <form onSubmit={tab === 'login' ? handleLogin : handleSignup}>

            {/* Full name — signup only */}
            {tab === 'signup' && (
              <div style={{ marginBottom:16 }}>
                <Label>Full Name</Label>
                <input style={inp} onFocus={onFocus} onBlur={onBlur}
                  value={name} onChange={e => setName(e.target.value)}
                  required placeholder="Juan dela Cruz"/>
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom:16 }}>
              <Label>Email</Label>
              <input style={inp} onFocus={onFocus} onBlur={onBlur}
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                required placeholder="name@example.com"/>
            </div>

            {/* Password */}
            <div style={{ marginBottom: tab === 'login' ? 10 : 16 }}>
              {/* Label row — with Forgot Password on the right (login only) */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <Label>Password</Label>
                {tab === 'login' && (
                  <button type="button" onClick={() => setForgot(true)}
                    style={{ fontSize:13, fontWeight:600, color:'#1A365D', background:'none', border:'none', cursor:'pointer', padding:0, marginBottom:0 }}>
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position:'relative' }}>
                <input
                  style={{ ...inp, paddingRight:44 }}
                  onFocus={onFocus} onBlur={onBlur}
                  type={showPw ? 'text' : 'password'}
                  value={pw} onChange={e => setPw(e.target.value)}
                  required placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A0AEC0', display:'flex', alignItems:'center' }}>
                  {showPw ? <EyeOff size={17}/> : <Eye size={17}/>}
                </button>
              </div>

              {/* Password strength (signup only) */}
              {tab === 'signup' && pw && (
                <div style={{ marginTop:9, display:'flex', flexDirection:'column', gap:4 }}>
                  {[['length','At least 8 characters'],['upper','One uppercase letter'],['lower','One lowercase letter'],['num','One number']].map(([k,l]) => (
                    <div key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color: checks[k] ? '#38A169' : '#A0AEC0' }}>
                      <CheckCircle size={11}/>{l}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Remember Me — login only, radio-circle style matching reference */}
            {tab === 'login' && (
              <div style={{ marginBottom:18 }}>
                <label style={{ display:'flex', alignItems:'center', gap:9, fontSize:14, cursor:'pointer', color:'#2D3748', fontFamily:"'Inter',sans-serif", userSelect:'none' }}
                  onClick={() => setRemem(r => !r)}>
                  <div style={{
                    width:20, height:20, borderRadius:'50%',
                    border:`2px solid ${remember ? '#1A365D' : '#CBD5E0'}`,
                    background: remember ? '#1A365D' : 'white',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0, transition:'all 0.15s', cursor:'pointer',
                  }}>
                    {remember && <div style={{ width:8, height:8, borderRadius:'50%', background:'white' }}/>}
                  </div>
                  Remember Me
                </label>
              </div>
            )}

            {/* Captcha */}
            <div style={{
              border:'1px solid #E2E8F0', borderRadius:8,
              padding:'11px 14px', marginBottom:18,
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'#F8FAFC',
            }}>
              <label style={{ display:'flex', alignItems:'center', gap:9, fontSize:14, cursor:'pointer', color:'#2D3748', fontFamily:"'Inter',sans-serif" }}>
                <input type="checkbox" checked={captcha} onChange={e => setCaptcha(e.target.checked)}
                  style={{ accentColor:'#1A365D', width:16, height:16 }}/>
                I'm not a robot
              </label>
              <span style={{ fontSize:20 }}>🤖</span>
            </div>

            {/* Submit button — full width navy, matches reference */}
            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'14px', borderRadius:10, border:'none',
              background: loading ? '#718096' : '#1A365D',
              color:'white', fontSize:15, fontWeight:700,
              fontFamily:"'Montserrat','Inter',sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              letterSpacing:'0.2px', transition:'background 0.15s',
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0F2444' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1A365D' }}>
              {loading && <Loader2 size={17} className="spinner"/>}
              {tab === 'login' ? 'Log In' : 'Create Account'}
            </button>

            {/* Switch tab */}
            <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'#718096', fontFamily:"'Inter',sans-serif" }}>
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => setTab(tab === 'login' ? 'signup' : 'login')}
                style={{ color:'#C53030', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:13, padding:0 }}>
                {tab === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </form>
        </div>
      </div>

      {/* ══════ FORGOT PASSWORD MODAL ══════ */}
      {forgot && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:18, padding:36, maxWidth:400, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', fontFamily:"'Inter',sans-serif" }}>
            <h3 style={{ fontSize:22, fontWeight:800, color:'#1A365D', marginBottom:6 }}>Reset Password</h3>
            {fSent ? (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <CheckCircle size={48} style={{ color:'#38A169', margin:'0 auto 14px', display:'block' }}/>
                <p style={{ fontSize:14, color:'#718096', lineHeight:1.6 }}>Password reset link sent!<br/>Please check your email inbox.</p>
                <button onClick={() => { setForgot(false); setFSent(false) }}
                  style={{ marginTop:20, padding:'11px 28px', borderRadius:10, background:'#1A365D', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:14 }}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <p style={{ fontSize:14, color:'#718096', marginBottom:20, lineHeight:1.6 }}>
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <Label>Email</Label>
                <input style={{ ...inp, marginBottom:20 }} onFocus={onFocus} onBlur={onBlur}
                  type="email" value={fEmail} onChange={e => setFEmail(e.target.value)}
                  required placeholder="name@example.com"/>
                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" onClick={() => setForgot(false)}
                    style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid #E2E8F0', background:'white', cursor:'pointer', fontSize:14, fontWeight:600, color:'#718096' }}>
                    Cancel
                  </button>
                  <button type="submit"
                    style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'#C53030', color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>
                    Send Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
