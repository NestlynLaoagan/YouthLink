import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAdminTheme } from '../contexts/AdminThemeContext'
import { ConfirmDialog } from './UI'
import {
  Home, FolderOpen, Calendar, MessageSquare,
  Shield, Archive, Settings, LogOut,
  Sun, Moon, ExternalLink, Bell, Megaphone, X, Menu
} from 'lucide-react'

const MF = "'Montserrat','Inter',sans-serif"
const IF = "'Inter',sans-serif"

const ALL_NAV = [
  { label:'Home',          icon:Home,          path:'/admin/dashboard',      viewRoles:['admin','super_admin'], crudRoles:['admin','super_admin'] },
  { label:'Announcements', icon:Megaphone,      path:'/admin/announcements',  viewRoles:['admin','super_admin'], crudRoles:['admin','super_admin'] },
  { label:'Projects',      icon:FolderOpen,     path:'/admin/projects',       viewRoles:['admin','super_admin'], crudRoles:['admin','super_admin'] },
  { label:'Events',        icon:Calendar,       path:'/admin/events',         viewRoles:['admin','super_admin'], crudRoles:['admin','super_admin'] },
  { label:'Feedback',      icon:MessageSquare,  path:'/admin/feedback',       viewRoles:['admin','super_admin'], crudRoles:['super_admin'] },
  { label:'Archives',      icon:Archive,        path:'/admin/archives',       viewRoles:['admin','super_admin'], crudRoles:['super_admin'] },
]

