// src/lib/loginHistory.test.js
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock supabase BEFORE importing the module under test
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
    })),
  },
}))

// Mock fetch for ip-api geo call
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    status: 'success',
    query: '1.2.3.4',
    city: 'Baguio',
    country: 'Philippines',
    countryCode: 'PH',
  }),
})

import { recordLoginEvent, recordLogout } from './loginHistory'
import { supabase } from './supabase'

describe('recordLoginEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase mock to return no existing row
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
    })
  })

  it('inserts a login row on successful login', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: mockUpsert,
    })

    await recordLoginEvent({
      user:       { id: 'user1', email: 'user@gmail.com', amr: [] },
      session:    { access_token: 'a'.repeat(30) },
      status:     'success',
      authMethod: 'password',
      userRole:   'resident',
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id:     'user1',
        email:       'user@gmail.com',
        status:      'success',
        auth_method: 'password',
        user_role:   'resident',
      }),
      expect.any(Object)
    )
  })

  it('does not insert twice for the same session (dedup)', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: mockUpsert,
    })

    const args = {
      user:       { id: 'user2', email: 'dup@gmail.com', amr: [] },
      session:    { access_token: 'b'.repeat(30) },
      status:     'success',
      authMethod: 'password',
      userRole:   'resident',
    }

    await recordLoginEvent(args)
    await recordLoginEvent(args) // second call — same session

    // upsert should only be called once (module-level dedup guard)
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })

  it('records failed login with failure reason', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: mockUpsert,
    })

    await recordLoginEvent({
      user:          null,
      session:       null,
      status:        'failed',
      authMethod:    'password',
      failureReason: 'Invalid credentials',
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status:         'failed',
        failure_reason: 'Invalid credentials',
      }),
      expect.any(Object)
    )
  })
})

describe('recordLogout', () => {
  beforeEach(() => vi.clearAllMocks())
  it('updates the login_history row with logged_out_at', async () => {
    const mockUpdate = vi.fn().mockReturnThis()
    const mockIs = vi.fn().mockResolvedValue({ error: null })

    supabase.from.mockReturnValue({
      update: mockUpdate,
      eq: vi.fn().mockReturnThis(),
      is: mockIs,
    })

    await recordLogout({
      user: { id: 'user3' },
      access_token: 'c'.repeat(30),
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ logged_out_at: expect.any(String) })
    )
  })

  it('does nothing when session has no user', async () => {
    await recordLogout({ user: null })
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
