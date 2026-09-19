import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { PLATFORM_META } from "./platforms";
import { PLATFORM_IDS, type ApprovalItem, type BestTimeCell, type CannedReply, type Draft, type MediaAsset, type NotificationItem, type PlatformId, type Template, type ApiKeyRow, type WebhookRow } from "./types";

const platformSchema = z.enum(PLATFORM_IDS);

function asBool(v: unknown): boolean {
  return v === true || v === "t" || v === "true" || v === 1 || v === "1";
}
function asNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function asIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return new Date().toISOString();
}
function parseJsonList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw !== "string" || !raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function audit(userId: string, action: string, detail = "") {
  const sql = await getSql();
  await sql`insert into audit_events (id, user_id, action, detail) values (${crypto.randomUUID()}, ${userId}, ${action}, ${detail})`;
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(prefix: string, bytes = 24): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  const hex = Array.from(raw)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}${hex}`;
}

function mapDraft(r: Record<string, unknown>): Draft {
  return {
    id: String(r.id),
    content: String(r.content ?? ""),
    mediaUrls: parseJsonList(r.media_urls),
    platforms: parseJsonList(r.platforms).filter((p): p is PlatformId => (PLATFORM_IDS as readonly string[]).includes(p)),
    firstComment: String(r.first_comment ?? ""),
    utm: String(r.utm ?? ""),
    scheduledAt: r.scheduled_at ? asIso(r.scheduled_at) : null,
    updatedAt: asIso(r.updated_at ?? r.created_at),
  };
}

export const listDrafts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from drafts where user_id = ${context.userId} order by updated_at desc limit 40
    `;
    return rows.map(mapDraft);
  });

export const saveDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        content: z.string().max(10000),
        mediaUrls: z.array(z.string()).max(4).optional(),
        platforms: z.array(platformSchema).optional(),
        firstComment: z.string().max(500).optional(),
        utm: z.string().max(240).optional(),
        scheduledAt: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = data.id ?? crypto.randomUUID();
    const media = JSON.stringify(data.mediaUrls ?? []);
    const platforms = JSON.stringify(data.platforms ?? []);
    const existing = await sql<{ id: string }>`
      select id from drafts where id = ${id} and user_id = ${context.userId} limit 1
    `;
    if (existing[0]) {
      await sql`
        update drafts set
          content = ${data.content},
          media_urls = ${media},
          platforms = ${platforms},
          first_comment = ${data.firstComment ?? ""},
          utm = ${data.utm ?? ""},
          scheduled_at = ${data.scheduledAt ?? null},
          updated_at = now()
        where id = ${id} and user_id = ${context.userId}
      `;
    } else {
      await sql`
        insert into drafts (id, user_id, content, media_urls, platforms, first_comment, utm, scheduled_at)
        values (${id}, ${context.userId}, ${data.content}, ${media}, ${platforms}, ${data.firstComment ?? ""}, ${data.utm ?? ""}, ${data.scheduledAt ?? null})
      `;
    }
    await audit(context.userId, "draft.save", id);
    const rows = await sql<Record<string, unknown>>`select * from drafts where id = ${id} limit 1`;
    return mapDraft(rows[0]!);
  });

export const deleteDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from drafts where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const listTemplates = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from templates where user_id = ${context.userId} order by created_at desc
    `;
    if (rows.length === 0) {
      const seed = [
        {
          title: "Product launch",
          category: "launch",
          content: "We just shipped {feature}. It cuts the time from idea to live post.\n\nTry it: {link}",
        },
        {
          title: "Weekly recap",
          category: "recap",
          content: "This week:\n• Shipped {one}\n• Learned {two}\n• Next: {three}",
        },
        {
          title: "Hiring",
          category: "hiring",
          content: "We're hiring a {role}. You will own {scope}. If this is you, reply.",
        },
      ];
      for (const t of seed) {
        await sql`
          insert into templates (id, user_id, title, content, category)
          values (${crypto.randomUUID()}, ${context.userId}, ${t.title}, ${t.content}, ${t.category})
        `;
      }
      const again = await sql<Record<string, unknown>>`
        select * from templates where user_id = ${context.userId} order by created_at desc
      `;
      return again.map(
        (r): Template => ({
          id: String(r.id),
          title: String(r.title),
          content: String(r.content),
          category: String(r.category ?? "general"),
          createdAt: asIso(r.created_at),
        }),
      );
    }
    return rows.map(
      (r): Template => ({
        id: String(r.id),
        title: String(r.title),
        content: String(r.content),
        category: String(r.category ?? "general"),
        createdAt: asIso(r.created_at),
      }),
    );
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ title: z.string().min(1).max(80), content: z.string().min(1).max(4000), category: z.string().max(40).optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into templates (id, user_id, title, content, category)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.title}, ${data.content}, ${data.category ?? "general"})
    `;
    await audit(context.userId, "template.create", data.title);
    return { ok: true };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from templates where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const listCannedReplies = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from canned_replies where user_id = ${context.userId} order by created_at desc
    `;
    return rows.map(
      (r): CannedReply => ({
        id: String(r.id),
        title: String(r.title),
        content: String(r.content),
        createdAt: asIso(r.created_at),
      }),
    );
  });

export const saveCannedReply = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ title: z.string().min(1).max(80), content: z.string().min(1).max(1000) }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into canned_replies (id, user_id, title, content)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.title}, ${data.content})
    `;
    return { ok: true };
  });

