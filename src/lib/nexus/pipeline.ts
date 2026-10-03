import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { audit } from "./data";
import { runPublish } from "./data";
import { PLATFORM_IDS, type PlatformId } from "./types";

const socialSchema = z.enum(PLATFORM_IDS).refine((p) => p !== "rss", "RSS is listen-only");

export interface SeriesRow {
  id: string;
  content: string;
  platforms: PlatformId[];
  cadence: "daily" | "weekly";
  nextRunAt: string;
  active: boolean;
}

export interface RssSourceRow {
  id: string;
  url: string;
  title: string;
  lastFetchedAt: string | null;
}

function asIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return new Date().toISOString();
}

function parsePlatforms(raw: unknown): PlatformId[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return [];
          }
        })()
      : [];
  if (!Array.isArray(list)) return [];
  return list.filter((p): p is PlatformId => (PLATFORM_IDS as readonly string[]).includes(String(p)) && p !== "rss");
}

function assertPublicHttps(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Enter a full https feed URL.");
  }
  if (url.protocol !== "https:") throw new Error("Feeds must use https.");
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host) ||
    host === "::1" ||
    host.includes("metadata.google")
  ) {
    throw new Error("That host is not allowed.");
  }
  return url;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseFeed(xml: string): Array<{ title: string; link: string; summary: string }> {
  const chunks = xml.split(/<item\b|<entry\b/i).slice(1);
  const items: Array<{ title: string; link: string; summary: string }> = [];
  for (const chunk of chunks.slice(0, 12)) {
    const title = decodeXml((chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "");
    const summary = decodeXml(
      (chunk.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ??
        chunk.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ??
        chunk.match(/<content[^>]*>([\s\S]*?)<\/content>/i) ??
        [])[1] ?? "",
    );
    const href = (chunk.match(/<link[^>]*href=["']([^"']+)["']/i) ?? [])[1];
    const linkText = decodeXml((chunk.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ?? [])[1] ?? "");
    const link = (href || linkText).trim();
    if (!title && !summary) continue;
    items.push({ title: title || "Untitled", link, summary: summary.slice(0, 280) });
  }
  return items;
}

async function ingestFeed(userId: string, sourceId: string, url: string, titleHint: string) {
  const target = assertPublicHttps(url);
  const res = await fetch(target, {
    headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(8000),
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) throw new Error("Feed redirects are not followed.");
  if (!res.ok) throw new Error(`Feed responded ${res.status}.`);
  const xml = (await res.text()).slice(0, 500_000);
  const items = parseFeed(xml);
  if (items.length === 0) throw new Error("No items found in that feed.");
  const channel = decodeXml((xml.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "") || titleHint || target.hostname;
  const sql = await getSql();
  let imported = 0;
  for (const item of items) {
    const externalId = `${sourceId}:${item.link || item.title}`.slice(0, 180);
    const content = item.summary ? `${item.title}\n\n${item.summary}` : item.title;
    const inserted = await sql<{ id: string }>`
      insert into feed_posts (
        id, user_id, platform, external_id, author_handle, author_name, content, is_own, posted_at
      ) values (
        ${crypto.randomUUID()}, ${userId}, 'rss', ${externalId},
        ${target.hostname}, ${channel}, ${content.slice(0, 2000)}, false, now()
      )
      on conflict (user_id, platform, external_id) do nothing
      returning id
    `;
    if (inserted[0]) imported += 1;
  }
  await sql`
    update rss_sources
    set title = ${channel.slice(0, 120)}, last_fetched_at = now()
    where id = ${sourceId} and user_id = ${userId}
  `;
  return { imported, title: channel };
}

export const listRssSources = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from rss_sources where user_id = ${context.userId} order by created_at desc
    `;
    return rows.map(
      (r): RssSourceRow => ({
        id: String(r.id),
        url: String(r.url),
        title: String(r.title ?? ""),
        lastFetchedAt: r.last_fetched_at ? asIso(r.last_fetched_at) : null,
      }),
    );
  });

export const addRssSource = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ url: z.string().min(8).max(500) }).parse(input))
  .handler(async ({ context, data }) => {
    const url = assertPublicHttps(data.url).toString();
    const sql = await getSql();
    const existing = await sql<{ id: string }>`
      select id from rss_sources where user_id = ${context.userId} and url = ${url} limit 1
    `;
    const id = existing[0]?.id ?? crypto.randomUUID();
    if (!existing[0]) {
      await sql`
        insert into rss_sources (id, user_id, url, title)
        values (${id}, ${context.userId}, ${url}, ${""})
      `;
    }
    const result = await ingestFeed(context.userId, id, url, "");
    await audit(context.userId, "rss.add", url);
    return result;
  });

export const refreshRssSource = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; url: string; title: string }>`
      select id, url, title from rss_sources where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Feed not found.");
    return ingestFeed(context.userId, row.id, row.url, row.title);
  });

export const removeRssSource = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from rss_sources where id = ${data.id} and user_id = ${context.userId}`;
    await audit(context.userId, "rss.remove", data.id);
    return { ok: true };
  });

function bump(iso: string, cadence: "daily" | "weekly"): string {
  const next = new Date(iso);
  next.setUTCDate(next.getUTCDate() + (cadence === "weekly" ? 7 : 1));
  return next.toISOString();
}

export const listSeries = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from series where user_id = ${context.userId} order by created_at desc
    `;
    return rows.map(
      (r): SeriesRow => ({
        id: String(r.id),
        content: String(r.content),
        platforms: parsePlatforms(r.platforms),
        cadence: r.cadence === "weekly" ? "weekly" : "daily",
        nextRunAt: asIso(r.next_run_at),
        active: r.active === true || r.active === "t" || r.active === "true",
      }),
    );
  });

