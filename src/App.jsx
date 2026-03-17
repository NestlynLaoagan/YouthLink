import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import AdminLayout from './components/AdminLayout'
import { AdminThemeProvider } from './contexts/AdminThemeContext'
import LoginPage        from './pages/LoginPage'
import UserSettings    from './pages/UserSettings'
import ProfilingForm    from './pages/ProfilingForm'
import Dashboard        from './pages/Dashboard'
import AdminHome        from './pages/admin/AdminHome'
import ProfilingSummary from './pages/admin/ProfilingSummary'
import {
  ProjectsPage, EventsPage, FeedbackPage, ChatbotPage,
  RolesPage, LogsPage, ArchivesPage, BackupPage, SettingsPage
} from './pages/admin/AdminModules'

function Loading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlow(true), 4000); return () => clearTimeout(t) }, [])
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7FAFC', fontFamily:'Georgia,serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#1A365D,#2A4A7F)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 20px',boxShadow:'0 4px 20px rgba(26,54,93,0.25)' }}>🏛️</div>
        <div style={{ width:32,height:32,border:'3px solid #E2E8F0',borderTopColor:'#1A365D',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 16px' }}/>
        <p style={{ fontSize:14, color:'#718096', marginBottom:8 }}>Loading BarangayConnect…</p>
        {slow && (
          <div style={{ marginTop:16,padding:'14px 20px',background:'#FEF9E7',border:'1px solid #D69E2E',borderRadius:10,maxWidth:340,textAlign:'left' }}>
            <p style={{ fontSize:13,color:'#7B4800',fontWeight:700,marginBottom:6 }}>⚠️ Taking longer than expected</p>
            <p style={{ fontSize:12,color:'#7B4800',lineHeight:1.6 }}>Go to <strong>Supabase → SQL Editor</strong> and run <strong>supabase-setup.sql</strong>.</p>
            <a href="https://supabase.com/dashboard/project/gbsjcdbjuzvywpqyolaa/sql/new" target="_blank" rel="noreferrer"
              style={{ display:'inline-block',marginTop:10,fontSize:12,color:'#1A365D',fontWeight:700,textDecoration:'underline' }}>
              Open Supabase SQL Editor →
            </a>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Route guard – checks auth AND role AND profile completion
function Protected({ children, adminOnly = false, superAdminOnly = false, skipProfileCheck = false }) {
  const { user, role, profile, loading } = useAuth()
  if (loading) return <Loading/>
  if (!user) return <Navigate to="/login" replace/>
  if (superAdminOnly && role !== 'super_admin') return <Navigate to="/admin/dashboard" replace/>
  if (adminOnly && role !== 'admin' && role !== 'super_admin') return <Navigate to="/dashboard" replace/>
  // Residents must complete profiling before accessing dashboard
  if (!skipProfileCheck && !adminOnly && !superAdminOnly && role !== 'admin' && role !== 'super_admin') {
    if (profile !== undefined && profile !== null && !profile.profile_completed) {
      return <Navigate to="/profile-setup" replace/>
    }
  }
  return children
}

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
  return (
    <Routes>
      <Route path="/" element={
        user ? (role==='admin'||role==='super_admin' ? <Navigate to="/admin/dashboard"/> : <Navigate to="/dashboard"/>) : <Navigate to="/login"/>
      }/>
      <Route path="/login"         element={<LoginPage/>}/>
      <Route path="/profile-setup" element={<Protected skipProfileCheck><ProfilingForm/></Protected>}/>
      <Route path="/dashboard"     element={<Protected><Dashboard/></Protected>}/>
      <Route path="/settings"      element={<Protected><UserSettings/></Protected>}/>

      {/* Admin + Super Admin — CRUD on Projects & Events */}
      <Route path="/admin/dashboard" element={<AdminPage Component={AdminHome}/>}/>
      <Route path="/admin/projects"  element={<AdminPage Component={ProjectsPage}/>}/>
      <Route path="/admin/events"    element={<AdminPage Component={EventsPage}/>}/>

      {/* Admin has READ-ONLY, Super Admin has full control */}
      <Route path="/admin/profiling" element={<AdminPage Component={ProfilingSummary}/>}/>
      <Route path="/admin/feedback"  element={<AdminPage Component={FeedbackPage}/>}/>
      <Route path="/admin/chatbot"   element={<AdminPage Component={ChatbotPage}/>}/>
      <Route path="/admin/archives"  element={<AdminPage Component={ArchivesPage}/>}/>
      <Route path="/admin/logs"      element={<AdminPage Component={LogsPage}/>}/>
      <Route path="/admin/backup"    element={<AdminPage Component={BackupPage}/>}/>

      {/* Super Admin ONLY — role management & settings */}
      <Route path="/admin/roles"     element={<AdminPage Component={RolesPage}     superAdminOnly/>}/>
      <Route path="/admin/settings"  element={<AdminPage Component={SettingsPage}  superAdminOnly/>}/>

      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider><ToastProvider><AppRoutes/></ToastProvider></AuthProvider>
    </BrowserRouter>
  )
}
