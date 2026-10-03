# NEXUS

One feed. Twelve networks. A social command center.

This repository is the TanStack Start app (Better Auth, Postgres, the console).
The old Next.js stub that called a missing API has been removed.

## Stack

- TanStack Start + React 19 + Vite
- Better Auth (email/password, plus Google/X when broker credentials are set)
- Postgres in production, embedded Postgres locally when `DATABASE_URL` is unset
- Nitro, deployed to Vercel

## Local

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:8080 and create an account (email, username, password).

## Production

Set these on the host before deploying:

| Name | Why |
| --- | --- |
| `DATABASE_URL` | Postgres. Migrations run during `npm run build`. |
| `BETTER_AUTH_SECRET` | Signs session cookies. |
| `BETTER_AUTH_URL` | Public site origin. Sign-in rejects other origins. |

`npm run build` builds the app and applies `migrations/`.
