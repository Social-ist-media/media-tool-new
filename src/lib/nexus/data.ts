import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { generateInbox, generateTimeline, simulatePublish } from "./demo";
import { PLATFORM_META, PLATFORM_ORDER } from "./platforms";
import type {
  AnalyticsRow,
  AuditEvent,
  Connection,
  DashboardData,
  FeedPost,
  InboxItem,
  InboxReply,
  PlatformId,
  Profile,
  PublishHistoryItem,
  PublishTargetResult,
  TeamInvite,
  ThemeMode,
} from "./types";
import { PLATFORM_IDS } from "./types";

export * from "./ops";

const platformSchema = z.enum(PLATFORM_IDS);
const PAGE = 20;

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

function parseMedia(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw !== "string" || !raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function mapConnection(row: Record<string, unknown>): Connection {
  return {
    id: String(row.id),
    platform: row.platform as PlatformId,
    handle: String(row.handle),
    displayName: String(row.display_name ?? ""),
    instance: String(row.instance ?? ""),
    status: (row.status as Connection["status"]) ?? "active",
    createdAt: asIso(row.created_at),
  };
}

function mapPost(row: Record<string, unknown>): FeedPost {
  return {
    id: String(row.id),
    platform: row.platform as PlatformId,
    authorHandle: String(row.author_handle),
    authorName: String(row.author_name),
    authorAvatar: String(row.author_avatar ?? ""),
    content: String(row.content),
    mediaUrls: parseMedia(row.media_urls),
    likeCount: asNum(row.like_count),
    repostCount: asNum(row.repost_count),
    replyCount: asNum(row.reply_count),
    liked: asBool(row.liked),
    bookmarked: asBool(row.bookmarked),
    isOwn: asBool(row.is_own),
    postedAt: asIso(row.posted_at),
  };
}

export async function audit(userId: string, action: string, detail = "") {
  const sql = await getSql();
  await sql`insert into audit_events (id, user_id, action, detail) values (${crypto.randomUUID()}, ${userId}, ${action}, ${detail})`;
}

export async function notify(userId: string, title: string, body = "", href = "") {
  const sql = await getSql();
  await sql`
    insert into notifications (id, user_id, title, body, href)
    values (${crypto.randomUUID()}, ${userId}, ${title}, ${body}, ${href})
  `;
}

const DEFAULT_TEMPLATES: Array<{ title: string; content: string; category: string }> = [
  {
    title: "Product launch",
    category: "launch",
    content:
      "We just shipped {feature}. It cuts the time from idea to live post across every network you already use.\n\nTry it: {link}",
  },
  {
    title: "Weekly recap",
    category: "recap",
    content:
      "This week:\n• Shipped {one}\n• Learned {two}\n• Next: {three}\n\nWhat should we tackle next?",
  },
  {
    title: "Hiring",
    category: "hiring",
    content:
      "We're hiring a {role}. You will own {scope}. Remote-friendly. If this is you, reply or email {email}.",
  },
  {
    title: "Customer story",
    category: "social-proof",
    content: "{customer} used NEXUS to {outcome}. Their words: “{quote}.”",
  },
  {
    title: "Thread starter",
    category: "thread",
    content: "A short thread on {topic}.\n\n1/ The problem nobody names.\n2/ What we measured.\n3/ The change that stuck.",
  },
];

const DEFAULT_CANNED: Array<{ title: string; content: string }> = [
  { title: "Thanks", content: "Appreciate you writing in — noted, and we'll follow up here." },
  { title: "Looking into it", content: "Got it. We're looking into this and will reply with a concrete next step." },
  { title: "Here's the link", content: "Here's the link: {url}. Ping us if anything's blocked." },
];

export async function ensureProfile(userId: string): Promise<Profile> {
  const sql = await getSql();
  const existing = await sql<Record<string, unknown>>`select * from profiles where user_id = ${userId} limit 1`;
  if (existing[0]) {
    const r = existing[0];
    return {
      userId,
      displayName: String(r.display_name ?? ""),
      bio: String(r.bio ?? ""),
      avatarUrl: String(r.avatar_url ?? ""),
      theme: (r.theme === "light" ? "light" : "dark") as ThemeMode,
      timezone: String(r.timezone ?? "UTC"),
    };
  }
  const users = await sql<{ name: string | null; image: string | null }>`
    select name, image from "user" where id = ${userId} limit 1
  `;
  const displayName = users[0]?.name ?? "Operator";
  const avatarUrl = users[0]?.image ?? "";
  await sql`insert into profiles (user_id, display_name, avatar_url) values (${userId}, ${displayName}, ${avatarUrl})`;
  try {
    for (const t of DEFAULT_TEMPLATES) {
      await sql`
        insert into templates (id, user_id, title, content, category)
        values (${crypto.randomUUID()}, ${userId}, ${t.title}, ${t.content}, ${t.category})
      `;
    }
    for (const c of DEFAULT_CANNED) {
      await sql`
        insert into canned_replies (id, user_id, title, content)
        values (${crypto.randomUUID()}, ${userId}, ${c.title}, ${c.content})
      `;
    }
    await notify(userId, "Welcome to NEXUS", "Connect a network, then write once and ship everywhere.", "/dashboard/connections");
  } catch {
    /* ops tables apply on the next getSql() after 0003 */
  }
  return { userId, displayName, bio: "", avatarUrl, theme: "dark", timezone: "UTC" };
}

export const getProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => ensureProfile(context.userId));

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        displayName: z.string().min(1).max(80),
        bio: z.string().max(280).optional(),
        theme: z.enum(["dark", "light"]).optional(),
        timezone: z.string().max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await ensureProfile(context.userId);
    const sql = await getSql();
    await sql`
      update profiles
      set display_name = ${data.displayName},
          bio = ${data.bio ?? ""},
          theme = ${data.theme ?? "dark"},
          timezone = ${data.timezone ?? "UTC"},
          updated_at = now()
      where user_id = ${context.userId}
    `;
    await audit(context.userId, "profile.update", data.displayName);
    return ensureProfile(context.userId);
  });

