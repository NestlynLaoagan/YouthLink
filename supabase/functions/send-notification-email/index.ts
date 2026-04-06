import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CAT_KEY: Record<string, string> = {
  announcement: 'announcements',
  event:        'events',
  project:      'projects',
}

function fmtDay(d?: string) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('en-PH', { weekday: 'long' }) } catch { return null }
}
function fmtDate(d?: string) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) } catch { return d }
}
function fmtTime(d?: string) {
  if (!d) return null
  try { return new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) } catch { return null }
}
function fmtDateTime(d?: string) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return d }
}

function buildIcs(item: Record<string, any>): string {
  const start = new Date(item.start_date || item.date_time || new Date())
  const end   = item.end_date ? new Date(item.end_date) : new Date(start.getTime() + 2 * 3600 * 1000)
  const toIcs = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const uid   = `${item.id ?? item.event_id ?? Date.now()}-invite@barangayconnect`
  const title = (item.title || 'Community Event').replace(/,/g, '\\,')
  const desc  = (item.content || item.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,')
  const loc   = (item.location || '').replace(/,/g, '\\,')
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SK Bakakeng Central//BarangayConnect//EN',
    'METHOD:REQUEST','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${uid}`,`DTSTART:${toIcs(start)}`,
    `DTEND:${toIcs(end)}`,`DTSTAMP:${toIcs(new Date())}`,`SUMMARY:${title}`,`DESCRIPTION:${desc}`,
    `LOCATION:${loc}`,'ORGANIZER;CN=SK Bakakeng Central:mailto:noreply@barangayconnect.app',
    'STATUS:CONFIRMED','SEQUENCE:0','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Reminder',
    'TRIGGER:-PT1H','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n')
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach(b => binary += String.fromCharCode(b))
  return btoa(binary)
}

