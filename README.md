# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## Messaging Feature — Deployment Setup

This project ships an in-app messaging feature for homeowners and pros.
When deploying to a new Supabase project, apply these in order:

### 1. SQL migrations (Supabase → SQL Editor → New Query → paste → Run)

Apply these files in order:

1. `messaging_schema.sql` — Phase 1: core tables (`conversations`,
   `messages`), RLS policies, helper functions, `chat-attachments`
   storage bucket, Realtime publication for both tables.
2. `messaging_notifications_schema.sql` — Phase 6: adds
   `last_seen_at` + `notify_email_on_message` columns to `profiles`.
3. `messaging_archive_cron.sql` — Phase 7: 30-day auto-archive cron
   job. **Requires `pg_cron` extension enabled first** via
   Supabase → Database → Extensions → toggle on `pg_cron`.

All three files are idempotent — safe to re-run.

### 2. Edge Function (optional — for email notifications)

Source: `supabase/functions/notify-message/index.ts`
Setup guide: `supabase/functions/notify-message/README.md`

Requires a Resend API key. The function fires on every new message and
emails the recipient if they haven't been active in the app for > 5 min.
Skipping this step does NOT break messaging — users just won't get
email notifications when offline.

### 3. Verify

After applying the SQL:
- Database → Replication → `messages` and `conversations` should both
  be in the `supabase_realtime` publication
- Storage → `chat-attachments` bucket exists, marked Private
- Database → Functions → confirms `archive_old_completed_conversations`,
  `is_conversation_participant`, `is_conversation_active`, and related
  triggers are present