export const listConnections = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from connections where user_id = ${context.userId} order by created_at desc
    `;
    return rows.map(mapConnection);
  });

export const connectPlatform = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        platform: platformSchema,
        handle: z.string().min(1).max(80),
        instance: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const handle = data.handle.replace(/^@/, "").trim();
    const dup = await sql`
      select id from connections
      where user_id = ${context.userId} and platform = ${data.platform} and handle = ${handle}
      limit 1
    `;
    if (dup.length) throw new Error("That account is already connected.");
    const id = crypto.randomUUID();
    await sql`
      insert into connections (id, user_id, platform, handle, display_name, instance, status)
      values (${id}, ${context.userId}, ${data.platform}, ${handle}, ${handle}, ${data.instance ?? ""}, 'active')
    `;
    const posts = generateTimeline(data.platform, handle, 8);
    for (const p of posts) {
      await sql`
        insert into feed_posts (
          id, user_id, connection_id, platform, external_id, author_handle, author_name,
          author_avatar, content, media_urls, like_count, repost_count, reply_count, posted_at
        ) values (
          ${crypto.randomUUID()}, ${context.userId}, ${id}, ${data.platform}, ${p.externalId},
          ${p.authorHandle}, ${p.authorName}, ${p.authorAvatar}, ${p.content},
          ${JSON.stringify(p.mediaUrls)}, ${p.likeCount}, ${p.repostCount}, ${p.replyCount}, ${p.postedAt}
        )
        on conflict (user_id, platform, external_id) do nothing
      `;
    }
    const inbox = generateInbox(data.platform, handle, 3);
    for (const item of inbox) {
      await sql`
        insert into inbox_items (id, user_id, platform, kind, from_handle, from_name, from_avatar, content, created_at)
        values (${crypto.randomUUID()}, ${context.userId}, ${data.platform}, ${item.kind}, ${item.fromHandle}, ${item.fromName}, ${item.fromAvatar}, ${item.content}, ${item.createdAt})
      `;
    }
    await audit(context.userId, "connection.create", `${data.platform}:${handle}`);
    await notify(
      context.userId,
      `Connected ${PLATFORM_META[data.platform].name}`,
      `Imported ${posts.length} posts for @${handle}.`,
      "/dashboard/feed",
    );
    return { importedPosts: posts.length, connectionId: id };
  });

export const disconnectPlatform = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from connections where id = ${data.id} and user_id = ${context.userId}`;
    await audit(context.userId, "connection.delete", data.id);
    return { ok: true };
  });