function buildEmail(opts: {
  recipientName: string; type: string; item: Record<string, any>; portalBaseUrl: string
}): { subject: string; html: string; text: string } {
  const { recipientName, type, item, portalBaseUrl } = opts
  const title    = item.title || item.project_name || 'New Update'
  const content  = item.content || item.description || ''
  const location = item.location || null
  const startDate = item.start_date || item.date_time || null
  const endDate   = item.end_date || null

  const dayStr  = fmtDay(startDate)
  const dateStr = fmtDate(startDate)
  const timeStr = fmtTime(startDate)
  const startFull = fmtDateTime(startDate)
  const endFull   = endDate ? fmtDateTime(endDate) : null

  const whenStr = [dayStr, dateStr, timeStr].filter(Boolean).join(', ')
  const isEvent = type === 'event'

  const subject = isEvent
    ? `📅 You're Invited: ${title} — SK Bakakeng Central`
    : type === 'announcement'
      ? `📢 New Announcement: ${title} — SK Bakakeng Central`
      : `🚀 New SK Project: ${title} — SK Bakakeng Central`

  // Deep link: login page redirects authenticated users straight to event
  const eventDeepLink = isEvent && item.id ? `/dashboard?tab=events&event=${item.id}` : '/dashboard?tab=events'
  const joinUrl = isEvent
    ? `${portalBaseUrl}/login?redirect=${encodeURIComponent(eventDeepLink)}`
    : `${portalBaseUrl}/dashboard`

  const startISO = startDate ? new Date(startDate).toISOString() : new Date().toISOString()
  const endISO   = endDate ? new Date(endDate).toISOString() : new Date(new Date(startISO).getTime() + 2*3600*1000).toISOString()
  const toGcalFmt = (iso: string) => iso.replace(/[-:.]/g, '').slice(0, 15) + 'Z'

  const googleCalUrl = isEvent
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${toGcalFmt(startISO)}/${toGcalFmt(endISO)}&details=${encodeURIComponent(content)}&location=${encodeURIComponent(location||'')}&sf=true&output=xml`
    : null
  const outlookUrl = isEvent
    ? `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(title)}&startdt=${encodeURIComponent(startISO)}&enddt=${encodeURIComponent(endISO)}&body=${encodeURIComponent(content)}&location=${encodeURIComponent(location||'')}`
    : null

  const posterUrl = (Array.isArray(item.posters) && item.posters[0]) || (Array.isArray(item.images) && item.images[0]) || item.banner_url || null

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#1A365D 0%,#2A4A7F 100%);padding:32px 36px;">
  <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:2px;text-transform:uppercase;">SK Bakakeng Central Youth Portal</p>
  <h1 style="margin:0;font-size:24px;font-weight:800;color:white;line-height:1.3;">${isEvent ? "🎉 You're Invited!" : type==='announcement' ? '📢 New Announcement' : '🚀 New SK Project'}</h1>
</td></tr>

${posterUrl ? `<tr><td style="padding:0;"><img src="${posterUrl}" alt="${title}" style="width:100%;max-height:280px;object-fit:cover;display:block;" onerror="this.style.display='none'"/></td></tr>` : ''}

<!-- Body -->
<tr><td style="padding:36px 36px 28px;">

  <p style="margin:0 0 8px;font-size:16px;color:#4A5568;line-height:1.8;">
    Hey <strong style="color:#1A365D;">${recipientName}</strong>,
  </p>

  ${isEvent ? `<p style="margin:0 0 20px;font-size:15px;color:#4A5568;line-height:1.8;">Don't miss our next event</p>` : ''}

  <!-- Title card -->
  <div style="background:#F7FAFC;border-left:4px solid #1A365D;border-radius:0 12px 12px 0;padding:18px 22px;margin-bottom:24px;">
    <h2 style="margin:0 0 ${content?'12px':'0'};font-size:22px;font-weight:800;color:#1A365D;line-height:1.3;">${title}</h2>
    ${content ? `<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#A0AEC0;text-transform:uppercase;letter-spacing:.8px;">About the event</p><p style="margin:0;font-size:14px;color:#718096;line-height:1.7;">${content}</p>` : ''}
  </div>

  ${(isEvent && (whenStr || location)) ? `
  <!-- When & Where -->
  <div style="background:#EBF8FF;border:1px solid #BEE3F8;border-radius:14px;padding:22px 26px;margin-bottom:24px;">
    <p style="margin:0 0 14px;font-size:12px;font-weight:800;color:#2B6CB0;text-transform:uppercase;letter-spacing:1.2px;">When &amp; Where</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      ${whenStr ? `<tr><td style="padding:6px 18px 6px 0;color:#718096;font-size:13px;font-weight:700;white-space:nowrap;vertical-align:top;">📅 When?</td><td style="padding:6px 0;color:#2D3748;font-size:14px;font-weight:700;">${whenStr}</td></tr>` : ''}
      ${location ? `<tr><td style="padding:6px 18px 6px 0;color:#718096;font-size:13px;font-weight:700;white-space:nowrap;vertical-align:top;">📍 Where?</td><td style="padding:6px 0;color:#2D3748;font-size:14px;font-weight:700;">${location}</td></tr>` : ''}
    </table>
  </div>` : ''}

  ${isEvent ? `
  <!-- Add to Calendar -->
  <div style="margin-bottom:28px;">
    <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:.8px;">Add to Calendar</p>
    <table cellpadding="0" cellspacing="6"><tr>
      <td><a href="${googleCalUrl}" style="display:inline-block;background:#4285F4;color:white;text-decoration:none;padding:9px 18px;border-radius:8px;font-size:12px;font-weight:700;">Google Calendar</a></td>
      <td style="padding-left:8px;"><a href="${outlookUrl}" style="display:inline-block;background:#0078D4;color:white;text-decoration:none;padding:9px 18px;border-radius:8px;font-size:12px;font-weight:700;">Outlook</a></td>
    </tr></table>
    <p style="margin:10px 0 0;font-size:11px;color:#A0AEC0;">An <strong>event-invite.ics</strong> is attached — open it to add to Apple Calendar, Yahoo, or any other calendar app.</p>
  </div>` : ''}

  <!-- Closing + CTA -->
  <p style="margin:0 0 28px;font-size:15px;color:#4A5568;line-height:1.8;">We hope to see you there!</p>

  <div style="text-align:center;margin-bottom:10px;">
    <a href="${joinUrl}"
      style="display:inline-block;background:linear-gradient(135deg,#1A365D,#2A4A7F);
             color:white;text-decoration:none;padding:16px 48px;border-radius:50px;
             font-size:15px;font-weight:800;letter-spacing:0.5px;
             box-shadow:0 6px 20px rgba(26,54,93,0.35);">
      Join Now
    </a>
  </div>
  <p style="margin:6px 0 0;text-align:center;font-size:11px;color:#CBD5E0;">
    Already signed in? Clicking "Join Now" will take you directly to the event.
  </p>

