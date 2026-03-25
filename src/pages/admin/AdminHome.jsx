import React, { useState, useEffect } from 'react'
import { RefreshCw, Save, Eye, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useAdminTheme } from '../../contexts/AdminThemeContext'
import { useSiteSettings } from '../../contexts/SiteSettingsContext'
import { useNavigate } from 'react-router-dom'

const MF = "'Montserrat','Inter',sans-serif"
const IF = "'Inter',sans-serif"

export default function AdminHome() {
  const { T } = useAdminTheme()
  const { role } = useAuth()
  const { settings, updateSettings } = useSiteSettings()
  const navigate = useNavigate()

  const [stats, setStats] = useState({ events:0, projects:0, announcements:0, members:0 })

  const [portalLabel,  setPortalLabel]  = useState(settings.portalLabel  || 'SANGGUNIANG KABATAAN — BAKAKENG CENTRAL')
  const [heroTitle,    setHeroTitle]    = useState(settings.heroTitle    || 'WELCOME TO THE SK PORTAL OF')
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle || 'BARANGAY BAKAKENG CENTRAL!')
  const [bgImage,      setBgImage]      = useState(settings.heroImage    || '/Hero.png')
  const [fbUrl,        setFbUrl]        = useState(settings.fbUrl        || 'https://facebook.com/SK.BakakengCentral')
  const [fbHandle,     setFbHandle]     = useState(settings.fbHandle     || '/SK.BakakengCentral')
  const [gmailAddress, setGmailAddress] = useState(settings.gmailAddress || 'skbakakengcentral@gmail.com')
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#1A365D')
  const [accentColor,  setAccentColor]  = useState(settings.accentColor  || '#D69E2E')

  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const bgImgRef = React.useRef()

  useEffect(() => { loadStats() }, [])

  useEffect(() => {
    setPortalLabel(settings.portalLabel  || 'SANGGUNIANG KABATAAN — BAKAKENG CENTRAL')
    setHeroTitle(settings.heroTitle      || 'WELCOME TO THE SK PORTAL OF')
    setHeroSubtitle(settings.heroSubtitle|| 'BARANGAY BAKAKENG CENTRAL!')
    setBgImage(settings.heroImage        || '/Hero.png')
    setFbUrl(settings.fbUrl              || 'https://facebook.com/SK.BakakengCentral')
    setFbHandle(settings.fbHandle        || '/SK.BakakengCentral')
    setGmailAddress(settings.gmailAddress|| 'skbakakengcentral@gmail.com')
    setPrimaryColor(settings.primaryColor|| '#1A365D')
    setAccentColor(settings.accentColor  || '#D69E2E')
  }, [settings])

  const loadStats = async () => {
    const [ann, ev, pr, us] = await Promise.all([
      supabase.from('announcements').select('id', { count:'exact', head:true }),
      supabase.from('events').select('id',        { count:'exact', head:true }),
      supabase.from('projects').select('id',      { count:'exact', head:true }).eq('status','completed'),
      supabase.from('user_roles').select('id',    { count:'exact', head:true }),
    ])
    setStats({ announcements: ann.count||0, events: ev.count||0, projects: pr.count||0, members: us.count||0 })
  }

  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target.result
      setBgImage(dataUrl)
      updateSettings({ heroImage: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const saveCustomization = async () => {
    setSaving(true)
    updateSettings({ portalLabel, heroTitle, heroSubtitle, heroImage: bgImage, fbUrl, fbHandle, gmailAddress, primaryColor, accentColor })
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const quickLinks = [
    { label:'Announcements', icon:'📢', path:'/admin/announcements', desc:'Post and manage announcements', count: stats.announcements },
    { label:'Events',        icon:'📅', path:'/admin/events',        desc:'Schedule community events',     count: stats.events        },
    { label:'Projects',      icon:'🏗️', path:'/admin/projects',      desc:'Track SK projects',             count: stats.projects      },
    { label:'Members',       icon:'👥', path:'/admin/settings',      desc:'Manage registered members',     count: stats.members       },
  ]

  const Section = ({ icon, title, children }) => (
    <div style={{ background:T.surface, borderRadius:14, border:`1px solid ${T.border}`, marginBottom:20, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
      <div style={{ padding:'15px 22px', borderBottom:`1px solid ${T.border}`, background:T.bg, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <h2 style={{ fontSize:15, fontWeight:700, color:T.text, margin:0, fontFamily:MF }}>{title}</h2>
      </div>
      <div style={{ padding:'20px 22px' }}>{children}</div>
    </div>
  )

  const Field = ({ label, hint, children }) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#4A5568', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5, fontFamily:IF }}>{label}</label>
      {hint && <p style={{ fontSize:11, color:T.textMuted, margin:'0 0 6px', fontFamily:IF }}>{hint}</p>}
      {children}
    </div>
  )

  const Preview = () => (
    <div style={{
      borderRadius:14, overflow:'hidden', position:'relative',
      backgroundImage:`url('${bgImage}')`,
      backgroundSize:'cover', backgroundPosition:'center',
      border:'1px solid rgba(255,255,255,.1)', minHeight:230,
    }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg,rgba(7,19,42,.93) 0%,rgba(7,19,42,.85) 100%)', backgroundImage:'linear-gradient(rgba(212,175,55,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,.03) 1px,transparent 1px)', backgroundSize:'40px 40px' }}/>
      <div style={{ position:'relative', zIndex:2, display:'flex', gap:0, padding:'14px 14px 0' }}>
        {/* Left */}
        <div style={{ flex:1, paddingRight:10, display:'flex', flexDirection:'column', gap:10 }}>
          <div>
            <p style={{ fontSize:8, fontWeight:600, color:`${accentColor}bb`, letterSpacing:'2px', textTransform:'uppercase', margin:'0 0 3px', fontFamily:'sans-serif' }}>{portalLabel}</p>
            <h1 style={{ fontSize:12, fontWeight:900, color:'white', margin:0, lineHeight:1.25, fontFamily:'sans-serif', textTransform:'uppercase' }}>
              {heroTitle} <span style={{ color:accentColor }}>{heroSubtitle}</span>
            </h1>
          </div>
          <div style={{ borderRadius:9, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', height:62, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:9, color:'rgba(255,255,255,.3)', fontFamily:'sans-serif' }}>✦ Accomplished Project Card</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {['Event A','Event B'].map(e => (
              <div key={e} style={{ borderRadius:7, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', padding:'7px 9px' }}>
                <span style={{ fontSize:8, color:'rgba(255,255,255,.4)', fontFamily:'sans-serif' }}>📅 {e}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right */}
        <div style={{ width:120, flexShrink:0, display:'flex', flexDirection:'column', gap:7 }}>
          <div style={{ background:'rgba(255,255,255,.04)', borderRadius:9, border:'1px solid rgba(255,255,255,.08)', overflow:'hidden' }}>
            <div style={{ padding:'6px 9px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:8, fontWeight:800, color:'white', fontFamily:'sans-serif' }}>Latest Announcements</span>
              <span style={{ fontSize:6, color:`${accentColor}aa`, fontFamily:'sans-serif' }}>SEE ALL →</span>
            </div>
            {['Advisory','General','Sports'].map((cat,i) => (
              <div key={i} style={{ padding:'5px 9px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                <span style={{ fontSize:7, padding:'1px 5px', borderRadius:8, background:'rgba(148,163,184,.15)', color:'#94A3B8', fontFamily:'sans-serif' }}>{cat}</span>
                <div style={{ height:4, background:'rgba(255,255,255,.07)', borderRadius:3, marginTop:3 }}/>
              </div>
            ))}
          </div>
          <div style={{ background:'rgba(255,255,255,.04)', borderRadius:9, border:'1px solid rgba(255,255,255,.08)', padding:'7px 9px' }}>
            <p style={{ fontSize:8, fontWeight:800, color:'white', margin:'0 0 5px', textTransform:'uppercase', letterSpacing:'1px', fontFamily:'sans-serif' }}>FOLLOW US</p>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 6px', borderRadius:6, background:'rgba(24,119,242,.12)', border:'1px solid rgba(24,119,242,.25)' }}>
                <div style={{ width:14,height:14,borderRadius:3,background:'#1877F2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:6, fontWeight:800, color:'white', margin:0, fontFamily:'sans-serif' }}>Facebook</p>
                  <p style={{ fontSize:5, color:'rgba(255,255,255,.4)', margin:0, fontFamily:'sans-serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fbHandle}</p>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 6px', borderRadius:6, background:'rgba(234,67,53,.1)', border:'1px solid rgba(234,67,53,.2)' }}>
                <div style={{ width:14,height:14,borderRadius:3,background:'linear-gradient(135deg,#EA4335,#FBBC04)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <svg width="7" height="5" viewBox="0 0 24 18" fill="white"><path d="M22 0H2C.9 0 0 .9 0 2v14c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2zm0 4l-10 6L2 4V2l10 6 10-6v2z"/></svg>
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:6, fontWeight:800, color:'white', margin:0, fontFamily:'sans-serif' }}>Gmail</p>
                  <p style={{ fontSize:5, color:'rgba(255,255,255,.4)', margin:0, fontFamily:'sans-serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{gmailAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Footer strip */}
      <div style={{ position:'relative', zIndex:2, background:primaryColor, padding:'7px 14px', textAlign:'center', marginTop:10 }}>
        <span style={{ fontSize:7, fontWeight:700, color:'white', letterSpacing:'1px', textTransform:'uppercase', fontFamily:'sans-serif' }}>BAKAKENG CENTRAL · © 2026 BARANGAY BAKAKENG CENTRAL. ALL RIGHTS RESERVED.</span>
      </div>
    </div>
  )

  return (
    <div>
      <h1 style={{ fontSize:28, fontWeight:800, color:T.text, marginBottom:4, fontFamily:MF }}>Admin Dashboard</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, fontFamily:IF }}>
        Welcome back · {new Date().toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
      </p>

      {/* ── Stat cards ── */}
      <div className="stat-grid" style={{ marginBottom:28 }}>
        {quickLinks.map(({ label, icon, path, desc, count }) => (
          <button key={label} onClick={() => navigate(path)}
            style={{ background:T.surface, borderRadius:13, padding:'18px 20px', border:`1px solid ${T.border}`, cursor:'pointer', textAlign:'left', transition:'all .18s', display:'flex', flexDirection:'column', gap:0, boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=T.navy; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <p style={{ fontSize:12, color:T.textMuted, fontWeight:500, fontFamily:IF, margin:0 }}>{label}</p>
              <span style={{ fontSize:22 }}>{icon}</span>
            </div>
            <p style={{ fontSize:34, fontWeight:800, color:T.navy, fontFamily:MF, margin:'0 0 10px', lineHeight:1 }}>{count}</p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:10, borderTop:`1px solid ${T.border}` }}>
              <p style={{ fontSize:11, color:T.textMuted, margin:0, fontFamily:IF, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, marginRight:8 }}>{desc}</p>
              <ChevronRight size={13} style={{ color:T.textMuted, flexShrink:0 }}/>
            </div>
          </button>
        ))}
      </div>

      {/* ════════ HOME PAGE CUSTOMIZATION ════════ */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:T.navy, margin:'0 0 2px', fontFamily:MF }}>🏠 Home Page Customization</h2>
          <p style={{ fontSize:12, color:T.textMuted, margin:0, fontFamily:IF }}>Changes apply instantly to the resident-facing portal.</p>
        </div>
      </div>

      {/* Live Preview */}
      <div style={{ marginBottom:20 }}>
        <p style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.5px', margin:'0 0 10px', fontFamily:IF }}>📱 Live Preview — Resident Home Page</p>
        <Preview />
      </div>

      {/* Section 1 — Header Text */}
      <Section icon="✍️" title="Header Text">
        <Field label="Portal Label" hint="Small label shown above the main headline (e.g. unit / barangay name).">
          <input className="input-field" value={portalLabel} onChange={e => setPortalLabel(e.target.value)} style={{ fontSize:13 }} placeholder="SANGGUNIANG KABATAAN — BAKAKENG CENTRAL"/>
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16 }}>
          <Field label="Main Title" hint="White text portion of the headline.">
            <input className="input-field" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} style={{ fontSize:13 }} placeholder="WELCOME TO THE SK PORTAL OF"/>
          </Field>
          <Field label="Accent Title" hint="Gold-colored continuation of the headline.">
            <input className="input-field" value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} style={{ fontSize:13 }} placeholder="BARANGAY BAKAKENG CENTRAL!"/>
          </Field>
        </div>
      </Section>

      {/* Section 2 — Background Image */}
      <Section icon="🖼️" title="Background Image">
        <Field label="Home Page Background" hint="Shown behind the dark overlay on the resident home page.">
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:160, height:100, borderRadius:10, overflow:'hidden', border:`2px dashed ${T.border}`, background:T.bg, flexShrink:0 }}>
              <img src={bgImage || '/Hero.png'} alt="Background preview"
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                onError={e => { e.target.src = '/Hero.png' }}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={() => bgImgRef.current?.click()}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:T.navy, color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:IF }}>
                📷 Upload New Photo
              </button>
              {bgImage && bgImage !== '/Hero.png' && (
                <button onClick={() => { setBgImage('/Hero.png'); updateSettings({ heroImage: '/Hero.png' }) }}
                  style={{ fontSize:11, color:T.textMuted, background:'none', border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 12px', cursor:'pointer', fontFamily:IF }}>
                  ↩ Reset to default
                </button>
              )}
              <p style={{ fontSize:10, color:T.textMuted, margin:0, fontFamily:IF }}>JPG, PNG or WEBP. Recommended: 1280×720px.</p>
            </div>
          </div>
          <input ref={bgImgRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleBgImageUpload}/>
        </Field>
      </Section>

      {/* Section 3 — Social Links */}
      <Section icon="🔗" title="Social & Contact Links">
        <p style={{ fontSize:12, color:T.textMuted, margin:'0 0 16px', fontFamily:IF }}>
          Shown in the <strong>Follow Us</strong> widget on the right side of the home page.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16 }}>
          <Field label="Facebook Page URL" hint="Full link for the Facebook button.">
            <input className="input-field" value={fbUrl} onChange={e => setFbUrl(e.target.value)} style={{ fontSize:13 }} placeholder="https://facebook.com/SK.BakakengCentral"/>
          </Field>
          <Field label="Facebook Handle / Display" hint="Short handle shown under the Facebook button.">
            <input className="input-field" value={fbHandle} onChange={e => setFbHandle(e.target.value)} style={{ fontSize:13 }} placeholder="/SK.BakakengCentral"/>
          </Field>
        </div>
        <Field label="Gmail Address" hint="Email address displayed on the Gmail contact button.">
          <input className="input-field" value={gmailAddress} onChange={e => setGmailAddress(e.target.value)} style={{ fontSize:13 }} placeholder="skbakakengcentral@gmail.com"/>
        </Field>
      </Section>

      {/* Section 4 — Brand Colors */}
      <Section icon="🎨" title="Brand Colors">
        <p style={{ fontSize:12, color:T.textMuted, margin:'0 0 16px', fontFamily:IF }}>
          These colors apply across the entire portal — sidebar, footer, buttons, and accent highlights.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20 }}>
          {[
            { label:'Primary Color', hint:'Sidebar, footer, buttons', val:primaryColor, set:setPrimaryColor, key:'primaryColor' },
            { label:'Accent Color',  hint:'Gold highlights & titles',  val:accentColor,  set:setAccentColor,  key:'accentColor'  },
          ].map(({ label, hint, val, set, key }) => (
            <Field key={key} label={label} hint={hint}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="color" value={val}
                  onChange={e => { set(e.target.value); updateSettings({ [key]: e.target.value }) }}
                  style={{ width:44, height:38, borderRadius:8, border:`1px solid ${T.border}`, cursor:'pointer', padding:2, background:T.surface }}/>
                <input className="input-field" value={val}
                  onChange={e => { set(e.target.value); updateSettings({ [key]: e.target.value }) }}
                  style={{ fontSize:13, fontFamily:'monospace', flex:1 }} placeholder="#1A365D"/>
              </div>
              <div style={{ marginTop:8, height:20, borderRadius:6, background:val }}/>
            </Field>
          ))}
        </div>
      </Section>

      {/* Save + Preview */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:32 }}>
        <button onClick={saveCustomization} disabled={saving}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 22px', borderRadius:9, background:saving?'#9CA3AF':T.navy, color:'white', border:'none', cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:700, fontFamily:IF, transition:'background .15s' }}>
          {saving ? <><RefreshCw size={13} style={{ animation:'spin .8s linear infinite' }}/> Saving…</> : <><Save size={13}/> Save Changes</>}
        </button>
        <button onClick={() => window.open('/dashboard','_blank')}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:9, border:`1px solid ${T.border}`, background:T.surface, cursor:'pointer', fontSize:13, color:T.navy, fontWeight:600, fontFamily:IF }}>
          <Eye size={13}/> Preview Site
        </button>
        {saved && (
          <span style={{ fontSize:12, color:'#38A169', fontWeight:600, fontFamily:IF, display:'flex', alignItems:'center', gap:5 }}>
            ✅ Changes saved and live on portal!
          </span>
        )}
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
