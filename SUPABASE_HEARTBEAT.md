# Supabase Heartbeat

This project has two daily keepalive paths that send `hi` to Supabase:

1. Vercel Cron calls `GET /api/heartbeat` once per day from `vercel.json`.
2. GitHub Actions runs `npm run heartbeat` once per day from `.github/workflows/supabase-heartbeat.yml`.

Both write to the `heartbeat_messages` table defined in `supabase/schema.sql`.

## Required Supabase Setup

Apply `supabase/schema.sql` to the Supabase project used by this app. At minimum, the database needs this table:

```sql
create table if not exists heartbeat_messages (
  id text primary key,
  message text not null default 'hi',
  sent_at timestamptz not null default now()
);
```

## Required Environment Variables

For the app and Vercel cron:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
CRON_SECRET=
```

For the GitHub Actions heartbeat, add these repository secrets:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

`CRON_SECRET` is optional locally, but recommended in Vercel. When set, `/api/heartbeat` requires `Authorization: Bearer <CRON_SECRET>`.

## Verification

Use these checks after secrets are configured:

```bash
npm run heartbeat
curl https://your-deployment.example/api/supabase-health
curl -H "Authorization: Bearer $CRON_SECRET" https://your-deployment.example/api/heartbeat
```
