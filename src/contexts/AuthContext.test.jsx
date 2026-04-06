// src/contexts/AuthContext.test.jsx
import { render, screen, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ error: null }),
      ilike: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: 'resident', error: null }),
  },
}))

vi.mock('../lib/loginHistory', () => ({
  recordLoginEvent: vi.fn(),
  recordLogout: vi.fn(),
}))

// Helper: component that reads auth context
function AuthConsumer() {
  const { user, loading, role } = useAuth()
  if (loading) return <div>Loading...</div>
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'no-user'}</span>
      <span data-testid="role">{role ?? 'no-role'}</span>
    </div>
  )
}

function setup() {
  // Default: no active session
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
  supabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts in loading state then settles with no user', async () => {
    setup()
    // Initial render may show loading
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })
  })

  it('exposes the signed-in user after a session is detected', async () => {
    const mockUser = { id: 'abc123', email: 'user@gmail.com', app_metadata: { provider: 'email' }, identities: [] }
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser, access_token: 'token123' } },
    })
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user@gmail.com')
    })
  })

  it('signIn calls supabase signInWithPassword', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    setup()

    function SignInButton() {
      const { signIn } = useAuth()
      return <button onClick={() => signIn('a@b.com', 'pass123')}>Sign In</button>
    }
    const { getByRole } = render(
      <AuthProvider>
        <SignInButton />
      </AuthProvider>
    )

    await act(async () => {
      getByRole('button').click()
    })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pass123',
    })
  })

  it('signIn throws when supabase returns an error', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: new Error('Invalid credentials'),
    })
    setup()

    function SignInButton() {
      const { signIn } = useAuth()
      const [err, setErr] = require('react').useState('')
      return (
        <>
          <button onClick={() => signIn('a@b.com', 'wrong').catch(e => setErr(e.message))}>Try</button>
          <span data-testid="err">{err}</span>
        </>
      )
    }
    const { getByRole, getByTestId } = render(
      <AuthProvider>
        <SignInButton />
      </AuthProvider>
    )

    await act(async () => { getByRole('button').click() })
    await waitFor(() => expect(getByTestId('err')).toHaveTextContent('Invalid credentials'))
  })

  it('signOut calls supabase auth.signOut', async () => {
    supabase.auth.signOut.mockResolvedValue({})
    setup()

    function SignOutButton() {
      const { signOut } = useAuth()
      return <button onClick={signOut}>Sign Out</button>
    }
    const { getByRole } = render(
      <AuthProvider>
        <SignOutButton />
      </AuthProvider>
    )

    await act(async () => { getByRole('button').click() })
    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled())
  })
})
