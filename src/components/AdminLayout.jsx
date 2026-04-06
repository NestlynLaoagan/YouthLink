import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAdminTheme } from '../contexts/AdminThemeContext'
import {
  Home, FolderOpen, Calendar, MessageSquare,
  Archive, Settings, LogOut, Sun, Moon,
  ExternalLink, X, Menu, ChevronRight, Megaphone,
} from 'lucide-react'

const MF = "'Montserrat','Plus Jakarta Sans',sans-serif"
const IF = "'Plus Jakarta Sans','Inter',sans-serif"
const ICON_MAP = { Home, FolderOpen, Calendar, MessageSquare, Archive, Megaphone }

const ALL_NAV = [
  { label: 'Home',          icon: 'Home',          path: '/admin/dashboard',     viewRoles: ['admin','super_admin'] },
  { label: 'Announcements', icon: 'Megaphone',      path: '/admin/announcements', viewRoles: ['admin','super_admin'] },
  { label: 'Projects',      icon: 'FolderOpen',     path: '/admin/projects',      viewRoles: ['admin','super_admin'] },
  { label: 'Events',        icon: 'Calendar',       path: '/admin/events',        viewRoles: ['admin','super_admin'] },
  { label: 'Feedback',      icon: 'MessageSquare',  path: '/admin/feedback',      viewRoles: ['admin','super_admin'] },
  { label: 'Archives',      icon: 'Archive',        path: '/admin/archives',      viewRoles: ['admin','super_admin'] },
]

