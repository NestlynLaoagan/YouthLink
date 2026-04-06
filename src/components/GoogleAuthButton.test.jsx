// src/components/GoogleAuthButton.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import GoogleAuthButton from './GoogleAuthButton'
import { supabase } from '../lib/supabase'

// Mock supabase so no real network calls happen
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}))

describe('GoogleAuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Sign in with Google button', () => {
    render(<GoogleAuthButton />)
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })

  it('is enabled by default', () => {
    render(<GoogleAuthButton />)
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('is disabled when disabled prop is passed', () => {
    render(<GoogleAuthButton disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls supabase signInWithOAuth with google provider on click', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValue({ error: null })

    render(<GoogleAuthButton />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      )
    })
  })

  it('always redirects to the production Netlify URL', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValue({ error: null })

    render(<GoogleAuthButton />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      const call = supabase.auth.signInWithOAuth.mock.calls[0][0]
      expect(call.options.redirectTo).toBe('https://skbakakengyouthlink.netlify.app')
    })
  })

  it('shows loading state while redirecting', async () => {
    // Never resolves so we can catch the loading state
    supabase.auth.signInWithOAuth.mockReturnValue(new Promise(() => {}))

    render(<GoogleAuthButton />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Redirecting to Google...')).toBeInTheDocument()
    })
  })

  it('calls onError when supabase returns an error', async () => {
    const mockError = new Error('OAuth failed')
    supabase.auth.signInWithOAuth.mockResolvedValue({ error: mockError })

    const onError = vi.fn()
    render(<GoogleAuthButton onError={onError} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('OAuth failed')
    })
  })
})
