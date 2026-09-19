import type { InboxKind, PlatformId } from "./types";
import { PLATFORM_META } from "./platforms";

interface Author {
  handle: string;
  name: string;
}

const AUTHORS: Record<PlatformId, Author[]> = {
  twitter: [
    { handle: "@verge", name: "The Verge" },
    { handle: "@levelsio", name: "levelsio" },
    { handle: "@sama", name: "Sam Altman" },
    { handle: "@naval", name: "Naval" },
  ],
  threads: [
    { handle: "@mosseri", name: "Adam Mosseri" },
    { handle: "@design.daily", name: "Design Daily" },
    { handle: "@studio.notes", name: "Studio Notes" },
  ],
  bluesky: [
    { handle: "@jay.bsky.team", name: "Jay" },
    { handle: "@pfrazee.com", name: "Paul Frazee" },
    { handle: "@news.bsky.social", name: "Bluesky News" },
  ],
  mastodon: [
    { handle: "@gargron@mastodon.social", name: "Eugen Rochko" },
    { handle: "@opensource@fosstodon.org", name: "Open Source Daily" },
    { handle: "@fedithoughts@mastodon.social", name: "Fedi Thoughts" },
  ],
  instagram: [
    { handle: "@natgeo", name: "National Geographic" },
    { handle: "@studio.notes", name: "Studio Notes" },
    { handle: "@dailyui", name: "Daily UI" },
  ],
  linkedin: [
    { handle: "satyanadella", name: "Satya Nadella" },
    { handle: "reidhoffman", name: "Reid Hoffman" },
    { handle: "product-ops", name: "Product Ops" },
  ],
  facebook: [
    { handle: "meta", name: "Meta" },
    { handle: "local.newsroom", name: "Local Newsroom" },
    { handle: "community.board", name: "Community Board" },
  ],
  youtube: [
    { handle: "@mkbhd", name: "MKBHD" },
    { handle: "@veritasium", name: "Veritasium" },
    { handle: "@theprimeagen", name: "ThePrimeagen" },
  ],
  tiktok: [
    { handle: "@editlab", name: "Edit Lab" },
    { handle: "@craftshorts", name: "Craft Shorts" },
    { handle: "@nightshift.cooks", name: "Nightshift Cooks" },
  ],
  reddit: [
    { handle: "u/spez", name: "spez" },
    { handle: "u/out_of_the_loop", name: "OutOfTheLoop" },
    { handle: "u/dataisbeautiful", name: "DataIsBeautiful" },
  ],
  pinterest: [
    { handle: "atelier", name: "Atelier" },
    { handle: "kitchen.archive", name: "Kitchen Archive" },
    { handle: "cabin.mood", name: "Cabin Mood" },
  ],
  telegram: [
    { handle: "@durov", name: "Pavel Durov" },
    { handle: "@techchannel", name: "Tech Channel" },
    { handle: "@desknotes", name: "Desk Notes" },
  ],
};

const SNIPPETS: Record<PlatformId, string[]> = {
  twitter: [
    "Shipping beats planning. Cut the spec, ship the slice.",
    "The best feature is often the one you delete.",
    "Compounding works on skills the same way it works on capital.",
    "Today's lesson: a missing await, three hours of archaeology.",
  ],
  threads: [
    "Quiet posting is underrated. Chronological still wins.",
    "One tool I will not drop from the stack this year: a plain text file.",
    "Building in public: the graph is finally useful, not noisy.",
  ],
  bluesky: [
    "Custom feeds on AT Protocol still feel like the actual product.",
    "Decentralization is not a feature. It is a constraint that buys you options.",
    "Chronological by default. Algorithms should be opt-in, not the room.",
  ],
  mastodon: [
    "No ads, no ranking, just the people I chose. That still matters.",
    "Federation means your graph can move with you.",
    "Self-hosting is more approachable than the discourse around it.",
  ],
  instagram: [
    "New collection this weekend. Behind-the-scenes from the studio.",
    "Light, texture, and a lot of waiting for the right hour.",
    "A still frame can carry a whole brief if you let it.",
  ],
  linkedin: [
    "Hiring: staff product designer who can hold a system, not just a screen.",
    "Most 'AI transformations' are still missing an operating model.",
    "Write the decision, not the slide. The slide is the residue.",
  ],
  facebook: [
    "Neighborhood update: Saturday market moves to the north lot.",
    "Photo recap from last night's community table.",
    "If you lost a navy jacket at the hall, we have it at the desk.",
  ],
  youtube: [
    "New video: we tore down the workflow, then rebuilt it from the cut.",
    "I was wrong about this codec. Here's the measurement.",
    "Studio tour, no talking. Just the room and the chain.",
  ],
  tiktok: [
    "The cut that made the whole piece land was 4 frames.",
    "Recipe in 20 seconds. No voiceover. Just the pan.",
    "Stop smoothing every transition. Let one be ugly on purpose.",
  ],
  reddit: [
    "Genuine question: what does your incident review actually change?",
    "We open-sourced the load test harness. Numbers in the comments.",
    "Unpopular: most dashboards should be emails that never send.",
  ],
  pinterest: [
    "A kitchen that keeps the steel and loses the clutter.",
    "Palette: ink, bone, one warm wood. Repeat.",
    "Shelves that hold fewer things, better.",
  ],
  telegram: [
    "Channel note: the API freeze lifts Friday 18:00 UTC.",
    "Desk log: three tabs closed, one decision written down.",
    "If you only ship one thing this week, make it the rollback plan.",
  ],
};