export const deleteCannedReply = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from canned_replies where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const replyInbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string(), content: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      select id from inbox_items where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    if (!rows[0]) throw new Error("Inbox item not found");
    await sql`
      insert into inbox_replies (id, user_id, inbox_id, content)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.id}, ${data.content.trim()})
    `;
    await sql`update inbox_items set read = true where id = ${data.id} and user_id = ${context.userId}`;
    await audit(context.userId, "inbox.reply", data.id);
    return { ok: true };
  });

export const listMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select id, name, mime, data_url, created_at from media_assets
      where user_id = ${context.userId} order by created_at desc limit 60
    `;
    return rows.map(
      (r): MediaAsset => ({
        id: String(r.id),
        name: String(r.name),
        mime: String(r.mime),
        dataUrl: String(r.data_url),
        createdAt: asIso(r.created_at),
      }),
    );
  });

export const saveMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ name: z.string().min(1).max(120), mime: z.string().max(80), dataUrl: z.string().min(1).max(1_400_000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    if (!data.dataUrl.startsWith("data:image/")) throw new Error("Only images can be stored in the library.");
    const sql = await getSql();
    const [count] = await sql<{ n: number }>`select count(*)::int as n from media_assets where user_id = ${context.userId}`;
    if (asNum(count?.n) >= 40) throw new Error("Library is full (40 assets). Delete one first.");
    const id = crypto.randomUUID();
    await sql`
      insert into media_assets (id, user_id, name, mime, data_url)
      values (${id}, ${context.userId}, ${data.name}, ${data.mime}, ${data.dataUrl})
    `;
    return { id };
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from media_assets where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from notifications where user_id = ${context.userId} order by created_at desc limit 30
    `;
    return rows.map(
      (r): NotificationItem => ({
        id: String(r.id),
        title: String(r.title),
        body: String(r.body ?? ""),
        href: String(r.href ?? ""),
        read: asBool(r.read),
        createdAt: asIso(r.created_at),
      }),
    );
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().optional(), all: z.boolean().optional() }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.all) {
      await sql`update notifications set read = true where user_id = ${context.userId}`;
    } else if (data.id) {
      await sql`update notifications set read = true where id = ${data.id} and user_id = ${context.userId}`;
    }
    return { ok: true };
  });

export const listApiKeys = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select id, name, prefix, last_used_at, created_at from api_keys
      where user_id = ${context.userId} order by created_at desc
    `;
    return rows.map(
      (r): ApiKeyRow => ({
        id: String(r.id),
        name: String(r.name),
        prefix: String(r.prefix),
        lastUsedAt: r.last_used_at ? asIso(r.last_used_at) : null,
        createdAt: asIso(r.created_at),
      }),
    );
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ name: z.string().min(1).max(60) }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const [count] = await sql<{ n: number }>`select count(*)::int as n from api_keys where user_id = ${context.userId}`;
    if (asNum(count?.n) >= 8) throw new Error("Maximum of 8 API keys.");
    const token = randomToken("nxk_");
    const hash = await sha256Hex(token);
    const prefix = token.slice(0, 10);
    const id = crypto.randomUUID();
    await sql`
      insert into api_keys (id, user_id, name, prefix, hash)
      values (${id}, ${context.userId}, ${data.name}, ${prefix}, ${hash})
    `;
    await audit(context.userId, "apikey.create", data.name);
    return { id, token, prefix };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from api_keys where id = ${data.id} and user_id = ${context.userId}`;
    await audit(context.userId, "apikey.revoke", data.id);
    return { ok: true };
  });

