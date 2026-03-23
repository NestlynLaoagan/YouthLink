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

/* ─── Design tokens ─── */
const NK='#0F2444', NV='#1A365D', NL='#2A4A7F'
const CR='#C53030', GD='#D69E2E', GR='#38A169', PU='#6B46C1', AM='#D97706'
const MF="'Montserrat','Inter',sans-serif", IF="'Inter',sans-serif"

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

const SESSIONS=[
  { id:1,device:'Chrome / Windows PC',type:'desktop',loc:'Bakakeng Central, Baguio',time:'Active now',current:true },
  { id:2,device:'Safari / iPhone 15', type:'mobile', loc:'Session Road, Baguio',    time:'2 hours ago',current:false },
  { id:3,device:'Firefox / Android',  type:'mobile', loc:'Bakakeng, Baguio City',   time:'Yesterday',  current:false },
]

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

  const PwF=({label,k,sk})=>{
    const [f,setF]=useState(false)
    return (
      <div>
        <label style={{ display:'block',fontSize:11,fontWeight:700,color:'#4A5568',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,fontFamily:IF }}>{label} *</label>
        <div style={{ position:'relative' }}>
          <input type={pw[sk]?'text':'password'} value={pw[k]} onChange={e=>setPw(p=>({...p,[k]:e.target.value}))} placeholder="••••••••"
            style={{ width:'100%',padding:'11px 40px 11px 13px',borderRadius:9,border:`1.5px solid ${f?NV:'#E2E8F0'}`,background:'#FAFBFC',fontSize:14,fontFamily:IF,color:'#2D3748',outline:'none',boxSizing:'border-box',transition:'border .15s, box-shadow .15s',boxShadow:f?`0 0 0 3px rgba(26,54,93,.09)`:'none' }}
            onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>
          <button type="button" onClick={()=>setPw(p=>({...p,[sk]:!p[sk]}))}
            style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#A0AEC0',padding:0,display:'flex' }}>
            {pw[sk]?<EyeOff size={14}/>:<Eye size={14}/>}
          </button>
        </div>
        {k==='new_'&&<StrBar val={pw.new_}/>}
        {k==='conf'&&pw.conf&&pw.conf!==pw.new_&&<p style={{ fontSize:11,color:CR,marginTop:3,fontFamily:IF }}>⚠ Do not match</p>}
      </div>
    )
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
            <PwF label="Current Password" k="cur" sk="showCur"/>
            <PwF label="New Password"     k="new_" sk="showNew"/>
            <PwF label="Confirm Password" k="conf" sk="showNew"/>
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
  const [sessions,setSess]=useState(SESSIONS)
  const [lcConfirm,setLC]=useState(false)
  const [loginHist,setLH]=useState([])
  const [lhLoad,setLHL]=useState(false)
  const [suspAlerts,setSuspAlerts]=useState(true)
  const [fb,setFb]=useState(null)
  const showFb=(t,m)=>{setFb({type:t,msg:m});setTimeout(()=>setFb(null),5000)}

  useEffect(()=>{
    supabase.auth.mfa.listFactors().then(({data})=>{const t=data?.totp?.find(f=>f.status==='verified');if(t){setMfa(true);setFid(t.id)}}).catch(()=>{})
    loadHistory()
  },[])

  const loadHistory=async()=>{
    setLHL(true)
    try{const{data}=await supabase.from('audit_logs').select('*').eq('user_id',user?.id).order('created_at',{ascending:false}).limit(15);if(data)setLH(data)}
    catch(_){}finally{setLHL(false)}
  }

  const startMFA=async()=>{setML(true);try{const{data,error}=await supabase.auth.mfa.enroll({factorType:'totp',issuer:'YouthLink Bakakeng'});if(error)throw error;setFid(data.id);setQR(data.totp.qr_code);setSec(data.totp.secret);setMfaS('enrolling')}catch(err){toast(err.message,'error')}finally{setML(false)}}
  const verifyMFA=async()=>{setML(true);try{const{data:c,error:ce}=await supabase.auth.mfa.challenge({factorId:fid});if(ce)throw ce;const{error:ve}=await supabase.auth.mfa.verify({factorId:fid,challengeId:c.id,code:mc});if(ve)throw ve;setMfa(true);setMfaS('idle');setQR(null);setSec(null);setMC('');await logAudit('Enable','Security','Enabled 2FA');showFb('success','2FA enabled! 🔒')}catch{toast('Invalid code. Try again.','error')}finally{setML(false)}}
  const disableMFA=async()=>{setML(true);try{const{error}=await supabase.auth.mfa.unenroll({factorId:fid});if(error)throw error;setMfa(false);setFid(null);setMfaS('idle');showFb('success','2FA disabled.')}catch(err){toast(err.message,'error')}finally{setML(false)}}

  return (
    <div style={{ animation:'slideUp .2s ease' }}>
      <CardTitle icon={Shield} title="Security" subtitle="2FA, sessions, login history and alerts" accent={CR}/>
      <Flash type={fb?.type} msg={fb?.msg} onClose={()=>setFb(null)}/>

      {/* 2FA */}
      <Card>
        <CardTitle icon={Shield} title="Two-Factor Authentication (2FA)" subtitle="Add an extra layer of security using an authenticator app" accent={GD}
          right={<RBadge ok={mfa} label={mfa?'Active':'Off'}/>}/>

        {mfaS==='idle'&&!mfa&&(<div><p style={{ fontSize:13,color:'#718096',lineHeight:1.7,marginBottom:14,fontFamily:IF }}>Install <strong>Google Authenticator</strong> or <strong>Authy</strong>, then click Enable below.</p><Btn onClick={startMFA} loading={ml}><Shield size={13}/> Enable 2FA</Btn></div>)}

        {mfaS==='enrolling'&&(
          <div style={{ background:'#F7FAFC',borderRadius:11,padding:18 }}>
            <div style={{ display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:18,marginBottom:16 }}>
              <div style={{ padding:8,background:'white',border:'2px solid #E2E8F0',borderRadius:11,flexShrink:0 }}>
                {qr&&<img src={qr} alt="2FA QR" style={{ width:120,height:120,display:'block' }}/>}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13,fontWeight:700,color:NV,margin:'0 0 8px',fontFamily:MF }}>Scan with your authenticator app</p>
                <ol style={{ fontSize:12,color:'#718096',lineHeight:2.2,paddingLeft:16,margin:'0 0 12px',fontFamily:IF }}>
                  <li>Open <strong>Google Authenticator</strong> or <strong>Authy</strong></li>
                  <li>Tap <strong>+</strong> → <strong>Scan QR Code</strong></li>
                  <li>Enter the 6-digit code below</li>
                </ol>
                <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                  <code style={{ fontSize:9,background:'white',border:'1px solid #E2E8F0',borderRadius:5,padding:'4px 8px',wordBreak:'break-all',flex:1,fontFamily:'monospace',color:'#2D3748' }}>{sec}</code>
                  <button onClick={()=>{navigator.clipboard.writeText(sec);setCopy(true);setTimeout(()=>setCopy(false),2200)}}
                    style={{ padding:'4px 9px',borderRadius:6,border:'1px solid #E2E8F0',background:'white',cursor:'pointer',fontSize:10,color:copied?GR:'#718096',display:'flex',alignItems:'center',gap:3,flexShrink:0 }}>
                    <Copy size={9}/>{copied?'Copied!':'Copy'}
                  </button>
                </div>
              </div>
            </div>
            <label style={{ display:'block',fontSize:11,fontWeight:700,color:'#4A5568',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:7,fontFamily:IF }}>6-Digit Code from App *</label>
            <div style={{ display:'flex',gap:10 }}>
              <input type="text" inputMode="numeric" maxLength={6} value={mc} onChange={e=>setMC(e.target.value.replace(/\D/g,''))} onKeyDown={e=>e.key==='Enter'&&verifyMFA()} placeholder="000000"
                style={{ width:130,padding:'11px',borderRadius:9,border:'2px solid #E2E8F0',fontSize:22,fontWeight:700,letterSpacing:'6px',textAlign:'center',fontFamily:'monospace',outline:'none' }}
                onFocus={e=>e.target.style.borderColor=NV} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              <Btn onClick={verifyMFA} disabled={mc.length!==6} loading={ml}>Activate 2FA</Btn>
              <Btn variant="ghost" onClick={()=>{setMfaS('idle');setQR(null);setSec(null);setMC('')}}><X size={13}/> Cancel</Btn>
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
        <CardTitle icon={Monitor} title="Active Sessions" subtitle="Devices currently signed in to your account" accent={NV}/>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
          {sessions.map(s=>{
            const Ic=s.type==='mobile'?Smartphone:Monitor
            return (
              <div key={s.id} style={{ display:'flex',alignItems: isMobile ? 'flex-start' : 'center',gap:10,padding:'12px 14px',borderRadius:11,background:s.current?'#EBF8FF':'#F7FAFC',border:`1px solid ${s.current?'#BEE3F8':'#E2E8F0'}`,transition:'all .15s',flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <Ic size={17} style={{ color:s.current?NV:'#718096',flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <span style={{ fontSize:13,fontWeight:s.current?700:500,color:s.current?NV:'#2D3748',fontFamily:IF }}>{s.device}</span>
                    {s.current&&<span style={{ fontSize:9,background:'#C6F6D5',color:'#276749',padding:'1px 8px',borderRadius:10,fontWeight:700 }}>Current</span>}
                  </div>
                  <span style={{ fontSize:11,color:'#718096',fontFamily:IF }}>{s.loc} · {s.time}</span>
                </div>
                {!s.current&&<button onClick={()=>setSess(p=>p.filter(x=>x.id!==s.id))}
                  style={{ padding:'5px 12px',borderRadius:7,border:'1px solid #FC8181',background:'white',color:CR,cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:IF }}>Remove</button>}
              </div>
            )
          })}
        </div>
        {lcConfirm?(
          <div style={{ padding:'12px 16px',background:'#FFF5F5',borderRadius:10,border:'1px solid #FC8181' }}>
            <p style={{ fontSize:13,color:CR,marginBottom:10,fontWeight:600,fontFamily:IF }}>Sign out of all other devices?</p>
            <div style={{ display:'flex',gap:9 }}>
              <Btn variant="ghost" size="sm" onClick={()=>setLC(false)}>Cancel</Btn>
              <Btn variant="danger" size="sm" onClick={()=>{setSess(p=>p.filter(s=>s.current));logAudit('Edit','Security','Logged out all devices');showFb('success','Signed out of all other devices.');setLC(false)}}>Confirm</Btn>
            </div>
          </div>
        ):<Btn variant="danger" size="sm" onClick={()=>setLC(true)}><LogOut size={13}/> Logout All Other Devices</Btn>}
      </Card>

      {/* Login History */}
      <Card>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <CardTitle icon={Clock} title="Login History" subtitle="Recent account activity" accent={NV}/>
          <button onClick={loadHistory} style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:7,border:'1px solid #E2E8F0',background:'white',cursor:'pointer',fontSize:11,color:'#718096',fontFamily:IF }}><RefreshCw size={11}/> Refresh</button>
        </div>
        {lhLoad?<p style={{ fontSize:12,color:'#A0AEC0',fontFamily:IF }}>Loading…</p>:loginHist.length===0?<p style={{ fontSize:12,color:'#A0AEC0',fontFamily:IF }}>No history found.</p>:(
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {loginHist.slice(0,10).map((l,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'center',gap:12,padding:'9px 12px',background:'#F7FAFC',borderRadius:9,border:'1px solid #E8ECF4' }}>
                <Activity size={13} style={{ color:'#718096',flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:12,fontWeight:600,color:'#2D3748',fontFamily:IF }}>{l.action} — {l.module}</span>
                  {l.description&&<span style={{ fontSize:11,color:'#718096',fontFamily:IF }}> · {l.description}</span>}
                </div>
                <span style={{ fontSize:10,color:'#A0AEC0',fontFamily:IF,whiteSpace:'nowrap' }}>
                  {l.created_at?new Date(l.created_at).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════
   4. NOTIFICATIONS
══════════════════════════════════════ */
function NotificationsSection({ isMobile=false }) {
  const [channels,setChannels]=useState({ email:true, sms:false, inApp:true })
  const [cats,setCats]=useState({ events:true, announcements:true, reminders:true, feedback:false, projects:true })
  const [eventReminders,setER]=useState(true)
  const [fb,setFb]=useState(null)
  const NRow=({icon,color,label,sub,k,store,setStore})=>(
    <RowItem icon={icon} color={color} title={label} sub={sub} right={<Toggle on={store[k]} onChange={v=>setStore(s=>({...s,[k]:v}))} color={color||NV}/>}/>
  )
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
        <NRow icon={Calendar}      color={GD} label="Event Reminders"       sub="Get reminded about upcoming events"       k="events"        store={cats} setCats={cats=>setCats(cats)}/>
        <RowItem icon={Calendar} color={GD} title="Event Reminders" sub="Get reminded about upcoming SK events and activities" right={<Toggle on={eventReminders} onChange={setER} color={GD}/>}/>
        <NRow icon={MessageSquare} color={NV} label="Announcements"        sub="Barangay and SK news and notices"         k="announcements" store={cats} setStore={setCats}/>
        <NRow icon={Clock}         color={AM} label="Reminders"            sub="Deadlines, meetings and schedules"        k="reminders"     store={cats} setStore={setCats}/>
        <NRow icon={Star}          color={GR} label="Feedback Responses"   sub="When your feedback receives a response"   k="feedback"      store={cats} setStore={setCats}/>
        <NRow icon={Activity}      color={PU} label="Project Updates"      sub="Progress and completion of SK projects"   k="projects"      store={cats} setStore={setCats}/>
      </Card>
      <div style={{ display:'flex',gap:10 }}>
        <Btn onClick={()=>{setFb({type:'success',msg:'Notification preferences saved!'});setTimeout(()=>setFb(null),4000)}}><Save size={13}/> Save Preferences</Btn>
        <Btn variant="ghost"><X size={13}/> Cancel</Btn>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   5. PRIVACY & DATA
══════════════════════════════════════ */
function PrivacySection({ user, profile, logAudit, toast, isMobile=false }) {
  const [vis,setVis]=useState('public')
  const [data,setData]=useState({ analytics:true, thirdParty:false, location:false, marketing:false })
  const [consent,setConsent]=useState(false)
  const [delConfirm,setDel]=useState(false)
  const [delInput,setDelInput]=useState('')
  const [fb,setFb]=useState(null)
  const showFb=(t,m)=>{setFb({type:t,msg:m});setTimeout(()=>setFb(null),5000)}

  const downloadData=async()=>{
    const d={profile,email:user?.email,exported_at:new Date().toISOString()}
    const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'})
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`my-data-${new Date().toISOString().split('T')[0]}.json`;a.click()
    await logAudit('Export','Privacy','Downloaded personal data')
    toast('Data downloaded!','success')
  }

  return (
    <div style={{ animation:'slideUp .2s ease' }}>
      <CardTitle icon={Eye} title="Privacy & Data" subtitle="Control your data, visibility, and consent" accent={GR}/>
      <Flash type={fb?.type} msg={fb?.msg} onClose={()=>setFb(null)}/>

      <Card>
        <p style={{ fontSize:12,fontWeight:700,color:'#718096',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 14px',fontFamily:IF }}>Profile Visibility</p>
        <div style={{ display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:12,marginBottom:8 }}>
          {[{v:'public',icon:'🌐',l:'Public',s:'Anyone in the portal can view your profile'},{v:'private',icon:'🔒',l:'Private',s:'Only you and admins can see your profile'}].map(({v,icon,l,s})=>(
            <button key={v} onClick={()=>setVis(v)}
              style={{ padding:'16px',borderRadius:11,border:`2px solid ${vis===v?NV:'#E2E8F0'}`,background:vis===v?`${NV}08`:'white',cursor:'pointer',textAlign:'left',transition:'all .18s' }}>
              <p style={{ fontSize:20,margin:'0 0 6px' }}>{icon}</p>
              <p style={{ fontSize:13,fontWeight:700,color:vis===v?NV:'#4A5568',margin:'0 0 3px',fontFamily:MF }}>{l}</p>
              <p style={{ fontSize:11,color:'#718096',margin:0,fontFamily:IF }}>{s}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <p style={{ fontSize:12,fontWeight:700,color:'#718096',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 4px',fontFamily:IF }}>Data Sharing Preferences</p>
        {[
          {k:'analytics',l:'Usage Analytics',s:'Share anonymous usage data to improve the portal'},
          {k:'thirdParty',l:'Third-party Sharing',s:'Allow sharing with authorised partner services'},
          {k:'location', l:'Location Services',s:'Enable location-based features and notifications'},
          {k:'marketing',l:'Marketing Communications',s:'Receive promotional and awareness materials'},
        ].map(({k,l,s})=>(
          <RowItem key={k} icon={Globe} color={GR} title={l} sub={s} right={<Toggle on={data[k]} onChange={v=>setData(d=>({...d,[k]:v}))} color={GR}/>}/>
        ))}
      </Card>

      <Card>
        <p style={{ fontSize:12,fontWeight:700,color:'#718096',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 14px',fontFamily:IF }}>Data Usage Consent</p>
        <label style={{ display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer',padding:'12px 14px',borderRadius:10,background:consent?'#F0FFF4':'#F7FAFC',border:`1px solid ${consent?'#9AE6B4':'#E2E8F0'}`,transition:'all .15s' }}>
          <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}
            style={{ accentColor:NV,width:16,height:16,marginTop:2,flexShrink:0 }}/>
          <span style={{ fontSize:12,color:'#2D3748',lineHeight:1.7,fontFamily:IF }}>
            I agree to the <strong>Data Privacy Act of 2012</strong> compliance terms and the storage and processing of my personal information by Barangay Bakakeng Central for the purpose of community services and governance.
          </span>
        </label>
      </Card>

      <Card>
        <p style={{ fontSize:12,fontWeight:700,color:'#718096',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 14px',fontFamily:IF }}>My Data</p>
        <div style={{ display:'flex',gap:10,marginBottom:14 }}>
          <Btn onClick={downloadData} variant="ghost"><Download size={13}/> Download Personal Data (JSON)</Btn>
        </div>

        {!delConfirm?(
          <div style={{ padding:'14px 16px',background:'#FFF5F5',borderRadius:10,border:'1px solid #FC8181' }}>
            <p style={{ fontSize:13,fontWeight:700,color:CR,margin:'0 0 4px',fontFamily:MF }}>⛔ Request Account Deletion</p>
            <p style={{ fontSize:12,color:'#718096',margin:'0 0 12px',lineHeight:1.6,fontFamily:IF }}>Permanently deletes your account and all associated data. This cannot be undone.</p>
            <Btn variant="danger" size="sm" onClick={()=>setDel(true)}><Trash2 size={12}/> Request Deletion</Btn>
          </div>
        ):(
          <div style={{ padding:'16px',background:'#FFF5F5',borderRadius:10,border:'1px solid #FC8181' }}>
            <p style={{ fontSize:13,fontWeight:700,color:CR,margin:'0 0 4px',fontFamily:MF }}>This is permanent and cannot be undone.</p>
            <p style={{ fontSize:11,color:'#718096',margin:'0 0 12px',fontFamily:IF }}>Type <strong>DELETE</strong> to confirm your deletion request:</p>
            <input type="text" value={delInput} onChange={e=>setDelInput(e.target.value)} placeholder="Type DELETE"
              style={{ width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #FC8181',background:'white',fontSize:13,fontFamily:'monospace',outline:'none',marginBottom:12,boxSizing:'border-box' }}/>
            <div style={{ display:'flex',gap:9 }}>
              <Btn variant="ghost" size="sm" onClick={()=>{setDel(false);setDelInput('')}}>Cancel</Btn>
              <Btn variant="danger" size="sm" disabled={delInput!=='DELETE'} onClick={async()=>{await supabase.from('profiles').update({deletion_requested:true}).eq('user_id',user.id);await logAudit('Request','Account','Requested account deletion');showFb('success','Deletion request submitted. Admin will review within 7 business days.');setDel(false);setDelInput('')}}>Submit Deletion Request</Btn>
            </div>
          </div>
        )}
      </Card>

      <div style={{ display:'flex',gap:10 }}>
        <Btn onClick={()=>showFb('success','Privacy settings saved.')}><Save size={13}/> Save Privacy Settings</Btn>
        <Btn variant="ghost"><X size={13}/> Cancel</Btn>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   6. ACTIVITY / HISTORY
══════════════════════════════════════ */
function ActivitySection({ user, isMobile=false }) {
  const [events,setEvents]=useState([])
  const [feedback,setFeedback]=useState([])
  const [logs,setLogs]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    const load=async()=>{
      setLoading(true)
      const[ev,fb,lg]=await Promise.all([
        supabase.from('events').select('id,title,start_date,status').order('start_date',{ascending:false}).limit(10),
        supabase.from('feedback').select('id,subject,rating,created_at').eq('user_id',user?.id).order('created_at',{ascending:false}).limit(10),
        supabase.from('audit_logs').select('*').eq('user_id',user?.id).order('created_at',{ascending:false}).limit(20),
      ])
      if(ev.data)setEvents(ev.data)
      if(fb.data)setFeedback(fb.data)
      if(lg.data)setLogs(lg.data)
      setLoading(false)
    }
    load()
  },[user])

  const downloadActivity=()=>{
    const d={events,feedback,audit_logs:logs,exported_at:new Date().toISOString()}
    const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'})
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`activity-${new Date().toISOString().split('T')[0]}.json`;a.click()
  }

  const StatusDot=({s})=>{const c={'Ongoing':'#38A169','Upcoming':'#3182CE','Finished':'#718096','Cancelled':CR}[s||'']||'#A0AEC0';return <span style={{ display:'inline-block',width:8,height:8,borderRadius:'50%',background:c,marginRight:6 }}/>}

  return (
    <div style={{ animation:'slideUp .2s ease' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
        <CardTitle icon={Activity} title="Activity & History" subtitle="Your registered events, feedback and participation" accent={GD}/>
        <Btn onClick={downloadActivity} variant="ghost" size="sm"><Download size={13}/> Export JSON</Btn>
      </div>

      {loading?<p style={{ fontSize:13,color:'#A0AEC0',fontFamily:IF }}>Loading activity…</p>:(
        <div style={{ display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:16 }}>
          <Card>
            <p style={{ fontSize:12,fontWeight:700,color:'#718096',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 14px',fontFamily:IF }}>📅 Events ({events.length})</p>
            {events.length===0?<p style={{ fontSize:12,color:'#A0AEC0',fontFamily:IF }}>No events yet.</p>:
              events.map(e=>(
                <div key={e.id} style={{ padding:'9px 0',borderBottom:'1px solid #F0F4F8',display:'flex',alignItems:'center',gap:8 }}>
                  <StatusDot s={e.status}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:600,color:'#2D3748',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:IF }}>{e.title}</p>
                    <p style={{ fontSize:10,color:'#A0AEC0',margin:0,fontFamily:IF }}>{e.start_date?new Date(e.start_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):e.status}</p>
                  </div>
                </div>
              ))}
          </Card>

          <Card>
            <p style={{ fontSize:12,fontWeight:700,color:'#718096',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 14px',fontFamily:IF }}>💬 Feedback Submitted ({feedback.length})</p>
            {feedback.length===0?<p style={{ fontSize:12,color:'#A0AEC0',fontFamily:IF }}>No feedback submitted yet.</p>:
              feedback.map(f=>(
                <div key={f.id} style={{ padding:'9px 0',borderBottom:'1px solid #F0F4F8' }}>
                  <p style={{ fontSize:13,fontWeight:600,color:'#2D3748',margin:'0 0 2px',fontFamily:IF }}>{f.subject||'General Feedback'}</p>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    {f.rating&&<span style={{ fontSize:11,color:GD,fontFamily:IF }}>{'⭐'.repeat(f.rating==='good'?5:f.rating==='average'?3:1)}</span>}
                    <span style={{ fontSize:10,color:'#A0AEC0',fontFamily:IF }}>{f.created_at?new Date(f.created_at).toLocaleDateString('en-PH'):''}</span>
                  </div>
                </div>
              ))}
          </Card>

          <Card style={{ gridColumn:'1/-1' }}>
            <p style={{ fontSize:12,fontWeight:700,color:'#718096',textTransform:'uppercase',letterSpacing:'.5px',margin:'0 0 14px',fontFamily:IF }}>🗂️ Recent Account Activity</p>
            {logs.length===0?<p style={{ fontSize:12,color:'#A0AEC0',fontFamily:IF }}>No activity recorded.</p>:
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {logs.slice(0,10).map((l,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:12,padding:'8px 12px',background:'#F7FAFC',borderRadius:9,border:'1px solid #E8ECF4' }}>
                    <Activity size={12} style={{ color:'#718096',flexShrink:0 }}/>
                    <span style={{ fontSize:12,fontWeight:600,color:'#2D3748',fontFamily:IF }}>{l.action} — {l.module}</span>
                    <span style={{ fontSize:10,color:'#A0AEC0',fontFamily:IF,marginLeft:'auto',whiteSpace:'nowrap' }}>
                      {l.created_at?new Date(l.created_at).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
                    </span>
                  </div>
                ))}
              </div>}
          </Card>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════
   MAIN — SIDEBAR + ROUTER
══════════════════════════════════════ */
const NAV=[
  { key:'profile',       label:'Profile',         icon:User,        sub:'Personal info & photo',      accent:NV  },
  { key:'account',       label:'Account Settings', icon:Lock,        sub:'Password, email, phone',     accent:NL  },
  { key:'security',      label:'Security',         icon:Shield,      sub:'2FA, sessions, history',     accent:CR  },
  { key:'notifications', label:'Notifications',    icon:Bell,        sub:'Email, SMS, in-app alerts',  accent:PU  },
  { key:'privacy',       label:'Privacy & Data',   icon:Eye,         sub:'Visibility & data rights',   accent:GR  },
  { key:'activity',      label:'Activity',         icon:Activity,    sub:'Events, feedback, history',  accent:GD  },
]

export default function UserSettings() {
  const { user, profile, signOut, logAudit, refreshProfile } = useAuth()
  const { toast } = useToast()
  const navigate  = useNavigate()
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
            {page==='notifications' &&<NotificationsSection isMobile={isMobile}/>}
            {page==='privacy'       &&<PrivacySection       isMobile={isMobile} user={user} profile={profile} logAudit={logAudit} toast={toast}/>}
            {page==='activity'      &&<ActivitySection      isMobile={isMobile} user={user}/>}
          </div>
        </div>
      </div>
    </div>
  )
}
