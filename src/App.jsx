/**
 * App.jsx (INTEGRATION PATCH)
 * ─────────────────────────────────────────────────────────────────
 * Apply these changes to your existing src/App.jsx
 *
 * Three things to add:
 * 1. Import ThemeProvider from new ThemeContext
 * 2. Import ThemeCustomization page
 * 3. Wrap <AdminThemeProvider> with <ThemeProvider>
 * 4. Add /admin/theme route
 *
 * The full modified App.jsx is below — copy-replace your existing file.
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth }                  from './contexts/AuthContext'
import { ToastProvider }                           from './contexts/ToastContext'
import { SiteSettingsProvider }                    from './contexts/SiteSettingsContext'
import { AdminThemeProvider }                      from './contexts/AdminThemeContext'

// ✅ NEW: Import the system-wide ThemeProvider
import { ThemeProvider }                           from './contexts/ThemeContext'

import AdminLayout          from './components/AdminLayout'
import LandingPage          from './pages/LandingPage'
import LoginPage            from './pages/LoginPage'
import UserSettings         from './pages/UserSettings'
import ProfilingForm        from './pages/ProfilingForm'
import Dashboard            from './pages/Dashboard'
import AdminHome            from './pages/admin/AdminHome'

// ✅ NEW: Import the Theme Customization panel
import ThemeCustomization        from './pages/admin/ThemeCustomization'

// ✅ NEW: Import the Login History page (admin + super admin)
import AdminLoginHistoryPage     from './pages/admin/AdminLoginHistoryPage'

import {
  ProjectsPage, EventsPage, FeedbackPage, ChatbotPage,
  RolesPage, LogsPage, ArchivesPage, BackupPage, SettingsPage, AnnouncementsPage
} from './pages/admin/AdminModules'


function Loading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlow(true), 4000); return () => clearTimeout(t) }, [])
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7FAFC', fontFamily:'Georgia,serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#1A365D,#2A4A7F)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 20px',boxShadow:'0 4px 20px rgba(26,54,93,0.25)' }}>🏛️</div>
        <div style={{ width:32,height:32,border:'3px solid #E2E8F0',borderTopColor:'#1A365D',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 16px' }}/>
        <p style={{ fontSize:14, color:'#718096' }}>Loading YouthLink…</p>
        {slow && (
          <div style={{ marginTop:16,padding:'14px 20px',background:'#FEF9E7',border:'1px solid #D69E2E',borderRadius:10,maxWidth:340,textAlign:'left' }}>
            <p style={{ fontSize:13,color:'#7B4800',fontWeight:700,marginBottom:6 }}>⚠️ Taking longer than expected</p>
            <p style={{ fontSize:12,color:'#7B4800',lineHeight:1.6 }}>Go to <strong>Supabase → SQL Editor</strong> and run <strong>supabase-setup.sql</strong>.</p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Protected({ children, adminOnly = false, superAdminOnly = false, skipProfileCheck = false }) {
  const { user, role, profile, loading, isNewGoogleUser } = useAuth()
  if (loading) return <Loading/>
  if (!user) return <Navigate to="/login" replace/>
  const normalizedRole = (role || '').toLowerCase().trim()
  const isAdminRole = ['admin', 'super_admin', 'superadmin', 'super admin'].includes(normalizedRole)
  const isSuperAdmin = ['super_admin', 'superadmin', 'super admin'].includes(normalizedRole)
  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/admin/dashboard" replace/>
  if (adminOnly && !isAdminRole) return <Navigate to="/dashboard" replace/>
  if (!skipProfileCheck && !adminOnly && !superAdminOnly && !isAdminRole) {
    // profile===undefined means still loading — wait.
    if (profile === undefined) return <Loading/>
    // Only redirect to profile-setup for new Google OAuth users who haven't completed profiling.
    // Email/password users who registered have already filled profiling during sign-up.
    if (isNewGoogleUser && (!profile || !profile.profile_completed)) {
      return <Navigate to="/profile-setup" replace/>
    }
  }
  return children
}

// AdminPage — ThemeProvider is now at app root, so no per-page wrapping needed
function AdminPage({ Component, superAdminOnly = false }) {
  return (
    <Protected adminOnly superAdminOnly={superAdminOnly}>
      <AdminThemeProvider>
        <AdminLayout><Component/></AdminLayout>
      </AdminThemeProvider>
    </Protected>
  )
}

function AppRoutes() {
  const { user, role, loading } = useAuth()
  if (loading) return <Loading/>
  const normalizedRole = (role || '').toLowerCase().trim()
  const isAdminRole = ['admin', 'super_admin', 'superadmin', 'super admin'].includes(normalizedRole)
  return (
    <Routes>
      <Route path="/" element={
        user
          ? (isAdminRole ? <Navigate to="/admin/dashboard"/> : <Navigate to="/dashboard"/>)
          : <LandingPage/>
      }/>
      <Route path="/login"         element={!user ? <LoginPage/> : <Navigate to="/"/>}/>
      <Route path="/profile-setup" element={<Protected skipProfileCheck><ProfilingForm/></Protected>}/>
      <Route path="/dashboard"     element={<Protected><Dashboard/></Protected>}/>
      <Route path="/settings"      element={<Protected><UserSettings/></Protected>}/>

      {/* ── Admin routes ── */}
      <Route path="/admin/dashboard"     element={<AdminPage Component={AdminHome}/>}/>

      {/* ✅ NEW: Theme Customization route */}
      <Route path="/admin/theme"         element={<AdminPage Component={ThemeCustomization}/>}/>

      <Route path="/admin/announcements" element={<AdminPage Component={AnnouncementsPage}/>}/>
      <Route path="/admin/projects"      element={<AdminPage Component={ProjectsPage}/>}/>
      <Route path="/admin/events"        element={<AdminPage Component={EventsPage}/>}/>
      <Route path="/admin/feedback"      element={<AdminPage Component={FeedbackPage}/>}/>
      <Route path="/admin/archives"      element={<AdminPage Component={ArchivesPage}/>}/>
      <Route path="/admin/settings"      element={<AdminPage Component={SettingsPage}/>}/>
      <Route path="/admin/roles"         element={<AdminPage Component={RolesPage}    superAdminOnly/>}/>
      <Route path="/admin/logs"          element={<AdminPage Component={LogsPage}     superAdminOnly/>}/>
      <Route path="/admin/backup"        element={<AdminPage Component={BackupPage}   superAdminOnly/>}/>
      
      {/* ✅ Login History — now embedded inside Audit Trail / Logs in Settings */}
      <Route path="/admin/login-history" element={<AdminPage Component={AdminLoginHistoryPage}/>}/>

      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteSettingsProvider>
        {/* ThemeProvider wraps the ENTIRE app so all pages — admin and user —
            share the same single ThemeContext instance and receive live
            Supabase Realtime updates together. */}
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes/>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SiteSettingsProvider>
    </BrowserRouter>
  )
}
