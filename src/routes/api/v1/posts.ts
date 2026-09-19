import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { simulatePublish } from "@/lib/nexus/demo";
import { PLATFORM_META } from "@/lib/nexus/platforms";
import { resolveApiKeyUser } from "@/lib/nexus/ops";
import { PLATFORM_IDS, type PlatformId } from "@/lib/nexus/types";

async function userFromRequest(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  return resolveApiKeyUser(token);
}

export const Route = createFileRoute("/api/v1/posts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userId = await userFromRequest(request);
        if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const sql = await getSql();
        const jobs = await sql<Record<string, unknown>>`
          select id, content, scheduled_at, created_at from publish_jobs
          where user_id = ${userId} order by created_at desc limit 20
        `;
        return Response.json({
          posts: jobs.map((j) => ({
            id: String(j.id),
            content: String(j.content),
            scheduledAt: j.scheduled_at ? new Date(String(j.scheduled_at)).toISOString() : null,
            createdAt: new Date(String(j.created_at)).toISOString(),
          })),
        });
      },
      POST: async ({ request }) => {
        const userId = await userFromRequest(request);
        if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
        let body: { content?: string; platforms?: string[]; scheduledAt?: string | null };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const content = (body.content ?? "").trim();
        if (!content) return Response.json({ error: "content is required" }, { status: 400 });
        const platforms = (body.platforms ?? []).filter((p): p is PlatformId =>
          (PLATFORM_IDS as readonly string[]).includes(p),
        );
        if (platforms.length === 0) {
          return Response.json({ error: "platforms must include at least one supported network" }, { status: 400 });
        }
        const sql = await getSql();
        const connections = await sql<{ platform: string }>`
          select platform from connections where user_id = ${userId} and status = 'active'
        `;
        const connected = new Set(connections.map((c) => c.platform));
        for (const p of platforms) {
          if (!connected.has(p)) {
            return Response.json({ error: `Connect ${PLATFORM_META[p].name} first` }, { status: 400 });
          }
        }
        const jobId = crypto.randomUUID();
        const scheduledAt = body.scheduledAt ?? null;
        await sql`
          insert into publish_jobs (id, user_id, content, scheduled_at)
          values (${jobId}, ${userId}, ${content}, ${scheduledAt})
        `;
        const scheduled = Boolean(scheduledAt && new Date(scheduledAt).getTime() > Date.now());
        const results = [];
        for (const platform of platforms) {
          const sim = scheduled ? { ok: true, error: "", latencyMs: 0 } : simulatePublish(platform, content);
          const status = scheduled ? "pending" : sim.ok ? "success" : "failed";
          const externalId = sim.ok && !scheduled ? `${platform}-${jobId.slice(0, 8)}` : "";
          await sql`
            insert into publish_targets (id, job_id, platform, status, external_id, error, latency_ms)
            values (${crypto.randomUUID()}, ${jobId}, ${platform}, ${status}, ${externalId}, ${sim.error}, ${sim.latencyMs})
          `;
          if (status === "success") {
            await sql`
              insert into feed_posts (
                id, user_id, platform, external_id, author_handle, author_name, content, is_own, posted_at
              ) values (
                ${crypto.randomUUID()}, ${userId}, ${platform}, ${externalId}, 'api', 'API', ${content}, true, now()
              )
              on conflict (user_id, platform, external_id) do nothing
            `;
          }
          results.push({ platform, status, error: sim.error, latencyMs: sim.latencyMs, externalId });
        }
        return Response.json({ jobId, results }, { status: 201 });
      },
    },
  },
});
