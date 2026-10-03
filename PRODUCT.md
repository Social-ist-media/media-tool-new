# NEXUS — product and project specification

Status: living spec. The running product is [nexus-console-eta.vercel.app](https://nexus-console-eta.vercel.app). Source of truth is `main` on [Social-ist-media/media-tool-new](https://github.com/Social-ist-media/media-tool-new) (the old `redinc23/nexus-console` name redirects here). `FEATURES.md` is the older shipped checklist. This document is the end-to-end product: what exists, what “complete” means, and the steps required to get there.

Legend used everywhere below:

| Mark | Meaning |
| --- | --- |
| Shipped | In the current app and reachable in production |
| Specified | Required for the complete product, not built yet |
| Blocked | Cannot ship until an external account, key, or decision exists |

Publish today is a **faithful simulator** (`src/lib/nexus/demo.ts`). Accounts, the database, the console, and the API are real. Posts do not yet leave NEXUS for X, Meta, or the other networks.

---

## 1. Product

NEXUS is a social command center. One person, or a small team, writes once and runs every network they care about from one feed.

Promise: **one feed, twelve networks.** Publish, listen, engage, measure.

Who it is for:

- A solo operator who posts to several networks and does not want twelve tabs.
- A small brand or newsroom that needs drafts, approval, and an audit trail.
- A developer who wants to schedule posts from their own tools.

Who it is not for, on purpose:

- A consumer social network. NEXUS does not host a public timeline for strangers.
- An ads manager. Paid spend, pixels, and campaign bidding stay in each network’s own ads product.
- A full customer-support suite. The inbox covers mentions, replies, and DMs that the connected accounts can see. It is not Zendesk.

## 2. Principles

1. The user’s data lives in their Postgres database. Preview with no `DATABASE_URL` uses embedded Postgres and is wiped on restart. Production does not.
2. Every row is scoped to the signed-in user. Team features never leak another user’s posts.
3. A failed network does not fail the whole post. Each target records its own status.
4. Demo connectors stay until real credentials exist. The UI must not pretend a simulated post went live on X.
5. Secrets never ship in the repo. Session signing, database URLs, and network tokens are environment or database secrets.
6. Listen-only sources (RSS) never become publish targets.

## 3. What is live today

Production deploy of commit `d7f909e` and later.

| Area | State |
| --- | --- |
| Identity | Email and password. Unique username. Sign-in by email or username. Google and X when a broker is configured. |
| Database | Neon Postgres on the Vercel project `nexus-console`. Migrations run during `npm run build` against the direct (non-pooled) URL. |
| Console | Overview, feed, composer, inbox, calendar, connections, analytics, library, approvals, team, reports, developers, settings, help. |
| Listen | RSS sources with an SSRF guard. |
| Cadence | Recurring series. CSV schedule import. |
| API | `GET /api/v1/health`, `GET` and `POST /api/v1/posts` with a Bearer `nxk_` key. |
| Legal | Privacy, terms, forgot-password page that does not pretend an email was sent. |

Environment already set on the Vercel project:

| Name | Role |
| --- | --- |
| `DATABASE_URL` | Pooled Neon URL, written by the integration. The app prefers the direct URL when it is present. |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL. Migrations and Better Auth use this. |
| `BETTER_AUTH_SECRET` | Signs the session cookie. |
| `BETTER_AUTH_URL` | `https://nexus-console-eta.vercel.app` |

## 4. End-to-end journeys

Each journey is the requirement. A journey is done only when every step works on production, not only in preview.

### J1. Create an account

1. Open `/register`.
2. Enter email, username, and password. Username matches `^[a-z][a-z0-9_]{2,19}$`.
3. The app rejects a taken username or a weak password with a specific message, never a generic “Registration failed”.
4. A session is created. A `profiles` row exists with that username.
5. The user lands on `/dashboard`.

### J2. Sign in and sign out

1. Open `/login`.
2. Sign in with the email or the username, plus the password.
3. A wrong password says the credentials are wrong. An unknown user says the account was not found.
4. Sign out clears the session and returns to `/login`.
5. A signed-out visit to `/dashboard` redirects to `/login`.

### J3. Connect a network

1. Open `/dashboard/connections`.
2. Pick a network, enter the handle (and Mastodon instance or Telegram bot token when that network needs it).
3. Shipped: the connector is stored and a demo timeline and inbox are imported.
4. Specified: the same screen starts real OAuth or token entry, stores the token encrypted, and imports the real timeline.
5. Disconnect removes that network’s connection. History of posts already made stays.

### J4. Write once, publish many

1. From the feed or overview, open the composer.
2. Write the post. The counter uses the tightest character limit of the selected networks.
3. Choose networks. Add media, a first comment, and an optional UTM string.
4. Publish now, or pick a time.
5. Shipped: each target is simulated. Success and failure are stored per network.
6. Specified: each target calls that network’s API. A failure on one network still records the others.
7. The post appears in history, on the calendar if scheduled, and in analytics.

### J5. Approve before it goes out

1. Submit a draft to `/dashboard/approvals` instead of publishing.
2. An admin sees the pending item, the networks, and the time.
3. Approve publishes it (or queues it). Reject stores a note and does not publish.
4. Both decisions are written to the audit log.

### J6. Listen

1. On connections, add an `http` or `https` RSS URL. Private hosts and link-local addresses are rejected.
2. Refresh pulls items into the unified feed, tagged as RSS, not as one of the twelve publish networks.
3. Specified: the same listen path also ingests real mentions and replies from connected accounts, on a schedule, without the user clicking refresh.

### J7. Engage

1. Open `/dashboard/inbox`.
2. Filter by mention, reply, DM, or like. Filter by network.
3. Mark read. Reply, or insert a saved reply from the library.
4. Shipped: the reply is stored on the inbox item.
5. Specified: the reply is sent to that network.

### J8. Plan the week

1. Open `/dashboard/calendar`.
2. See the month and the queued list.
3. Publish a queued item now, or cancel it.
4. Create a recurring series (content, networks, cadence). Pause it.
5. Import a CSV of scheduled posts. Bad rows are reported. Good rows become queue items.

### J9. Measure

1. Open `/dashboard/analytics`.
2. See attempts, success, failure, success rate, and average latency per network.
3. See 14-day volume and the best-time heatmap.
4. Export CSV from `/dashboard/reports` for history, inbox, analytics, and the audit log.

### J10. Operate the account

1. Settings: display name, bio, avatar URL, theme, timezone.
2. Audit log lists connect, publish, invite, delete, and API events.
3. Delete workspace data removes that user’s product rows and signs them out. The auth user can be removed separately. Specified: one action deletes both.
4. Notifications bell lists unread items and marks them read.
5. Command palette (⌘K) jumps to pages and recent records.

### J11. Invite a teammate

1. An admin invites an email with role `admin`, `member`, or `analyst`.
2. Shipped: the invite is stored. No email is sent.
3. Specified: the email contains a single-use link. Accepting it attaches that person to the workspace with the role’s permissions.

### J12. Automate from outside

1. On `/dashboard/developers`, create an API key. The full `nxk_` secret is shown once.
2. `GET /api/v1/health` returns `{ ok, service, db }` with no key.
3. `GET /api/v1/posts` with `Authorization: Bearer nxk_…` returns the caller’s jobs.
4. `POST /api/v1/posts` with `content` and `platforms` creates a job.
5. A webhook URL must be `https`. A test ping sends a body and `x-nexus-signature`.

## 5. Screens

| Route | Job |
| --- | --- |
| `/` | Product explanation and sign-in entry |
| `/register` | Create account |
| `/login` | Sign in |
| `/forgot-password` | Honest explanation. No fake email. |
| `/privacy` | What is stored |
| `/terms` | Terms of use |
| `/dashboard` | Overview counts and shortcuts |
| `/dashboard/feed` | Unified feed and composer |
| `/dashboard/inbox` | Mentions, replies, DMs, likes |
| `/dashboard/calendar` | Month, queue, series, CSV import |
| `/dashboard/connections` | Networks and RSS |
| `/dashboard/analytics` | Rates, volume, best time |
| `/dashboard/library` | Templates, saved replies, media |
| `/dashboard/approvals` | Submit, approve, reject |
| `/dashboard/team` | Invites and roles |
| `/dashboard/reports` | CSV exports |
| `/dashboard/developers` | API keys and webhooks |
| `/dashboard/settings` | Profile, theme, audit, delete |
| `/dashboard/help` | How the console works |
| `/api/auth/*` | Better Auth |
| `/api/v1/health` | Liveness |
| `/api/v1/posts` | Key-authenticated publish API |

Mobile: the dashboard keeps a bottom tab bar. Desktop: a side nav. Both themes: dark and light.

## 6. Feature catalog

### 6.1 Identity and access

| Feature | State | Requirement |
| --- | --- | --- |
| Email and password | Shipped | Passwords hashed by Better Auth. Minimum length enforced by the auth library. |
| Username | Shipped | Unique, lowercase, 3–20 characters, starts with a letter. |
| Sign in by email or username | Shipped | Username is resolved to the email before Better Auth. |
| Google and X sign-in | Shipped when broker env is set | `GROK_AUTH_CLIENT_ID`, `GROK_AUTH_CLIENT_SECRET`, `GROK_AUTH_ISSUER`. Not required for email accounts. |
| Sign out | Shipped | Clears the session cookie. |
| Forgot password | Blocked | The page must not claim an email was sent until SMTP and a reset token exist. |
| Email verification | Specified | New accounts can use the app, but a verified badge waits on SMTP. |
| Change password | Specified | Requires the current password. |
| Change email | Specified | Requires the current password and a confirm link. |
| Sessions list and revoke | Specified | Show device, last seen, revoke one, revoke all others. |
| MFA, TOTP | Specified | Optional per user. Recovery codes shown once. |
| SAML SSO | Blocked | Needs an IdP and an enterprise plan. Not a default. |
| SCIM | Blocked | Same IdP requirement. Provision and deprovision members. |
| Magic links | Out | Not a login method for this product. |

Roles, once invites actually join a workspace:

| Role | May |
| --- | --- |
| admin | Everything, including invites, keys, delete, and approvals. |
| member | Compose, schedule, reply, connect networks they are allowed. Cannot delete the workspace or manage keys. |
| analyst | Read analytics, reports, and the audit log. Cannot publish. |

Shipped invites store the role. Enforcement of member versus analyst on every button is specified, not complete.

### 6.2 Networks

Twelve publish networks, plus RSS as listen-only.

| Id | Name | Limit | Auth the real client will use | State |
| --- | --- | --- | --- | --- |
| `twitter` | X | 280 | OAuth 2.0 | Demo |
| `threads` | Threads | 500 | Meta OAuth | Demo |
| `bluesky` | Bluesky | 300 | App password | Demo |
| `mastodon` | Mastodon | 500 | OAuth per instance | Demo |
| `instagram` | Instagram | 2200 | Meta OAuth | Demo |
| `linkedin` | LinkedIn | 3000 | OAuth 2.0 | Demo |
| `facebook` | Facebook | 5000 | Meta OAuth | Demo |
| `youtube` | YouTube | 5000 | OAuth 2.0 | Demo |
| `tiktok` | TikTok | 2200 | OAuth 2.0 | Demo |
| `reddit` | Reddit | 10000 | OAuth 2.0 | Demo |
| `pinterest` | Pinterest | 500 | OAuth 2.0 | Demo |
| `telegram` | Telegram | 4096 | Bot token | Demo |
| `rss` | RSS | n/a | URL only | Shipped, listen only |

Connection fields: handle, display name, optional instance, status `active | expired | error`.

Specified per network, when credentials exist:

- Token refresh before expiry. Expired tokens flip status to `expired` and raise a notification.
- Rate-limit handling. A 429 stores the error on that target and does not retry in a tight loop.
- Media rules. Instagram and TikTok require media. Text-only is rejected before the call, not after.
- Threaded posts on X, Threads, Bluesky, and Mastodon. One composer, many segments, each under that network’s limit.

### 6.3 Publish

| Feature | State | Options |
| --- | --- | --- |
| Multi-network composer | Shipped | Any subset of the twelve. Limit is the minimum of the selected networks. |
| Publish now | Shipped | Simulated per target. |
| Schedule | Shipped | `scheduledAt`. Released by the calendar action, not yet by a cron. |
| Cancel scheduled | Shipped | Status `cancelled`. |
| Drafts | Shipped | Content, media, networks, first comment, UTM, optional time. |
| Templates | Shipped | Title, body, category. |
| First comment | Shipped | Stored with the job. Specified: posted after the main post succeeds. |
| UTM | Shipped | Stored string. Specified: appended to links in the body. |
| Media | Shipped | Data URLs in the library. Specified: object storage, size and type checks. |
| Approvals | Shipped | `pending`, `approved`, `rejected`, reviewer note. |
| Recurring series | Shipped | Content, platforms, cadence, next run, active flag. Tick is user-triggered. |
| CSV import | Shipped | Rows become scheduled jobs. |
| AI rewrite | Shipped | User-initiated, throttled. Fails soft when no model key is set. |
| Real delivery | Blocked | Replace `simulatePublish` per network. |
| Cron release | Specified | A scheduler calls the same release function the calendar uses, every minute. |
| Queues and retries | Specified | Failed targets retry with backoff, max 3, then stay `failed`. |
| Link shortener | Specified | Optional. Off by default. |
| Post preview per network | Specified | Show the trimmed render before publish. |

CSV columns required: `content`, `platforms` (comma-separated ids), `scheduledAt` (ISO-8601). Optional: `firstComment`, `utm`.

### 6.4 Listen

| Feature | State |
| --- | --- |
| Unified chronological feed | Shipped |
| Search and network filter | Shipped |
| Like, bookmark, reply on a feed item | Shipped, stored locally |
| RSS add, refresh, remove | Shipped |
| SSRF guard on RSS URLs | Shipped |
| Live mention ingest | Blocked on network credentials |
| Keyword streams | Specified |
| Brand keyword alerts | Specified |

### 6.5 Engage

| Feature | State |
| --- | --- |
| Inbox kinds: mention, reply, DM, like | Shipped |
| Mark read | Shipped |
| Reply on the item | Shipped, local |
| Saved replies | Shipped |
| Send the reply to the network | Blocked |
| Assignment to a teammate | Specified |
| Internal notes | Specified |
| Collision detection (someone else is replying) | Specified |

### 6.6 Measure

| Feature | State |
| --- | --- |
| Per-network attempts, success, failure, rate, latency | Shipped |
| 14-day volume | Shipped |
| Best-time heatmap | Shipped |
| CSV export | Shipped |
| Follower and impression counts from each network | Blocked on credentials |
| Compare period vs previous period | Specified |
| Saved report definitions | Specified |
| Scheduled email of a report | Specified, needs SMTP |

### 6.7 Workspace tools

| Tool | State |
| --- | --- |
| Notifications | Shipped |
| Command palette | Shipped |
| Audit log | Shipped |
| Theme and timezone | Shipped |
| Delete workspace data | Shipped |
| Help, privacy, terms | Shipped |
| PWA install | Shipped |
| Team invites without email | Shipped |
| Native iOS, Android, Electron | Out. The install path is the PWA. |

### 6.8 Developer tools

| Tool | State |
| --- | --- |
| API keys, hashed, prefix shown, secret once | Shipped |
| Revoke key | Shipped |
| Webhooks, https only, signed test ping | Shipped |
| REST health and posts | Shipped |
| OpenAPI document | Specified |
| Official SDK | Specified, after the API is stable |
| CLI | Specified, thin client over the same REST API |
| Idempotency key on POST | Specified |

## 7. Functional requirements

Numbered so later work can cite them. “Must” is required for the complete product. “Shipped” means the current app already meets it.

### Identity

- FR-1. Must create an account with email, username, and password. Shipped.
- FR-2. Must reject duplicate usernames and duplicate emails with a specific error. Shipped.
- FR-3. Must sign in with email or username. Shipped.
- FR-4. Must keep a session across reloads until sign-out. Shipped in production only when `BETTER_AUTH_SECRET` and `DATABASE_URL` are set.
- FR-5. Must scope every product query by the signed-in user id. Shipped.

### Connections

- FR-6. Must store a connection per network with status. Shipped.
- FR-7. Must not offer RSS as a publish target. Shipped.
- FR-8. Must, once credentials exist, refresh tokens and mark expired connections. Specified.

### Publish

- FR-9. Must publish one body to many networks and store a result per network. Shipped as simulation.
- FR-10. Must enforce the tightest character limit of the selected networks before send. Shipped.
- FR-11. Must allow schedule, cancel, and publish-now. Shipped.
- FR-12. Must support drafts, templates, approvals, series, and CSV import. Shipped.
- FR-13. Must deliver to the real network API when that network’s credentials exist, and keep simulation only when they do not. Specified.
- FR-14. Must release due scheduled posts without a person clicking the calendar. Specified.

### Listen and engage

- FR-15. Must show one chronological feed. Shipped.
- FR-16. Must accept public RSS URLs and reject private-network URLs. Shipped.
- FR-17. Must store inbox replies. Shipped. Must deliver them when the network is real. Specified.

### Measure and operate

- FR-18. Must show per-network success and latency. Shipped.
- FR-19. Must export history, inbox, analytics, and audit as CSV. Shipped.
- FR-20. Must write an audit row for connect, disconnect, publish, invite, key create, key revoke, and delete. Shipped.
- FR-21. Must let the user delete their product data. Shipped.

### API

- FR-22. Must expose an unauthenticated health check. Shipped.
- FR-23. Must authenticate `/api/v1/posts` with a Bearer key and reject missing or revoked keys with 401. Shipped.
- FR-24. Must sign outbound webhooks. Shipped for the test ping.

## 8. Non-functional requirements

| Id | Requirement | Target | Now |
| --- | --- | --- | --- |
| NFR-1 | Availability | 99.9% monthly on the Vercel + Neon pair | Single region `iad1`. No documented failover. |
| NFR-2 | RPO | 24 hours via Neon backups | Operator must confirm backups in the Neon console. |
| NFR-3 | RTO | 4 hours to restore the database and redeploy | Not drilled. |
| NFR-4 | Page load | Dashboard interactive under 3s on a normal laptop | Not budgeted in CI. |
| NFR-5 | Isolation | No query returns another user’s rows | Enforced by `user_id` and auth middleware. |
| NFR-6 | Secrets | None in git | `.env` is gitignored. |
| NFR-7 | Migrations | Applied once, in a transaction, recorded in `_migrations` | `scripts/migrate.mjs`. |
| NFR-8 | Accessibility | Keyboard reach for sign-in, composer, and primary nav | Not formally audited. |
| NFR-9 | Privacy | Delete removes product rows | Shipped. Auth-user deletion is specified. |

## 9. Data model

Postgres. Preview without `DATABASE_URL` uses the same SQL on embedded Postgres.

| Table | Purpose | Migration |
| --- | --- | --- |
| Better Auth tables | Users, sessions, accounts | `migrations/0001_auth.sql` |
| `profiles` | Display name, bio, avatar, theme, timezone, username | `0002`, username in `0004` |
| `connections` | Network handles and status | `0002` |
| `feed_posts` | Unified feed items | `0002` |
| `publish_jobs` | One authored post | `0002` |
| `publish_targets` | Per-network result | `0002` |
| `inbox_items` | Mentions, replies, DMs, likes | `0002` |
| `inbox_replies` | Replies on an inbox item | `0003` |
| `audit_events` | Who did what | `0002` |
| `team_invites` | Email, role, status | `0002` |
| `drafts` | Unsent composer state | `0003` |
| `templates` | Reusable copy | `0003` |
| `canned_replies` | Saved inbox replies | `0003` |
| `media_assets` | Uploaded files (data URLs today) | `0003` |
| `notifications` | In-app notices | `0003` |
| `api_keys` | Hash and prefix only | `0003` |
| `webhooks` | URL, events, secret, last status | `0003` |
| `approvals` | Queue items | `0003` |
| `rss_sources` | Listen URLs | `0004` |
| `series` | Recurring posts | `0004` |

Specified tables, not created yet:

- `workspace_members` — user, role, joined time. Invites become members.
- `network_tokens` — encrypted refresh and access tokens. Never returned to the browser.
- `report_jobs` — saved exports.

## 10. API

Base URL in production: `https://nexus-console-eta.vercel.app`.

### `GET /api/v1/health`

No authentication.

```json
{ "ok": true, "service": "nexus", "db": "neon" }
```

`db` is `pglite` when no database URL is configured.

### `GET /api/v1/posts`

Header: `Authorization: Bearer nxk_…`

Returns the latest 20 jobs for the key’s owner: `id`, `content`, `scheduledAt`, `createdAt`.

### `POST /api/v1/posts`

Same header. JSON body:

| Field | Required | Notes |
| --- | --- | --- |
| `content` | yes | Non-empty string |
| `platforms` | yes | Array of platform ids, not `rss` |
| `scheduledAt` | no | ISO time or null |

Shipped behavior creates a simulated job. Specified behavior matches the in-app publisher, including real delivery when tokens exist.

### Webhooks

Outbound JSON to the saved `https` URL. Header `x-nexus-signature` is the HMAC of the body with the webhook secret. Events to support: `post.published`, `post.failed`, `inbox.received`. The test ping is shipped. The live event fan-out is specified.

### Errors

| Status | When |
| --- | --- |
| 401 | Missing, unknown, or revoked key |
| 400 | Body failed validation |
| 429 | Specified. Not enforced yet. |

## 11. Security requirements

- Passwords are hashed by Better Auth. The app never stores or logs the raw password.
- API keys are stored as a SHA-256 hash. The UI keeps only the prefix.
- SQL uses parameters. No string-built queries from user input.
- RSS fetch rejects non-http(s) URLs and private or link-local hosts.
- Webhooks reject non-https URLs.
- `BETTER_AUTH_URL` is the only accepted browser origin for credentialed auth posts in production.
- Network tokens, when they exist, are encrypted at rest and never sent to the client.
- A user can delete their product data from Settings.
- Dependency review: `npm audit` in CI is specified. A published pentest is not claimed.

## 12. Stack and repository

| Piece | Choice |
| --- | --- |
| App | TanStack Start, React 19, Vite |
| Auth | Better Auth |
| Database | Postgres via `pg`. Neon in production. Embedded Postgres locally when unset. |
| Deploy | Nitro preset `vercel`. Project `nexus-console` on team `redinc23s-projects`. |
| Styling | Tailwind 4 |
| Package name | `nexus` |

Important paths:

| Path | Role |
| --- | --- |
| `src/routes` | Screens and HTTP routes |
| `src/lib/nexus/data.ts` | Feed, publish, connections, analytics |
| `src/lib/nexus/ops.ts` | Drafts, library, approvals, keys, webhooks, AI |
| `src/lib/nexus/pipeline.ts` | RSS, series, CSV |
| `src/lib/nexus/identity.ts` | Username rules |
| `src/lib/nexus/demo.ts` | Simulated network I/O. The seam to replace. |
| `migrations` | Schema, applied in order |
| `scripts/migrate.mjs` | Deploy-time migrator |
| `scripts/setup-production.sh` | One-shot Vercel login, env, Neon, redeploy |

## 13. Environments

| Env | Database | Auth | Networks |
| --- | --- | --- | --- |
| Local `npm run dev` | Embedded, unless `DATABASE_URL` is set | Email and password on `http://localhost:8080` | Demo |
| Vercel preview | Neon, if the integration attached preview | `BETTER_AUTH_URL` must include that preview origin before password sign-in works there | Demo until keys exist |
| Production | Neon direct URL | `https://nexus-console-eta.vercel.app` | Demo until keys exist |

### Ship checklist

Use this when cutting a production release.

1. `npm run typecheck` passes.
2. `npm run build` passes. With `DATABASE_URL_UNPOOLED` or `DATABASE_URL` set, new SQL files in `migrations/` apply once.
3. `main` on `Social-ist-media/media-tool-new` contains the commit.
4. Vercel project framework is TanStack Start, build command `npm run build`.
5. Production env contains `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and a direct Postgres URL.
6. Deploy production from `main`.
7. `GET /api/v1/health` returns `db: "neon"`.
8. Register a new user on the production URL and reach `/dashboard`.
9. Connect one demo network, publish one post, see it in history.

The script `scripts/setup-production.sh` covers steps 4–6 for a fresh project. Do not run it twice against a project that already has Neon unless you intend to create another database.

## 14. Delivery plan

Work in this order. Do not start a later phase by faking the earlier one.

### Phase A — production truth (done)

Exit: a stranger can register on the production URL and the row survives a new deploy.

Evidence: Neon store `nexus` connected, production alias `nexus-console-eta.vercel.app`, health returns the console.

### Phase B — unattended publishing

1. Add a minute cron that releases due `publish_jobs` and due `series` rows.
2. Record the run in the audit log.
3. Notify the user when a target fails.

Exit: a post scheduled for a time in the next hour goes out with nobody on the calendar page.

### Phase C — one real network

Pick Bluesky (app password) or Telegram (bot token) first. They do not need a company OAuth review.

1. Encrypt the credential on `network_tokens`.
2. Replace `simulatePublish` for that id only.
3. Show `active` or the upstream error on the connection.
4. Keep every other network on the simulator.

Exit: a post published to that one network is visible on the network itself, and the other targets still record a simulated result.

### Phase D — the rest of the networks

One client per id in section 6.2. Each needs the operator’s developer app. Meta covers Instagram, Facebook, and Threads. Do not block the others on Meta review.

Exit: for every network the operator has approved, publish and inbox reply hit the real API. Networks without keys stay on the simulator and say so in the UI.

### Phase E — team is real

1. SMTP for invite and password reset.
2. Accept-invite creates `workspace_members`.
3. Enforce admin, member, and analyst on publish, keys, and delete.

Exit: an invited analyst can open analytics and cannot publish.

### Phase F — measure the real audience

Pull impressions, follows, and clicks where each API allows it. The current analytics stay as delivery analytics. Audience analytics are a separate section so simulated delivery numbers are never mixed with real reach.

Exit: a connected real network shows yesterday’s impressions from that API, labeled with the time they were fetched.

### Phase G — operate it like a product

1. Neon backup restore drill, written down with the time it took.
2. `npm audit` on pull requests.
3. A status page that mirrors `/api/v1/health`.
4. OpenAPI for `/api/v1/*`.

Exit: a second person can restore the database from the written drill without asking the author.

## 15. Acceptance for “complete”

The product is complete when all of the following are true. Anything short of this is a phase, not a finished command center.

1. J1 through J12 pass on production.
2. Every network the operator has credentials for publishes and receives replies. The UI labels the others as not connected, not as published.
3. Scheduled and recurring posts leave without someone sitting on the calendar.
4. Invites and password reset send real email.
5. Roles are enforced.
6. Analytics can show delivery and, separately, audience numbers from the networks.
7. Delete removes product data and the auth user.
8. Health, backups, and the restore drill exist outside this repository’s README.

Explicitly never required:

- Native app store binaries.
- Magic-link login.
- An ads manager.
- A public social network of NEXUS users.

## 16. Decisions still open

| Decision | Default if nobody chooses |
| --- | --- |
| First real network | Bluesky, then Telegram |
| Media storage | Vercel Blob, private |
| Transactional email | A single SMTP provider, invites and reset only |
| Custom domain | Stay on `nexus-console-eta.vercel.app` until a domain is purchased. Changing it requires updating `BETTER_AUTH_URL` and redeploying. |
| Multi-workspace | One workspace per account until Phase E is done. Organizations come after roles work. |

## 17. How to work in this repo

1. Read this file, then `FEATURES.md` if you need the older checklist.
2. Do not re-scaffold. Routes, auth, and migrations already exist.
3. Change network I/O only inside `src/lib/nexus/demo.ts` and the new client that replaces each function. Screens call server functions, not network APIs.
4. Add columns in a new `migrations/0005_….sql`. Never edit an applied file.
5. Push to `main`. Vercel builds `main`.
6. After a migration ships, confirm `/api/v1/health` still reports `neon`.