const INBOX_COPY: Array<{ kind: InboxKind; content: (name: string) => string }> = [
  { kind: "mention", content: (n) => `${n} mentioned you in a thread.` },
  { kind: "reply", content: (n) => `${n} replied: "This is the cut I needed."` },
  { kind: "dm", content: (n) => `${n} sent a direct message about a collab.` },
  { kind: "like", content: (n) => `${n} liked your latest post.` },
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

function avatarFor(seed: string): string {
  const initial = seed.replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase() || "N";
  const hues = [200, 190, 30, 0, 260, 145];
  const hue = hues[hashString(seed) % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="hsl(${hue} 18% 22%)"/><text x="50%" y="54%" font-family="ui-sans-serif,system-ui" font-size="32" fill="#ececec" text-anchor="middle" dominant-baseline="middle">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function demoImageFor(seed: number): string {
  const pairs: Array<[string, string]> = [
    ["#1c1917", "#44403c"],
    ["#0f172a", "#1e293b"],
    ["#14532d", "#166534"],
    ["#1e1b4b", "#312e81"],
    ["#3f1d1d", "#7f1d1d"],
  ];
  const [from, to] = pairs[seed % pairs.length];
  const id = `g${seed}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="640" height="400" fill="url(#${id})"/><circle cx="180" cy="160" r="70" fill="#ffffff18"/><rect x="340" y="210" width="220" height="8" rx="4" fill="#ffffff22"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface RemotePost {
  externalId: string;
  authorHandle: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mediaUrls: string[];
  likeCount: number;
  repostCount: number;
  replyCount: number;
  postedAt: string;
}

export interface RemoteInbox {
  kind: InboxKind;
  fromHandle: string;
  fromName: string;
  fromAvatar: string;
  content: string;
  createdAt: string;
}

export function generateTimeline(platform: PlatformId, handle: string, limit = 8): RemotePost[] {
  const authors = AUTHORS[platform];
  const snippets = SNIPPETS[platform];
  const base = hashString(`${platform}:${handle}`);
  const now = Date.now();
  return Array.from({ length: limit }, (_, i) => {
    const seed = base + i * 97;
    const author = authors[seed % authors.length];
    const snippet = snippets[seed % snippets.length];
    const media = seed % 3 === 0 ? [demoImageFor(seed)] : [];
    return {
      externalId: `${platform}-${handle}-${seed}`,
      authorHandle: author.handle,
      authorName: author.name,
      authorAvatar: avatarFor(author.handle),
      content: snippet,
      mediaUrls: media,
      likeCount: 12 + (seed % 420),
      repostCount: seed % 80,
      replyCount: seed % 40,
      postedAt: new Date(now - (i * 47 + (seed % 30)) * 60_000).toISOString(),
    };
  });
}

export function generateInbox(platform: PlatformId, handle: string, count = 3): RemoteInbox[] {
  const authors = AUTHORS[platform];
  const base = hashString(`inbox:${platform}:${handle}`);
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const seed = base + i * 13;
    const author = authors[seed % authors.length];
    const copy = INBOX_COPY[seed % INBOX_COPY.length];
    return {
      kind: copy.kind,
      fromHandle: author.handle,
      fromName: author.name,
      fromAvatar: avatarFor(author.handle),
      content: copy.content(author.name),
      createdAt: new Date(now - (i * 90 + (seed % 20)) * 60_000).toISOString(),
    };
  });
}

export function simulatePublish(platform: PlatformId, content: string): { ok: boolean; error: string; latencyMs: number } {
  const limit = PLATFORM_META[platform].charLimit;
  const latencyMs = 180 + (hashString(platform + content) % 420);
  if (content.length > limit) {
    return { ok: false, error: `Over ${limit} character limit`, latencyMs };
  }
  // Deterministic rare failure so analytics is honest, not a toy 100%.
  if (hashString(content + platform) % 17 === 0) {
    return { ok: false, error: "Upstream rate limited", latencyMs };
  }
  return { ok: true, error: "", latencyMs };
}
