# NEXUS console

`main` is this app. The previous Next.js frontend (the one that posted to a
local API that was never in this repo) has been removed, so a Vercel deploy
builds the console.

## What works

- Email/password sign-up with a unique username
- Sign-in by email or username, with a specific error instead of a generic failure
- Unified feed, composer, inbox, calendar (recurring series + CSV import)
- RSS listen sources
- Analytics, reports, API keys, webhooks
- Team invites, audit log, notifications

## Production env

`DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` must be set on the
host. Without `DATABASE_URL` there is no durable database on Vercel.