export const createSeries = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        content: z.string().min(1).max(2000),
        platforms: z.array(socialSchema).min(1),
        cadence: z.enum(["daily", "weekly"]),
        nextRunAt: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    const next = data.nextRunAt && !Number.isNaN(Date.parse(data.nextRunAt)) ? new Date(data.nextRunAt).toISOString() : new Date(Date.now() + 60_000).toISOString();
    await sql`
      insert into series (id, user_id, content, platforms, cadence, next_run_at)
      values (${id}, ${context.userId}, ${data.content.trim()}, ${JSON.stringify(data.platforms)}, ${data.cadence}, ${next})
    `;
    await audit(context.userId, "series.create", data.cadence);
    return { id };
  });

export const setSeriesActive = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string(), active: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update series set active = ${data.active}
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const tickSeries = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const due = await sql<Record<string, unknown>>`
      select * from series
      where user_id = ${context.userId} and active = true and next_run_at <= now()
      order by next_run_at asc
      limit 5
    `;
    let published = 0;
    for (const row of due) {
      const platforms = parsePlatforms(row.platforms);
      const cadence = row.cadence === "weekly" ? "weekly" : "daily";
      if (platforms.length === 0) continue;
      try {
        await runPublish(context.userId, {
          content: String(row.content),
          platforms,
          idempotencyKey: `series:${String(row.id)}:${asIso(row.next_run_at)}`,
        });
        published += 1;
      } catch {
        /* leave the slot; operator can reconnect and tick again */
        continue;
      }
      await sql`
        update series set next_run_at = ${bump(asIso(row.next_run_at), cadence)}
        where id = ${String(row.id)} and user_id = ${context.userId}
      `;
    }
    return { published };
  });

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export const importScheduleCsv = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ csv: z.string().min(1).max(100_000) }).parse(input))
  .handler(async ({ context, data }) => {
    const lines = data.csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const start = lines[0]?.toLowerCase().startsWith("content") ? 1 : 0;
    let queued = 0;
    const errors: string[] = [];
    for (const line of lines.slice(start, start + 40)) {
      const [content, platformsRaw, when] = splitCsvLine(line);
      if (!content) continue;
      const platforms = (platformsRaw ?? "")
        .split(/[|;]/)
        .map((p) => p.trim().toLowerCase())
        .filter((p): p is PlatformId => (PLATFORM_IDS as readonly string[]).includes(p) && p !== "rss");
      if (platforms.length === 0) {
        errors.push(`Skipped a row with no known networks.`);
        continue;
      }
      const scheduledAt = when && !Number.isNaN(Date.parse(when)) ? new Date(when).toISOString() : new Date(Date.now() + 3_600_000).toISOString();
      try {
        await runPublish(context.userId, {
          content,
          platforms,
          scheduledAt,
          idempotencyKey: `csv:${crypto.randomUUID()}`,
        });
        queued += 1;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Row failed");
      }
    }
    await audit(context.userId, "csv.import", String(queued));
    return { queued, errors: errors.slice(0, 5) };
  });