export const listWebhooks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from webhooks where user_id = ${context.userId} order by created_at desc
    `;
    return rows.map(
      (r): WebhookRow => ({
        id: String(r.id),
        url: String(r.url),
        events: parseJsonList(r.events),
        secret: String(r.secret),
        active: asBool(r.active),
        lastStatus: asNum(r.last_status),
        createdAt: asIso(r.created_at),
      }),
    );
  });

export const saveWebhook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        url: z.string().url().max(400),
        events: z.array(z.enum(["post.publish", "post.schedule", "inbox.reply", "approval.decided"])).min(1),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    if (!data.url.startsWith("https://")) throw new Error("Webhook URL must be https.");
    const sql = await getSql();
    const secret = randomToken("nwh_");
    await sql`
      insert into webhooks (id, user_id, url, events, secret)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.url}, ${JSON.stringify(data.events)}, ${secret})
    `;
    await audit(context.userId, "webhook.create", data.url);
    return { secret };
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from webhooks where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const testWebhook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from webhooks where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    const hook = rows[0];
    if (!hook) throw new Error("Webhook not found");
    const body = JSON.stringify({
      event: "webhook.test",
      at: new Date().toISOString(),
      workspace: context.userId.slice(0, 8),
    });
    const sig = await sha256Hex(`${hook.secret}.${body}`);
    let status = 0;
    try {
      const res = await fetch(String(hook.url), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-nexus-signature": sig,
        },
        body,
        signal: AbortSignal.timeout(4000),
      });
      status = res.status;
    } catch {
      status = 0;
    }
    await sql`update webhooks set last_status = ${status} where id = ${data.id}`;
    return { status };
  });

export const listApprovals = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from approvals where user_id = ${context.userId} order by created_at desc limit 40
    `;
    return rows.map(
      (r): ApprovalItem => ({
        id: String(r.id),
        content: String(r.content),
        platforms: parseJsonList(r.platforms).filter((p): p is PlatformId => (PLATFORM_IDS as readonly string[]).includes(p)),
        mediaUrls: parseJsonList(r.media_urls),
        scheduledAt: r.scheduled_at ? asIso(r.scheduled_at) : null,
        status: (r.status as ApprovalItem["status"]) ?? "pending",
        reviewerNote: String(r.reviewer_note ?? ""),
        createdAt: asIso(r.created_at),
      }),
    );
  });

export const submitApproval = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        content: z.string().min(1).max(10000),
        platforms: z.array(platformSchema).min(1),
        mediaUrls: z.array(z.string()).max(4).optional(),
        scheduledAt: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into approvals (id, user_id, content, platforms, media_urls, scheduled_at, status)
      values (${id}, ${context.userId}, ${data.content}, ${JSON.stringify(data.platforms)}, ${JSON.stringify(data.mediaUrls ?? [])}, ${data.scheduledAt ?? null}, 'pending')
    `;
    await audit(context.userId, "approval.submit", id);
    return { id };
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ id: z.string(), status: z.enum(["approved", "rejected"]), note: z.string().max(400).optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update approvals
      set status = ${data.status}, reviewer_note = ${data.note ?? ""}, decided_at = now()
      where id = ${data.id} and user_id = ${context.userId} and status = 'pending'
    `;
    await audit(context.userId, `approval.${data.status}`, data.id);
    return { ok: true };
  });

export const searchWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ q: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const like = `%${data.q.trim()}%`;
    const posts = await sql<Record<string, unknown>>`
      select id, content, platform, posted_at from feed_posts
      where user_id = ${context.userId} and (content ilike ${like} or author_handle ilike ${like})
      order by posted_at desc limit 8
    `;
    const jobs = await sql<Record<string, unknown>>`
      select id, content, created_at from publish_jobs
      where user_id = ${context.userId} and content ilike ${like}
      order by created_at desc limit 6
    `;
    const inbox = await sql<Record<string, unknown>>`
      select id, content, from_name from inbox_items
      where user_id = ${context.userId} and (content ilike ${like} or from_name ilike ${like})
      limit 6
    `;
    return {
      posts: posts.map((p) => ({
        id: String(p.id),
        content: String(p.content).slice(0, 140),
        platform: p.platform as PlatformId,
        at: asIso(p.posted_at),
      })),
      jobs: jobs.map((p) => ({
        id: String(p.id),
        content: String(p.content).slice(0, 140),
        at: asIso(p.created_at),
      })),
      inbox: inbox.map((p) => ({
        id: String(p.id),
        content: String(p.content).slice(0, 140),
        from: String(p.from_name),
      })),
    };
  });

