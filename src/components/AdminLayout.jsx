import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAdminTheme } from '../contexts/AdminThemeContext'
import { ConfirmDialog } from './UI'
import {
  Home, Users, FolderOpen, Calendar, MessageSquare, Bot,
  Shield, Archive, FileText, Database, Settings, LogOut,
  Sun, Moon, ExternalLink, Lock, Bell
} from 'lucide-react'

const MF = "'Montserrat','Inter',sans-serif"
const IF = "'Inter',sans-serif"

const ALL_NAV = [
  { label:'Home',             icon:Home,          path:'/admin/dashboard', viewRoles:['admin','super_admin'], crudRoles:['admin','super_admin'] },
  { label:'Profiling Summary',icon:Users,         path:'/admin/profiling', viewRoles:['admin','super_admin'], crudRoles:['super_admin'] },
  { label:'Projects',         icon:FolderOpen,    path:'/admin/projects',  viewRoles:['admin','super_admin'], crudRoles:['admin','super_admin'] },
  { label:'Events',           icon:Calendar,      path:'/admin/events',    viewRoles:['admin','super_admin'], crudRoles:['admin','super_admin'] },
  { label:'Feedback',         icon:MessageSquare, path:'/admin/feedback',  viewRoles:['admin','super_admin'], crudRoles:['super_admin'] },
  { label:'AI Chatbot',       icon:Bot,           path:'/admin/chatbot',   viewRoles:['admin','super_admin'], crudRoles:['super_admin'] },
  { label:'Role Management',  icon:Shield,        path:'/admin/roles',     viewRoles:['super_admin'],         crudRoles:['super_admin'] },
  { label:'Archives',         icon:Archive,       path:'/admin/archives',  viewRoles:['admin','super_admin'], crudRoles:['super_admin'] },
  { label:'Logs',             icon:FileText,      path:'/admin/logs',      viewRoles:['admin','super_admin'], crudRoles:['super_admin'] },
  { label:'Backup & Restore', icon:Database,      path:'/admin/backup',    viewRoles:['admin','super_admin'], crudRoles:['super_admin'] },
]

export default function AdminLayout({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { signOut, profile, user, role } = useAuth()
  const { T, dark, setDark } = useAdminTheme()

  const [logout,     setLogout]  = React.useState(false)
  const [loggingOut, setLO]      = React.useState(false)

  const doLogout = async () => {
    setLO(true)
    try { await signOut() } catch {}
    navigate('/login')
  }

  const sidebarBg = dark ? '#0A1628' : '#0F2444'

  const pillStyle = role === 'super_admin'
    ? { bg:'#FEF9E7', color:'#7B4800', label:'Super Admin' }
    : { bg:'rgba(255,255,255,0.18)', color:'white', label:'Admin' }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:IF }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width:215, background:sidebarBg, display:'flex', flexDirection:'column', flexShrink:0 }}>

        {/* Logo */}
        <div style={{ padding:'20px 14px 14px', borderBottom:'1px solid rgba(255,255,255,0.09)', textAlign:'center' }}>
          <img src="/SK_Logo.png" alt="SK Logo" style={{ width:80, height:80, objectFit:'contain', margin:'0 auto 10px', display:'block', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}/>
          <p style={{ color:'white', fontSize:11, fontWeight:700, lineHeight:1.45, letterSpacing:'0.4px', fontFamily:MF }}>BARANGAY<br/>BAKAKENG<br/>CENTRAL</p>
          <div style={{ marginTop:8, display:'inline-block', padding:'2px 11px', borderRadius:20, background:pillStyle.bg, fontSize:10, fontWeight:700, color:pillStyle.color, fontFamily:IF }}>
            {pillStyle.label}
          </div>
        </div>

        {/* Preview site */}
        <div style={{ padding:'9px 8px 0' }}>
          <button onClick={() => window.open('/dashboard','_blank')}
            style={{ display:'flex', alignItems:'center', gap:7, width:'100%', padding:'7px 10px', borderRadius:7, border:'1px solid rgba(214,158,46,0.4)', background:'rgba(214,158,46,0.10)', cursor:'pointer', fontSize:11, color:'#F6E05E', fontFamily:IF, fontWeight:600, transition:'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(214,158,46,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(214,158,46,0.10)'}>
            <ExternalLink size={12}/><span>See Website</span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'8px 7px', overflowY:'auto' }}>
          {ALL_NAV.map(({ label, icon:Icon, path, viewRoles, crudRoles }) => {
            const canView = viewRoles.includes(role)
            const canCrud = crudRoles.includes(role)
            const active  = location.pathname === path
            if (!canView) return null
            return (
              <button key={path} onClick={() => navigate(path)}
                style={{
                  display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'8px 10px', borderRadius:7, border:'none',
                  background: active ? '#C53030' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.70)',
                  fontSize:12, fontFamily:IF, textAlign:'left',
                  marginBottom:1, fontWeight: active ? 700 : 400,
                  cursor:'pointer', transition:'all .15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background='rgba(255,255,255,0.10)'; e.currentTarget.style.color='white' }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.70)' }}}>
                <Icon size={13} style={{ flexShrink:0 }}/>
                <span style={{ flex:1 }}>{label}</span>
                {!canCrud && <span style={{ fontSize:8, background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.65)', padding:'1px 5px', borderRadius:10, fontFamily:IF, letterSpacing:'0.3px' }}>VIEW</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:'8px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', marginBottom:5 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'#C53030', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:700, flexShrink:0, fontFamily:IF }}>
              {(profile?.name||user?.email||'A')[0].toUpperCase()}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ color:'white', fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:IF }}>{profile?.name||user?.email||'Admin'}</p>
              <p style={{ color:'rgba(255,255,255,0.40)', fontSize:9, textTransform:'capitalize', marginTop:1, fontFamily:IF }}>{pillStyle.label}</p>
            </div>
          </div>
          {[
            { icon: dark ? <Sun size={13}/> : <Moon size={13}/>, label: dark ? 'Light Mode' : 'Dark Mode', action: () => setDark(d => !d) },
            { icon: <Settings size={13}/>, label: 'Settings', action: () => navigate('/admin/settings') },
            { icon: <LogOut size={13}/>,   label: 'Log Out',  action: () => setLogout(true), red: true },
          ].map(({ icon, label, action, red }) => (
            <button key={label} onClick={action}
              style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 10px', borderRadius:7, border:'none', background:'transparent', cursor:'pointer', fontSize:12, color: red ? '#FC8181' : 'rgba(255,255,255,0.65)', fontFamily:IF, marginBottom:1, transition:'all .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:T.bg, transition:'background .25s' }}>
        {/* Topbar */}
        <div style={{ height:54, background:T.surface, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', flexShrink:0, transition:'background .25s' }}>
          <p style={{ fontSize:13, color:T.textMuted, fontFamily:IF }}>
            {new Date().toLocaleDateString('en-PH',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Bell size={18} style={{ color:T.textMuted, cursor:'pointer' }}/>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'#C53030', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:IF }}>
              {(profile?.name||user?.email||'A')[0].toUpperCase()}
            </div>
          </div>
        </div>

        <main style={{ flex:1, overflowY:'auto', padding:'28px 32px', color:T.text, transition:'color .25s', fontFamily:IF }}>
          {children}
        </main>
      </div>

      <ConfirmDialog open={logout} onClose={() => setLogout(false)} onConfirm={doLogout}
        loading={loggingOut} danger title="Log Out?" message="Are you sure you want to log out of the admin panel?"/>
    </div>
  )
}