</td></tr>

<!-- Footer -->
<tr><td style="background:#F7FAFC;border-top:1px solid #E8ECF0;padding:22px 36px;text-align:center;">
  <p style="margin:0 0 4px;font-size:12px;color:#A0AEC0;">SK Bakakeng Central · Baguio City, Benguet</p>
  <p style="margin:0;font-size:11px;color:#CBD5E0;">
    You're receiving this because you enabled email notifications in your account settings.<br/>
    To unsubscribe, visit Settings → Notifications in your portal account.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const text = [
    `Hey ${recipientName},`,
    '',
    isEvent ? `Don't miss our next event: ${title}` : title,
    content ? `\nAbout the event: ${content}` : '',
    whenStr ? `\nWhen? ${whenStr}` : '',
    location ? `Where? ${location}` : '',
    '',
    'We hope to see you there!',
    '',
    `Join Now: ${joinUrl}`,
    '',
    '— SK Bakakeng Central Youth Portal',
  ].join('\n')

  return { subject, html, text }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { type, item } = await req.json() as { type: string; item: Record<string, any> }

    if (!type || !item) {
      return new Response(JSON.stringify({ error: 'Missing type or item' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const catKey = CAT_KEY[type]
    if (!catKey) {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'project') {
      const status = (item.status || '').toLowerCase()
      if (!['upcoming', 'ongoing', ''].includes(status)) {
        return new Response(JSON.stringify({ skipped: true, reason: 'Not an upcoming project' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const portalBaseUrl = (Deno.env.get('PORTAL_BASE_URL') || 'https://barangay-connect2-0.vercel.app').replace(/\/$/, '')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, name, email, notification_prefs')
      .not('notification_prefs', 'is', null)

    if (profErr) throw profErr

    const recipients = (profiles || []).filter(p => {
      const prefs = p.notification_prefs
      return prefs?.channels?.email === true && prefs?.cats?.[catKey] === true
    })

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No opted-in recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY env var not set')

    const isEvent = type === 'event'
    const icsContent = isEvent ? buildIcs(item) : null
    const icsBase64  = icsContent ? toBase64(icsContent) : null

    let sent = 0
    const errors: string[] = []

    for (const p of recipients) {
      const recipientEmail = p.email
      if (!recipientEmail) continue
      const recipientName = p.name || recipientEmail.split('@')[0] || 'Youth Member'
      const { subject, html, text } = buildEmail({ recipientName, type, item, portalBaseUrl })

      const attachments = icsBase64
        ? [{ filename: 'event-invite.ics', content: icsBase64, type: 'text/calendar; method=REQUEST' }]
        : []

      const body: Record<string, any> = {
        from: 'SK Bakakeng Central <onboarding@resend.dev>',
        to:   [recipientEmail],
        subject,
        html,
        text,
      }
      if (attachments.length > 0) body.attachments = attachments

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) { sent++ } else { errors.push(`${recipientEmail}: ${await res.text()}`) }
    }

    return new Response(
      JSON.stringify({ sent, total: recipients.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