export const exportCsv = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ kind: z.enum(["history", "inbox", "analytics", "audit"]) }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    let csv = "";
    if (data.kind === "history") {
      csv = "id,created,scheduled,content,platforms,statuses\n";
      const jobs = await sql<Record<string, unknown>>`
        select * from publish_jobs where user_id = ${context.userId} order by created_at desc limit 200
      `;
      for (const j of jobs) {
        const targets = await sql<Record<string, unknown>>`select platform, status from publish_targets where job_id = ${String(j.id)}`;
        csv += `${[j.id, asIso(j.created_at), j.scheduled_at ? asIso(j.scheduled_at) : "", j.content, targets.map((t) => t.platform).join("|"), targets.map((t) => t.status).join("|")].map(esc).join(",")}\n`;
      }
    } else if (data.kind === "inbox") {
      csv = "id,platform,kind,from,content,read,created\n";
      const rows = await sql<Record<string, unknown>>`
        select * from inbox_items where user_id = ${context.userId} order by created_at desc limit 200
      `;
      for (const r of rows) {
        csv += `${[r.id, r.platform, r.kind, r.from_handle, r.content, r.read, asIso(r.created_at)].map(esc).join(",")}\n`;
      }
    } else if (data.kind === "audit") {
      csv = "id,action,detail,created\n";
      const rows = await sql<Record<string, unknown>>`
        select * from audit_events where user_id = ${context.userId} order by created_at desc limit 200
      `;
      for (const r of rows) {
        csv += `${[r.id, r.action, r.detail, asIso(r.created_at)].map(esc).join(",")}\n`;
      }
    } else {
      csv = "platform,attempts,success,failed,success_rate,avg_latency_ms\n";
      for (const platform of PLATFORM_IDS) {
        const [row] = await sql<{ attempts: number; ok: number; fail: number; avg: number }>`
          select
            count(*)::int as attempts,
            count(*) filter (where t.status = 'success')::int as ok,
            count(*) filter (where t.status = 'failed')::int as fail,
            coalesce(avg(t.latency_ms), 0)::int as avg
          from publish_targets t
          join publish_jobs j on j.id = t.job_id
          where j.user_id = ${context.userId} and t.platform = ${platform}
        `;
        const attempts = asNum(row?.attempts);
        const ok = asNum(row?.ok);
        csv += `${[PLATFORM_META[platform].name, attempts, ok, asNum(row?.fail), attempts ? Math.round((ok / attempts) * 100) : 0, asNum(row?.avg)].join(",")}\n`;
      }
    }
    await audit(context.userId, "export.csv", data.kind);
    return { csv, filename: `nexus-${data.kind}-${new Date().toISOString().slice(0, 10)}.csv` };
  });

export const getBestTimes = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ wd: number; hr: number; score: number }>`
      select
        extract(dow from posted_at)::int as wd,
        extract(hour from posted_at)::int as hr,
        coalesce(sum(like_count + repost_count + reply_count), 0)::int as score
      from feed_posts
      where user_id = ${context.userId}
      group by 1, 2
    `;
    const cells: BestTimeCell[] = [];
    const map = new Map<string, number>();
    for (const r of rows) map.set(`${asNum(r.wd)}-${asNum(r.hr)}`, asNum(r.score));
    for (let wd = 0; wd < 7; wd += 1) {
      for (let hr = 0; hr < 24; hr += 1) {
        cells.push({ weekday: wd, hour: hr, score: map.get(`${wd}-${hr}`) ?? 0 });
      }
    }
    const top = [...cells].sort((a, b) => b.score - a.score).slice(0, 3);
    return { cells, top };
  });

const lastAi = new Map<string, number>();

export const rewriteCopy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        content: z.string().min(1).max(4000),
        mode: z.enum(["rewrite", "shorten", "expand", "hashtags", "thread"]),
        platform: platformSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const now = Date.now();
    const prev = lastAi.get(context.userId) ?? 0;
    if (now - prev < 2500) return { ok: false as const, error: "Wait a moment before another rewrite." };
    lastAi.set(context.userId, now);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI is not available in this environment." };
    const limit = data.platform ? PLATFORM_META[data.platform].charLimit : 280;
    const instructions: Record<typeof data.mode, string> = {
      rewrite: `Rewrite this social post so it is sharper and more specific. Keep the meaning. Stay under ${limit} characters. Return only the post.`,
      shorten: `Shorten this social post. Stay under ${Math.min(limit, 200)} characters. Return only the post.`,
      expand: `Expand this social post with one concrete detail. Stay under ${limit} characters. Return only the post.`,
      hashtags: `Rewrite this social post and add 3 relevant hashtags at the end. Stay under ${limit} characters. Return only the post.`,
      thread: `Turn this into a numbered 4-post thread. Each post under ${Math.min(limit, 280)} characters. Return the thread only.`,
    };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 400,
        messages: [
          { role: "system", content: "You write social posts. No preamble. No quotes around the result." },
          { role: "user", content: `${instructions[data.mode]}\n\n${data.content}` },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI API error ${res.status}` };
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "Empty model response." };
    await audit(context.userId, "ai.rewrite", data.mode);
    return { ok: true as const, text };
  });

export async function resolveApiKeyUser(token: string): Promise<string | null> {
  if (!token.startsWith("nxk_")) return null;
  const sql = await getSql();
  const hash = await sha256Hex(token);
  const rows = await sql<{ user_id: string; id: string }>`
    select user_id, id from api_keys where hash = ${hash} limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  await sql`update api_keys set last_used_at = now() where id = ${row.id}`;
  return row.user_id;
}
