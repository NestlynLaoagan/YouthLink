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
  const isSuperAdmin = role === 'super_admin'

  /* ── Stats ── */
  const [stats, setStats] = useState({ events:0, projects:0, announcements:0, members:0 })

  /* ── Home Page Customization ── */
  const [heroTitle,    setHeroTitle]    = useState(settings.heroTitle    || 'WELCOME TO BARANGAY')
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle || 'BAKAKENG CENTRAL')
  const [heroTagline,  setHeroTagline]  = useState(settings.heroTagline  || 'Stay connected, informed, and engaged with your community. Explore projects, events, and services all in one place.')
  const [btn1Label,    setBtn1Label]    = useState(settings.btn1Label    || 'View Events')
  const [btn2Label,    setBtn2Label]    = useState(settings.btn2Label    || 'Explore Projects')
  const [heroImage,    setHeroImage]    = useState(settings.heroImage    || '/Hero.png')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const heroImgRef = React.useRef()

  useEffect(() => { loadStats() }, [])

  /* sync if settings change externally */
  useEffect(() => {
    setHeroTitle(settings.heroTitle       || 'WELCOME TO BARANGAY')
    setHeroSubtitle(settings.heroSubtitle || 'BAKAKENG CENTRAL')
    setHeroTagline(settings.heroTagline   || 'Stay connected, informed, and engaged with your community. Explore projects, events, and services all in one place.')
    setBtn1Label(settings.btn1Label       || 'View Events')
    setBtn2Label(settings.btn2Label       || 'Explore Projects')
    setHeroImage(settings.heroImage       || '/Hero.png')
  }, [settings])

  const loadStats = async () => {
    const [ann, ev, pr, us] = await Promise.all([
      supabase.from('announcements').select('id', { count:'exact', head:true }),
      supabase.from('events').select('id',        { count:'exact', head:true }),
      supabase.from('projects').select('id',      { count:'exact', head:true }).eq('status','completed'),
      supabase.from('user_roles').select('id',    { count:'exact', head:true }),
    ])
    setStats({
      announcements: ann.count || 0,
      events:        ev.count  || 0,
      projects:      pr.count  || 0,
      members:       us.count  || 0,
    })
  }

  const handleHeroImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target.result
      setHeroImage(dataUrl)
      updateSettings({ heroImage: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const saveCustomization = async () => {
    setSaving(true)
    updateSettings({ heroTitle, heroSubtitle, heroTagline, btn1Label, btn2Label, heroImage })
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }


  /* ── Quick link cards ── */
  const quickLinks = [
    { label:'Announcements', icon:'📢', path:'/admin/announcements', desc:'Post and manage announcements',  count: stats.announcements },
    { label:'Events',        icon:'📅', path:'/admin/events',        desc:'Schedule community events',       count: stats.events        },
    { label:'Projects',      icon:'🏗️', path:'/admin/projects',      desc:'Track SK projects',               count: stats.projects      },
    { label:'Members',       icon:'👥', path:'/admin/settings',      desc:'Manage registered members',       count: stats.members       },
  ]

  const cardStyle = {
    background: T.surface, borderRadius:13, padding:'20px 22px',
    border:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between',
    alignItems:'flex-start', boxShadow:'0 2px 8px rgba(0,0,0,.04)',
  }

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

  return (
    <div>
      <h1 style={{ fontSize:28, fontWeight:800, color:T.text, marginBottom:4, fontFamily:MF }}>Admin Dashboard</h1>
      <p style={{ fontSize:13, color:T.textMuted, marginBottom:24, fontFamily:IF }}>
        Welcome back · {new Date().toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
      </p>

      {/* ── Merged stat + quick-nav cards ── */}
      <div className="stat-grid" style={{ marginBottom:28 }}>
        {quickLinks.map(({ label, icon, path, desc, count }) => (
          <button key={label} onClick={() => navigate(path)}
            style={{
              background: T.surface, borderRadius:13, padding:'18px 20px',
              border:`1px solid ${T.border}`, cursor:'pointer', textAlign:'left',
              transition:'all .18s', display:'flex', flexDirection:'column', gap:0,
              boxShadow:'0 2px 8px rgba(0,0,0,.04)', position:'relative', overflow:'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor=T.navy
              e.currentTarget.style.transform='translateY(-2px)'
              e.currentTarget.style.boxShadow=`0 6px 20px rgba(0,0,0,.1)`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor=T.border
              e.currentTarget.style.transform='translateY(0)'
              e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)'
            }}>
            {/* Top row: label + icon */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <p style={{ fontSize:12, color:T.textMuted, fontWeight:500, fontFamily:IF, margin:0 }}>{label}</p>
              <span style={{ fontSize:22 }}>{icon}</span>
            </div>
            {/* Count */}
            <p style={{ fontSize:34, fontWeight:800, color:T.navy, fontFamily:MF, margin:'0 0 10px', lineHeight:1 }}>{count}</p>
            {/* Bottom row: description + chevron */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:10, borderTop:`1px solid ${T.border}` }}>
              <p style={{ fontSize:11, color:T.textMuted, margin:0, fontFamily:IF, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, marginRight:8 }}>{desc}</p>
              <ChevronRight size={13} style={{ color:T.textMuted, flexShrink:0 }}/>
            </div>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════
          HOME PAGE CUSTOMIZATION
      ════════════════════════════════ */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:T.navy, margin:'0 0 2px', fontFamily:MF }}>🏠 Home Page Customization</h2>
          <p style={{ fontSize:12, color:T.textMuted, margin:0, fontFamily:IF }}>Changes apply instantly to the resident-facing portal.</p>
        </div>
      </div>


      {/* Hero section */}
      <Section icon="✍️" title="Hero Section Text">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16 }}>
          <Field label="Main Title (Line 1)" hint="e.g. WELCOME TO BARANGAY">
            <input className="input-field" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} style={{ fontSize:13 }} placeholder="WELCOME TO BARANGAY"/>
          </Field>
          <Field label="Main Title (Line 2 — accent color)" hint="e.g. BAKAKENG CENTRAL">
            <input className="input-field" value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} style={{ fontSize:13 }} placeholder="BAKAKENG CENTRAL"/>
          </Field>
        </div>
        <Field label="Tagline / Subtitle" hint="Short description shown below the main title.">
          <textarea className="input-field" rows={2} value={heroTagline} onChange={e => setHeroTagline(e.target.value)} style={{ resize:'vertical', fontSize:13 }} placeholder="Stay connected, informed, and engaged with your community."/>
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16 }}>
          <Field label="Primary Button Label">
            <input className="input-field" value={btn1Label} onChange={e => setBtn1Label(e.target.value)} style={{ fontSize:13 }} placeholder="View Events"/>
          </Field>
          <Field label="Secondary Button Label">
            <input className="input-field" value={btn2Label} onChange={e => setBtn2Label(e.target.value)} style={{ fontSize:13 }} placeholder="Explore Projects"/>
          </Field>
        </div>

        {/* Hero Image Upload */}
        <Field label="Hero Image (right side of banner)" hint="Upload a photo to replace the default barangay hall image.">
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:140, height:90, borderRadius:10, overflow:'hidden', border:`2px dashed ${T.border}`, background:T.bg, flexShrink:0 }}>
              <img src={heroImage || '/Hero.png'} alt="Hero preview"
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                onError={e => { e.target.src = '/Hero.png' }}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={() => heroImgRef.current?.click()}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:T.navy, color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:IF }}>
                📷 Upload New Photo
              </button>
              {heroImage && heroImage !== '/Hero.png' && (
                <button onClick={() => { setHeroImage('/Hero.png'); updateSettings({ heroImage: '/Hero.png' }) }}
                  style={{ fontSize:11, color:T.textMuted, background:'none', border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 12px', cursor:'pointer', fontFamily:IF }}>
                  ↩ Reset to default
                </button>
              )}
              <p style={{ fontSize:10, color:T.textMuted, margin:0, fontFamily:IF }}>JPG, PNG or WEBP. Recommended: 880×600px.</p>
            </div>
          </div>
          <input ref={heroImgRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleHeroImageUpload}/>
        </Field>

        {/* Live preview */}
        <div style={{ marginTop:8, padding:'18px 22px', borderRadius:12, background:`linear-gradient(135deg,${T.navy}08,${T.gold}08)`, border:`1px dashed ${T.border}` }}>
          <p style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.5px', margin:'0 0 10px', fontFamily:IF }}>Preview</p>
          <p style={{ fontSize:11, fontWeight:700, color:T.textMuted, margin:'0 0 2px', fontFamily:IF }}>OFFICIAL PORTAL</p>
          <p style={{ fontSize:16, fontWeight:800, color:T.text, margin:'0 0 2px', fontFamily:MF }}>{heroTitle || 'WELCOME TO BARANGAY'}</p>
          <p style={{ fontSize:16, fontWeight:800, color:T.gold, margin:'0 0 8px', fontFamily:MF }}>{heroSubtitle || 'BAKAKENG CENTRAL'}</p>
          <p style={{ fontSize:11, color:T.textMuted, margin:'0 0 12px', fontFamily:IF, lineHeight:1.6 }}>{heroTagline}</p>
          <div style={{ display:'flex', gap:8 }}>
            <span style={{ padding:'6px 14px', borderRadius:7, background:T.crimson||'#C53030', color:'white', fontSize:11, fontWeight:700, fontFamily:IF }}>{btn1Label || 'View Events'}</span>
            <span style={{ padding:'6px 14px', borderRadius:7, border:`1.5px solid ${T.border}`, fontSize:11, fontWeight:700, fontFamily:IF, color:T.text }}>{btn2Label || 'Explore Projects'}</span>
          </div>
        </div>

        {/* Save button + Preview Site */}
        <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <button onClick={saveCustomization} disabled={saving}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:9, background: saving ? '#9CA3AF' : T.navy, color:'white', border:'none', cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:700, fontFamily:IF, transition:'background .15s' }}>
            {saving
              ? <><RefreshCw size={13} style={{ animation:'spin .8s linear infinite' }}/> Saving…</>
              : <><Save size={13}/> Save Changes</>}
          </button>
          <button onClick={() => window.open('/dashboard','_blank')}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:`1px solid ${T.border}`, background:T.surface, cursor:'pointer', fontSize:13, color:T.navy, fontWeight:600, fontFamily:IF }}>
            <Eye size={13}/> Preview Site
          </button>
          {saved && (
            <span style={{ fontSize:12, color:'#38A169', fontWeight:600, fontFamily:IF, display:'flex', alignItems:'center', gap:5 }}>
              ✅ Changes saved and live on portal!
            </span>
          )}
        </div>
      </Section>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