export default function AdminLayout({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { signOut, profile, user, role } = useAuth()
  const { T, dark, setDark } = useAdminTheme()

  const [logout,      setLogout]      = React.useState(false)
  const [loggingOut,  setLO]          = React.useState(false)
  const [mobileOpen,  setMobile]      = React.useState(false)
  const [isMobile,    setIsMobile]    = React.useState(window.innerWidth < 1024)
  const [profileOpen, setProfileOpen] = React.useState(false)
  const profileRef = React.useRef()

  React.useEffect(() => {
    const onResize = () => { const m = window.innerWidth < 1024; setIsMobile(m); if (!m) setMobile(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  React.useEffect(() => {
    const h = e => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  React.useEffect(() => { setMobile(false) }, [location.pathname])

  const doLogout = async () => { setLO(true); try { await signOut() } catch {} navigate('/login') }

  const sidebarBg  = dark ? '#0A1628' : '#0F2444'
  const isSA       = role === 'super_admin'
  const pillLabel  = isSA ? '👑 Super Admin' : '🛠️ Admin'
  const pillStyle  = isSA ? { bg:'#FEF9E7', color:'#7B4800' } : { bg:'rgba(255,255,255,0.18)', color:'white' }
  const displayName = profile?.full_name || profile?.display_name || user?.email?.split('@')[0] || 'Admin'
  const initials    = displayName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const visibleNav  = ALL_NAV.filter(n => n.viewRoles.includes(role))

  const NavBtn = ({ path, iconKey, label }) => {
    const Icon   = ICON_MAP[iconKey] || Home
    const active = location.pathname === path
    return (
      <button onClick={() => { navigate(path); setMobile(false) }}
        style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 14px', borderRadius:10, border:'none', cursor:'pointer', textAlign:'left', background: active ? 'rgba(255,255,255,0.13)' : 'transparent', borderLeft: active ? '3px solid rgba(255,255,255,0.8)' : '3px solid transparent', transition:'all .15s' }}
        onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='rgba(255,255,255,0.07)' }}
        onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent' }}>
        <Icon size={16} style={{ color: active ? 'white' : 'rgba(255,255,255,0.5)', flexShrink:0 }}/>
        <span style={{ fontSize:13, color: active ? 'white' : 'rgba(255,255,255,0.65)', fontWeight: active ? 700 : 500, fontFamily:IF }}>{label}</span>
        {active && <ChevronRight size={13} style={{ color:'rgba(255,255,255,0.4)', marginLeft:'auto' }}/>}
      </button>
    )
  }

  const UtilBtn = ({ icon: Icon, label, action, danger }) => (
    <button onClick={action}
      style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 14px', borderRadius:10, border:'none', cursor:'pointer', background:'transparent', transition:'background .15s' }}
      onMouseEnter={e=>e.currentTarget.style.background = danger ? 'rgba(220,53,69,0.12)' : 'rgba(255,255,255,0.07)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <Icon size={15} style={{ color: danger ? 'rgba(255,100,100,0.75)' : 'rgba(255,255,255,0.5)', flexShrink:0 }}/>
      <span style={{ fontSize:13, color: danger ? 'rgba(255,100,100,0.75)' : 'rgba(255,255,255,0.65)', fontFamily:IF }}>{label}</span>
    </button>
  )

  const Avatar = ({ size=36 }) => (
    <div style={{ width:size, height:size, borderRadius:'50%', background: isSA ? 'rgba(214,158,46,0.35)' : 'rgba(255,255,255,0.18)', border: isSA ? '2px solid rgba(214,158,46,0.6)' : '2px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:700, color:'white', overflow:'hidden', flexShrink:0 }}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initials}
    </div>
  )

  const SidebarInner = () => (
    <div style={{ width:224, background:sidebarBg, height:'100vh', display:'flex', flexDirection:'column', overflowY:'auto', overflowX:'hidden' }}>
      {/* Brand row */}
      <div style={{ padding:'18px 14px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
            <img src="/SK_Logo.png" alt="SK" style={{ width:32, height:32, objectFit:'contain' }}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'white', fontFamily:MF, lineHeight:1.2 }}>BARANGAY</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontFamily:IF }}>Bakakeng Central</div>
          </div>
          {isMobile && (
            <button onClick={()=>setMobile(false)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, padding:'5px 7px', cursor:'pointer', display:'flex', flexShrink:0 }}>
              <X size={15} style={{ color:'rgba(255,255,255,0.7)' }}/>
            </button>
          )}
        </div>
        <div style={{ display:'inline-flex', padding:'3px 10px', borderRadius:20, background:pillStyle.bg }}>
          <span style={{ fontSize:10, fontWeight:700, color:pillStyle.color, fontFamily:IF }}>{pillLabel}</span>
        </div>
      </div>
      {/* Profile mini */}
      <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar size={34}/>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'white', margin:0, fontFamily:MF, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</p>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', margin:0, fontFamily:IF, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</p>
          </div>
        </div>
      </div>
      {/* Nav */}
      <div style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:1 }}>
        {visibleNav.map(n => <NavBtn key={n.path} path={n.path} iconKey={n.icon} label={n.label}/>)}
      </div>
      {/* Utilities */}
      <div style={{ padding:'10px 8px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', gap:1 }}>
        <UtilBtn icon={Settings}      label="Settings"        action={()=>navigate('/admin/settings')}/>
        <UtilBtn icon={ExternalLink}  label="Preview Website" action={()=>window.open('/dashboard','_blank')}/>
        <UtilBtn icon={dark?Sun:Moon} label={dark?'Light Mode':'Dark Mode'} action={()=>setDark(!dark)}/>
        <UtilBtn icon={LogOut}        label="Log Out"         action={()=>setLogout(true)} danger/>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:T.bg }}>

      {/* Desktop fixed sidebar */}
      {!isMobile && (
        <div style={{ position:'fixed', top:0, left:0, zIndex:50, height:'100vh' }}>
          <SidebarInner/>
        </div>
      )}

      {/* Mobile drawer + backdrop */}
      {isMobile && (
        <>
          <div onClick={()=>setMobile(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:998, backdropFilter:'blur(3px)', opacity: mobileOpen?1:0, pointerEvents: mobileOpen?'auto':'none', transition:'opacity .25s' }}/>
          <div style={{ position:'fixed', top:0, left: mobileOpen?0:-240, zIndex:999, height:'100vh', transition:'left .28s cubic-bezier(.4,0,.2,1)', boxShadow: mobileOpen?'4px 0 32px rgba(0,0,0,0.4)':'none' }}>
            <SidebarInner/>
          </div>
        </>
      )}

      {/* Main */}
      <div style={{ marginLeft: isMobile ? 0 : 224, flex:1, minHeight:'100vh', display:'flex', flexDirection:'column' }}>

        {/* Mobile topbar */}
        {isMobile && (
          <div style={{ background: dark?'#0A1628':'#0F2444', padding:'0 14px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:40, height:54, boxShadow:'0 2px 14px rgba(0,0,0,0.3)', flexShrink:0 }}>
            {/* Hamburger */}
            <button onClick={()=>setMobile(true)} style={{ width:38, height:38, borderRadius:10, background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Menu size={18} style={{ color:'white' }}/>
            </button>
            {/* Brand */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <img src="/SK_Logo.png" alt="SK" style={{ width:26, height:26, objectFit:'contain' }}/>
              <span style={{ fontSize:13, fontWeight:800, color:'white', fontFamily:MF, letterSpacing:'.5px' }}>SK ADMIN</span>
            </div>
            {/* Right: dark mode + avatar */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={()=>setDark(!dark)} style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {dark ? <Sun size={15} style={{ color:'rgba(255,255,255,0.8)' }}/> : <Moon size={15} style={{ color:'rgba(255,255,255,0.8)' }}/>}
              </button>
              <div ref={profileRef} style={{ position:'relative' }}>
                <button onClick={()=>setProfileOpen(o=>!o)} style={{ width:34, height:34, borderRadius:'50%', background: isSA?'rgba(214,158,46,0.4)':'rgba(255,255,255,0.2)', border: isSA?'2px solid rgba(214,158,46,0.7)':'2px solid rgba(255,255,255,0.3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', overflow:'hidden' }}>
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initials}
                </button>
                {profileOpen && (
                  <div style={{ position:'absolute', top:42, right:0, background: dark?'#1A2744':'white', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.22)', border:`1px solid ${dark?'rgba(255,255,255,0.1)':'#E2E8F0'}`, minWidth:210, overflow:'hidden', zIndex:100 }}>
                    <div style={{ padding:'14px 16px', borderBottom:`1px solid ${dark?'rgba(255,255,255,0.08)':'#F0F4F8'}` }}>
                      <p style={{ fontSize:13, fontWeight:700, color: dark?'white':'#1A365D', margin:'0 0 2px', fontFamily:MF }}>{displayName}</p>
                      <p style={{ fontSize:11, color: dark?'rgba(255,255,255,0.45)':'#718096', margin:0, fontFamily:IF }}>{user?.email}</p>
                      <div style={{ marginTop:6, display:'inline-flex', padding:'2px 8px', borderRadius:12, background: isSA?'#FEF9E7':'#EBF4FF' }}>
                        <span style={{ fontSize:10, fontWeight:700, color: isSA?'#7B4800':'#1A365D', fontFamily:IF }}>{pillLabel}</span>
                      </div>
                    </div>
                    {[
                      { icon:Settings,     label:'Settings',        action:()=>{navigate('/admin/settings');setProfileOpen(false)} },
                      { icon:ExternalLink, label:'Preview Website',  action:()=>{window.open('/dashboard','_blank');setProfileOpen(false)} },
                    ].map(({icon:Icon,label,action})=>(
                      <button key={label} onClick={action} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, color: dark?'rgba(255,255,255,0.75)':'#4A5568', fontFamily:IF, textAlign:'left' }}
                        onMouseEnter={e=>e.currentTarget.style.background=dark?'rgba(255,255,255,0.06)':'#F7FAFC'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <Icon size={14}/>{label}
                      </button>
                    ))}
                    <button onClick={()=>{setLogout(true);setProfileOpen(false)}} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, color:'#DC3545', fontFamily:IF, textAlign:'left', borderTop:`1px solid ${dark?'rgba(255,255,255,0.08)':'#F0F4F8'}` }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(220,53,69,0.07)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <LogOut size={14}/> Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <div style={{ flex:1, padding: isMobile?'18px 14px':'28px 32px', maxWidth:1400 }}>
          {children}
        </div>
      </div>

      {/* Logout dialog */}
      {logout && (
        <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background: dark?'#1A2744':'white', borderRadius:20, padding:'36px 32px', maxWidth:380, width:'100%', textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.28)' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(220,53,69,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
              <LogOut size={28} style={{ color:'#DC3545' }}/>
            </div>
            <h3 style={{ fontSize:20, fontWeight:700, color: dark?'white':'#1A365D', marginBottom:10, fontFamily:MF }}>Do you want to log out?</h3>
            <p style={{ fontSize:14, color: dark?'rgba(255,255,255,0.6)':'#718096', marginBottom:28, lineHeight:1.6, fontFamily:IF }}>You will be redirected to the login page.</p>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={()=>setLogout(false)} disabled={loggingOut} style={{ flex:1, padding:'11px 0', borderRadius:10, border:`1px solid ${dark?'rgba(255,255,255,0.2)':'#CBD5E0'}`, background:'transparent', color: dark?'rgba(255,255,255,0.75)':'#4A5568', fontWeight:600, fontSize:14, fontFamily:IF, cursor: loggingOut?'not-allowed':'pointer' }}>No</button>
              <button onClick={doLogout} disabled={loggingOut} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'none', background:'#DC3545', color:'white', fontWeight:700, fontSize:14, fontFamily:IF, cursor: loggingOut?'not-allowed':'pointer', opacity: loggingOut?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {loggingOut?'Logging out…':'Yes, Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
