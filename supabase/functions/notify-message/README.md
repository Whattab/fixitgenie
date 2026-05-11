# notify-message — Email Notification Edge Function

Sends an email to the conversation recipient when a new message arrives and
the recipient has been offline for more than 5 minutes.

---

## 1. Prerequisites

- A **Resend** account at <https://resend.com> (free tier: 3 000 emails/month)
- A **verified sending domain** on Resend  
  *(or use `onboarding@resend.dev` for initial smoke-testing — Resend's
  shared test domain; emails only deliver to your own verified address)*
- The SQL migration in `messaging_notifications_schema.sql` applied to your
  Supabase project

---

## 2. SQL migration

1. Open **Supabase Dashboard → SQL Editor**
2. Paste the full contents of `messaging_notifications_schema.sql` (repo root)
3. Click **Run**

Adds to `profiles`:
| Column | Type | Default | Purpose |
|---|---|---|---|
| `last_seen_at` | `timestamptz` | `now()` | Updated by client heartbeat every 60 s |
| `notify_email_on_message` | `boolean` | `true` | User opt-out flag |

---

## 3. Deploy the Edge Function

### Option A — Supabase CLI (recommended)

```bash
# From the repo root
supabase functions deploy notify-message
```

### Option B — Supabase Dashboard

1. Dashboard → **Edge Functions** → **New Function** → name it `notify-message`
2. Upload `supabase/functions/notify-message/index.ts`
3. Click **Deploy**

After deployment the function URL will look like:  
`https://<project-ref>.supabase.co/functions/v1/notify-message`

---

## 4. Set environment variables

Dashboard → **Edge Functions** → `notify-message` → **Settings** → **Secrets**

| Variable | Required | Value |
|---|---|---|
| `RESEND_API_KEY` | ✅ | Paste from Resend Dashboard → API Keys |
| `FROM_EMAIL` | Recommended | `Fixit Genie <noreply@your-domain.com>` |
| `APP_BASE_URL` | ✅ | Your production URL, e.g. `https://fixitgenie.com` |
| `SUPABASE_URL` | Auto-injected | Verify it appears; add manually if missing |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | Verify it appears; add manually if missing |

> **Never** hard-code `RESEND_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in
> source files. They are read exclusively from environment variables.

---

## 5. Create the Database Webhook

Dashboard → **Database** → **Webhooks** → **Create a new hook**

| Setting | Value |
|---|---|
| Name | `on_message_insert_notify` |
| Table | `messages` |
| Events | ☑ INSERT |
| Type | HTTP Request |
| Method | POST |
| URL | the function URL from Step 3 |
| HTTP Headers | *(none required — function is internal)* |

Click **Confirm**.

---

## 6. Smoke test

1. Log in as **User A** and send a message to **User B**
2. **User B** must have been inactive for > 5 minutes  
   *(last_seen_at heartbeat not updated — i.e. tab closed or in background)*
3. Within ~30 seconds **User B** should receive an email

### If no email arrives

- Check **Edge Function logs**: Dashboard → Edge Functions → `notify-message` → Logs
- Common causes:
  - `RESEND_API_KEY` not set or wrong
  - `FROM_EMAIL` domain not verified on Resend
  - Webhook not saved or pointing at wrong URL
  - Recipient's `last_seen_at` is within 5 minutes (user is "active")
  - Recipient's `notify_email_on_message` is `false`

---

## 7. User opt-out (future UI)

When you build notification preferences, update `profiles.notify_email_on_message`
to `false` for the authenticated user. The Edge Function already checks this flag.
