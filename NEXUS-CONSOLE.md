# NEXUS Console (this branch)

Working social command center built in Grok App Builder.

**Do not merge this branch onto `main` as a drop-in.** `main` is still the Next.js stub that talks to a missing Fastify API (that is why login is broken on the current Vercel URL). This branch is a **TanStack Start** app with real Better Auth, per-user Postgres, and a 12-network console.

## What works here
- Email/password + Google/X sign-in
- Unified feed, composer (drafts, schedule, media, Grok rewrite)
- Inbox replies, month calendar, library, approvals
- Analytics, reports/CSV, API keys, webhooks (`/api/v1/posts`)
- Team invites, audit log, notifications, command palette

## Layout
- `src/lib/nexus/` — data, ops, demo connectors
- `src/routes/dashboard/` — console surfaces
- `migrations/` — auth + product schema

Live OAuth for Twitter/Meta is **not** in this tree (demo connectors). Native store apps are not in this tree (PWA only).

Source of truth while developing: the Grok preview of this workspace.