export const listFeed = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        platform: z.union([z.literal("all"), platformSchema]).optional(),
        search: z.string().optional(),
        bookmarked: z.boolean().optional(),
        cursor: z.string().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const platform = data.platform ?? "all";
    const search = (data.search ?? "").trim();
    const bookmarked = data.bookmarked ?? false;
    const like = search ? `%${search}%` : "%";
    const rows = await sql<Record<string, unknown>>`
      select * from feed_posts
      where user_id = ${context.userId}
        and (${platform} = 'all' or platform = ${platform})
        and (${bookmarked} = false or bookmarked = true)
        and (
          ${search} = ''
          or content ilike ${like}
          or author_name ilike ${like}
          or author_handle ilike ${like}
        )
      order by posted_at desc, id desc
      limit ${PAGE + 1}
    `;
    const hasMore = rows.length > PAGE;
    const slice = hasMore ? rows.slice(0, PAGE) : rows;
    return {
      posts: slice.map(mapPost),
      nextCursor: hasMore ? String(slice[slice.length - 1]?.id ?? "") : null,
    };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from feed_posts where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Post not found");
    const liked = !asBool(row.liked);
    const likeCount = Math.max(0, asNum(row.like_count) + (liked ? 1 : -1));
    await sql`
      update feed_posts set liked = ${liked}, like_count = ${likeCount}
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return mapPost({ ...row, liked, like_count: likeCount });
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from feed_posts where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Post not found");
    const bookmarked = !asBool(row.bookmarked);
    await sql`
      update feed_posts set bookmarked = ${bookmarked}
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return mapPost({ ...row, bookmarked });
  });

export const replyToPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ id: z.string(), content: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from feed_posts where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Post not found");
    const platform = row.platform as PlatformId;
    const externalId = `reply-${crypto.randomUUID().slice(0, 8)}`;
    await sql`
      insert into feed_posts (
        id, user_id, platform, external_id, author_handle, author_name, content, is_own, posted_at
      ) values (
        ${crypto.randomUUID()}, ${context.userId}, ${platform}, ${externalId},
        'you', 'You', ${data.content.trim()}, true, now()
      )
    `;
    const replyCount = asNum(row.reply_count) + 1;
    await sql`update feed_posts set reply_count = ${replyCount} where id = ${data.id} and user_id = ${context.userId}`;
    await audit(context.userId, "feed.reply", data.id);
    return mapPost({ ...row, reply_count: replyCount });
  });

export const publishPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        content: z.string().min(1).max(10000),
        platforms: z.array(platformSchema).min(1),
        mediaUrls: z.array(z.string()).max(4).optional(),
        scheduledAt: z.string().nullable().optional(),
        idempotencyKey: z.string().optional(),
        firstComment: z.string().max(500).optional(),
        utm: z.string().max(240).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.idempotencyKey) {
      const existing = await sql<{ id: string }>`
        select id from publish_jobs
        where user_id = ${context.userId} and idempotency_key = ${data.idempotencyKey}
        limit 1
      `;
      if (existing[0]) {
        return listJob(context.userId, existing[0].id);
      }
    }
    const connections = await sql<{ platform: string }>`
      select platform from connections where user_id = ${context.userId} and status = 'active'
    `;
    const connected = new Set(connections.map((c) => c.platform));
    for (const p of data.platforms) {
      if (!connected.has(p)) throw new Error(`Connect ${PLATFORM_META[p].name} before posting.`);
    }
    let body = data.content;
    if (data.utm?.trim()) {
      const sep = body.includes("http") ? " " : " ";
      body = `${body.trim()}${sep}${data.utm.trim()}`.trim();
    }
    const jobId = crypto.randomUUID();
    const media = JSON.stringify(data.mediaUrls ?? []);
    await sql`
      insert into publish_jobs (id, user_id, content, media_urls, scheduled_at, idempotency_key)
      values (${jobId}, ${context.userId}, ${body}, ${media}, ${data.scheduledAt ?? null}, ${data.idempotencyKey ?? null})
    `;
    await sql`
      insert into job_meta (job_id, first_comment, utm)
      values (${jobId}, ${data.firstComment ?? ""}, ${data.utm ?? ""})
      on conflict (job_id) do update set first_comment = excluded.first_comment, utm = excluded.utm
    `;
    const scheduled = Boolean(data.scheduledAt && new Date(data.scheduledAt).getTime() > Date.now());
    const results: PublishTargetResult[] = [];
    for (const platform of data.platforms) {
      const sim = scheduled
        ? { ok: true, error: "", latencyMs: 0 }
        : simulatePublish(platform, body);
      const status = scheduled ? "pending" : sim.ok ? "success" : "failed";
      const externalId = sim.ok && !scheduled ? `${platform}-${jobId.slice(0, 8)}` : "";
      await sql`
        insert into publish_targets (id, job_id, platform, status, external_id, error, latency_ms)
        values (${crypto.randomUUID()}, ${jobId}, ${platform}, ${status}, ${externalId}, ${sim.error}, ${sim.latencyMs})
      `;
      if (status === "success") {
        await sql`
          insert into feed_posts (
            id, user_id, platform, external_id, author_handle, author_name, author_avatar,
            content, media_urls, is_own, posted_at
          ) values (
            ${crypto.randomUUID()}, ${context.userId}, ${platform}, ${externalId},
            'you', 'You', '', ${body}, ${media}, true, now()
          )
          on conflict (user_id, platform, external_id) do nothing
        `;
      }
      results.push({
        platform,
        status,
        externalId,
        error: sim.error,
        latencyMs: sim.latencyMs,
      });
    }
    await audit(context.userId, scheduled ? "post.schedule" : "post.publish", data.platforms.join(","));
    await notify(
      context.userId,
      scheduled ? "Post scheduled" : "Post published",
      body.slice(0, 120),
      scheduled ? "/dashboard/calendar" : "/dashboard/feed",
    );
    return { jobId, results };
  });

