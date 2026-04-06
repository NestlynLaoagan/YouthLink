// src/lib/notifyEmail.test.js
import { vi, describe, it, expect, beforeEach } from 'vitest'

// vi.mock is hoisted to the top of the file by Vitest — any variable defined
// outside the factory (like `const mockInvoke = vi.fn()`) doesn't exist yet
// when the factory executes. Fix: use vi.fn() inline, then grab the reference
// via the imported mock after the module is loaded.
vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { notifyEmailSubscribers } from './notifyEmail'
import { supabase } from './supabase'

// Safe to alias here — imports are resolved after the mock factory runs
const mockInvoke = supabase.functions.invoke

describe('notifyEmailSubscribers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invokes the send-notification-email edge function with correct payload', async () => {
    mockInvoke.mockResolvedValue({ error: null })

    const item = { id: '1', title: 'New Event', description: 'Test' }
    await notifyEmailSubscribers('event', item)

    expect(mockInvoke).toHaveBeenCalledWith('send-notification-email', {
      body: { type: 'event', item },
    })
  })

  it('calls the function for announcement type', async () => {
    mockInvoke.mockResolvedValue({ error: null })

    const item = { id: '2', title: 'New Announcement' }
    await notifyEmailSubscribers('announcement', item)

    expect(mockInvoke).toHaveBeenCalledWith('send-notification-email', {
      body: { type: 'announcement', item },
    })
  })

  it('does not throw when edge function returns an error', async () => {
    mockInvoke.mockResolvedValue({ error: new Error('function error') })

    // Non-fatal — should resolve, not throw
    await expect(notifyEmailSubscribers('project', {})).resolves.toBeUndefined()
  })

  it('does not throw when network call itself throws', async () => {
    mockInvoke.mockRejectedValue(new Error('network error'))

    await expect(notifyEmailSubscribers('event', {})).resolves.toBeUndefined()
  })
})
