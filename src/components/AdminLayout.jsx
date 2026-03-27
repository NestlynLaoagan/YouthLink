/**
 * AdminLayout.jsx  (UPDATED — Theme nav item removed)
 * ─────────────────────────────────────────────────────────────────
 * Changes vs previous version:
 *  • "Theme" nav item REMOVED from ALL_NAV
 *  • Paintbrush import removed (no longer needed)
 *  • Everything else unchanged
 *
 * Theme Customization now lives exclusively inside the Admin Home
 * (Dashboard) view as a configuration section — see AdminHome.jsx.
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAdminTheme } from '../contexts/AdminThemeContext'
import { ConfirmDialog } from './UI'
import {
  Home, FolderOpen, Calendar, MessageSquare,
  Archive, Settings, LogOut,
  Sun, Moon, ExternalLink, Bell, Megaphone, X, Menu,
  // ❌ Paintbrush removed — Theme is no longer a sidebar nav item
} from 'lucide-react'

const MF = "'Montserrat','Plus Jakarta Sans',sans-serif"
const IF = "'Plus Jakarta Sans','Inter',sans-serif"

const ICON_MAP = { Home, FolderOpen, Calendar, MessageSquare, Archive, Megaphone }

// ─────────────────────────────────────────────────────────────────
// ALL_NAV — "Theme" entry has been removed.
// Theme Customization is now embedded in /admin/dashboard (Home).
// ─────────────────────────────────────────────────────────────────
const ALL_NAV = [
  { label: 'Home',          icon: 'Home',         path: '/admin/dashboard',     viewRoles: ['admin','super_admin'], crudRoles: ['admin','super_admin'] },
  { label: 'Announcements', icon: 'Megaphone',    path: '/admin/announcements', viewRoles: ['admin','super_admin'], crudRoles: ['admin','super_admin'] },
  { label: 'Projects',      icon: 'FolderOpen',   path: '/admin/projects',      viewRoles: ['admin','super_admin'], crudRoles: ['admin','super_admin'] },
  { label: 'Events',        icon: 'Calendar',     path: '/admin/events',        viewRoles: ['admin','super_admin'], crudRoles: ['admin','super_admin'] },
  { label: 'Feedback',      icon: 'MessageSquare',path: '/admin/feedback',      viewRoles: ['admin','super_admin'], crudRoles: ['super_admin'] },
  { label: 'Archives',      icon: 'Archive',      path: '/admin/archives',      viewRoles: ['admin','super_admin'], crudRoles: ['super_admin'] },
  // ❌ { label:'Theme', icon:'Paintbrush', path:'/admin/theme', ... } — REMOVED
]

export default function AdminLayout({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { signOut, profile, user, role } = useAuth()
  const { T, dark, setDark, navbarVisible } = useAdminTheme()

  const [logout,     setLogout]   = React.useState(false)
  const [loggingOut, setLO]       = React.useState(false)
  const [mobileOpen, setMobile]   = React.useState(false)
  const [isMobile,   setIsMobile] = React.useState(window.innerWidth < 768)

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
    ? { bg: '#FEF9E7', color: '#7B4800', label: 'Super Admin' }
    : { bg: 'rgba(255,255,255,0.18)', color: 'white', label: 'Admin' }

  const navItem = (path, iconKey, label) => {
    const Icon = ICON_MAP[iconKey] || Home
    const active = location.pathname === path
    return (
      <button
        key={path}
        onClick={() => { navigate(path); if (isMobile) setMobile(false) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 14px', borderRadius: 10, border: 'none',
          cursor: 'pointer', textAlign: 'left',
          background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
          borderLeft: active ? '3px solid rgba(255,255,255,0.7)' : '3px solid transparent',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      >
        <Icon size={15} style={{ color: active ? 'white' : 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: active ? 'white' : 'rgba(255,255,255,0.65)', fontWeight: active ? 700 : 500, fontFamily: IF }}>
          {label}
        </span>
      </button>
    )
  }

  const visibleNav = ALL_NAV.filter(n => n.viewRoles.includes(role))

  const Sidebar = () => (
    <div style={{
      width: 220, background: sidebarBg, height: '100vh',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: isMobile ? (mobileOpen ? 0 : -240) : 0,
      zIndex: 50, transition: 'left .25s', overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🏛️</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'white', fontFamily: MF, lineHeight: 1.2 }}>BARANGAY</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: IF }}>Bakakeng Central</div>
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: pillStyle.bg }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: pillStyle.color, fontFamily: IF }}>{pillStyle.label}</span>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {visibleNav.map(n => navItem(n.path, n.icon, n.label))}
      </div>

      {/* Bottom utilities */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => navigate('/admin/settings')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent' }}
        >
          <Settings size={15} style={{ color: 'rgba(255,255,255,0.55)' }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: IF }}>Settings</span>
        </button>

        <button
          onClick={() => setDark(!dark)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent' }}
        >
          {dark
            ? <Sun  size={15} style={{ color: 'rgba(255,255,255,0.55)' }} />
            : <Moon size={15} style={{ color: 'rgba(255,255,255,0.55)' }} />}
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: IF }}>
            {dark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        <button
          onClick={() => window.open('/dashboard', '_blank')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent' }}
        >
          <ExternalLink size={15} style={{ color: 'rgba(255,255,255,0.55)' }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: IF }}>See Website</span>
        </button>

        <button
          onClick={() => setLogout(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent' }}
        >
          <LogOut size={15} style={{ color: 'rgba(255,100,100,0.7)' }} />
          <span style={{ fontSize: 13, color: 'rgba(255,100,100,0.7)', fontFamily: IF }}>Log Out</span>
        </button>
      </div>

      {isMobile && (
        <button
          onClick={() => setMobile(false)}
          style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
        >
          <X size={16} style={{ color: 'white' }} />
        </button>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg }}>
      <Sidebar />

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobile(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }}
        />
      )}

      {/* Main content area */}
      <div style={{ marginLeft: isMobile ? 0 : 220, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            background: T.surface, borderBottom: `1px solid ${T.border}`,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
            position: 'sticky', top: 0, zIndex: 40,
          }}>
            <button onClick={() => setMobile(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Menu size={20} style={{ color: T.text }} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: MF }}>SK Admin</span>
          </div>
        )}

        <div style={{ flex: 1, padding: isMobile ? '20px 16px' : '28px 32px', maxWidth: 1400 }}>
          {children}
        </div>
      </div>

      {logout && (
        <ConfirmDialog
          title="Log Out?"
          message="Are you sure you want to log out of the admin panel?"
          onConfirm={doLogout}
          onCancel={() => setLogout(false)}
          loading={loggingOut}
          T={T}
        />
      )}
    </div>
  )
}