async function listJob(userId: string, jobId: string) {
  const sql = await getSql();
  const jobs = await sql<Record<string, unknown>>`
    select * from publish_jobs where id = ${jobId} and user_id = ${userId} limit 1
  `;
  const job = jobs[0];
  if (!job) throw new Error("Job not found");
  const targets = await sql<Record<string, unknown>>`select * from publish_targets where job_id = ${jobId}`;
  return {
    jobId,
    results: targets.map(
      (t): PublishTargetResult => ({
        platform: t.platform as PlatformId,
        status: t.status as PublishTargetResult["status"],
        externalId: String(t.external_id ?? ""),
        error: String(t.error ?? ""),
        latencyMs: asNum(t.latency_ms),
      }),
    ),
  };
}

export const listHistory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const jobs = await sql<Record<string, unknown>>`
      select j.*, m.first_comment, m.utm
      from publish_jobs j
      left join job_meta m on m.job_id = j.id
      where j.user_id = ${context.userId}
      order by j.created_at desc
      limit 80
    `;
    const items: PublishHistoryItem[] = [];
    for (const job of jobs) {
      const targets = await sql<Record<string, unknown>>`select * from publish_targets where job_id = ${String(job.id)}`;
      items.push({
        id: String(job.id),
        content: String(job.content),
        mediaUrls: parseMedia(job.media_urls),
        scheduledAt: job.scheduled_at ? asIso(job.scheduled_at) : null,
        createdAt: asIso(job.created_at),
        firstComment: String(job.first_comment ?? ""),
        utm: String(job.utm ?? ""),
        targets: targets.map((t) => ({
          platform: t.platform as PlatformId,
          status: t.status as PublishTargetResult["status"],
          externalId: String(t.external_id ?? ""),
          error: String(t.error ?? ""),
          latencyMs: asNum(t.latency_ms),
        })),
      });
    }
    return items;
  });

export const releaseScheduled = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const jobs = await sql<Record<string, unknown>>`
      select * from publish_jobs where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    const job = jobs[0];
    if (!job) throw new Error("Job not found");
    const targets = await sql<Record<string, unknown>>`
      select * from publish_targets where job_id = ${data.id} and status = 'pending'
    `;
    for (const t of targets) {
      const platform = t.platform as PlatformId;
      const sim = simulatePublish(platform, String(job.content));
      const status = sim.ok ? "success" : "failed";
      const externalId = sim.ok ? `${platform}-${String(job.id).slice(0, 8)}` : "";
      await sql`
        update publish_targets
        set status = ${status}, external_id = ${externalId}, error = ${sim.error}, latency_ms = ${sim.latencyMs}
        where id = ${String(t.id)}
      `;
      if (sim.ok) {
        await sql`
          insert into feed_posts (
            id, user_id, platform, external_id, author_handle, author_name, content, media_urls, is_own, posted_at
          ) values (
            ${crypto.randomUUID()}, ${context.userId}, ${platform}, ${externalId},
            'you', 'You', ${String(job.content)}, ${String(job.media_urls)}, true, now()
          )
          on conflict (user_id, platform, external_id) do nothing
        `;
      }
    }
    await sql`update publish_jobs set scheduled_at = null where id = ${data.id} and user_id = ${context.userId}`;
    await audit(context.userId, "post.release", data.id);
    return { ok: true };
  });

export const cancelScheduled = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const jobs = await sql<{ id: string }>`
      select id from publish_jobs where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    if (!jobs[0]) throw new Error("Job not found");
    await sql`
      update publish_targets set status = 'cancelled', error = 'Cancelled by operator'
      where job_id = ${data.id} and status = 'pending'
    `;
    await sql`update publish_jobs set scheduled_at = null where id = ${data.id} and user_id = ${context.userId}`;
    await audit(context.userId, "post.cancel", data.id);
    return { ok: true };
  });

