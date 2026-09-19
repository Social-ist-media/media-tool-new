# RESUME — next agent

Start here. Do not re-scaffold. This is a TanStack Start app with auth ON.

## State
- Login works.
- Product is a 12-network social command center (demo connectors, not live OAuth).
- GitHub: branch `nexus-console-build` on `Social-ist-media/media-tool-new`. Do not overwrite `main` (Next stub).

## Read first
1. `FEATURES.md`
2. `src/lib/nexus/data.ts` + `src/lib/nexus/ops.ts`
3. `migrations/0002_nexus.sql` + `migrations/0003_ops.sql`
4. `src/routes/dashboard.tsx`

## Next 3 tasks
1. Finish pushing remaining source onto `nexus-console-build` if the last batch was truncated.
2. Wire live OAuth only if operator supplies keys — keep demo connectors otherwise.
3. Recurring posts, RSS in, bulk CSV import.
