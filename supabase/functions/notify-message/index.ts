// supabase/functions/notify-message/index.ts
// ---------------------------------------------------------------------------
// Notify-message — Database Webhook handler for messages INSERT
//
// Triggered by Supabase Database Webhook on:
//   table: messages  |  event: INSERT
//
// TODO(rate-limiting): V1 relies on the 5-min "last_seen_at" gate + the
//   notify_email_on_message flag to avoid flooding. A proper per-recipient
//   rate limit (e.g. Redis or a DB table) should be added before high-volume
//   production use.
// ---------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Env vars — guarded at startup so misconfiguration surfaces immediately.
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL =
  Deno.env.get('FROM_EMAIL') ?? 'Fixit Genie <onboarding@resend.dev>';
const APP_BASE_URL =
  Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** First word of a name, falling back to "there". */
function firstName(name: string | null | undefined): string {
  if (!name) return 'there';
  return name.split(' ')[0];
}

/** Safe 140-char preview of a message body. */
function buildPreview(body: string | null | undefined, kind: string): string {
  if (kind === 'image' && !body) return '[Photo]';
  if (!body) return '';
  return body.length <= 140 ? body : body.slice(0, 140) + '…';
}

/** Build a minimal HTML email body. */
function buildHtml(
  recipientFirst: string,
  senderName: string,
  category: string,
  preview: string,
  conversationUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="max-width:520px;margin:40px auto;padding:32px;background:#1e293b;border-radius:12px;">
    <tr><td>
      <h2 style="margin:0 0 16px;color:#f8fafc;font-size:1.1rem;">
        New message from ${escHtml(senderName)}
      </h2>
      <p style="margin:0 0 8px;color:#94a3b8;">
        Hi ${escHtml(recipientFirst)},
      </p>
      <p style="margin:0 0 16px;color:#cbd5e1;">
        <strong>${escHtml(senderName)}</strong> just sent you a new message about your
        &ldquo;${escHtml(category)}&rdquo; project on <strong>Fixit Genie</strong>.
      </p>
      ${preview ? `
      <div style="background:#0f172a;border-radius:8px;padding:12px 16px;margin:0 0 24px;color:#e2e8f0;font-style:italic;">
        &ldquo;${escHtml(preview)}&rdquo;
      </div>` : ''}
      <p style="margin:0 0 24px;">
        <a href="${conversationUrl}"
           style="display:inline-block;padding:10px 22px;background:#7c3aed;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:600;">
          Open Conversation
        </a>
      </p>
      <p style="margin:0;color:#64748b;font-size:0.8rem;">— Fixit Genie</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {
  // ── 0. Env guard ──────────────────────────────────────────────────────────
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    console.error('[notify-message] Missing required env vars. Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.');
    return new Response('Configuration error', { status: 500 });
  }

  // ── 1. Parse webhook payload ───────────────────────────────────────────────
  let payload: { type: string; table: string; record: Record<string, unknown>; schema: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (payload.type !== 'INSERT' || payload.table !== 'messages') {
    // Not the event we care about
    return new Response('Ignored', { status: 200 });
  }

  const record = payload.record;

  // ── 2. Skip system messages ────────────────────────────────────────────────
  if (record.kind === 'system') {
    console.log('[notify-message] Skipping system message', record.id);
    return new Response('Skipped (system)', { status: 200 });
  }

  const conversationId = record.conversation_id as string;
  const senderId = record.sender_id as string;
  const messageKind = record.kind as string;
  const messageBody = record.body as string | null;

  // ── 3. Service-role client (bypasses RLS) ─────────────────────────────────
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ── 4. Look up the conversation → determine recipient ─────────────────────
  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .select('homeowner_id, pro_id, request_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (convErr || !conv) {
    console.error('[notify-message] Could not load conversation:', convErr);
    return new Response('Internal error', { status: 500 });
  }

  const recipientId =
    senderId === conv.pro_id ? conv.homeowner_id : conv.pro_id;

  // ── 5. Look up recipient profile ───────────────────────────────────────────
  const { data: recipient, error: recipErr } = await admin
    .from('profiles')
    .select('id, email, name, last_seen_at, notify_email_on_message')
    .eq('id', recipientId)
    .maybeSingle();

  if (recipErr || !recipient) {
    console.error('[notify-message] Could not load recipient profile:', recipErr);
    return new Response('Internal error', { status: 500 });
  }

  if (recipient.notify_email_on_message === false) {
    console.log('[notify-message] Recipient opted out of email notifications.');
    return new Response('Skipped (opted out)', { status: 200 });
  }

  if (!recipient.email) {
    console.log('[notify-message] Recipient has no email address on file.');
    return new Response('Skipped (no email)', { status: 200 });
  }

  // ── 6. Online check: skip if last_seen_at within 5 minutes ────────────────
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const lastSeen = recipient.last_seen_at
    ? new Date(recipient.last_seen_at)
    : null;

  if (lastSeen && lastSeen > fiveMinutesAgo) {
    console.log('[notify-message] Recipient active recently — skipping email.');
    return new Response('Skipped (active)', { status: 200 });
  }

  // ── 7. Look up sender name ─────────────────────────────────────────────────
  const { data: sender, error: senderErr } = await admin
    .from('profiles')
    .select('name')
    .eq('id', senderId)
    .maybeSingle();

  if (senderErr) {
    console.error('[notify-message] Could not load sender profile:', senderErr);
  }

  const senderName = (sender?.name as string | null) ?? 'Someone';

  // ── 8. Look up service_request category ───────────────────────────────────
  const { data: sr, error: srErr } = await admin
    .from('service_requests')
    .select('category')
    .eq('id', conv.request_id)
    .maybeSingle();

  if (srErr) {
    console.error('[notify-message] Could not load service_request:', srErr);
  }

  const category = (sr?.category as string | null) ?? 'home services';

  // ── 9. Build email content ─────────────────────────────────────────────────
  const recipientFirst = firstName(recipient.name as string | null);
  const preview = buildPreview(messageBody, messageKind);
  const conversationUrl = `${APP_BASE_URL}/messages?conversation=${conversationId}`;

  const subject = `New message from ${senderName} about your ${category} project`;

  const textBody = [
    `Hi ${recipientFirst},`,
    '',
    `${senderName} just sent you a new message about your "${category}" project on Fixit Genie.`,
    ...(preview ? ['', 'Message preview:', `"${preview}"`, ''] : ['']),
    `Open the conversation:`,
    conversationUrl,
    '',
    '— Fixit Genie',
  ].join('\n');

  const htmlBody = buildHtml(recipientFirst, senderName, category, preview, conversationUrl);

  // ── 10. Send via Resend ────────────────────────────────────────────────────
  let resendResponse: Response;
  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipient.email],
        subject,
        text: textBody,
        html: htmlBody,
      }),
    });
  } catch (fetchErr) {
    console.error('[notify-message] Resend fetch failed:', fetchErr);
    return new Response('Failed to send email', { status: 500 });
  }

  if (!resendResponse.ok) {
    const errBody = await resendResponse.text();
    // Log full error server-side; return generic message to caller
    console.error(`[notify-message] Resend error ${resendResponse.status}:`, errBody);
    return new Response('Email delivery failed', { status: 500 });
  }

  console.log(`[notify-message] Email sent to recipient ${recipientId} for conversation ${conversationId}`);
  return new Response('OK', { status: 200 });
});