export const getDashboard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardData> => {
    await ensureProfile(context.userId);
    const sql = await getSql();
    const connections = (
      await sql<Record<string, unknown>>`select * from connections where user_id = ${context.userId} order by created_at desc`
    ).map(mapConnection);
    const connected = new Set(connections.map((c) => c.platform));
    const [feed] = await sql<{ n: number }>`select count(*)::int as n from feed_posts where user_id = ${context.userId}`;
    const [own] = await sql<{ n: number }>`select count(*)::int as n from feed_posts where user_id = ${context.userId} and is_own = true`;
    const [jobs] = await sql<{ n: number }>`select count(*)::int as n from publish_jobs where user_id = ${context.userId}`;
    const [targets] = await sql<{ n: number; ok: number; fail: number }>`
      select
        count(*)::int as n,
        count(*) filter (where t.status = 'success')::int as ok,
        count(*) filter (where t.status = 'failed')::int as fail
      from publish_targets t
      join publish_jobs j on j.id = t.job_id
      where j.user_id = ${context.userId}
    `;
    const [eng] = await sql<{ likes: number; reposts: number; replies: number }>`
      select coalesce(sum(like_count),0)::int as likes,
             coalesce(sum(repost_count),0)::int as reposts,
             coalesce(sum(reply_count),0)::int as replies
      from feed_posts where user_id = ${context.userId}
    `;
    const [inbox] = await sql<{ n: number }>`
      select count(*)::int as n from inbox_items where user_id = ${context.userId} and read = false
    `;
    const [approvals] = await sql<{ n: number }>`
      select count(*)::int as n from approvals where user_id = ${context.userId} and status = 'pending'
    `;
    const [notes] = await sql<{ n: number }>`
      select count(*)::int as n from notifications where user_id = ${context.userId} and read = false
    `;
    const [drafts] = await sql<{ n: number }>`
      select count(*)::int as n from drafts where user_id = ${context.userId}
    `;
    const cross = asNum(targets?.n);
    const ok = asNum(targets?.ok);
    return {
      connections,
      stats: {
        connectionsCount: connections.length,
        totalFeedPosts: asNum(feed?.n),
        ownPosts: asNum(own?.n),
        publishJobs: asNum(jobs?.n),
        crossPosts: cross,
        crossPostSuccessRate: cross ? Math.round((ok / cross) * 100) : 0,
        crossPostFailed: asNum(targets?.fail),
        totalLikes: asNum(eng?.likes),
        totalReposts: asNum(eng?.reposts),
        totalReplies: asNum(eng?.replies),
        unreadInbox: asNum(inbox?.n),
        pendingApprovals: asNum(approvals?.n),
        unreadNotifications: asNum(notes?.n),
        draftCount: asNum(drafts?.n),
      },
      platforms: PLATFORM_ORDER.map((platform) => ({
        platform,
        name: PLATFORM_META[platform].name,
        charLimit: PLATFORM_META[platform].charLimit,
        connected: connected.has(platform),
      })),
    };
  });