export default function AdminLayout({ children }) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { signOut, profile, user, role } = useAuth()
  const { T, dark, setDark, navbarVisible } = useAdminTheme()

  const [logout,     setLogout]  = React.useState(false)
  const [loggingOut, setLO]      = React.useState(false)
  const [mobileOpen, setMobile]  = React.useState(false)
  const [isMobile,   setIsMobile]= React.useState(window.innerWidth < 768)

  React.useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setMobile(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const doLogout = async () => {
    setLO(true)
    try { await signOut() } catch {}
    navigate('/login')
  }

  const sidebarBg = dark ? '#0A1628' : '#0F2444'
  const pillStyle = role === 'super_admin'
    ? { bg:'#FEF9E7', color:'#7B4800', label:'Super Admin' }
    : { bg:'rgba(255,255,255,0.18)', color:'white', label:'Admin' }

  const navItem = (path, Icon, label, canCrud) => {
    const active = location.pathname === path
    return (
      <button key={path} onClick={() => { navigate(path); if (isMobile) setMobile(false) }}
        style={{
          display:'flex', alignItems:'center', gap:10, width:'100%',
          padding:'10px 12px', borderRadius:8, border:'none',
          background: active ? '#C53030' : 'transparent',
          color: active ? 'white' : 'rgba(255,255,255,0.70)',
          fontSize:13, fontFamily:IF, textAlign:'left', marginBottom:2,
          fontWeight: active ? 700 : 400, cursor:'pointer', transition:'all .15s',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background='rgba(255,255,255,0.10)'; e.currentTarget.style.color='white' }}}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.70)' }}}>
        <Icon size={15} style={{ flexShrink:0 }}/>
        <span style={{ flex:1 }}>{label}</span>
        {!canCrud && (
          <span style={{ fontSize:8, background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.65)',
            padding:'1px 5px', borderRadius:10, fontFamily:IF, letterSpacing:'0.3px' }}>VIEW</span>
        )}
      </button>
    )
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding:'16px 14px 12px', borderBottom:'1px solid rgba(255,255,255,0.09)',
        display:'flex', alignItems:'center', justifyContent: isMobile ? 'space-between' : 'center',
        flexDirection: isMobile ? 'row' : 'column', textAlign: isMobile ? 'left' : 'center' }}>
        {isMobile ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <img src="/SK_Logo.png" alt="SK Logo" style={{ width:42, height:42, objectFit:'contain',
                filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}/>
              <div>
                <p style={{ color:'white', fontSize:11, fontWeight:700, lineHeight:1.4,
                  letterSpacing:'0.4px', fontFamily:MF, margin:0 }}>BARANGAY BAKAKENG</p>
                <div style={{ marginTop:4, display:'inline-block', padding:'2px 9px',
                  borderRadius:20, background:pillStyle.bg, fontSize:9, fontWeight:700,
                  color:pillStyle.color, fontFamily:IF }}>{pillStyle.label}</div>
              </div>
            </div>
            <button onClick={() => setMobile(false)}
              style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8,
                width:32, height:32, cursor:'pointer', color:'white', display:'flex',
                alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <X size={16}/>
            </button>
          </>
        ) : (
          <>
            <img src="/SK_Logo.png" alt="SK Logo" style={{ width:72, height:72, objectFit:'contain',
              margin:'0 auto 8px', display:'block', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}/>
            <p style={{ color:'white', fontSize:10, fontWeight:700, lineHeight:1.45,
              letterSpacing:'0.4px', fontFamily:MF }}>BARANGAY<br/>BAKAKENG<br/>CENTRAL</p>
            <div style={{ marginTop:6, display:'inline-block', padding:'2px 11px', borderRadius:20,
              background:pillStyle.bg, fontSize:10, fontWeight:700, color:pillStyle.color, fontFamily:IF }}>
              {pillStyle.label}
            </div>
          </>
        )}
      </div>

      {/* See Website */}
      <div style={{ padding:'9px 8px 0' }}>
        <button onClick={() => window.open('/dashboard','_blank')}
          style={{ display:'flex', alignItems:'center', gap:7, width:'100%', padding:'7px 10px',
            borderRadius:7, border:'1px solid rgba(214,158,46,0.4)', background:'rgba(214,158,46,0.10)',
            cursor:'pointer', fontSize:11, color:'#F6E05E', fontFamily:IF, fontWeight:600, transition:'all .15s' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(214,158,46,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(214,158,46,0.10)'}>
          <ExternalLink size={12}/><span>See Website</span>
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'8px 7px', overflowY:'auto' }}>
        {ALL_NAV.map(({ label, icon: Icon, path, viewRoles, crudRoles }) => {
          if (!viewRoles.includes(role)) return null
          return navItem(path, Icon, label, crudRoles.includes(role))
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:'8px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', marginBottom:4 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'#C53030', display:'flex',
            alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:700,
            flexShrink:0, fontFamily:IF }}>
            {(profile?.name||user?.email||'A')[0].toUpperCase()}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <p style={{ color:'white', fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis',
              whiteSpace:'nowrap', fontFamily:IF, margin:0 }}>{profile?.name||user?.email||'Admin'}</p>
            <p style={{ color:'rgba(255,255,255,0.40)', fontSize:9, textTransform:'capitalize',
              marginTop:1, fontFamily:IF }}>{pillStyle.label}</p>
          </div>
        </div>
        {[
          { icon: dark ? <Sun size={13}/> : <Moon size={13}/>, label: dark ? 'Light Mode' : 'Dark Mode', action: () => setDark(d => !d) },
          { icon: <Settings size={13}/>, label: 'Settings', action: () => navigate('/admin/settings') },
          { icon: <LogOut size={13}/>,   label: 'Log Out',  action: () => setLogout(true), red: true },
        ].map(({ icon, label, action, red }) => (
          <button key={label} onClick={action}
            style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 10px',
              borderRadius:7, border:'none', background:'transparent', cursor:'pointer', fontSize:12,
              color: red ? '#FC8181' : 'rgba(255,255,255,0.65)', fontFamily:IF, marginBottom:1, transition:'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            {icon}<span>{label}</span>
          </button>
        ))}
      </div>
    </>
  )

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:IF }}>

      {/* ── MOBILE OVERLAY ── */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobile(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.52)',
            zIndex:299, backdropFilter:'blur(2px)' }}/>
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{
        width:          isMobile ? 260 : 215,
        flexShrink:     0,
        background:     sidebarBg,
        display:        'flex',
        flexDirection:  'column',
        overflow:       'hidden',
        zIndex:         300,
        transition:     'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        /* Mobile: fixed drawer that slides in from left */
        position:       isMobile ? 'fixed'   : 'relative',
        top:            isMobile ? 0          : 'auto',
        left:           isMobile ? 0          : 'auto',
        bottom:         isMobile ? 0          : 'auto',
        height:         isMobile ? '100vh'    : 'auto',
        transform:      isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        boxShadow:      isMobile && mobileOpen ? '6px 0 32px rgba(0,0,0,0.35)' : 'none',
      }}>
        <SidebarContent/>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden',
        background:T.bg, transition:'background .25s' }}>

        {/* Topbar */}
        {navbarVisible && (
          <div style={{ height:54, background:T.surface, borderBottom:`1px solid ${T.border}`,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding: isMobile ? '0 14px' : '0 28px', flexShrink:0, transition:'background .25s' }}>

            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {/* Hamburger — mobile only */}
              {isMobile && (
                <button onClick={() => setMobile(o => !o)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:T.textMuted,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    padding:6, borderRadius:8, transition:'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background=T.surface2}
                  onMouseLeave={e => e.currentTarget.style.background='none'}>
                  <Menu size={22} strokeWidth={2}/>
                </button>
              )}
              {isMobile ? (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <img src="/SK_Logo.png" alt="SK" style={{ width:28, height:28, objectFit:'contain' }}/>
                  <span style={{ fontSize:11, fontWeight:700, color:T.navy,
                    fontFamily:MF, letterSpacing:'0.5px' }}>BAKAKENG</span>
                </div>
              ) : (
                <p style={{ fontSize:13, color:T.textMuted, fontFamily:IF }}>
                  {new Date().toLocaleDateString('en-PH',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                </p>
              )}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Bell size={18} style={{ color:T.textMuted, cursor:'pointer' }}/>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'#C53030',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:IF }}>
                {(profile?.name||user?.email||'A')[0].toUpperCase()}
              </div>
            </div>
          </div>
        )}

        <main style={{ flex:1, overflowY:'auto', padding: isMobile ? '16px' : '28px 32px',
          color:T.text, transition:'color .25s', fontFamily:IF }}>
          {children}
        </main>
      </div>

      <ConfirmDialog open={logout} onClose={() => setLogout(false)} onConfirm={doLogout}
        loading={loggingOut} danger title="Log Out?" message="Are you sure you want to log out of the admin panel?"/>
    </div>
  )
}
