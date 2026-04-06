import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Lock, Mail, Phone, MapPin, Calendar, Shield, Key, Fingerprint,
  Bell, Eye, EyeOff, Download, Trash2, LogOut, Monitor, Smartphone,
  RefreshCw, CheckCircle, AlertCircle, Copy, X, Save, ChevronRight,
  Activity, MessageSquare, LayoutDashboard, Globe, Clock, FileText,
  Star, Users, Heart, Info, Menu, X as XIcon
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
// ✅ NEW: Drop-in login history component (replaces the inline Login History card)
import LoginHistorySection from '../components/LoginHistorySection'

/* ─── Design tokens (static fallbacks — real values come from ThemeContext) ─── */
let NK='#0F2444', NV='#1A365D', NL='#2A4A7F'
let CR='#C53030', GD='#D69E2E'
const GR='#38A169', PU='#6B46C1', AM='#D97706'
let MF="'Plus Jakarta Sans','Inter',sans-serif"
const IF="'Inter',sans-serif"

/* ─── Global CSS ─── */
const G_CSS=`
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  *{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:#CBD5E0;border-radius:4px}
`

/* ─── Shared atoms ─── */
const Toggle = ({ on, onChange, color=NV, disabled }) => (
  <button onClick={()=>!disabled&&onChange(!on)} disabled={disabled}
    style={{ width:48,height:26,borderRadius:13,border:'none',cursor:disabled?'not-allowed':'pointer',
      background:on?color:'#CBD5E0',position:'relative',transition:'background .22s',flexShrink:0,opacity:disabled?.5:1 }}>
    <span style={{ display:'block',width:20,height:20,borderRadius:'50%',background:'white',
      position:'absolute',top:3,left:on?25:3,transition:'left .22s',boxShadow:'0 1px 4px rgba(0,0,0,.22)' }}/>
  </button>
)

const Flash = ({ type, msg, onClose }) => !msg?null:(
  <div style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 16px',borderRadius:11,marginBottom:18,
    background:type==='success'?'#F0FFF4':'#FFF5F5',border:`1px solid ${type==='success'?'#9AE6B4':'#FC8181'}`,
    animation:'slideUp .25s ease' }}>
    {type==='success'?<CheckCircle size={15} style={{ color:GR,flexShrink:0 }}/>:<AlertCircle size={15} style={{ color:CR,flexShrink:0 }}/>}
    <span style={{ fontSize:13,color:type==='success'?'#276749':CR,fontFamily:IF,flex:1 }}>{msg}</span>
    {onClose&&<button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'#A0AEC0',padding:0,display:'flex' }}><X size={14}/></button>}
  </div>
)

const Card = ({ children, style }) => (
  <div style={{ background:'white',borderRadius:14,border:'1px solid #E8ECF4',padding:'20px',
    boxShadow:'0 2px 12px rgba(15,36,68,.06)',marginBottom:16,...style }}>
    {children}
  </div>
)

const CardTitle = ({ icon:Icon, title, subtitle, accent, right }) => (
  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
    marginBottom:18,paddingBottom:14,borderBottom:`2px solid ${accent||GD}` }}>
    <div style={{ display:'flex',alignItems:'center',gap:11 }}>
      <div style={{ width:36,height:36,borderRadius:9,background:`${accent||GD}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <Icon size={16} style={{ color:accent||GD }}/>
      </div>
      <div>
        <p style={{ fontWeight:700,fontSize:15,color:NV,fontFamily:MF,margin:0 }}>{title}</p>
        {subtitle&&<p style={{ fontSize:11,color:'#718096',margin:'2px 0 0',fontFamily:IF }}>{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
)

function FInput({ label, value, onChange, type='text', placeholder, disabled, required, prefix, hint, error, children }) {
  const [f,setF]=useState(false)
  return (
    <div style={{ marginBottom:14 }}>
      {label&&<label style={{ display:'block',fontSize:11,fontWeight:700,color:'#4A5568',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,fontFamily:IF }}>
        {label}{required&&<span style={{ color:CR }}> *</span>}
      </label>}
      <div style={{ display:'flex',alignItems:'center',border:`1.5px solid ${error?CR:f?NV:'#E2E8F0'}`,borderRadius:9,overflow:'hidden',
        background:disabled?'#F7F8FA':'white',transition:'border .15s, box-shadow .15s',boxShadow:f&&!disabled?`0 0 0 3px rgba(26,54,93,.09)`:'none' }}>
        {prefix&&<span style={{ padding:'0 12px',fontSize:13,color:'#718096',background:'#F7F8FA',borderRight:'1px solid #E2E8F0',alignSelf:'stretch',display:'flex',alignItems:'center',whiteSpace:'nowrap' }}>{prefix}</span>}
        <input type={type} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder}
          onFocus={()=>setF(true)} onBlur={()=>setF(false)}
          style={{ flex:1,padding:'11px 13px',border:'none',background:'transparent',fontSize:14,fontFamily:IF,color:'#2D3748',outline:'none',cursor:disabled?'not-allowed':'text',width:'100%' }}/>
        {children}
      </div>
      {hint&&<p style={{ fontSize:11,color:'#A0AEC0',marginTop:3,fontFamily:IF }}>{hint}</p>}
      {error&&<p style={{ fontSize:11,color:CR,marginTop:3,fontFamily:IF }}>⚠ {error}</p>}
    </div>
  )
}

const BV={ primary:{bg:NV,fg:'white',bd:'none'}, danger:{bg:CR,fg:'white',bd:'none'},
  ghost:{bg:'white',fg:NV,bd:'1.5px solid #E2E8F0'}, success:{bg:GR,fg:'white',bd:'none'},
  warning:{bg:AM,fg:'white',bd:'none'}, purple:{bg:PU,fg:'white',bd:'none'} }

const Btn = ({ children,onClick,type='button',disabled,variant='primary',size='md',loading,fullWidth }) => {
  const v=BV[variant]||BV.primary
  return (
    <button type={type} onClick={onClick} disabled={disabled||loading}
      style={{ padding:size==='sm'?'7px 14px':'10px 22px',borderRadius:9,background:v.bg,color:v.fg,border:v.bd,
        cursor:disabled||loading?'not-allowed':'pointer',fontSize:size==='sm'?12:13,fontWeight:700,fontFamily:IF,
        display:'inline-flex',alignItems:'center',gap:7,opacity:disabled?.62:1,transition:'opacity .15s',
        width:fullWidth?'100%':'auto',justifyContent:fullWidth?'center':'flex-start' }}
      onMouseEnter={e=>{if(!disabled&&!loading)e.currentTarget.style.opacity='.82'}}
      onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
      {loading&&<RefreshCw size={13} style={{ animation:'spin .8s linear infinite' }}/>}
      {children}
    </button>
  )
}

const StrBar = ({ val }) => {
  if (!val) return null
  const s=[val.length>=8,/[A-Z]/.test(val),/[a-z]/.test(val),/[0-9]/.test(val),/[^A-Za-z0-9]/.test(val)].filter(Boolean).length
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ height:4,borderRadius:2,overflow:'hidden',display:'flex',gap:2 }}>
        {[...Array(5)].map((_,i)=><div key={i} style={{ flex:1,background:i<s?['','#C53030','#D97706','#D69E2E','#38A169','#276749'][s]:'#E2E8F0',borderRadius:2,transition:'background .3s' }}/>)}
      </div>
      <p style={{ fontSize:11,color:['','#C53030','#D97706','#D69E2E','#38A169','#276749'][s],marginTop:3,fontWeight:600,fontFamily:IF }}>{['','Weak','Fair','Good','Strong','Excellent'][s]}</p>
    </div>
  )
}

const RBadge = ({ ok, label }) => (
  <span style={{ fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:ok?'#C6F6D5':'#FEF3C7',color:ok?'#276749':'#92400E',display:'inline-flex',alignItems:'center',gap:4 }}>
    {ok?<CheckCircle size={9}/>:<AlertCircle size={9}/>} {label}
  </span>
)

const RowItem = ({ icon:Icon, color, title, sub, right, children }) => (
  <div style={{ display:'flex',alignItems:'flex-start',gap:14,padding:'14px 0',borderBottom:'1px solid #F0F4F8' }}>
    {Icon&&<div style={{ width:34,height:34,borderRadius:9,background:`${color||NV}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}>
      <Icon size={15} style={{ color:color||NV }}/>
    </div>}
    <div style={{ flex:1,minWidth:0 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:sub||children?4:0 }}>
        <p style={{ fontSize:13,fontWeight:600,color:'#2D3748',margin:0,fontFamily:IF }}>{title}</p>
        {right}
      </div>
      {sub&&<p style={{ fontSize:12,color:'#718096',margin:0,fontFamily:IF,lineHeight:1.6 }}>{sub}</p>}
      {children&&<div style={{ marginTop:10 }}>{children}</div>}
    </div>
  </div>
)