export const getAnalytics = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const per: AnalyticsRow[] = [];
    for (const platform of PLATFORM_ORDER) {
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
      const successCount = asNum(row?.ok);
      per.push({
        platform,
        name: PLATFORM_META[platform].name,
        attempts,
        successCount,
        failedCount: asNum(row?.fail),
        successRate: attempts ? Math.round((successCount / attempts) * 100) : 0,
        avgLatencyMs: asNum(row?.avg),
      });
    }
    const volume = await sql<{ date: string; count: number }>`
      select to_char(posted_at::date, 'YYYY-MM-DD') as date, count(*)::int as count
      from feed_posts
      where user_id = ${context.userId} and posted_at >= now() - interval '14 days'
      group by posted_at::date
      order by date
    `;
    const days: Array<{ date: string; count: number }> = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const date = d.toISOString().slice(0, 10);
      days.push({ date, count: asNum(volume.find((v) => String(v.date).slice(0, 10) === date)?.count) });
    }
    return { perPlatform: per, feedVolume: days };
  });

export const listInbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from inbox_items where user_id = ${context.userId} order by created_at desc limit 80
    `;
    const replies = await sql<Record<string, unknown>>`
      select * from inbox_replies where user_id = ${context.userId} order by created_at asc
    `;
    const byInbox = new Map<string, InboxReply[]>();
    for (const r of replies) {
      const key = String(r.inbox_id);
      const list = byInbox.get(key) ?? [];
      list.push({ id: String(r.id), content: String(r.content), createdAt: asIso(r.created_at) });
      byInbox.set(key, list);
    }
    return rows.map(
      (r): InboxItem => ({
        id: String(r.id),
        platform: r.platform as PlatformId,
        kind: r.kind as InboxItem["kind"],
        fromHandle: String(r.from_handle),
        fromName: String(r.from_name),
        fromAvatar: String(r.from_avatar ?? ""),
        content: String(r.content),
        read: asBool(r.read),
        createdAt: asIso(r.created_at),
        replies: byInbox.get(String(r.id)) ?? [],
      }),
    );
  });

export const markInboxRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().optional(), all: z.boolean().optional() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.all) {
      await sql`update inbox_items set read = true where user_id = ${context.userId}`;
    } else if (data.id) {
      await sql`update inbox_items set read = true where id = ${data.id} and user_id = ${context.userId}`;
    }
    return { ok: true };
  });

export const listAudit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from audit_events where user_id = ${context.userId} order by created_at desc limit 50
    `;
    return rows.map(
      (r): AuditEvent => ({
        id: String(r.id),
        action: String(r.action),
        detail: String(r.detail ?? ""),
        createdAt: asIso(r.created_at),
      }),
    );
  });

export const listInvites = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from team_invites where user_id = ${context.userId} order by created_at desc
    `;
    return rows.map(
      (r): TeamInvite => ({
        id: String(r.id),
        email: String(r.email),
        role: String(r.role),
        status: String(r.status),
        createdAt: asIso(r.created_at),
      }),
    );
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ email: z.string().email(), role: z.enum(["admin", "member", "analyst"]) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into team_invites (id, user_id, email, role, status)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.email.toLowerCase()}, ${data.role}, 'pending')
    `;
    await audit(context.userId, "team.invite", data.email);
    await notify(context.userId, "Invite recorded", data.email, "/dashboard/team");
    return { ok: true };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from team_invites where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const deleteAccountData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(input))
  .handler(async ({ context }) => {
    const sql = await getSql();
    const uid = context.userId;
    await sql`delete from inbox_replies where user_id = ${uid}`;
    await sql`delete from inbox_items where user_id = ${uid}`;
    await sql`delete from feed_posts where user_id = ${uid}`;
    await sql`delete from publish_targets where job_id in (select id from publish_jobs where user_id = ${uid})`;
    await sql`delete from job_meta where job_id in (select id from publish_jobs where user_id = ${uid})`;
    await sql`delete from publish_jobs where user_id = ${uid}`;
    await sql`delete from connections where user_id = ${uid}`;
    await sql`delete from drafts where user_id = ${uid}`;
    await sql`delete from templates where user_id = ${uid}`;
    await sql`delete from canned_replies where user_id = ${uid}`;
    await sql`delete from media_assets where user_id = ${uid}`;
    await sql`delete from notifications where user_id = ${uid}`;
    await sql`delete from api_keys where user_id = ${uid}`;
    await sql`delete from webhooks where user_id = ${uid}`;
    await sql`delete from approvals where user_id = ${uid}`;
    await sql`delete from team_invites where user_id = ${uid}`;
    await sql`delete from audit_events where user_id = ${uid}`;
    await sql`delete from profiles where user_id = ${uid}`;
    return { ok: true };
  });
