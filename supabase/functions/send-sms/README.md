# Send-sms — Premium Pro SMS Alerts

Sends an SMS to premium professionals when a homeowner posts a new service
request in their zip code. Triggered by a Supabase Database Webhook on
`INSERT` against `service_requests`.

## Deploy

This function source is the canonical copy. The deployed function lives in
the Supabase Dashboard under Edge Functions, named **Send-sms** (URL slug
auto-generated as `clever-endpoint`). To update it after editing the source
here:

1. Supabase Dashboard → Edge Functions → **Send-sms** → **Code** tab
2. Paste the full contents of `index.ts` from this folder
3. Click **Deploy**

Yes, this is a manual sync. The function was originally created in the
Dashboard editor, so there is no CLI deploy pipeline.

## Required environment variables

Set these in Supabase Dashboard → Edge Functions → Send-sms → Settings:

| Variable | Where to get it |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account → API keys & tokens |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account → API keys & tokens |
| `TWILIO_PHONE_NUMBER` | The Twilio number you bought (e.g. `+18335551234`) |
| `SUPABASE_URL` | Injected automatically by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Injected automatically by Supabase |

## Database Webhook

Created at Supabase Dashboard → Database → Webhooks:

- Table: `service_requests`
- Events: `INSERT`
- HTTP method: `POST`
- Type: Supabase Edge Functions → Send-sms

## Pro qualification criteria

For a pro to receive an SMS for a new request, ALL of the following must
be true on their `profiles` row:

- `type = 'professional'`
- `vetting_status = 'approved'`
- `is_premium = true`
- `active_zipcode` equals the zip code extracted from the new request's
  `city_state` field (regex `\b\d{5}\b`)

Their phone number is read from
`professional_details.onboarding_data.phone`. Must be present and US format.

## US carrier compliance

US SMS delivery requires one of:

1. **Toll-Free Verification** (for 8XX numbers) — Twilio Console → Messaging
   → Senders → Toll-Free Verifications. Approval takes 1-3 weeks.
2. **A2P 10DLC registration** (for regular 10-digit numbers) — Twilio
   Console → Messaging → Regulatory Compliance. Approval takes 1-7 days,
   ~$15 brand registration + $10/month per campaign.

Without one of these, US carriers silently filter messages (function logs
"sent" successfully but recipient never receives).

Message body must include opt-out language. Current implementation
appends `Reply STOP to opt out.` to every message. Twilio handles STOP
replies automatically — opted-out recipients are blocked at the platform
level without any additional code in this function.

## Known limitations (TODO)

- No rate limiting. If many pros match a zip, this loops with no throttle.
- US phone format only (assumes `+1`).
- Message body is hard-coded. No per-pro personalization or A/B variants.
- No retry on transient Twilio failures.
- No reply-handling for things other than STOP (e.g. HELP). Twilio
  handles HELP/STOP/UNSTOP automatically.
