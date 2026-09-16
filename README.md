# NEXUS

One feed. Twelve networks. A social command center.

Publish, listen, engage, and measure from a single dashboard.

## Repositories

- **Production monorepo:** [Mangu-Platforms/centuries](https://github.com/Mangu-Platforms/centuries) — Next.js web (`apps/web`) + Fastify API (`apps/api`)
- **This repo:** [redinc23/nexus-console](https://github.com/redinc23/nexus-console) — standalone Vercel-ready web app (same `apps/web` surface)

## Deploy

- **This repo → Vercel project `nexus-console`** (root = repo root)
- **Monorepo web → Vercel project `nexus`**, root directory `apps/web`
- API → Railway (see `DEPLOY.md` in centuries)

### Live (centuries / nexus)

- Production: https://nexus-mocha-psi-88.vercel.app
- Alias: https://nexus-redinc23s-projects.vercel.app
- Latest deploy: https://nexus-15xionv7i-redinc23s-projects.vercel.app

## Local

```bash
cp .env.example .env.local
npm install
npm run dev
```

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:4000` (centuries `apps/api`).
Demo workspace: chronological feed, composer, inbox, connections, analytics, settings.
