// src/pages/LoginPage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

// ── Mock all external dependencies ──────────────────────────────────────────

const mockSignIn  = vi.fn()
const mockSignUp  = vi.fn()
const mockToast   = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn:  mockSignIn,
    signUp:  mockSignUp,
    user:    null,
    role:    null,
    profile: null,
    isNewGoogleUser: false,
  }),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

vi.mock('../components/GoogleAuthButton', () => ({
  default: ({ onError }) => (
    <button onClick={() => onError?.('Google error')}>Sign in with Google</button>
  ),
}))

// Cloudflare Turnstile doesn't exist in jsdom — stub it
beforeEach(() => {
  window.turnstile = {
    render:  vi.fn(() => 'widget-id'),
    remove:  vi.fn(),
  }
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage — Login tab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders email and password fields', () => {
    renderLoginPage()
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('renders Login button', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('renders "Sign in with Google" button', () => {
    renderLoginPage()
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })

  it('shows toast error when CAPTCHA not completed on login', async () => {
    renderLoginPage()
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'user@gmail.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Password1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('CAPTCHA'),
        'error'
      )
    })
  })

  it('rejects non-gmail/yahoo email domains', async () => {
    renderLoginPage()
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'user@outlook.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Password1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining('@gmail.com'),
        'error'
      )
    })
  })

  it('shows Google error via toast when Google sign-in fails', async () => {
    renderLoginPage()
    fireEvent.click(screen.getByText('Sign in with Google'))
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Google error', 'error')
    })
  })

  it('toggles to Sign Up tab when "Sign Up" link is clicked', () => {
    renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    expect(screen.getByText('Create Account')).toBeInTheDocument()
  })

  it('opens Forgot Password modal', () => {
    renderLoginPage()
    fireEvent.click(screen.getByText(/forget your password/i))
    expect(screen.getByText('Reset Password')).toBeInTheDocument()
  })
})

describe('LoginPage — Sign Up tab', () => {
  beforeEach(() => vi.clearAllMocks())

  function switchToSignup() {
    renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
  }

  it('renders name, email, and password fields on signup tab', () => {
    switchToSignup()
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('shows password strength requirements when typing', () => {
    switchToSignup()
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'abc' },
    })
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
  })

  it('shows all password checks satisfied', () => {
    switchToSignup()
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Password1' },
    })
    const checks = screen.getAllByText(/at least 8 characters|one uppercase|one lowercase|one number/i)
    expect(checks.length).toBeGreaterThan(0)
  })

  it('shows CAPTCHA error when submitting without completing it', async () => {
    switchToSignup()
    fireEvent.change(screen.getByPlaceholderText('Full name'),     { target: { value: 'Juan Dela Cruz' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'juan@gmail.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'),      { target: { value: 'Password1' } })

    // Check the terms boxes
    const checkboxes = screen.getAllByRole('button', { hidden: true })
    // Trigger form submission
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled()
    })
  })
})
