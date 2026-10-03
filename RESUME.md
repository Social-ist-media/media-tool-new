# RESUME — next agent

Start here. Do not re-scaffold. This is a TanStack Start app in `/workspace` with auth ON.

## State
- Login works: `authClient.signIn.email` / `signUp.email` + Grok Google/X.
- Product is a 12-network social command center (demo connectors, not live OAuth).
- Latest slice: ops schema + drafts/inbox replies/calendar/library/approvals/API/webhooks/AI.
- GitHub: branch `nexus-console-build` on `Social-ist-media/media-tool-new`. Do not overwrite `main` (Next stub).

## Read first
1. `FEATURES.md`
2. `src/lib/nexus/data.ts` + `src/lib/nexus/ops.ts`
3. `migrations/0002_nexus.sql` + `migrations/0003_ops.sql`
4. `src/routes/dashboard.tsx`

## Resume commands
```
sh /workspace/startup.sh
curl -sf http://127.0.0.1:8080/
npm run typecheck
npm run check:auth
```

QA account previously used: `mihir@nexus.app` / `password123` (re-register if PGLite reset).

## Next 3 tasks
1. Finish pushing remaining source onto `nexus-console-build` if the last batch was truncated.
2. Wire live OAuth only if operator supplies keys — keep demo connectors otherwise.
3. Recurring posts, RSS in, bulk CSV import.

## Blockers (exact)
| Item | File/system | Next step |
|---|---|---|
| Live Twitter/Meta publish | `src/lib/nexus/demo.ts` | Replace `simulatePublish` with per-network clients once secrets exist |
| Password email reset | `src/routes/forgot-password.tsx` | Auth skill: no magic links; keep honesty unless SMTP + Better Auth token reset is approved |
| Native desktop/mobile | PWA only (`public/__grok`) | Do not add Electron theater; PWA install is the path |
| 99.99% SLA / pentest | ENTERPRISE.md | Cannot be evidenced in this sandbox |
| Production :8081 local vercel output | PGLite wasm omitted from nitro bundle | Deploy uses Neon; local `preview` is not the launch path |
