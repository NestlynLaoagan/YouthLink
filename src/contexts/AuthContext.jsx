import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext({})
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [role,    setRole]    = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchRole = async (uid) => {
    try {
      const { data } = await supabase
        .from('user_roles').select('role').eq('user_id', uid).maybeSingle()
      return data?.role || 'resident'
    } catch { return 'resident' }
  }

  const fetchProfile = useCallback(async (uid) => {
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('user_id', uid).maybeSingle()
      return data || null
    } catch { return null }
  }, [])

  const loadUser = useCallback(async (u) => {
    if (!u) { setUser(null); setRole(null); setProfile(null); setLoading(false); return }
    setUser(u)
    try {
      const [r, p] = await Promise.all([fetchRole(u.id), fetchProfile(u.id)])
      setRole(r); setProfile(p)
    } catch {
      setRole('resident'); setProfile(null)
    } finally { setLoading(false) }
  }, [fetchProfile])

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000)
    supabase.auth.getSession()
      .then(({ data: { session } }) => { clearTimeout(timeout); loadUser(session?.user ?? null) })
      .catch(() => { clearTimeout(timeout); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      loadUser(session?.user ?? null)
    })
    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [loadUser])

  // ── SIGN IN ──────────────────────────────────────────────
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Non-blocking audit log after login
    setTimeout(() => {
      supabase.from('audit_logs').insert({
        user_id: data.user?.id, user_name: email,
        user_role: 'resident', action: 'Login',
        module: 'Auth', description: `Logged in: ${email}`, status: 'Success'
      }).then(() => {}).catch(() => {})
    }, 1000)
    return data
  }

  // ── SIGN UP ──────────────────────────────────────────────
  // IMPORTANT: Only call supabase.auth.signUp here.
  // Do NOT touch the database during signup — Supabase sometimes
  // runs auth triggers that conflict with immediate DB writes.
  // The user_roles row is written AFTER auth succeeds via onAuthStateChange.
  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name || '' } },
    })
    if (error) throw error
    // Write user_roles row after a short delay to avoid trigger conflicts
    if (data.user) {
      setTimeout(async () => {
        try {
          await supabase.from('user_roles').upsert({
            user_id: data.user.id,
            email:   email,
            name:    name || email.split('@')[0],
            role:    'resident',
          }, { onConflict: 'user_id', ignoreDuplicates: true })
        } catch {}
      }, 1500)
    }
    return data
  }

  // ── SIGN OUT ─────────────────────────────────────────────
  const signOut = async () => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id, user_name: profile?.name || user?.email || 'User',
        user_role: role || 'resident', action: 'Logout',
        module: 'Auth', description: 'User logged out', status: 'Success'
      })
    } catch {}
    await supabase.auth.signOut()
  }

  // ── REFRESH PROFILE ──────────────────────────────────────
  const refreshProfile = async () => {
    if (user) { const p = await fetchProfile(user.id); setProfile(p) }
  }

  // ── LOG AUDIT ────────────────────────────────────────────
  const logAudit = async (action, module, description, uid = user?.id) => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: uid, user_name: profile?.name || user?.email || 'System',
        user_role: role || 'unknown', action, module, description, status: 'Success'
      })
    } catch {} // Never throw — audit is non-critical
  }

  const isVerified     = profile?.verification_status === 'Verified'
  const isPending      = profile?.verification_status === 'Pending'
  const profileComplete = !!profile?.profile_completed

  return (
    <Ctx.Provider value={{
      user, profile, role, loading,
      isVerified, isPending, profileComplete,
      signIn, signUp, signOut, refreshProfile, logAudit,
    }}>
      {children}
    </Ctx.Provider>
  )
}