/* ── Session helpers ─────────────────────────────────────────────────────── */
function parseUserAgent(ua='') {
  let browser='Unknown Browser', os='Unknown OS', type='desktop'
  // Browser
  if(/Edg\//.test(ua))       browser='Edge'
  else if(/OPR\//.test(ua))  browser='Opera'
  else if(/Chrome\//.test(ua)&&!/Chromium/.test(ua)) browser='Chrome'
  else if(/Firefox\//.test(ua)) browser='Firefox'
  else if(/Safari\//.test(ua)&&!/Chrome/.test(ua))   browser='Safari'
  // OS
  if(/iPhone|iPad/.test(ua)){      os=ua.match(/CPU (?:iPhone )?OS ([\d_]+)/)?.[1]?.replace(/_/g,'.')?`iOS ${ua.match(/CPU (?:iPhone )?OS ([\d_]+)/)[1].replace(/_/g,'.')}`:'iOS'; type='mobile'}
  else if(/Android/.test(ua)){     os=`Android ${ua.match(/Android ([\d.]+)/)?.[1]||''}`; type='mobile'}
  else if(/Windows NT/.test(ua)){  const v={'10.0':'10','6.3':'8.1','6.2':'8','6.1':'7'}; os=`Windows ${v[ua.match(/Windows NT ([\d.]+)/)?.[1]]||''}`.trim()}
  else if(/Mac OS X/.test(ua)){    os=`macOS ${ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g,'.')||''}`.trim()}
  else if(/Linux/.test(ua))        os='Linux'
  else if(/CrOS/.test(ua))         os='ChromeOS'
  return { browser, os, type }
}
function timeAgo(iso) {
  if(!iso) return '—'
  const diff=Date.now()-new Date(iso).getTime()
  const m=Math.floor(diff/60000)
  if(m<1)  return 'Active now'
  if(m<60) return `${m}m ago`
  const h=Math.floor(m/60)
  if(h<24) return `${h}h ago`
  const d=Math.floor(h/24)
  if(d===1) return 'Yesterday'
  return `${d} days ago`
}

/* ══════════════════════════════════════
   1. PROFILE
══════════════════════════════════════ */
function ProfileSection({ user, profile, toast, logAudit, refreshProfile, isMobile=false }) {
  const [form,setForm]=useState({ given:'',last:'',email:'',phone:'',address:'',birthday:'',gender:'',emergency:'' })
  const [avatarSrc,setAS]=useState(null)
  const [avatarFile,setAF]=useState(null)
  const [saving,setSave]=useState(false)
  const [fb,setFb]=useState(null)
  const fileRef=useRef()

  useEffect(()=>{
    if(!profile)return
    setForm({
      given:   profile.given_name||profile.name?.split(' ')[0]||'',
      last:    profile.last_name ||profile.name?.split(' ').slice(-1)[0]||'',
      email:   user?.email||'',
      phone:   profile.contact_number?.replace('+639','')||'',
      address: profile.address||'',
      birthday:profile.birthday||'',
      gender:  profile.gender||'',
      emergency:profile.emergency_contact||'',
    })
    setAS(profile.profile_picture||null)
  },[profile,user])

  const initials=([form.given[0],form.last[0]].filter(Boolean).join('')||(user?.email||'U')[0]).toUpperCase()

  const handleSave=async()=>{
    if(!form.given||!form.last){setFb({type:'error',msg:'First and last name are required.'}); return}
    setSave(true)
    try {
      let picUrl=profile?.profile_picture||null
      if(avatarFile){
        const ext=avatarFile.name.split('.').pop(), path=`${user.id}-avatar.${ext}`
        const{error:ue}=await supabase.storage.from('profile-pictures').upload(path,avatarFile,{upsert:true})
        if(!ue){const{data}=supabase.storage.from('profile-pictures').getPublicUrl(path);picUrl=data.publicUrl}
      }
      const fullName=[form.given,form.last].filter(Boolean).join(' ')
      const{error}=await supabase.from('profiles').update({
        given_name:form.given, last_name:form.last, name:fullName,
        contact_number:form.phone?`+639${form.phone}`:null,
        address:form.address||null, birthday:form.birthday||null,
        gender:form.gender||null, emergency_contact:form.emergency||null,
        profile_picture:picUrl
      }).eq('user_id',user.id)
      if(error)throw error
      await supabase.from('user_roles').update({name:fullName}).eq('user_id',user.id)
      await refreshProfile()
      await logAudit('Edit','Profile','Updated profile information')
      setFb({type:'success',msg:'Profile saved successfully! ✅'})
      setTimeout(()=>setFb(null),4000)
    }catch(err){setFb({type:'error',msg:err.message})}
    finally{setSave(false)}
  }

  return (
    <div style={{ animation:'slideUp .2s ease' }}>
      <CardTitle icon={User} title="Profile" subtitle="Your personal information and identity" accent={NV}/>
      <Flash type={fb?.type} msg={fb?.msg} onClose={()=>setFb(null)}/>

      {/* Avatar card — horizontal strip on mobile */}
      <Card style={{ padding: isMobile ? '16px' : '20px', marginBottom:16 }}>
        <div style={{ display:'flex', flexDirection: isMobile ? 'row' : 'column', alignItems:'center',
          gap:16, textAlign: isMobile ? 'left' : 'center' }}>
          {/* Avatar circle + upload btn */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width: isMobile ? 72 : 96, height: isMobile ? 72 : 96,
              borderRadius:'50%', overflow:'hidden', border:'3px solid #E2E8F0',
              boxShadow:'0 4px 16px rgba(0,0,0,.12)' }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                : <div style={{ width:'100%',height:'100%',
                    background:`linear-gradient(135deg,${NV},${NK})`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    color:'white', fontSize: isMobile ? 24 : 32, fontWeight:800, fontFamily:MF }}>
                    {initials}
                  </div>}
            </div>
            <button onClick={()=>fileRef.current?.click()}
              style={{ position:'absolute',bottom:0,right:0,width:26,height:26,borderRadius:'50%',
                background:NV,border:'2px solid white',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=CR}
              onMouseLeave={e=>e.currentTarget.style.background=NV}>
              <User size={11} style={{ color:'white' }}/>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
              onChange={e=>{const f=e.target.files?.[0];if(f&&f.size<=2*1024*1024){setAF(f);setAS(URL.createObjectURL(f))}else if(f)toast('Max 2MB.','error')}}/>
          </div>
          {/* Name / email / badge */}
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize: isMobile ? 15 : 16, fontWeight:700, color:NV,
              margin:'0 0 2px', fontFamily:MF, overflow:'hidden',
              textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {[form.given,form.last].filter(Boolean).join(' ')||'Your Name'}
            </p>
            <p style={{ fontSize:11, color:'#718096', margin:'0 0 8px', fontFamily:IF,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.email}
            </p>
            {!isMobile && <p style={{ fontSize:10,color:'#A0AEC0',marginTop:8,
              lineHeight:1.6,fontFamily:IF }}>JPG / PNG · Max 2 MB</p>}
          </div>
          {isMobile && <p style={{ fontSize:10,color:'#A0AEC0',margin:0,fontFamily:IF,
            alignSelf:'flex-end',flexShrink:0 }}>Max 2 MB</p>}
        </div>
      </Card>

      {/* Fields card */}
      <Card style={{ padding: isMobile ? '16px' : '20px', marginBottom:16 }}>
        <p style={{ fontSize:11,fontWeight:700,color:'#718096',textTransform:'uppercase',
          letterSpacing:'.5px',margin:'0 0 14px',fontFamily:IF }}>Personal Information</p>
        <div style={{ display:'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'0 14px' }}>
          <FInput label="First Name" value={form.given}
            onChange={e=>setForm(f=>({...f,given:e.target.value}))}
            placeholder="Juan" required/>
          <FInput label="Last Name" value={form.last}
            onChange={e=>setForm(f=>({...f,last:e.target.value}))}
            placeholder="dela Cruz" required/>
        </div>
        <FInput label="Email Address" value={form.email} disabled
          hint="Change email in Account Settings."/>
        <FInput label="Phone Number" value={form.phone}
          onChange={e=>setForm(f=>({...f,phone:e.target.value.replace(/\D/g,'').slice(0,9)}))}
          prefix="+63 9" placeholder="XX XXX XXXX"/>
        <FInput label="Barangay Address" value={form.address}
          onChange={e=>setForm(f=>({...f,address:e.target.value}))}
          placeholder="Street, Barangay, Baguio City"/>
        <div style={{ display:'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'0 14px' }}>
          <FInput label="Date of Birth" type="date" value={form.birthday}
            onChange={e=>setForm(f=>({...f,birthday:e.target.value}))}/>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block',fontSize:11,fontWeight:700,color:'#4A5568',
              textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,fontFamily:IF }}>
              Gender
            </label>
            <select value={form.gender}
              onChange={e=>setForm(f=>({...f,gender:e.target.value}))}
              style={{ width:'100%',padding:'11px 13px',borderRadius:9,
                border:'1.5px solid #E2E8F0',background:'white',fontSize:14,
                fontFamily:IF,color:'#2D3748',outline:'none',
                WebkitAppearance:'none', appearance:'none' }}>
              <option value="">Select gender</option>
              {['Male','Female','Non-binary','Prefer not to say'].map(g=>
                <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <FInput label="Emergency Contact (Optional)" value={form.emergency}
          onChange={e=>setForm(f=>({...f,emergency:e.target.value}))}
          placeholder="Name — +63 9XX XXX XXXX"/>
      </Card>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:10,
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
        <Btn variant="ghost" fullWidth={isMobile}
          onClick={()=>{
            if(profile) setForm({
              given:profile.given_name||'', last:profile.last_name||'',
              email:user?.email||'',
              phone:profile.contact_number?.replace('+639','')||'',
              address:profile.address||'', birthday:profile.birthday||'',
              gender:profile.gender||'', emergency:profile.emergency_contact||''
            })
            setAF(null); setAS(profile?.profile_picture||null)
          }}>
          <X size={13}/> Cancel
        </Btn>
        <Btn loading={saving} fullWidth={isMobile} onClick={handleSave}>
          <Save size={13}/> Save Profile
        </Btn>
      </div>
    </div>
  )
}

// ── PwF: standalone password field — MUST be outside AccountSection ─────────
// Defining it inside causes remount on every keystroke (focus lost).
function PwF({ label, k, sk, pw, setPw }) {
  const [f, setF] = useState(false)
  return (
    <div>
      <label style={{ display:'block',fontSize:11,fontWeight:700,color:'#4A5568',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,fontFamily:IF }}>{label} *</label>
      <div style={{ position:'relative' }}>
        <input
          type={pw[sk] ? 'text' : 'password'}
          value={pw[k]}
          onChange={e => setPw(p => ({ ...p, [k]: e.target.value }))}
          placeholder="••••••••"
          style={{ width:'100%',padding:'11px 40px 11px 13px',borderRadius:9,border:`1.5px solid ${f?NV:'#E2E8F0'}`,background:'#FAFBFC',fontSize:14,fontFamily:IF,color:'#2D3748',outline:'none',boxSizing:'border-box',transition:'border .15s, box-shadow .15s',boxShadow:f?`0 0 0 3px rgba(26,54,93,.09)`:'none' }}
          onFocus={() => setF(true)}
          onBlur={() => setF(false)}
        />
        <button type="button" onClick={() => setPw(p => ({ ...p, [sk]: !p[sk] }))}
          style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#A0AEC0',padding:0,display:'flex' }}>
          {pw[sk] ? <EyeOff size={14}/> : <Eye size={14}/>}
        </button>
      </div>
      {k==='new_' && <StrBar val={pw.new_}/>}
      {k==='conf' && pw.conf && pw.conf !== pw.new_ && <p style={{ fontSize:11,color:CR,marginTop:3,fontFamily:IF }}>⚠ Do not match</p>}
    </div>
  )
}

/* ══════════════════════════════════════
   2. ACCOUNT SETTINGS
══════════════════════════════════════ */
function AccountSection({ user, profile, toast, logAudit, isMobile=false }) {
  const [pw,setPw]=useState({cur:'',new_:'',conf:'',showNew:false,showCur:false})
  const [pwS,setPwS]=useState(false)
  const [emailNew,setEN]=useState('')
  const [emailStep,setES]=useState('idle')
  const [phoneNew,setPN]=useState('')
  const [phoneOTP,setPhO]=useState('')
  const [phoneStep,setPhS]=useState('idle')
  const [phoneLoad,setPhL]=useState(false)
  const [uname,setUname]=useState('')
  const [uS,setUS]=useState(false)
  const [fb,setFb]=useState(null)
  const showFb=(t,m)=>{setFb({type:t,msg:m});setTimeout(()=>setFb(null),5000)}

  const handlePw=async e=>{
    e.preventDefault()
    if(pw.new_!==pw.conf){showFb('error','Passwords do not match.');return}
    if(pw.new_.length<8){showFb('error','Minimum 8 characters required.');return}
    setPwS(true)
    try{const{error}=await supabase.auth.updateUser({password:pw.new_});if(error)throw error;await logAudit('Edit','Account','Changed password');showFb('success','Password updated! 🔐');setPw({cur:'',new_:'',conf:'',showNew:false,showCur:false})}
    catch(err){showFb('error',err.message)}finally{setPwS(false)}
  }


  return (
    <div style={{ animation:'slideUp .2s ease' }}>
      <CardTitle icon={Lock} title="Account Settings" subtitle="Password, email, phone and verification" accent={NL}/>
      <Flash type={fb?.type} msg={fb?.msg} onClose={()=>setFb(null)}/>

      {/* Password */}
      <Card>
        <CardTitle icon={Lock} title="Change Password" accent={CR}/>
        <form onSubmit={handlePw}>
          <div style={{ display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',gap:12 }}>
            <PwF label="Current Password" k="cur"  sk="showCur" pw={pw} setPw={setPw}/>
            <PwF label="New Password"     k="new_" sk="showNew" pw={pw} setPw={setPw}/>
            <PwF label="Confirm Password" k="conf" sk="showNew" pw={pw} setPw={setPw}/>
          </div>
          <div style={{ display:'flex',gap:10,marginTop:14 }}>
            <Btn type="submit" loading={pwS}><Lock size={13}/> Update Password</Btn>
            <Btn variant="ghost" type="button" onClick={()=>setPw({cur:'',new_:'',conf:'',showNew:false,showCur:false})}><X size={13}/> Clear</Btn>
          </div>
        </form>
      </Card>

      {/* Email */}
      <Card>
        <CardTitle icon={Mail} title="Update Email" subtitle={`Current: ${user?.email}`} accent={PU}/>
        {emailStep==='idle'?(
          <div style={{ display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr auto',gap:10,alignItems:'end' }}>
            <FInput label="New Email Address" value={emailNew} onChange={e=>setEN(e.target.value)} type="email" placeholder="new@email.com"/>
            <div style={{ marginBottom:14 }}>
              <Btn onClick={async()=>{if(!emailNew)return;const{error}=await supabase.auth.updateUser({email:emailNew});if(error)showFb('error',error.message);else{setES('sent');showFb('success','Verification emails sent to both addresses!')}}} variant="purple"><Mail size={13}/> Send Verification</Btn>
            </div>
          </div>
        ):(
          <div style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 16px',background:'#FAF5FF',borderRadius:10,border:'1px solid #D6BCFA' }}>
            <CheckCircle size={14} style={{ color:PU,flexShrink:0 }}/>
            <p style={{ fontSize:13,color:'#553C9A',fontWeight:600,margin:0,fontFamily:IF }}>Verification sent! Check both email inboxes.</p>
            <button onClick={()=>{setES('idle');setEN('')}} style={{ marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#A0AEC0' }}><X size={13}/></button>
          </div>
        )}
      </Card>

      {/* Phone */}
      <Card>
        <CardTitle icon={Phone} title="Update Phone Number" subtitle="Requires OTP verification" accent={GR}/>
        {phoneStep==='idle'?(
          <div style={{ display:'flex',gap:10,alignItems:'end' }}>
            <div style={{ flex:1 }}><FInput label="Phone Number" value={phoneNew} onChange={e=>setPN(e.target.value.replace(/\D/g,'').slice(0,9))} prefix="+63 9" placeholder="XX XXX XXXX"/></div>
            <div style={{ marginBottom:14 }}><Btn onClick={()=>{setPhS('sent');showFb('success','OTP sent to your phone!')}} variant="success"><Phone size={13}/> Verify & Save</Btn></div>
          </div>
        ):(
          <div>
            <p style={{ fontSize:12,color:GR,marginBottom:10,fontWeight:600,fontFamily:IF }}>✅ OTP sent to your phone. Enter the 6-digit code:</p>
            <div style={{ display:'flex',gap:10 }}>
              <input type="text" inputMode="numeric" maxLength={6} value={phoneOTP} onChange={e=>setPhO(e.target.value.replace(/\D/g,''))} placeholder="000000"
                style={{ width:130,padding:'11px',borderRadius:9,border:'2px solid #E2E8F0',fontSize:22,fontWeight:700,letterSpacing:'6px',textAlign:'center',fontFamily:'monospace',outline:'none' }}
                onFocus={e=>e.target.style.borderColor=NV} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              <Btn onClick={async()=>{setPhL(true);try{await supabase.from('profiles').update({contact_number:`+639${phoneNew}`}).eq('user_id',user.id);await logAudit('Edit','Account','Updated phone number');showFb('success','Phone updated! ✅');setPhS('idle');setPhO('')}catch(err){showFb('error',err.message)}finally{setPhL(false)}}} disabled={phoneOTP.length!==6} loading={phoneLoad} variant="success">Verify OTP</Btn>
              <Btn variant="ghost" onClick={()=>{setPhS('idle');setPhO('')}}><X size={13}/> Cancel</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Username */}
      <Card>
        <CardTitle icon={User} title="Username" subtitle="Optional — used for public display" accent={GD}/>
        <div style={{ display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:10,alignItems: isMobile ? 'stretch' : 'end' }}>
          <div style={{ flex:1 }}><FInput label="Username" value={uname} onChange={e=>setUname(e.target.value.toLowerCase().replace(/\s/g,'_'))} prefix="@" placeholder="your_username" hint="Lowercase, no spaces."/></div>
          <div style={{ marginBottom:uname?31:14 }}><Btn onClick={async()=>{if(!uname)return;setUS(true);try{await supabase.from('profiles').update({username:uname}).eq('user_id',user.id);await logAudit('Edit','Account','Updated username');showFb('success','Username saved!')}catch(err){showFb('error',err.message)}finally{setUS(false)}}} loading={uS}><Save size={13}/> Save</Btn></div>
        </div>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════
   3. SECURITY
══════════════════════════════════════ */
function SecuritySection({ user, logAudit, toast, isMobile=false }) {
  const [mfa,setMfa]=useState(false)
  const [mfaS,setMfaS]=useState('idle')
  const [fid,setFid]=useState(null)
  const [qr,setQR]=useState(null)
  const [sec,setSec]=useState(null)
  const [mc,setMC]=useState('')
  const [ml,setML]=useState(false)
  const [copied,setCopy]=useState(false)
  const [otpOn,setOtpOn]=useState(false)
  const [otpSent,setOtpSent]=useState(false)
  const [otpCode,setOtpCode]=useState('')
  const [otpLoad,setOtpLoad]=useState(false)
  const [sessions,setSess]=useState([])
  const [sessLoad,setSessLoad]=useState(false)
  const [currentSessionId,setCurrentSessId]=useState(null)
  const [lcConfirm,setLC]=useState(false)
  const [lcLoading,setLCLoad]=useState(false)
  const [suspAlerts,setSuspAlerts]=useState(true)
  const [fb,setFb]=useState(null)
  const showFb=(t,m)=>{setFb({type:t,msg:m});setTimeout(()=>setFb(null),5000)}

  useEffect(()=>{
    supabase.auth.mfa.listFactors().then(({data})=>{const t=data?.totp?.find(f=>f.status==='verified');if(t){setMfa(true);setFid(t.id)}}).catch(()=>{})
    loadSessions()
  },[])

  const loadSessions=async()=>{
    setSessLoad(true)
    try {
      // Get current session to identify "this device"
      const { data:{ session:cur } } = await supabase.auth.getSession()
      setCurrentSessId(cur?.access_token?.slice(-16)||null)

      // Supabase doesn't expose multi-session list via anon client,
      // so we query login_history for unique active sessions for this user.
      const { data } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', user?.id)
        .is('logged_out_at', null)
        .order('logged_in_at', { ascending: false })
        .limit(20)

      if (data && data.length > 0) {
        const parsed = data.map(row => {
          const { browser, os, type } = parseUserAgent(row.user_agent || '')
          return {
            id: row.id,
            device: `${browser} / ${os}`,
            type,
            time: timeAgo(row.logged_in_at),
            session_id: row.session_id,
            // Mark current if session_id matches tail of current access_token
            current: cur?.access_token?.endsWith(row.session_id || '') || false,
          }
        })
        // Ensure current session is always first
        parsed.sort((a,b)=>a.current?-1:b.current?1:0)
        setSess(parsed)
      } else {
        // Fallback: show at least the current session parsed from live token
        const { browser, os, type } = parseUserAgent(navigator.userAgent)
        setSess([{ id:'current', device:`${browser} / ${os}`, type, time:'Active now', current:true }])
      }
    } catch { setSess([]) } finally { setSessLoad(false) }
  }

  const removeSession=async(sessionRow)=>{
    try {
      await supabase.from('login_history').update({ logged_out_at:new Date().toISOString() }).eq('id', sessionRow.id)
      setSess(p=>p.filter(x=>x.id!==sessionRow.id))
      await logAudit('Remove','Security',`Removed session: ${sessionRow.device}`)
      showFb('success','Session removed.')
    } catch { showFb('error','Could not remove session.') }
  }

  const logoutAllOthers=async()=>{
    setLCLoad(true)
    try {
      const others = sessions.filter(s=>!s.current)
      await Promise.all(others.map(s=>
        supabase.from('login_history').update({ logged_out_at:new Date().toISOString() }).eq('id',s.id)
      ))
      setSess(p=>p.filter(s=>s.current))
      await logAudit('Edit','Security','Logged out all other devices')
      showFb('success','Signed out of all other devices.')
    } catch { showFb('error','Could not sign out other sessions.') }
    finally { setLCLoad(false); setLC(false) }
  }

  const startMFA=async()=>{setML(true);try{
    // Clean up any existing unverified (dangling) TOTP factors first
    const{data:existing}=await supabase.auth.mfa.listFactors()
    const unverified=existing?.totp?.filter(f=>f.status!=='verified')||[]
    for(const f of unverified){await supabase.auth.mfa.unenroll({factorId:f.id})}
    // Now enroll fresh
    const{data,error}=await supabase.auth.mfa.enroll({factorType:'totp',issuer:'YouthLink Bakakeng'})
    if(error)throw error
    setFid(data.id);setQR(data.totp.qr_code);setSec(data.totp.secret);setMfaS('enrolling')
  }catch(err){toast(err.message,'error')}finally{setML(false)}}
  const verifyMFA=async()=>{setML(true);try{const{data:c,error:ce}=await supabase.auth.mfa.challenge({factorId:fid});if(ce)throw ce;const{error:ve}=await supabase.auth.mfa.verify({factorId:fid,challengeId:c.id,code:mc});if(ve)throw ve;setMfa(true);setMfaS('idle');setQR(null);setSec(null);setMC('');await logAudit('Enable','Security','Enabled 2FA');showFb('success','2FA enabled! 🔒')}catch{toast('Invalid code. Try again.','error')}finally{setML(false)}}
  const disableMFA=async()=>{setML(true);try{const{error}=await supabase.auth.mfa.unenroll({factorId:fid});if(error)throw error;setMfa(false);setFid(null);setMfaS('idle');showFb('success','2FA disabled.')}catch(err){toast(err.message,'error')}finally{setML(false)}}

  return (
    <div style={{ animation:'slideUp .2s ease' }}>
      <CardTitle icon={Shield} title="Security" subtitle="2FA, sessions, sign up activity and alerts" accent={CR}/>
      <Flash type={fb?.type} msg={fb?.msg} onClose={()=>setFb(null)}/>

      {/* 2FA */}
      <Card>
        <CardTitle icon={Shield} title="Two-Factor Authentication (2FA)" subtitle="Add an extra layer of security using an authenticator app" accent={GD}
          right={<RBadge ok={mfa} label={mfa?'Active':'Off'}/>}/>

        {mfaS==='idle'&&!mfa&&(<div><p style={{ fontSize:13,color:'#718096',lineHeight:1.7,marginBottom:14,fontFamily:IF }}>Install <strong>Google Authenticator</strong> or <strong>Authy</strong>, then click Enable below.</p><Btn onClick={startMFA} loading={ml}><Shield size={13}/> Enable 2FA</Btn></div>)}

        {mfaS==='enrolling'&&(
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'20px 8px',gap:20 }}>
            {/* Step indicators */}
            <div style={{ display:'flex',alignItems:'center',width:'100%',maxWidth:440 }}>
              {['Get the app','Scan QR code','Enter code'].map((label,i)=>(
                <React.Fragment key={i}>
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4,flex:1 }}>
                    <div style={{ width:28,height:28,borderRadius:'50%',background:NV,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,fontFamily:IF }}>{i+1}</div>
                    <span style={{ fontSize:10,color:'#718096',fontFamily:IF,textAlign:'center' }}>{label}</span>
                  </div>
                  {i<2&&<div style={{ height:2,flex:1,background:'#E2E8F0',marginBottom:16 }}/>}
                </React.Fragment>
              ))}
            </div>
            {/* QR card */}
            <div style={{ background:'white',border:'1.5px solid #E2E8F0',borderRadius:16,padding:20,width:'100%',maxWidth:440,boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize:14,fontWeight:700,color:NV,margin:'0 0 4px',fontFamily:MF,textAlign:'center' }}>Scan with your authenticator app</p>
              <p style={{ fontSize:12,color:'#718096',margin:'0 0 16px',fontFamily:IF,textAlign:'center' }}>Open <strong>Google Authenticator</strong> or <strong>Authy</strong>, tap <strong>+</strong> and scan</p>
              <div style={{ display:'flex',justifyContent:'center',marginBottom:16 }}>
                <div style={{ padding:10,background:'white',border:'2px solid #E2E8F0',borderRadius:12 }}>
                  {qr&&<img src={qr} alt="2FA QR" style={{ width:140,height:140,display:'block' }}/>}
                </div>
              </div>
              <p style={{ fontSize:11,color:'#A0AEC0',textAlign:'center',margin:'0 0 6px',fontFamily:IF }}>Can't scan? Enter this key manually:</p>
              <div style={{ display:'flex',gap:6,alignItems:'center',background:'#F7FAFC',borderRadius:8,padding:'6px 10px',border:'1px solid #E2E8F0' }}>
                <code style={{ fontSize:10,flex:1,wordBreak:'break-all',fontFamily:'monospace',color:'#2D3748',letterSpacing:'1px' }}>{sec}</code>
                <button onClick={()=>{navigator.clipboard.writeText(sec);setCopy(true);setTimeout(()=>setCopy(false),2200)}}
                  style={{ padding:'4px 10px',borderRadius:6,border:'1px solid #E2E8F0',background:'white',cursor:'pointer',fontSize:10,color:copied?GR:NV,fontWeight:600,display:'flex',alignItems:'center',gap:4,flexShrink:0,fontFamily:IF }}>
                  <Copy size={10}/>{copied?'Copied!':'Copy'}
                </button>
              </div>
            </div>
            {/* OTP input card — Facebook style */}
            <div style={{ background:'white',border:'1.5px solid #E2E8F0',borderRadius:16,padding:24,width:'100%',maxWidth:440,boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize:14,fontWeight:700,color:NV,margin:'0 0 4px',fontFamily:MF,textAlign:'center' }}>Enter the 6-digit code</p>
              <p style={{ fontSize:12,color:'#718096',margin:'0 0 20px',fontFamily:IF,textAlign:'center' }}>Enter the code shown in your authenticator app</p>
              <div style={{ display:'flex',gap:8,justifyContent:'center',marginBottom:20 }}>
                {[0,1,2,3,4,5].map(i=>(
                  <input key={i} id={`mfa-digit-${i}`} type="text" inputMode="numeric" maxLength={1}
                    value={mc[i]||''}
                    onChange={e=>{
                      const val=e.target.value.replace(/\D/g,'')
                      if(!val){const arr=mc.split('');arr[i]='';setMC(arr.join(''));return}
                      const arr=mc.split('');arr[i]=val;const next=arr.join('').slice(0,6);setMC(next)
                      if(i<5)document.getElementById(`mfa-digit-${i+1}`)?.focus()
                    }}
                    onKeyDown={e=>{
                      if(e.key==='Backspace'){const arr=mc.split('');arr[i]='';setMC(arr.join(''));if(i>0)document.getElementById(`mfa-digit-${i-1}`)?.focus()}
                      if(e.key==='Enter'&&mc.length===6)verifyMFA()
                    }}
                    onPaste={e=>{e.preventDefault();const p=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);setMC(p);document.getElementById(`mfa-digit-${Math.min(p.length,5)}`)?.focus()}}
                    style={{ width:44,height:52,textAlign:'center',fontSize:22,fontWeight:700,fontFamily:'monospace',borderRadius:10,outline:'none',border:`2px solid ${mc[i]?NV:'#E2E8F0'}`,background:mc[i]?'#EBF4FF':'white',color:NV,transition:'all .15s',caretColor:'transparent' }}
                    onFocus={e=>{e.target.style.borderColor=NV;e.target.style.boxShadow=`0 0 0 3px ${NV}22`}}
                    onBlur={e=>{e.target.style.borderColor=mc[i]?NV:'#E2E8F0';e.target.style.boxShadow='none'}}
                  />
                ))}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                <Btn onClick={verifyMFA} disabled={mc.length!==6} loading={ml}><Shield size={14}/> Activate 2FA</Btn>
                <Btn variant="ghost" onClick={()=>{setMfaS('idle');setQR(null);setSec(null);setMC('')}}><X size={13}/> Cancel</Btn>
              </div>
            </div>
          </div>
        )}

        {mfaS==='idle'&&mfa&&(
          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ flex:1,padding:'11px 16px',background:'#F0FFF4',borderRadius:10,border:'1px solid #9AE6B4',display:'flex',alignItems:'center',gap:9 }}>
              <CheckCircle size={15} style={{ color:GR,flexShrink:0 }}/><p style={{ fontSize:13,color:'#276749',fontWeight:600,margin:0,fontFamily:IF }}>2FA is active — your account is protected by authenticator app.</p>
            </div>
            <Btn onClick={()=>setMfaS('disabling')} variant="ghost" size="sm">Disable</Btn>
          </div>
        )}

        {mfaS==='disabling'&&(
          <div style={{ padding:'14px 16px',background:'#FFF5F5',borderRadius:10,border:'1px solid #FC8181' }}>
            <p style={{ fontSize:13,color:CR,marginBottom:12,fontWeight:600,fontFamily:IF }}>⚠ Disable 2FA? This will reduce your account security.</p>
            <div style={{ display:'flex',gap:9 }}>
              <Btn variant="ghost" size="sm" onClick={()=>setMfaS('idle')}>Cancel</Btn>
              <Btn variant="danger" size="sm" loading={ml} onClick={disableMFA}>Yes, Disable 2FA</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Email OTP Login */}
      <Card>
        <RowItem icon={Mail} color={PU} title="Email OTP Login" sub="Sign in with a one-time code sent to your email instead of a password"
          right={<Toggle on={otpOn} onChange={v=>{setOtpOn(v);if(v){supabase.auth.signInWithOtp({email:user?.email,options:{shouldCreateUser:false}}).then(()=>setOtpSent(true))}else{setOtpSent(false);setOtpCode('')}}} color={PU}/>}>
          {otpOn&&otpSent&&(
            <div style={{ display:'flex',gap:10 }}>
              <input type="text" inputMode="numeric" maxLength={6} value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,''))} placeholder="OTP code"
                style={{ width:130,padding:'9px',borderRadius:9,border:'2px solid #E2E8F0',fontSize:20,fontWeight:700,letterSpacing:'5px',textAlign:'center',fontFamily:'monospace',outline:'none' }}
                onFocus={e=>e.target.style.borderColor=PU} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              <Btn onClick={async()=>{setOtpLoad(true);try{const{error}=await supabase.auth.verifyOtp({email:user?.email,token:otpCode,type:'email'});if(error)throw error;showFb('success','OTP verified ✅');setOtpSent(false);setOtpCode('')}catch{toast('Invalid OTP.','error')}finally{setOtpLoad(false)}}} disabled={otpCode.length!==6} loading={otpLoad} size="sm" variant="purple">Verify</Btn>
              <Btn variant="ghost" size="sm" onClick={()=>{setOtpOn(false);setOtpSent(false);setOtpCode('')}}>Cancel</Btn>
            </div>
          )}
        </RowItem>
        <RowItem icon={AlertCircle} color={AM} title="Suspicious Login Alerts" sub="Receive email notification when login from a new device or location is detected"
          right={<Toggle on={suspAlerts} onChange={setSuspAlerts} color={AM}/>}/>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardTitle icon={Monitor} title="Active Sessions" subtitle="Devices currently signed in to your account" accent={NV}
          right={<button onClick={loadSessions} style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:7,border:'1px solid #E2E8F0',background:'white',cursor:'pointer',fontSize:11,color:'#718096',fontFamily:IF }}><RefreshCw size={11}/> Refresh</button>}/>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
          {sessLoad ? (
            <p style={{ fontSize:12,color:'#A0AEC0',fontFamily:IF }}>Loading sessions…</p>
          ) : sessions.length===0 ? (
            <p style={{ fontSize:12,color:'#A0AEC0',fontFamily:IF }}>No active sessions found.</p>
          ) : sessions.map(s=>{
            const Ic=s.type==='mobile'?Smartphone:Monitor
            return (
              <div key={s.id} style={{ display:'flex',alignItems: isMobile?'flex-start':'center',gap:10,padding:'12px 14px',borderRadius:11,background:s.current?'#EBF8FF':'#F7FAFC',border:`1px solid ${s.current?'#BEE3F8':'#E2E8F0'}`,transition:'all .15s',flexWrap: isMobile?'wrap':'nowrap' }}>
                <Ic size={17} style={{ color:s.current?NV:'#718096',flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <span style={{ fontSize:13,fontWeight:s.current?700:500,color:s.current?NV:'#2D3748',fontFamily:IF }}>{s.device}</span>
                    {s.current&&<span style={{ fontSize:9,background:'#C6F6D5',color:'#276749',padding:'1px 8px',borderRadius:10,fontWeight:700 }}>Current</span>}
                  </div>
                  <span style={{ fontSize:11,color:'#718096',fontFamily:IF }}>{s.time}</span>
                </div>
                {!s.current&&<button onClick={()=>removeSession(s)}
                  style={{ padding:'5px 12px',borderRadius:7,border:'1px solid #FC8181',background:'white',color:CR,cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:IF }}>Remove</button>}
              </div>
            )
          })}
        </div>
        {sessions.filter(s=>!s.current).length > 0 && (
          lcConfirm?(
            <div style={{ padding:'12px 16px',background:'#FFF5F5',borderRadius:10,border:'1px solid #FC8181' }}>
              <p style={{ fontSize:13,color:CR,marginBottom:10,fontWeight:600,fontFamily:IF }}>Sign out of all other devices?</p>
              <div style={{ display:'flex',gap:9 }}>
                <Btn variant="ghost" size="sm" onClick={()=>setLC(false)}>Cancel</Btn>
                <Btn variant="danger" size="sm" loading={lcLoading} onClick={logoutAllOthers}>Confirm</Btn>
              </div>
            </div>
          ):<Btn variant="danger" size="sm" onClick={()=>setLC(true)}><LogOut size={13}/> Logout All Other Devices</Btn>
        )}
      </Card>

      {/* ✅ Sign Up Activity — dedicated LoginHistorySection component */}
      <LoginHistorySection
        user={user}
        supabase={supabase}
        logAudit={logAudit}
        isMobile={isMobile}
      />
    </div>
  )
}

/* ══════════════════════════════════════
   4. NOTIFICATIONS
══════════════════════════════════════ */
function NotificationsSection({ isMobile=false, user, profile }) {
  const [channels,setChannels]=useState({ email:true, sms:false, inApp:true })
  const [cats,setCats]=useState({ events:true, announcements:true, reminders:true, feedback:false, projects:true })
  const [saving,setSaving]=useState(false)
  const [fb,setFb]=useState(null)

  // Load existing prefs from profile on mount
  useEffect(()=>{
    const prefs = profile?.notification_prefs
    if (!prefs) return
    if (prefs.channels) setChannels(c=>({...c,...prefs.channels}))
    if (prefs.cats)     setCats(c=>({...c,...prefs.cats}))
  },[profile])

  const NRow=({icon,color,label,sub,k,store,setStore})=>(
    <RowItem icon={icon} color={color} title={label} sub={sub} right={<Toggle on={store[k]} onChange={v=>setStore(s=>({...s,[k]:v}))} color={color||NV}/>}/>
  )

  const handleSave = async () => {
    if (!user?.id) { setFb({type:'error',msg:'Not logged in.'}); return }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_prefs: { channels, cats } })
        .eq('user_id', user.id)
      if (error) throw error
      setFb({type:'success',msg:'Notification preferences saved! ✅'})
      setTimeout(()=>setFb(null),4000)
    } catch(err) {
      setFb({type:'error',msg:err.message})
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ animation:'slideUp .2s ease' }}>
      <CardTitle icon={Bell} title="Notifications" subtitle="Control how and when you receive notifications" accent={PU}/>
      <Flash type={fb?.type} msg={fb?.msg} onClose={()=>setFb(null)}/>
      <Card>
        <p style={{ fontSize:12,fontWeight:700,color:'#718096',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 4px',fontFamily:IF }}>Notification Channels</p>
        <NRow icon={Mail}       color={NV} label="Email Notifications" sub="Updates and alerts sent to your email"       k="email"  store={channels} setStore={setChannels}/>
        <NRow icon={Smartphone} color={GR} label="SMS Alerts"          sub="Text message notifications for urgent items" k="sms"    store={channels} setStore={setChannels}/>
        <NRow icon={Bell}       color={PU} label="In-App Notifications" sub="Browser and dashboard alerts"               k="inApp"  store={channels} setStore={setChannels}/>
      </Card>
      <Card>
        <p style={{ fontSize:12,fontWeight:700,color:'#718096',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 4px',fontFamily:IF }}>Notification Categories</p>
        <NRow icon={Calendar}      color={GD} label="Event Reminders"       sub="Get reminded about upcoming events"       k="events"        store={cats} setStore={setCats}/>
        <NRow icon={MessageSquare} color={NV} label="Announcements"         sub="Barangay and SK news and notices"         k="announcements" store={cats} setStore={setCats}/>
        <NRow icon={Activity}      color={PU} label="Project Updates"       sub="Progress and completion of SK projects"   k="projects"      store={cats} setStore={setCats}/>
      </Card>
      <div style={{ display:'flex',gap:10 }}>
        <Btn onClick={handleSave} disabled={saving}><Save size={13}/> {saving ? 'Saving…' : 'Save Preferences'}</Btn>
        <Btn variant="ghost"><X size={13}/> Cancel</Btn>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   5. TERMS & POLICIES
══════════════════════════════════════ */
function PrivacySection({ user, profile, logAudit, toast, isMobile=false }) {
  const [activeTab, setActiveTab] = useState('tos')

  const tabStyle = (key) => ({
    padding: '10px 22px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: MF,
    transition: 'all .18s',
    background: activeTab === key ? NV : '#F1F5F9',
    color: activeTab === key ? 'white' : '#4A5568',
    boxShadow: activeTab === key ? `0 2px 8px ${NV}33` : 'none',
  })

  const sectionTitle = (text) => (
    <p style={{ fontSize: 13, fontWeight: 700, color: NV, margin: '20px 0 6px', fontFamily: MF }}>{text}</p>
  )
  const sectionBody = (text) => (
    <p style={{ fontSize: 12.5, color: '#4A5568', lineHeight: 1.75, margin: '0 0 6px', fontFamily: IF }}>{text}</p>
  )
  const bulletList = (items) => (
    <ul style={{ margin: '4px 0 10px 18px', padding: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 12.5, color: '#4A5568', lineHeight: 1.75, fontFamily: IF, marginBottom: 2 }}>{item}</li>
      ))}
    </ul>
  )

  return (
    <div style={{ animation: 'slideUp .2s ease' }}>
      <CardTitle icon={Eye} title="Terms & Policies" subtitle="Terms of Service and Privacy Policy" accent={GR} />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button style={tabStyle('tos')} onClick={() => setActiveTab('tos')}>📄 Terms of Service</button>
        <button style={tabStyle('pp')} onClick={() => setActiveTab('pp')}>🔒 Privacy Policy</button>
      </div>

      {activeTab === 'tos' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>📄</span>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#1A202C', margin: 0, fontFamily: MF }}>Terms of Service</p>
              <p style={{ fontSize: 11, color: '#718096', margin: 0, fontFamily: IF }}>SK Bakakeng Central Youth Link Portal · Effective Date: April 3, 2026</p>
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1.5px solid #E2E8F0', margin: '14px 0' }} />

          {sectionTitle('Overview')}
          {sectionBody('These Terms of Service ("Terms") govern your access to and use of the SK Bakakeng Central Youth Link Portal (the "Platform"). By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree, you must not use the Platform.')}

          {sectionTitle('1. Eligibility')}
          {sectionBody('This Platform is exclusively for residents of Barangay Bakakeng Central aged 15 to 30 years old, who are members of the Katipunan ng Kabataan (KK). This requirement is based on Republic Act No. 10742, which legally defines the youth sector eligible for SK participation. If you do not meet these requirements, you are not permitted to use the Platform.')}

          {sectionTitle('2. Your Account')}
          {sectionBody('When you create an account, you agree to:')}
          {bulletList(['Provide accurate and complete information','Keep your login credentials secure','Be responsible for all activities under your account'])}
          {sectionBody('The SK Council may verify your information and suspend accounts with false data.')}

          {sectionTitle('3. Use of the Platform')}
          {sectionBody('The Platform allows users to:')}
          {bulletList(['Submit applications and requests','Participate in SK programs and activities','Receive announcements and updates'])}
          {sectionBody('Submission of requests does not guarantee approval and is subject to SK Council review.')}

          {sectionTitle('4. Acceptable Use')}
          {sectionBody('You agree not to:')}
          {bulletList(['Provide false or misleading information','Impersonate another person or official','Disrupt or attempt to hack the system','Use the platform for commercial or unauthorized purposes'])}

          {sectionTitle('5. AI Chatbot')}
          {sectionBody('The Platform may include an AI chatbot:')}
          {bulletList(['It provides general guidance only','It does not represent official SK decisions','Users must verify important information with SK officials'])}

          {sectionTitle('6. Intellectual Property')}
          {sectionBody('All content on this Platform (logos, documents, media) belongs to SK Bakakeng Central. You may not copy, distribute, or reuse content without permission.')}

          {sectionTitle('7. Suspension or Termination')}
          {sectionBody('We may suspend or terminate your account if you:')}
          {bulletList(['Violate these Terms','Provide false information','Misuse the Platform'])}

          {sectionTitle('8. Limitation of Liability')}
          {sectionBody('The Platform is provided "as is." The SK Council is not liable for:')}
          {bulletList(['System errors or downtime','Data loss due to user actions','Decisions based on platform information'])}

          {sectionTitle('9. Changes to Terms')}
          {sectionBody('We may update these Terms at any time. Continued use means you accept the updated Terms.')}

          {sectionTitle('10. Contact')}
          {sectionBody('For concerns, please contact SK Bakakeng Central officials.')}
        </Card>
      )}

      {activeTab === 'pp' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>🔒</span>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#1A202C', margin: 0, fontFamily: MF }}>Privacy Policy</p>
              <p style={{ fontSize: 11, color: '#718096', margin: 0, fontFamily: IF }}>SK Bakakeng Central Youth Link Portal · Effective Date: April 3, 2026</p>
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1.5px solid #E2E8F0', margin: '14px 0' }} />

          {sectionTitle('Overview')}
          {sectionBody('This Privacy Policy explains how your personal data is collected, used, and protected when you use the Platform. All data processing complies with the Data Privacy Act of 2012.')}

          {sectionTitle('1. Information We Collect')}
          {sectionBody('We may collect the following:')}
          {bulletList(['Full name, birthdate, age, gender','Address and residency details','Contact information (email, phone number)','Education and employment details','Uploaded documents and records','Activity within the Platform'])}

          {sectionTitle('2. How We Use Your Information')}
          {sectionBody('Your data is used strictly for official SK purposes:')}
          <p style={{ fontSize: 12.5, fontWeight: 700, color: '#2D3748', margin: '8px 0 2px', fontFamily: MF }}>a. Youth Profiling</p>
          {sectionBody('To maintain an official Katipunan ng Kabataan database for planning and governance.')}
          <p style={{ fontSize: 12.5, fontWeight: 700, color: '#2D3748', margin: '8px 0 2px', fontFamily: MF }}>b. Program Processing</p>
          {bulletList(['Evaluate eligibility','Process applications','Track participation'])}
          <p style={{ fontSize: 12.5, fontWeight: 700, color: '#2D3748', margin: '8px 0 2px', fontFamily: MF }}>c. Communication</p>
          {sectionBody('To send:')}
          {bulletList(['Announcements','Event updates','Notifications'])}
          <p style={{ fontSize: 12.5, fontWeight: 700, color: '#2D3748', margin: '8px 0 2px', fontFamily: MF }}>d. Verification and Security</p>
          {bulletList(['Confirm identity','Prevent fraud or duplicate accounts','Protect system integrity'])}
          <p style={{ fontSize: 12.5, fontWeight: 700, color: '#2D3748', margin: '8px 0 2px', fontFamily: MF }}>e. Government Reporting</p>
          {sectionBody('To comply with reporting requirements to agencies such as:')}
          {bulletList(['National Youth Commission','Department of the Interior and Local Government'])}
          {sectionBody('Data shared is limited and only when required by law.')}

          {sectionTitle('3. Data Protection')}
          {sectionBody('We implement safeguards to protect your personal data:')}
          {bulletList(['Restricted access to authorized personnel','Secure storage systems','Monitoring against unauthorized access'])}

          {sectionTitle('4. Data Retention')}
          {sectionBody('Your data is retained only as long as necessary for:')}
          {bulletList(['SK operations','Legal and reporting requirements'])}

          {sectionTitle('5. Your Rights')}
          {sectionBody('Under the Data Privacy Act, you have the right to:')}
          {bulletList(['Access your personal data','Request correction of inaccurate data','Request deletion (when applicable)','Withdraw consent'])}

          {sectionTitle('6. Data Sharing')}
          {sectionBody('We do NOT:')}
          {bulletList(['Sell your personal data','Use your data for commercial purposes'])}
          {sectionBody('We only share data:')}
          {bulletList(['With authorized government agencies','When required by law'])}

          {sectionTitle('7. Security Responsibility')}
          {sectionBody('Users are responsible for:')}
          {bulletList(['Protecting their account credentials','Reporting unauthorized access'])}

          {sectionTitle('8. Updates to this Policy')}
          {sectionBody('This Privacy Policy may be updated. Continued use means you accept the changes.')}

          {sectionTitle('9. Contact')}
          {sectionBody('For privacy concerns, contact SK Bakakeng Central.')}
        </Card>
      )}
    </div>
  )
}

/* ══════════════════════════════════════
   6. ACTIVITY / HISTORY  (redesigned)
══════════════════════════════════════ */

/* ── Micro-helpers ── */
const fmtD=(iso,opts={month:'short',day:'numeric',year:'numeric'})=>
  iso?new Date(iso).toLocaleDateString('en-PH',opts):'—'
const fmtDT=(iso)=>
  iso?new Date(iso).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'

const ACT_CSS=`
@keyframes act-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes act-fade{from{opacity:0}to{opacity:1}}
@keyframes act-spin{to{transform:rotate(360deg)}}
@keyframes act-bar{from{width:0}to{width:var(--w)}}
.act-wrap *{box-sizing:border-box;font-family:'Plus Jakarta Sans','Inter',sans-serif}
.act-wrap{--ink:#0E2240;--ink2:#4A5E78;--ink3:#8FA3B8;--surface:#F4F7FA;--card:#FFFFFF;--border:#E2E8F1;--blue:#1D72C8;--teal:#0C9AA0;--amber:#D97706;--green:#16A34A;--red:#DC2626;--purple:#7C3AED}
.act-card{background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:0 2px 12px rgba(14,34,64,.06)}
.act-row-hover:hover{background:#F8FAFD;transition:background .15s}
.act-btn-primary{background:var(--blue);color:#fff;border:none;border-radius:10px;padding:9px 20px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:box-shadow .18s,transform .12s;box-shadow:0 3px 14px rgba(29,114,200,.3)}
.act-btn-primary:hover{box-shadow:0 6px 22px rgba(29,114,200,.42);transform:translateY(-1px)}
.act-btn-ghost{background:transparent;color:var(--ink2);border:1.5px solid var(--border);border-radius:10px;padding:8px 16px;font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:border-color .15s,background .15s}
.act-btn-ghost:hover{border-color:var(--blue);background:#F0F7FF;color:var(--blue)}
.act-drop{position:absolute;top:calc(100% + 6px);right:0;background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:0 10px 36px rgba(14,34,64,.15);z-index:200;min-width:196px;overflow:hidden;animation:act-fade .14s ease}
.act-drop-item{display:flex;align-items:center;gap:10px;padding:10px 14px;width:100%;background:transparent;border:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--ink);text-align:left;transition:background .12s}
.act-drop-item:hover{background:#F4F7FA}
.act-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0}
.act-stat{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 8px rgba(14,34,64,.05);transition:box-shadow .18s,transform .12s}
.act-stat:hover{box-shadow:0 4px 18px rgba(14,34,64,.1);transform:translateY(-1px)}
.act-timeline-dot{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;position:relative;z-index:1}
.act-section-title{font-family:'Montserrat','Plus Jakarta Sans',sans-serif;font-size:17px;font-weight:700;color:var(--ink);letter-spacing:-.2px}
`

function ActivitySection({ user, isMobile=false }) {
  const [events,   setEvents]  = useState([])
  const [feedback, setFeedback]= useState([])
  const [logs,     setLogs]    = useState([])
  const [loading,  setLoading] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef()

  /* ── Data load ── */
  useEffect(()=>{
    if(!user?.id) return
    const load = async () => {
      setLoading(true)

      // Fetch all three in parallel
      const [regRes, fbRes, lgRes] = await Promise.all([
        // Events the user actually joined via event_registrations, joined with event details
        supabase
          .from('event_registrations')
          .select('id, created_at, event_id, events(id, title, start_date, status)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(25),
        // Feedback submitted by the user
        supabase
          .from('feedback')
          .select('id, subject, rating, created_at, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(25),
        // Audit log entries for the user
        supabase
          .from('audit_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      // Flatten event registrations -> normalise to {id, title, start_date, status, joined_at}
      const evList = (regRes.data || []).map(r => ({
        id:         r.event_id,
        regId:      r.id,
        title:      r.events?.title      || 'Event',
        start_date: r.events?.start_date || r.created_at,
        status:     r.events?.status     || 'Joined',
        joined_at:  r.created_at,
      }))
      setEvents(evList)

      const fbList = fbRes.data || []
      setFeedback(fbList)

      // Build a unified activity log:
      // Start with audit_log rows, then synthesise entries from registrations
      // and feedback that aren't already represented, then sort by date.
      const auditEntries = (lgRes.data || []).map(l => ({ ...l, _src: 'audit' }))

      // Synthesise "Joined event" entries from registrations not already in audit
      const auditEventDescs = new Set(
        auditEntries.filter(l => /event/i.test(l.module)).map(l => l.description)
      )
      const syntheticEvents = evList
        .filter(e => !auditEventDescs.has(`Joined event: ${e.title}`))
        .map(e => ({
          id:          `ev-${e.regId}`,
          action:      'Join',
          module:      'Events',
          description: `Joined event: ${e.title}`,
          created_at:  e.joined_at,
          status:      'Success',
          _src:        'event',
        }))

      // Synthesise "Submitted feedback" entries not already in audit
      const auditFbTimes = new Set(
        auditEntries.filter(l => /feedback/i.test(l.module)).map(l => l.created_at)
      )
      const syntheticFb = fbList
        .filter(f => !auditFbTimes.has(f.created_at))
        .map(f => ({
          id:          `fb-${f.id}`,
          action:      'Submit',
          module:      'Feedback',
          description: `Submitted feedback: ${f.subject || 'General Feedback'}`,
          created_at:  f.created_at,
          status:      'Success',
          _src:        'feedback',
        }))

      // Merge, sort newest-first, cap at 50
      const merged = [...auditEntries, ...syntheticEvents, ...syntheticFb]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50)
      setLogs(merged)

      setLoading(false)
    }
    load()
  },[user])

  /* ── Close dropdown on outside click ── */
  useEffect(()=>{
    const h = e => { if(exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  },[])

  /* ── Derived counts ── */
  const fbResolved = feedback.filter(f=>f.status==='Resolved'||(f.rating==='good'&&!f.status)).length

  /* ── Badge configs ── */
  const evBadge = status => {
    const d = status==='Attended'?'Attended':status==='Cancelled'?'Cancelled':'Joined'
    return {
      Joined:    {bg:'#EBF4FF',fg:'#1D72C8',dot:'#1D72C8'},
      Attended:  {bg:'#ECFDF5',fg:'#16A34A',dot:'#16A34A'},
      Cancelled: {bg:'#FEF2F2',fg:'#DC2626',dot:'#DC2626'},
    }[d] || {bg:'#EBF4FF',fg:'#1D72C8',dot:'#1D72C8'}
  }
  const fbBadge = (status, rating) => {
    const d = status || ({good:'Resolved',average:'Under Review',bad:'Action Taken'}[rating]) || 'Under Review'
    return ({
      'Under Review': {bg:'#FFFBEB',fg:'#D97706',dot:'#D97706',label:'Under Review'},
      'Resolved':     {bg:'#ECFDF5',fg:'#16A34A',dot:'#16A34A',label:'Resolved'},
      'Action Taken': {bg:'#EBF4FF',fg:'#1D72C8',dot:'#1D72C8',label:'Action Taken'},
    }[d] || {bg:'#FFFBEB',fg:'#D97706',dot:'#D97706',label:d})
  }
  const logMeta = (action, module) => {
    if(/profile/i.test(module)||/edit/i.test(action)) return {bg:'#EBF4FF',fg:'#1D72C8',icon:User}
    if(/document/i.test(module))                      return {bg:'#ECFDF5',fg:'#16A34A',icon:FileText}
    if(/event/i.test(module))                         return {bg:'#FFFBEB',fg:'#D97706',icon:Calendar}
    if(/feedback/i.test(module))                      return {bg:'#F5F3FF',fg:'#7C3AED',icon:MessageSquare}
    if(/post|update/i.test(module))                   return {bg:'#FEF2F2',fg:'#DC2626',icon:Globe}
    return                                                   {bg:'#F1F5F9',fg:'#64748B',icon:Activity}
  }

  /* ── CSV export ── */
  const doCSV = () => {
    const rows=[['Type','Title / Subject','Date','Status']]
    events.forEach(e=>rows.push(['Event',e.title||'',fmtD(e.start_date),e.status||'Joined']))
    feedback.forEach(f=>rows.push(['Feedback',f.subject||'General Feedback',fmtD(f.created_at),fbBadge(f.status,f.rating).label]))
    logs.forEach(l=>rows.push(['Log',`${l.action||''} — ${l.module||''}`,fmtDT(l.created_at),'—']))
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`activity-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    setExportOpen(false)
  }

  /* ── PDF export ── */
  const doPDF = () => {
    const badge=(label,fg,bg)=>`<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;color:${fg};background:${bg}">${label}</span>`
    const evRows  = events.map(e=>{const b=evBadge(e.status);return`<tr><td>${e.title||''}</td><td>${fmtD(e.start_date)}</td><td>${badge(e.status||'Joined',b.fg,b.bg)}</td></tr>`}).join('')
    const fbRows  = feedback.map(f=>{const b=fbBadge(f.status,f.rating);return`<tr><td>${f.subject||'General Feedback'}</td><td>${fmtD(f.created_at)}</td><td>${badge(b.label,b.fg,b.bg)}</td></tr>`}).join('')
    const logRows = logs.slice(0,20).map(l=>`<tr><td>${l.description||`${l.action||''} — ${l.module||''}`}</td><td>${fmtDT(l.created_at)}</td></tr>`).join('')
    const html=`<!DOCTYPE html><html><head><title>Activity Report</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}body{font-family:'Plus Jakarta Sans','Inter',sans-serif;color:#0E2240;padding:40px;background:#fff;max-width:860px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #E2E8F1}
h1{font-size:22px;margin:0 0 4px}p{margin:0;font-size:13px;color:#4A5E78}
h2{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1D72C8;margin:28px 0 12px}
table{width:100%;border-collapse:collapse;font-size:13px}th{background:#F4F7FA;padding:9px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#4A5E78;border-bottom:1px solid #E2E8F1}
td{padding:9px 12px;border-bottom:1px solid #F4F7FA}tr:hover td{background:#FAFCFF}
footer{margin-top:36px;padding-top:14px;border-top:1px solid #E2E8F1;font-size:11px;color:#8FA3B8;display:flex;justify-content:space-between}
</style></head><body>
<div class="header"><div><h1>Activity &amp; Participation Report</h1><p>Barangay Bakakeng Central SK Portal</p></div><p style="text-align:right">${new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p></div>
<h2>📅 Events (${events.length})</h2>
<table><thead><tr><th>Event Name</th><th>Date</th><th>Status</th></tr></thead><tbody>${evRows||'<tr><td colspan="3" style="color:#8FA3B8">No events found.</td></tr>'}</tbody></table>
<h2>💬 Feedback (${feedback.length})</h2>
<table><thead><tr><th>Subject</th><th>Submitted</th><th>Status</th></tr></thead><tbody>${fbRows||'<tr><td colspan="3" style="color:#8FA3B8">No feedback found.</td></tr>'}</tbody></table>
<h2>🗂 Recent Activity Log</h2>
<table><thead><tr><th>Action</th><th>Date &amp; Time</th></tr></thead><tbody>${logRows||'<tr><td colspan="2" style="color:#8FA3B8">No activity recorded.</td></tr>'}</tbody></table>
<footer><span>Confidential — for personal reference only</span><span>Exported ${new Date().toLocaleString('en-PH')}</span></footer>
</body></html>`
    const w=window.open('','_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(()=>w.print(),500)
    setExportOpen(false)
  }

  /* ── Sub-components ── */
  const StatPill = ({value,label,icon:Icon,accent,bg}) => (
    <div className="act-stat" style={{flex:1,minWidth:isMobile?'calc(50% - 5px)':0,animationDelay:'.05s',animation:'act-in .35s ease both'}}>
      <div style={{width:44,height:44,borderRadius:12,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <Icon size={20} style={{color:accent}}/>
      </div>
      <div>
        <p style={{fontSize:26,fontWeight:700,color:'var(--ink)',margin:0,lineHeight:1,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{value}</p>
        <p style={{fontSize:12,color:'var(--ink2)',margin:'3px 0 0',fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{label}</p>
      </div>
    </div>
  )

  const SectionHeader = ({icon:Icon,title,sub,accentBg,accentFg,count}) => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,paddingBottom:14,borderBottom:'1.5px solid var(--border)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:accentBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Icon size={15} style={{color:accentFg}}/>
        </div>
        <div>
          <p className="act-section-title" style={{margin:0}}>{title}</p>
          <p style={{fontSize:11,color:'var(--ink3)',margin:0,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{sub}</p>
        </div>
      </div>
      {count!=null&&<span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:'var(--surface)',color:'var(--ink2)',fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{count} total</span>}
    </div>
  )

  const EmptyState = ({icon:Icon,msg}) => (
    <div style={{textAlign:'center',padding:'32px 0',color:'var(--ink3)'}}>
      <div style={{width:48,height:48,borderRadius:14,background:'var(--surface)',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:10}}>
        <Icon size={22} style={{opacity:.4}}/>
      </div>
      <p style={{fontSize:12,margin:0,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{msg}</p>
    </div>
  )

  const EvBadge = ({status}) => {
    const c=evBadge(status); const d=status==='Cancelled'?'Cancelled':status==='Attended'?'Attended':'Joined'
    return <span className="act-badge" style={{background:c.bg,color:c.fg}}><span style={{width:5,height:5,borderRadius:'50%',background:c.dot,flexShrink:0}}/>{d}</span>
  }

  const FbBadge = ({status,rating}) => {
    const c=fbBadge(status,rating)
    return <span className="act-badge" style={{background:c.bg,color:c.fg}}><span style={{width:5,height:5,borderRadius:'50%',background:c.dot,flexShrink:0}}/>{c.label}</span>
  }

  return (
    <div className="act-wrap" style={{animation:'act-in .25s ease'}}>
      <style>{ACT_CSS}</style>

      {/* ═══ ACTION BAR ═══ */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22,gap:12,flexWrap:'wrap'}}>
        <div>
          <p style={{fontFamily:"'Montserrat','Plus Jakarta Sans',sans-serif",fontSize:22,fontWeight:800,color:'var(--ink)',margin:'0 0 3px',letterSpacing:'-.3px'}}>
            Activity & History
          </p>
          <p style={{fontSize:13,color:'var(--ink2)',margin:0,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>
            Your participation, feedback, and portal interactions
          </p>
        </div>

        {/* Export dropdown */}
        <div ref={exportRef} style={{position:'relative',flexShrink:0}}>
          <button className="act-btn-primary" onClick={()=>setExportOpen(o=>!o)}>
            <Download size={14}/>
            Export Activity
            <svg width="10" height="10" viewBox="0 0 10 10" style={{opacity:.7,flexShrink:0}}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            </svg>
          </button>
          {exportOpen&&(
            <div className="act-drop">
              <p style={{fontSize:10,fontWeight:700,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.6px',padding:'10px 14px 5px',margin:0,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>Download as</p>
              {[
                {label:'PDF Report',    sub:'Formatted, print-ready',  icon:FileText, fn:doPDF},
                {label:'CSV File',      sub:'Open in Excel or Sheets', icon:Download, fn:doCSV},
              ].map(opt=>(
                <button key={opt.label} className="act-drop-item" onClick={opt.fn}>
                  <div style={{width:32,height:32,borderRadius:8,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <opt.icon size={14} style={{color:'var(--blue)'}}/>
                  </div>
                  <div>
                    <p style={{fontSize:13,fontWeight:600,margin:0,color:'var(--ink)'}}>{opt.label}</p>
                    <p style={{fontSize:11,margin:0,color:'var(--ink3)'}}>{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:'64px 0'}}>
          <RefreshCw size={24} style={{color:'var(--ink3)',animation:'act-spin 1s linear infinite',display:'block',margin:'0 auto 12px'}}/>
          <p style={{fontSize:13,color:'var(--ink3)',margin:0,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>Loading your activity…</p>
        </div>
      ) : (<>

        {/* ═══ QUICK STATS ═══ */}
        <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
          <StatPill value={events.length}   label="Events Joined"   icon={Calendar}      accent='#1D72C8' bg='#EBF4FF'/>
          <StatPill value={feedback.length} label="Feedback Sent"   icon={MessageSquare} accent='#7C3AED' bg='#F5F3FF'/>
        </div>

        {/* ═══ MAIN GRID ═══ */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:16,marginBottom:16}}>

          {/* Events History */}
          <div className="act-card" style={{padding:'18px 20px'}}>
            <SectionHeader icon={Calendar} title="Events History" sub={`${events.length} event${events.length!==1?'s':''} registered`} accentBg='#EBF4FF' accentFg='#1D72C8' count={events.length}/>
            {events.length===0
              ? <EmptyState icon={Calendar} msg="No events joined yet."/>
              : <div>
                  {events.map((e,i)=>(
                    <div key={e.id} className="act-row-hover"
                      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 8px',borderRadius:8,
                        borderBottom:i<events.length-1?'1px solid var(--border)':'none',marginLeft:-8,marginRight:-8}}>
                      {/* Calendar mini-icon */}
                      <div style={{width:34,height:34,borderRadius:9,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <Calendar size={14} style={{color:'var(--blue)'}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:600,color:'var(--ink)',margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{e.title}</p>
                        <p style={{fontSize:11,color:'var(--ink3)',margin:0,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{fmtD(e.start_date)}</p>
                      </div>
                      <EvBadge status={e.status}/>
                    </div>
                  ))}
                </div>}
          </div>

          {/* Feedback & Suggestions */}
          <div className="act-card" style={{padding:'18px 20px'}}>
            <SectionHeader icon={MessageSquare} title="Feedback & Suggestions" sub={`${feedback.length} submission${feedback.length!==1?'s':''}`} accentBg='#F5F3FF' accentFg='#7C3AED' count={feedback.length}/>
            {feedback.length===0
              ? <EmptyState icon={MessageSquare} msg="No feedback submitted yet."/>
              : <div>
                  {feedback.map((f,i)=>(
                    <div key={f.id} className="act-row-hover"
                      style={{padding:'10px 8px',borderRadius:8,
                        borderBottom:i<feedback.length-1?'1px solid var(--border)':'none',marginLeft:-8,marginRight:-8}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:13,fontWeight:600,color:'var(--ink)',margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{f.subject||'General Feedback'}</p>
                          <p style={{fontSize:11,color:'var(--ink3)',margin:0,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{fmtD(f.created_at)}</p>
                        </div>
                        <FbBadge status={f.status} rating={f.rating}/>
                      </div>
                    </div>
                  ))}
                </div>}
          </div>
        </div>

        {/* ═══ ACTIVITY LOG (full-width) ═══ */}
        <div className="act-card" style={{padding:'18px 20px'}}>
          <SectionHeader icon={Clock} title="Recent Activity Log" sub="Chronological feed of portal interactions" accentBg='#ECFDF5' accentFg='#16A34A'
            count={null}/>
          {/* Count badge inline */}
          {logs.length===0
            ? <EmptyState icon={Activity} msg="No activity recorded yet."/>
            : (
              <div style={{position:'relative'}}>
                {/* Vertical timeline track */}
                <div style={{position:'absolute',left:16,top:6,bottom:6,width:2,
                  background:'linear-gradient(to bottom,#E2E8F1 0%,transparent 100%)',borderRadius:2}}/>

                {logs.slice(0,15).map((l,i)=>{
                  const m=logMeta(l.action,l.module)
                  return (
                    <div key={i} className="act-row-hover"
                      style={{display:'flex',alignItems:'flex-start',gap:14,padding:'10px 8px 10px 4px',
                        borderRadius:8,marginLeft:-4,marginRight:-4,
                        borderBottom:i<Math.min(logs.length-1,14)?'1px solid #F8FAFC':'none'}}>
                      {/* Timeline dot */}
                      <div className="act-timeline-dot" style={{background:m.bg,boxShadow:`0 0 0 3px white, 0 0 0 4px ${m.bg}`}}>
                        <m.icon size={12} style={{color:m.fg}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:500,color:'var(--ink)',margin:'0 0 2px',fontFamily:"'Plus Jakarta Sans','Inter',sans-serif",lineHeight:1.4}}>
                          {l.description||`${l.action||'Action'} — ${l.module||''}`}
                        </p>
                        <p style={{fontSize:11,color:'var(--ink3)',margin:0,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>{fmtDT(l.created_at)}</p>
                      </div>
                      {l.action&&(
                        <span style={{fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:20,
                          background:m.bg,color:m.fg,flexShrink:0,whiteSpace:'nowrap',marginTop:1,fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>
                          {l.action}
                        </span>
                      )}
                    </div>
                  )
                })}
                {logs.length>15&&(
                  <p style={{fontSize:12,color:'var(--ink3)',margin:'12px 0 0 44px',fontFamily:"'Plus Jakarta Sans','Inter',sans-serif"}}>
                    +{logs.length-15} more entries — export to view all
                  </p>
                )}
              </div>
            )}
        </div>

      </>)}
    </div>
  )
}

/* ══════════════════════════════════════
   MAIN — SIDEBAR + ROUTER
══════════════════════════════════════ */
const NAV=[
  { key:'profile',       label:'Profile',         icon:User,        sub:'Personal info & photo',      accent:NV  },
  { key:'account',       label:'Account Settings', icon:Lock,        sub:'Password, email, phone',     accent:NL  },
  { key:'security',      label:'Security',         icon:Shield,      sub:'2FA, sessions, sign up activity', accent:CR  },
  { key:'notifications', label:'Notifications',    icon:Bell,        sub:'Email, SMS, in-app alerts',  accent:PU  },
  { key:'privacy',       label:'Terms & Policies', icon:Eye,         sub:'Terms of Service & Privacy Policy', accent:GR  },
  { key:'activity',      label:'Activity',         icon:Activity,    sub:'Events, feedback, history',  accent:GD  },
]

export default function UserSettings() {
  const { user, profile, signOut, logAudit, refreshProfile } = useAuth()
  const { toast } = useToast()
  const navigate  = useNavigate()
  const { theme: liveTheme } = useTheme()
  // Sync module-level tokens with live theme so all sub-components get updated colors
  NV = liveTheme.primaryColor   || '#1A365D'
  NK = liveTheme.primaryColor   ? liveTheme.primaryColor + 'DD' : '#0F2444'
  NL = liveTheme.primaryColor   ? liveTheme.primaryColor + 'BB' : '#2A4A7F'
  CR = liveTheme.secondaryColor || '#C53030'
  GD = liveTheme.accentColor    || '#D69E2E'
  MF = `'${liveTheme.fontFamily || 'Plus Jakarta Sans'}', 'Inter', sans-serif`
  const [page,setPage]=useState('profile')
  const [collapsed,setCollapsed]=useState(false)
  const [isMobile,setIsMobile]=useState(window.innerWidth < 1024)
  const [mobileNav,setMobileNav]=useState(false)

  React.useEffect(()=>{
    const onResize=()=>{
      const m=window.innerWidth<1024
      setIsMobile(m)
      if(!m) setMobileNav(false)
    }
    window.addEventListener('resize',onResize)
    return ()=>window.removeEventListener('resize',onResize)
  },[])

  const showFull = isMobile ? true : !collapsed   // mobile drawer always shows full width

  return (
    <div style={{ height:'100vh',display:'flex',overflow:'hidden',background:'#F0F4F8',fontFamily:IF }}>
      <style>{G_CSS}</style>

      {/* ── Mobile overlay ── */}
      {isMobile && mobileNav && (
        <div onClick={()=>setMobileNav(false)}
          style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.52)',zIndex:299,backdropFilter:'blur(2px)' }}/>
      )}

      {/* ── Sidebar ── */}
      <div style={{
        width: isMobile ? 270 : (collapsed ? 68 : 256),
        flexShrink:0,
        background:`linear-gradient(180deg,${NK} 0%,${NV} 100%)`,
        display:'flex', flexDirection:'column',
        transition:'width .26s cubic-bezier(.4,0,.2,1), transform .28s cubic-bezier(.4,0,.2,1)',
        overflow:'hidden',
        boxShadow: isMobile && mobileNav ? '6px 0 32px rgba(0,0,0,.35)' : '4px 0 24px rgba(0,0,0,.16)',
        /* Mobile: fixed overlay drawer */
        position:  isMobile ? 'fixed'  : 'relative',
        top:       isMobile ? 0        : 'auto',
        left:      isMobile ? 0        : 'auto',
        bottom:    isMobile ? 0        : 'auto',
        height:    isMobile ? '100vh'  : 'auto',
        transform: isMobile ? (mobileNav ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        zIndex:    isMobile ? 300 : 'auto',
      }}>

        {/* Brand */}
        <div style={{ padding:'16px 14px 12px',borderBottom:'1px solid rgba(255,255,255,.09)',display:'flex',alignItems:'center',gap:10 }}>
          <img src="/SK_Logo.png" alt="SK" style={{ width:36,height:36,objectFit:'contain',flexShrink:0 }}/>
          {showFull && <div style={{ overflow:'hidden',flex:1 }}><p style={{ color:'white',fontSize:11,fontWeight:700,letterSpacing:'.5px',margin:0,whiteSpace:'nowrap',fontFamily:MF }}>BAKAKENG CENTRAL</p><p style={{ color:'rgba(255,255,255,.4)',fontSize:9,margin:0,textTransform:'uppercase' }}>SK Portal · Settings</p></div>}
          {isMobile ? (
            <button onClick={()=>setMobileNav(false)} style={{ background:'rgba(255,255,255,0.1)',border:'none',cursor:'pointer',color:'rgba(255,255,255,.8)',padding:6,display:'flex',borderRadius:8,flexShrink:0,marginLeft:'auto' }}>
              <XIcon size={18}/>
            </button>
          ) : (
            <button onClick={()=>setCollapsed(c=>!c)} style={{ background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.45)',padding:4,display:'flex',borderRadius:6,flexShrink:0,transition:'color .15s',marginLeft:collapsed?'auto':undefined }}
              onMouseEnter={e=>e.currentTarget.style.color='white'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.45)'}>
              {collapsed?<ChevronRight size={16}/>:<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><rect y="2" width="16" height="2" rx="1"/><rect y="7" width="16" height="2" rx="1"/><rect y="12" width="16" height="2" rx="1"/></svg>}
            </button>
          )}
        </div>

        {/* User chip */}
        {showFull&&<div style={{ padding:'12px 14px 10px',borderBottom:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:'50%',background:CR,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,fontWeight:700,flexShrink:0 }}>{(profile?.name||user?.email||'U')[0].toUpperCase()}</div>
          <div style={{ minWidth:0 }}>
            <p style={{ color:'white',fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0,fontFamily:IF }}>{profile?.name||'Resident'}</p>
            <p style={{ color:'rgba(255,255,255,.4)',fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0 }}>{user?.email}</p>
          </div>
        </div>}

        {/* Nav */}
        <nav style={{ flex:1,padding:'8px 8px',overflowY:'auto' }}>
          {showFull&&<p style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,.28)',textTransform:'uppercase',letterSpacing:'1.2px',padding:'6px 12px 10px',margin:0,fontFamily:IF }}>User Settings</p>}
          {NAV.map(({key,label,icon:Icon,sub})=>{
            const active=page===key
            return (
              <button key={key} onClick={()=>{setPage(key);if(isMobile)setMobileNav(false)}} title={collapsed?label:''}
                style={{ display:'flex',alignItems:'center',gap:11,width:'100%',padding:showFull?'10px 12px':'11px 0',justifyContent:showFull?'flex-start':'center',borderRadius:10,border:active?'1px solid rgba(255,255,255,.16)':'1px solid transparent',cursor:'pointer',background:active?'rgba(255,255,255,.15)':'transparent',color:active?'white':'rgba(255,255,255,.52)',fontSize:13,fontWeight:active?700:400,marginBottom:2,transition:'all .18s',fontFamily:IF,boxShadow:active?'0 2px 10px rgba(0,0,0,.16)':'none' }}
                onMouseEnter={e=>{if(!active){e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.color='white'}}}
                onMouseLeave={e=>{if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,.52)'}}}>
                <div style={{ width:28,height:28,borderRadius:7,background:active?'rgba(255,255,255,.18)':'rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <Icon size={14}/>
                </div>
                {showFull&&<div style={{ flex:1,minWidth:0,textAlign:'left' }}>
                  <p style={{ margin:0,fontFamily:IF,fontSize:13,fontWeight:active?700:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{label}</p>
                  <p style={{ margin:0,fontSize:9,opacity:.55,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontFamily:IF }}>{sub}</p>
                </div>}
                {active&&showFull&&<span style={{ width:6,height:6,borderRadius:'50%',background:'white',opacity:.8,flexShrink:0 }}/>}
              </button>
            )
          })}
          <div style={{ height:1,background:'rgba(255,255,255,.08)',margin:'10px 0' }}/>
          <button onClick={()=>navigate('/dashboard')} title={collapsed?'Portal':''} style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:showFull?'9px 12px':'10px 0',justifyContent:showFull?'flex-start':'center',borderRadius:9,border:'none',cursor:'pointer',background:'none',color:'rgba(255,255,255,.36)',fontSize:12,fontFamily:IF,transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.color='white'}} onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='rgba(255,255,255,.36)'}}>
            <LayoutDashboard size={14} style={{ flexShrink:0 }}/>{showFull&&'Back to Portal'}
          </button>
        </nav>

        {/* Sign out */}
        <div style={{ padding:'10px 8px',borderTop:'1px solid rgba(255,255,255,.08)' }}>
          <button onClick={async()=>{await signOut();navigate('/login')}} title={collapsed?'Sign Out':''} style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:showFull?'9px 12px':'10px 0',justifyContent:showFull?'flex-start':'center',borderRadius:9,border:'none',background:'none',cursor:'pointer',color:'#FC8181',fontSize:13,fontFamily:IF,transition:'all .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.07)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <LogOut size={15} style={{ flexShrink:0 }}/>{showFull&&'Sign Out'}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0 }}>
        {/* Topbar */}
        <div style={{ height:54,background:'white',borderBottom:'1px solid #E8ECF4',display:'flex',alignItems:'center',justifyContent:'space-between',padding: isMobile ? '0 14px' : '0 28px',flexShrink:0,boxShadow:'0 1px 6px rgba(0,0,0,.05)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <button onClick={()=>{ if(isMobile) setMobileNav(o=>!o); else setCollapsed(c=>!c) }}
                style={{ background:'none',border:'none',cursor:'pointer',color:NV,display:'flex',alignItems:'center',justifyContent:'center',padding:6,borderRadius:8,transition:'background .15s',flexShrink:0 }}
                onMouseEnter={e=>e.currentTarget.style.background='#F0F4F8'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <Menu size={22} strokeWidth={2}/>
              </button>
            <div>
              <p style={{ fontSize:15,fontWeight:700,color:NV,margin:0,fontFamily:MF }}>{NAV.find(n=>n.key===page)?.label||'Settings'}</p>
              {!isMobile && <p style={{ fontSize:11,color:'#718096',margin:0,fontFamily:IF }}>User Settings · Barangay Bakakeng Central SK Portal</p>}
            </div>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:33,height:33,borderRadius:'50%',background:CR,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:12,fontWeight:700 }}>
              {(profile?.name||user?.email||'U')[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page */}
        <div style={{ flex:1,overflowY:'auto',padding: isMobile ? '14px 14px 24px' : '28px 32px' }}>
          <div style={{ maxWidth: isMobile ? '100%' : 900,margin:'0 auto' }}>
            {page==='profile'       &&<ProfileSection       isMobile={isMobile} user={user} profile={profile} toast={toast} logAudit={logAudit} refreshProfile={refreshProfile}/>}
            {page==='account'       &&<AccountSection       isMobile={isMobile} user={user} profile={profile} toast={toast} logAudit={logAudit}/>}
            {page==='security'      &&<SecuritySection      isMobile={isMobile} user={user} logAudit={logAudit} toast={toast}/>}
            {page==='notifications' &&<NotificationsSection isMobile={isMobile} user={user} profile={profile}/>}
            {page==='privacy'       &&<PrivacySection       isMobile={isMobile} user={user} profile={profile} logAudit={logAudit} toast={toast}/>}
            {page==='activity'      &&<ActivitySection      isMobile={isMobile} user={user}/>}
          </div>
        </div>
      </div>
    </div>
  )
}
