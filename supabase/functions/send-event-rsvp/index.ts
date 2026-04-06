// supabase/functions/send-event-rsvp/index.ts
// Place this file at:
//   barangay-connect2.0/supabase/functions/send-event-rsvp/index.ts
//
// Deploy with:
//   supabase functions deploy send-event-rsvp
//
// Set these secrets in Supabase Dashboard → Edge Functions → Secrets:
//   SMTP_HOST  (e.g. smtp.gmail.com)
//   SMTP_PORT  (e.g. 465)
//   SMTP_USER  (your Gmail or SMTP address)
//   SMTP_PASS  (your app password — NOT your regular Gmail password)
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { event, user_email, user_name } = await req.json();

    if (!event || !user_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event, user_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpUser = Deno.env.get("SMTP_USER") ?? "";
    const smtpPass = Deno.env.get("SMTP_PASS") ?? "";
    const smtpHost = Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") ?? "465");

    // ── Build .ics calendar invite ────────────────────────────────────────────
    const start = new Date(event.start_date);
    const end   = event.end_date
      ? new Date(event.end_date)
      : new Date(start.getTime() + 2 * 3600 * 1000); // default +2h if no end

    const toIcs = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const uid = `${event.id ?? Date.now()}-rsvp@barangayconnect`;

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BarangayConnect//EN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${toIcs(start)}`,
      `DTEND:${toIcs(end)}`,
      `SUMMARY:${event.title ?? "Community Event"}`,
      `DESCRIPTION:${(event.description ?? "").replace(/\n/g, "\\n")}`,
      `LOCATION:${event.location ?? ""}`,
      `ORGANIZER;CN=BarangayConnect:mailto:${smtpUser}`,
      `ATTENDEE;RSVP=TRUE;CN=${user_name}:mailto:${user_email}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      `DTSTAMP:${toIcs(new Date())}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    // ── Format readable dates ─────────────────────────────────────────────────
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-PH", {
        weekday: "long", year: "numeric", month: "long",
        day: "numeric", hour: "2-digit", minute: "2-digit",
      });

    // ── HTML email ────────────────────────────────────────────────────────────
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F7FAFC;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;
              overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1A365D,#2A4A7F);padding:28px 32px;">
      <p style="color:rgba(255,255,255,0.65);font-size:11px;letter-spacing:1.5px;
                text-transform:uppercase;margin:0 0 6px;">BarangayConnect</p>
      <h1 style="color:#ffffff;font-size:22px;margin:0;line-height:1.3;">
        🎉 You're registered!
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="color:#2D3748;font-size:15px;margin:0 0 4px;">
        Hi <strong>${user_name}</strong>,
      </p>
      <p style="color:#4A5568;font-size:14px;margin:0 0 24px;line-height:1.6;">
        You've successfully joined <strong>${event.title ?? "this event"}</strong>.
        A calendar invite is attached — tap or click it to add this event to your
        Google Calendar, Apple Calendar, or Outlook.
      </p>

      <!-- Event Details Card -->
      <div style="background:#F7FAFC;border-radius:12px;padding:18px 20px;
                  border:1px solid #E2E8F0;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#718096;width:110px;vertical-align:top;">
              📅 Starts
            </td>
            <td style="padding:6px 0;color:#2D3748;font-weight:600;">
              ${fmt(start)}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#718096;vertical-align:top;">🏁 Ends</td>
            <td style="padding:6px 0;color:#2D3748;font-weight:600;">
              ${fmt(end)}
            </td>
          </tr>
          ${event.handler ? `
          <tr>
            <td style="padding:6px 0;color:#718096;vertical-align:top;">👤 Handler</td>
            <td style="padding:6px 0;color:#2D3748;font-weight:600;">${event.handler}</td>
          </tr>` : ""}
          ${event.location ? `
          <tr>
            <td style="padding:6px 0;color:#718096;vertical-align:top;">📍 Venue</td>
            <td style="padding:6px 0;color:#2D3748;font-weight:600;">${event.location}</td>
          </tr>` : ""}
          ${event.max_participants ? `
          <tr>
            <td style="padding:6px 0;color:#718096;vertical-align:top;">👥 Slots</td>
            <td style="padding:6px 0;color:#2D3748;font-weight:600;">
              ${event.max_participants} total participants
            </td>
          </tr>` : ""}
        </table>
      </div>

      ${event.description ? `
      <p style="color:#4A5568;font-size:13px;line-height:1.7;margin:0 0 20px;">
        <strong>About:</strong> ${event.description}
      </p>` : ""}

      <p style="color:#718096;font-size:12px;margin:0;line-height:1.6;">
        See you there! If you have questions, please contact your barangay office directly.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#F7FAFC;border-top:1px solid #E2E8F0;">
      <p style="color:#A0AEC0;font-size:11px;margin:0;text-align:center;">
        BarangayConnect · This is an automated message. Please do not reply.
      </p>
    </div>

  </div>
</body>
</html>`;

    // ── Plain-text fallback ───────────────────────────────────────────────────
    const text = `
Hi ${user_name},

You've successfully registered for "${event.title ?? "this event"}".

Event Details:
  Start : ${fmt(start)}
  End   : ${fmt(end)}
  ${event.handler  ? `Handler : ${event.handler}\n  ` : ""}${event.location ? `Venue   : ${event.location}\n  ` : ""}

A calendar invite (.ics) is attached. Open it to add the event to your calendar.

See you there!
— BarangayConnect
`.trim();

    // ── Send email ────────────────────────────────────────────────────────────
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port:     smtpPort,
        tls:      true,
        auth:     { username: smtpUser, password: smtpPass },
      },
    });

    await client.send({
      from:    `BarangayConnect <${smtpUser}>`,
      to:      user_email,
      subject: `✅ You're registered: ${event.title ?? "Event"}`,
      content: text,
      html,
      attachments: [
        {
          filename:    "event-invite.ics",
          content:     icsContent,
          contentType: "text/calendar; method=REQUEST",
          encoding:    "utf-8",
        },
      ],
    });

    await client.close();

    console.log(`[send-event-rsvp] Email sent to ${user_email} for event: ${event.title}`);

    return new Response(
      JSON.stringify({ ok: true, message: "RSVP email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[send-event-rsvp] Error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
