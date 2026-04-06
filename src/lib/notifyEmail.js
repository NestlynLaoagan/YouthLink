import { supabase } from './supabase'

/**
 * Call the send-notification-email Edge Function.
 * Invoke after successfully inserting/creating an announcement, event, or project.
 *
 * @param {'announcement'|'event'|'project'} type
 * @param {object} item  — the full saved row from Supabase
 */
export async function notifyEmailSubscribers(type, item) {
  try {
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: { type, item },
    })
    if (error) console.warn('[notifyEmail] Edge function error:', error.message)
  } catch (err) {
    // Non-fatal — don't interrupt the admin flow
    console.warn('[notifyEmail] Failed to invoke edge function:', err)
  }
}
