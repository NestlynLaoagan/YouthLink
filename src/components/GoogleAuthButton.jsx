/**
 * GoogleAuthButton.jsx
 * Place in: src/components/GoogleAuthButton.jsx
 *
 * Uses Supabase's built-in Google OAuth — no GIS script, no backend needed.
 * Supabase handles the entire OAuth flow via its own Google provider.
 *
 * Prerequisites (one-time setup):
 *  1. Supabase Dashboard → Authentication → Providers → Google → Enable
 *     and paste your Google Cloud OAuth Client ID + Secret.
 *  2. Google Cloud Console → Credentials → OAuth Client →
 *     Authorized redirect URIs → add:
 *       https://<your-project>.supabase.co/auth/v1/callback
 *  3. No VITE_GOOGLE_CLIENT_ID needed in .env — Supabase manages it.
 */

import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

// Google logo SVG (official colors)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2582c-.806.54-1.8368.859-3.0477.859-2.3441 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.5927.1018-1.1695.282-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71Z" fill="#FBBC05"/>
    <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795Z" fill="#EA4335"/>
  </svg>
)

export default function GoogleAuthButton({ onSuccess, onError, disabled }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading || disabled) return
    setLoading(true)

    try {
      // Always redirect to the production Netlify URL after Google OAuth.
      // This prevents Supabase from redirecting back to localhost after login.
      const redirectTo = 'https://skbakakengyouthlink.netlify.app'

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) throw error

      // signInWithOAuth redirects the browser — onSuccess is called by
      // AuthContext once the session is detected after the redirect.
      onSuccess?.()
    } catch (err) {
      console.error('[GoogleAuthButton]', err)
      onError?.(err.message || 'Google sign-in failed.')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: 50,
        border: '1.5px solid #E8ECF0',
        background: loading ? '#F7F8FA' : 'white',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        color: '#2D3748',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'border-color .15s, box-shadow .15s, background .15s',
        boxSizing: 'border-box',
        opacity: disabled ? 0.6 : 1,
        letterSpacing: '0.2px',
      }}
      onMouseEnter={e => {
        if (!loading && !disabled) {
          e.currentTarget.style.borderColor = '#CBD5E0'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#E8ECF0'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {loading ? (
        <>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid #E2E8F0', borderTopColor: '#1A365D',
            animation: 'spin .6s linear infinite', flexShrink: 0,
          }} />
          <span>Redirecting to Google...</span>
        </>
      ) : (
        <>
          <GoogleIcon />
          <span>Sign in with Google</span>
        </>
      )}
    </button>
  )
}
