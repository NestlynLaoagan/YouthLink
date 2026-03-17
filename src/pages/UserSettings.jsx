import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Shield, Eye, EyeOff, Download, Trash2,
  Monitor, Smartphone, Tablet, LogOut, Save, X, Bell, Lock,
  CheckCircle, AlertCircle, Copy, RefreshCw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? '#1A365D' : '#CBD5E0',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 3,
        left: checked ? 23 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}/>
    </button>
  )
}

const MOCK_SESSIONS = [
  { id:1, device:'Chrome/MacBook Air',  icon:'monitor', location:'Bakakeng Central, City', time:'2026-03-16 10:50', current:true },
  { id:2, device:'iOS/iPhone 15',       icon:'phone',   location:'Bakakeng, City',          time:'2026-03-15 08:36', current:false },
  { id:3, device:'iOS/iPhone 15',       icon:'phone',   location:'Barangay Suranang',        time:'2026-03-14 22:00', current:false },
  { id:4, device:'Safari/iPad Pro',     icon:'tablet',  location:'Bakakeng, City',            time:'2026-03-13 12:00', current:false },
]

export default function UserSettings() {
  const { user, profile, signOut, logAudit } = useAuth()
  const { toast } = useToast()
  const navigate  = useNavigate()

  const [activeTab, setActiveTab] = useState('security')
  const [pw, setPw]   = useState({ current:'', newpw:'', confirm:'', showCurrent:false, showNew:false })
  const [saving, setSaving] = useState(false)
  // ── Real Supabase MFA state ──
  const [mfaStatus,   setMfaStatus]   = useState('idle')   // idle | enrolling | verifying | enabled | disabling
  const [mfaFactorId, setFactorId]    = useState(null)
  const [mfaQR,       setMfaQR]       = useState(null)
  const [mfaSecret,   setMfaSecret]   = useState(null)
  const [mfaCode,     setMfaCode]     = useState('')
  const [mfaEnabled,  setMfaEnabled]  = useState(false)
  const [mfaLoading,  setMfaLoading]  = useState(false)
  const [copiedSecret,setCopied]      = useState(false)
  const [sessions, setSessions] = useState(MOCK_SESSIONS)
  const [logoutAllConfirm, setLogoutAllConfirm] = useState(false)
  const [dataVisibility, setDataVisibility] = useState(true)
  const [notifs, setNotifs] = useState({
    email: true, sms: false, push: false,
    announcements: true, events: true, projects: true, feedback: true,
  })

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pw.newpw !== pw.confirm) { toast('Passwords do not match.','error'); return }
    if (pw.newpw.length < 8)     { toast('Password must be at least 8 characters.','error'); return }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.newpw })
      if (error) throw error
      await logAudit('Edit','Settings','Changed account password')
      toast('Password updated successfully!','success')
      setPw({ current:'', newpw:'', confirm:'', showCurrent:false, showNew:false })
    } catch (err) { toast(err.message,'error') }
    finally { setSaving(false) }
  }

  const handleDownloadData = async () => {
    const data = { profile, email: user?.email, exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    await logAudit('Export','Settings','Downloaded personal data')
    toast('Your data has been downloaded.','success')
  }

  const handleLogoutAll = async () => {
    setSessions(prev => prev.filter(s => s.current))
    await logAudit('Edit','Settings','Logged out of all other devices')
    toast('Logged out of all other devices.','success')
    setLogoutAllConfirm(false)
  }

  // ── MFA: check current status on load ──
  useEffect(() => {
    const checkMFA = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) return
        const totp = data?.totp?.find(f => f.status === 'verified')
        if (totp) { setMfaEnabled(true); setFactorId(totp.id) }
      } catch {}
    }
    checkMFA()
  }, [])

  // ── MFA: start enrollment (get QR code) ──
  const startMFAEnroll = async () => {
    setMfaLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'BarangayConnect' })
      if (error) throw error
      setFactorId(data.id)
      setMfaQR(data.totp.qr_code)
      setMfaSecret(data.totp.secret)
      setMfaStatus('enrolling')
    } catch (err) { toast(err.message, 'error') }
    finally { setMfaLoading(false) }
  }

  // ── MFA: verify the code and activate ──
  const verifyMFA = async () => {
    if (mfaCode.length !== 6) { toast('Enter the 6-digit code from your authenticator app.', 'error'); return }
    setMfaLoading(true)
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (challengeErr) throw challengeErr
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId:    mfaFactorId,
        challengeId: challengeData.id,
        code:        mfaCode,
      })
      if (verifyErr) throw verifyErr
      setMfaEnabled(true)
      setMfaStatus('idle')
      setMfaQR(null); setMfaSecret(null); setMfaCode('')
      await logAudit('Enable', 'Settings', 'Enabled Two-Factor Authentication')
      toast('2FA enabled successfully! Your account is now more secure.', 'success')
    } catch (err) { toast('Invalid code. Please try again.', 'error') }
    finally { setMfaLoading(false) }
  }

  // ── MFA: disable/unenroll ──
  const disableMFA = async () => {
    setMfaLoading(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
      if (error) throw error
      setMfaEnabled(false); setFactorId(null); setMfaStatus('idle')
      await logAudit('Disable', 'Settings', 'Disabled Two-Factor Authentication')
      toast('2FA has been disabled.', 'success')
    } catch (err) { toast(err.message, 'error') }
    finally { setMfaLoading(false) }
  }

  const cancelEnroll = async () => {
    if (mfaFactorId && !mfaEnabled) {
      try { await supabase.auth.mfa.unenroll({ factorId: mfaFactorId }) } catch {}
    }
    setMfaStatus('idle'); setMfaQR(null); setMfaSecret(null); setMfaCode(''); setFactorId(null)
  }

  const copySecret = () => {
    navigator.clipboard.writeText(mfaSecret).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const DeviceIcon = ({ type }) => {
    const s = { color:'#718096', flexShrink:0 }
    if (type==='phone')  return <Smartphone size={16} style={s}/>
    if (type==='tablet') return <Tablet size={16} style={s}/>
    return <Monitor size={16} style={s}/>
  }

  const card = { background:'white', borderRadius:12, border:'1px solid #E2E8F0', padding:'24px' }
  const inp  = { width:'100%', padding:'11px 13px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:14, fontFamily:'Inter,Georgia,sans-serif', outline:'none', color:'#2D3748' }
  const label = (txt) => <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#4A5568', marginBottom:6, fontFamily:'Inter,sans-serif' }}>{txt}</label>

  return (
    <div style={{ minHeight:'100vh', background:'#F0F4F8', fontFamily:'Inter, Georgia, sans-serif', display:'flex' }}>
      {/* Sidebar */}
      <div style={{ width:220, background:'white', borderRight:'1px solid #E2E8F0', padding:'24px 0', flexShrink:0, display:'flex', flexDirection:'column' }}>
        {/* Logo */}
        <div style={{ padding:'0 20px 20px', borderBottom:'1px solid #E2E8F0', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/SK_Logo.png" alt="SK Logo" style={{ width:44, height:44, objectFit:'contain' }}/>
            <div>
              <p style={{ fontWeight:700, fontSize:12, color:'#1A365D', lineHeight:1.3 }}>Barangay Bakakeng<br/>Central SK</p>
            </div>
          </div>
        </div>

        <nav style={{ padding:'0 10px', flex:1 }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 12px', borderRadius:8, border:'none', background:'none', cursor:'pointer', fontSize:13, color:'#718096', fontFamily:'Inter,sans-serif', textAlign:'left', marginBottom:4 }}
            onMouseEnter={e => e.currentTarget.style.background='#F7FAFC'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            <Home size={16}/> Dashboard
          </button>
          <button
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 12px', borderRadius:8, border:'none', background:'#EBF8FF', cursor:'pointer', fontSize:13, color:'#1A365D', fontWeight:700, fontFamily:'Inter,sans-serif', textAlign:'left' }}>
            <Shield size={16}/> Security &amp; Preferences
          </button>
        </nav>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflow:'auto' }}>
        <div style={{ padding:'32px 40px' }}>
          <h1 style={{ fontSize:32, fontWeight:800, color:'#1A365D', marginBottom:32, fontFamily:'Inter,sans-serif' }}>Account Settings</h1>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, maxWidth:1200 }}>

            {/* ── LEFT COLUMN ── */}
            <div>
              <h2 style={{ fontSize:18, fontWeight:700, color:'#1A365D', marginBottom:18, fontFamily:'Inter,sans-serif' }}>Security &amp; Access</h2>

              {/* Password Management */}
              <div style={{ ...card, marginBottom:20 }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:'#2D3748', marginBottom:20, fontFamily:'Inter,sans-serif' }}>Password Management</h3>
                <form onSubmit={handlePasswordChange}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                    <div>
                      {label('Current Password')}
                      <div style={{ position:'relative' }}>
                        <input style={{ ...inp, paddingLeft:36 }} type={pw.showCurrent?'text':'password'}
                          value={pw.current} onChange={e => setPw(p=>({...p,current:e.target.value}))}
                          onFocus={e => { e.target.style.borderColor='#1A365D' }} onBlur={e => { e.target.style.borderColor='#E2E8F0' }}/>
                        <Lock size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#A0AEC0' }}/>
                      </div>
                    </div>
                    <div>
                      {label('New Password')}
                      <div style={{ position:'relative' }}>
                        <input style={{ ...inp, paddingRight:36 }} type={pw.showNew?'text':'password'}
                          value={pw.newpw} onChange={e => setPw(p=>({...p,newpw:e.target.value}))} required minLength={8}
                          onFocus={e => { e.target.style.borderColor='#1A365D' }} onBlur={e => { e.target.style.borderColor='#E2E8F0' }}/>
                        <button type="button" onClick={() => setPw(p=>({...p,showNew:!p.showNew}))}
                          style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#A0AEC0', padding:0 }}>
                          {pw.showNew ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                      </div>
                    </div>
                    <div>
                      {label('Confirm Password')}
                      <input style={{ ...inp, borderColor: pw.confirm && pw.confirm!==pw.newpw ? '#C53030' : '#E2E8F0' }}
                        type={pw.showNew?'text':'password'} value={pw.confirm}
                        onChange={e => setPw(p=>({...p,confirm:e.target.value}))} required
                        onFocus={e => { e.target.style.borderColor='#1A365D' }} onBlur={e => { e.target.style.borderColor= pw.confirm && pw.confirm!==pw.newpw ? '#C53030' : '#E2E8F0' }}/>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <button type="submit" disabled={saving}
                      style={{ padding:'10px 24px', borderRadius:8, background:'#C53030', color:'white', border:'none', cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:700, fontFamily:'Inter,sans-serif' }}>
                      {saving ? 'Changing…' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* 2FA — Real Supabase MFA */}
              <div style={{ ...card, marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <h3 style={{ fontSize:16, fontWeight:700, color:'#2D3748', marginBottom:4, fontFamily:'Inter,sans-serif' }}>Two-Factor Authentication</h3>
                    <p style={{ fontSize:12, color:'#718096' }}>Adds an extra layer of security using an authenticator app.</p>
                  </div>
                  {mfaEnabled && (
                    <span style={{ fontSize:11, background:'#C6F6D5', color:'#276749', padding:'3px 10px', borderRadius:20, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                      <CheckCircle size={11}/> Active
                    </span>
                  )}
                </div>

                {/* Idle — not enrolled */}
                {mfaStatus === 'idle' && !mfaEnabled && (
                  <div>
                    <div style={{ padding:'14px', background:'#EBF8FF', borderRadius:10, border:'1px solid #BEE3F8', marginBottom:16 }}>
                      <p style={{ fontSize:13, color:'#1A365D', lineHeight:1.6 }}>
                        🔐 Use an authenticator app like <strong>Google Authenticator</strong> or <strong>Authy</strong> to generate one-time codes each time you log in.
                      </p>
                    </div>
                    <button onClick={startMFAEnroll} disabled={mfaLoading}
                      style={{ padding:'10px 22px', borderRadius:8, background:'#1A365D', color:'white', border:'none', cursor:mfaLoading?'not-allowed':'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8, opacity:mfaLoading?0.7:1 }}>
                      {mfaLoading ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Setting up…</> : '🔐 Enable 2FA'}
                    </button>
                  </div>
                )}

                {/* Step 1 — Show QR code */}
                {mfaStatus === 'enrolling' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
                      {/* QR code */}
                      <div style={{ textAlign:'center' }}>
                        <div style={{ padding:10, background:'white', border:'2px solid #E2E8F0', borderRadius:12, display:'inline-block' }}>
                          {mfaQR && <img src={mfaQR} alt="2FA QR Code" style={{ width:140, height:140, display:'block' }}/>}
                        </div>
                        <p style={{ fontSize:11, color:'#718096', marginTop:6 }}>Scan with your app</p>
                      </div>
                      {/* Instructions */}
                      <div style={{ flex:1, minWidth:180 }}>
                        <p style={{ fontSize:13, fontWeight:700, color:'#2D3748', marginBottom:8 }}>Steps:</p>
                        <ol style={{ fontSize:12, color:'#718096', lineHeight:2, paddingLeft:16, margin:'0 0 12px' }}>
                          <li>Open Google Authenticator or Authy</li>
                          <li>Tap <strong>+</strong> → <strong>Scan QR code</strong></li>
                          <li>Scan the code on the left</li>
                          <li>Enter the 6-digit code below</li>
                        </ol>
                        {/* Manual secret */}
                        <p style={{ fontSize:11, color:'#A0AEC0', marginBottom:4 }}>Can't scan? Enter manually:</p>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <code style={{ fontSize:10, background:'#F7FAFC', border:'1px solid #E2E8F0', borderRadius:6, padding:'4px 8px', letterSpacing:'1px', color:'#2D3748', wordBreak:'break-all' }}>
                            {mfaSecret}
                          </code>
                          <button onClick={copySecret}
                            style={{ padding:'5px 8px', borderRadius:6, border:'1px solid #E2E8F0', background:'white', cursor:'pointer', color: copiedSecret ? '#48BB78' : '#718096', fontSize:11, display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                            <Copy size={11}/> {copiedSecret ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Code entry */}
                    <div style={{ marginTop:18 }}>
                      <label style={{ fontSize:13, fontWeight:600, color:'#4A5568', display:'block', marginBottom:6 }}>
                        Enter 6-digit code from your app
                      </label>
                      <div style={{ display:'flex', gap:10 }}>
                        <input
                          type="text" inputMode="numeric" maxLength={6}
                          value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g,''))}
                          placeholder="000000"
                          style={{ width:130, padding:'11px 14px', borderRadius:8, border:'2px solid #E2E8F0', fontSize:20, fontWeight:700, letterSpacing:'6px', textAlign:'center', fontFamily:'monospace', outline:'none' }}
                          onFocus={e => e.target.style.borderColor='#1A365D'}
                          onBlur={e => e.target.style.borderColor='#E2E8F0'}
                          onKeyDown={e => e.key==='Enter' && verifyMFA()}
                        />
                        <button onClick={verifyMFA} disabled={mfaLoading || mfaCode.length!==6}
                          style={{ padding:'11px 22px', borderRadius:8, background: mfaCode.length===6 ? '#1A365D' : '#CBD5E0', color:'white', border:'none', cursor:mfaCode.length===6?'pointer':'not-allowed', fontSize:13, fontWeight:700 }}>
                          {mfaLoading ? 'Verifying…' : 'Activate 2FA'}
                        </button>
                        <button onClick={cancelEnroll}
                          style={{ padding:'11px 16px', borderRadius:8, background:'none', border:'1px solid #E2E8F0', cursor:'pointer', fontSize:13, color:'#718096' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enabled state */}
                {mfaStatus === 'idle' && mfaEnabled && (
                  <div>
                    <div style={{ padding:'14px', background:'#F0FFF4', borderRadius:10, border:'1px solid #9AE6B4', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                      <CheckCircle size={18} style={{ color:'#48BB78', flexShrink:0 }}/>
                      <p style={{ fontSize:13, color:'#276749', fontWeight:600 }}>
                        Your account is protected with Two-Factor Authentication.
                      </p>
                    </div>
                    {mfaStatus !== 'disabling' ? (
                      <button onClick={() => setMfaStatus('disabling')}
                        style={{ padding:'9px 20px', borderRadius:8, background:'none', border:'1.5px solid #C53030', color:'#C53030', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                        Disable 2FA
                      </button>
                    ) : null}
                    {mfaStatus === 'disabling' && (
                      <div style={{ padding:'14px', background:'#FFF5F5', borderRadius:10, border:'1px solid #FC8181' }}>
                        <p style={{ fontSize:13, color:'#C53030', marginBottom:10, fontWeight:600 }}>Are you sure you want to disable 2FA? This will make your account less secure.</p>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => setMfaStatus('idle')}
                            style={{ padding:'8px 16px', borderRadius:7, border:'1px solid #CBD5E0', background:'white', cursor:'pointer', fontSize:12 }}>Cancel</button>
                          <button onClick={disableMFA} disabled={mfaLoading}
                            style={{ padding:'8px 16px', borderRadius:7, background:'#C53030', color:'white', border:'none', cursor:mfaLoading?'not-allowed':'pointer', fontSize:12, fontWeight:700 }}>
                            {mfaLoading ? 'Disabling…' : 'Yes, Disable 2FA'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>

              {/* Active Sessions */}
              <div style={card}>
                <h3 style={{ fontSize:16, fontWeight:700, color:'#2D3748', marginBottom:16, fontFamily:'Inter,sans-serif' }}>Active Sessions</h3>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#F7FAFC' }}>
                      {['Device','Location','Timestamp'].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:700, color:'#718096', fontSize:11, textTransform:'uppercase', letterSpacing:'0.3px', border:'1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id} style={{ background: s.current ? '#F0FFF4' : 'white' }}>
                        <td style={{ padding:'9px 10px', border:'1px solid #E2E8F0' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <DeviceIcon type={s.icon}/>
                            <span style={{ color: s.current ? '#276749' : '#2D3748', fontWeight: s.current ? 700 : 400 }}>{s.device}</span>
                            {s.current && <span style={{ fontSize:9, background:'#C6F6D5', color:'#276749', padding:'1px 6px', borderRadius:10, fontWeight:700 }}>Current</span>}
                          </div>
                        </td>
                        <td style={{ padding:'9px 10px', border:'1px solid #E2E8F0', color:'#718096' }}>{s.location}</td>
                        <td style={{ padding:'9px 10px', border:'1px solid #E2E8F0', color:'#718096' }}>{s.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logoutAllConfirm ? (
                  <div style={{ marginTop:12, padding:'12px 16px', background:'#FFF5F5', border:'1px solid #FC8181', borderRadius:8 }}>
                    <p style={{ fontSize:13, color:'#C53030', marginBottom:10 }}>Log out of all other devices?</p>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setLogoutAllConfirm(false)}
                        style={{ padding:'7px 16px', borderRadius:7, border:'1px solid #CBD5E0', background:'white', cursor:'pointer', fontSize:12 }}>Cancel</button>
                      <button onClick={handleLogoutAll}
                        style={{ padding:'7px 16px', borderRadius:7, background:'#C53030', color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>Confirm Logout</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setLogoutAllConfirm(true)}
                    style={{ marginTop:14, width:'100%', padding:'11px', borderRadius:8, background:'#C53030', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                    Logout of All Devices
                  </button>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div>
              <h2 style={{ fontSize:18, fontWeight:700, color:'#1A365D', marginBottom:18, fontFamily:'Inter,sans-serif' }}>Notification Preferences</h2>

              {/* Channels */}
              <div style={{ ...card, marginBottom:20 }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:'#2D3748', marginBottom:18, fontFamily:'Inter,sans-serif' }}>Channels</h3>
                <div style={{ display:'flex', alignItems:'center', gap:28, flexWrap:'wrap' }}>
                  {[
                    { key:'email', label:'Email',       icon:'✉️' },
                    { key:'sms',   label:'SMS',         icon:'💬' },
                    { key:'push',  label:'In-App Push', icon:'📱' },
                  ].map(({ key, label: lbl, icon }) => (
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:8, background:'#F7FAFC', border:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{icon}</div>
                      <span style={{ fontSize:14, color:'#2D3748', fontWeight:500 }}>{lbl}</span>
                      <Toggle checked={notifs[key]} onChange={v => setNotifs(n => ({...n,[key]:v}))}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert Types */}
              <div style={{ ...card, marginBottom:20 }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:'#2D3748', marginBottom:18, fontFamily:'Inter,sans-serif' }}>Alert Types</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {[
                    { key:'announcements', label:'Announcements', sub:'Barangay News',        icon:'📢' },
                    { key:'events',        label:'Event Invites', sub:'Assemblies/Clinics',    icon:'📅' },
                    { key:'projects',      label:'Project Updates',sub:'SK Initiatives',       icon:'👷' },
                    { key:'feedback',      label:'Feedback Requests',sub:'Surveys/Polls',      icon:'💬' },
                  ].map(({ key, label: lbl, sub, icon }) => (
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px', background:'#F7FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
                      <div style={{ width:36, height:36, borderRadius:8, background:'white', border:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:700, color:'#2D3748' }}>{lbl}</p>
                        <p style={{ fontSize:11, color:'#718096' }}>{sub}</p>
                      </div>
                      <Toggle checked={notifs[key]} onChange={v => setNotifs(n => ({...n,[key]:v}))}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy & Data Control */}
              <div style={card}>
                <h3 style={{ fontSize:16, fontWeight:700, color:'#2D3748', marginBottom:6, fontFamily:'Inter,sans-serif' }}>Privacy &amp; Data Control</h3>
                <p style={{ fontSize:12, color:'#718096', marginBottom:18, lineHeight:1.6 }}>References that control to the Data Privacy Act of 2012.</p>

                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px', background:'#F7FAFC', borderRadius:10, border:'1px solid #E2E8F0', marginBottom:16 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'white', border:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>👁</div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#2D3748' }}>Data Visibility</p>
                    <p style={{ fontSize:11, color:'#718096' }}>Show my email to others</p>
                  </div>
                  <Toggle checked={dataVisibility} onChange={setDataVisibility}/>
                </div>

                <button onClick={handleDownloadData}
                  style={{ width:'100%', padding:'13px', borderRadius:8, background:'#D69E2E', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:8 }}>
                  <Download size={15}/> Download My Data
                </button>
                <p style={{ fontSize:11, color:'#718096', textAlign:'center', marginBottom:16 }}>Download My Profile Data (CSV/JSON)</p>

                <button style={{ width:'100%', padding:'11px', borderRadius:8, background:'none', border:'1.5px solid #C53030', color:'#C53030', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  Request Account Deactivation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
