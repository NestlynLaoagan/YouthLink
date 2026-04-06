import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { recordLoginEvent, recordLogout } from '../lib/loginHistory'

const Ctx = createContext({})
export const useAuth = () => useContext(Ctx)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Module-level guard — survives React StrictMode double-mount/unmount cycles.
// Stores the last session token we recorded so re-fires of SIGNED_IN are ignored.
let _lastRecordedToken = null

export function AuthProvider({ children }) {
  const [user,            setUser]            = useState(null)
  const [profile,         setProfile]         = useState(undefined)
  const [role,            setRole]            = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [isNewGoogleUser, setIsNewGoogleUser] = useState(false)

  const fetchRole = async (uid) => {
    try {
      const { data, error } = await supabase.rpc('get_my_role')
      if (error) throw error
      return data || 'resident'
    } catch {
      try {
        const { data } = await supabase
          .from('user_roles').select('role').eq('user_id', uid).maybeSingle()
        return data?.role || 'resident'
      } catch {
        return 'resident'
      }
    }
  }

  const fetchProfile = useCallback(async (uid, email) => {
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('user_id', uid).maybeSingle()
      if (data) return data

      if (email) {
        const { data: byEmail } = await supabase
          .from('profiles').select('*').eq('email', email).maybeSingle()
        if (byEmail) {
          if (!byEmail.user_id) {
            await supabase.from('profiles').update({ user_id: uid }).eq('email', email)
          }
          return byEmail
        }
      }
      return null
    } catch { return null }
  }, [])

  const loadUser = useCallback(async (u, isActiveSignIn = false) => {
    if (!u) {
      setUser(null); setRole(null); setProfile(null)
      setIsNewGoogleUser(false); setLoading(false)
      return
    }
    setUser(u)
    try {
      const [r, p] = await Promise.all([fetchRole(u.id), fetchProfile(u.id, u.email)])
      setRole(r ?? 'resident')
      setProfile(p)

      const isGoogle = u.app_metadata?.provider === 'google' ||
        u.identities?.some(i => i.provider === 'google')

      if (isActiveSignIn) {
        setIsNewGoogleUser(isGoogle && (!p || !p.profile_completed))
      }

      const name = p?.name || u.user_metadata?.full_name || u.user_metadata?.name ||
        u.email?.split('@')[0] || ''
      supabase.from('user_roles').upsert(
        { user_id: u.id, email: u.email, name, role: r ?? 'resident' },
        { onConflict: 'user_id', ignoreDuplicates: true }
      ).then(() => {}).catch(() => {})
    } catch {
      setRole('resident'); setProfile(null)
    } finally { setLoading(false) }
  }, [fetchProfile])

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => { clearTimeout(timeout); loadUser(session?.user ?? null) })
      .catch(() => { clearTimeout(timeout); setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      loadUser(session?.user ?? null, event === 'SIGNED_IN')

      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user
        // Use module-level guard — survives StrictMode remounts unlike a useRef
        const tokenKey = session.access_token ? session.access_token.slice(-20) : null
        if (tokenKey && _lastRecordedToken === tokenKey) return
        _lastRecordedToken = tokenKey

        const provider = u.app_metadata?.provider
        const authMethod = provider === 'google' ? 'google'
          : u.amr?.some(a => a.method === 'otp') ? 'otp'
          : u.amr?.some(a => a.method === 'totp') ? '2fa'
          : 'password'

        setTimeout(() => {
          fetchRole(u.id).then(r => {
            recordLoginEvent({ user: u, session, status: 'success', authMethod, userRole: r || 'resident' })
          })
        }, 500)
      }
    })

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [loadUser])

  // ── SIGN IN ──────────────────────────────────────────────────────────────
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      recordLoginEvent({ user: null, session: null, status: 'failed', authMethod: 'password', failureReason: error.message })
      throw error
    }
    setTimeout(() => {
      supabase.from('audit_logs').insert({
        user_id: data.user?.id, user_name: email,
        user_role: 'resident', action: 'Login',
        module: 'Auth', description: `Logged in: ${email}`, status: 'Success'
      }).then(() => {}).catch(() => {})
    }, 1000)
    return data
  }

  // ── SIGN IN WITH GOOGLE ──────────────────────────────────────────────────
  const signInWithGoogle = async (idToken) => {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Google sign-in failed on the server.')
    }
    const { access_token, refresh_token } = await res.json()
    const { error: sessionErr, data: sessionData } = await supabase.auth.setSession({ access_token, refresh_token })
    if (sessionErr) throw sessionErr

    if (sessionData?.user) {
      const u = sessionData.user
      const gName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || ''
      setTimeout(async () => {
        try {
          await supabase.from('user_roles').upsert(
            { user_id: u.id, email: u.email, name: gName, role: 'resident' },
            { onConflict: 'user_id', ignoreDuplicates: true }
          )
        } catch {}
      }, 1000)
    }
  }

  // ── SIGN UP ──────────────────────────────────────────────────────────────
  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name || '' } },
    })
    if (error) throw error
    if (data.user) {
      setTimeout(async () => {
        try {
          await supabase.from('user_roles').upsert(
            { user_id: data.user.id, email, name: name || email.split('@')[0], role: 'resident' },
            { onConflict: 'user_id', ignoreDuplicates: true }
          )
        } catch {}
      }, 1500)
    }
    return data
  }

  // ── SIGN OUT ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id, user_name: profile?.name || user?.email || 'User',
        user_role: role || 'resident', action: 'Logout',
        module: 'Auth', description: 'User logged out', status: 'Success'
      })
    } catch {}
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await recordLogout(session)
    } catch {}
    await supabase.auth.signOut()
  }

  // ── REFRESH PROFILE ──────────────────────────────────────────────────────
  const refreshProfile = async () => {
    if (user) { const p = await fetchProfile(user.id, user.email); setProfile(p) }
  }

  // ── LOG AUDIT ────────────────────────────────────────────────────────────
  const logAudit = async (action, module, description, uid = user?.id) => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: uid, user_name: profile?.name || user?.email || 'System',
        user_role: role || 'unknown', action, module, description, status: 'Success'
      })
    } catch {}
  }

  const clearNewGoogleUser = () => setIsNewGoogleUser(false)
  const profileComplete = !!profile?.profile_completed

  return (
    <Ctx.Provider value={{
      user, profile, role, loading,
      profileComplete, isNewGoogleUser,
      signIn, signInWithGoogle, signUp, signOut,
      refreshProfile, logAudit, clearNewGoogleUser,
    }}>
      {children}
    </Ctx.Provider>
  )
}
