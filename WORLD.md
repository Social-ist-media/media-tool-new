# NEXUS — the world-class product

This is the end-to-end document for making NEXUS the best social command center in the world. It is written from the tool as it exists, not from a blank category brief.

`PRODUCT.md` is the contract of what is shipped and what “done” means. This document is the standard above that contract: why this tool can win, what the finished experience feels like, and the exact path from the current code to that product.

Live app: [nexus-console-eta.vercel.app](https://nexus-console-eta.vercel.app). Source: [Social-ist-media/media-tool-new](https://github.com/Social-ist-media/media-tool-new) on `main`.

---

## 1. The bet

The category leaders (Buffer, Hootsuite, Sprout Social, Later, Typefully, Hypefury) all do the same three jobs: queue posts, show a feed, and sell a dashboard. They lose on three things NEXUS can own.

1. **One honest result per network.** Everyone else hides a partial failure inside “published.” NEXUS already stores a row per target (`publish_targets`: status, error, latency, external id). The best product in the world shows that row, retries only the failed target, and never claims a post is live when it is not.
2. **The operator owns the system.** Accounts, posts, keys, and audit live in the customer’s Postgres. Credentials, when they exist, never sit in a vendor’s shared tenant. Export is a button, not a support ticket.
3. **The screen and the API are the same product.** The composer already calls `runPublish`. The REST API already creates jobs. The best version is one publisher. If the UI can do it, a key can do it. If a key can do it, the UI is just a client.

The sentence on the door stays: **one feed, twelve networks.** The standard behind it is: a single operator can listen, write, approve, deliver, reply, and prove what happened, before lunch, without opening a second tool and without being lied to.

## 2. What “best” means

A product is the best in this category when a skeptical operator, after one week, will not go back. That is not a slogan. It is six tests.

| Test | Pass |
| --- | --- |
| Truth | Every target is `pending`, `success`, `failed`, or `cancelled`. The UI uses those words. A simulated network is labeled simulated. |
| Speed | From “I should post this” to “it is queued on the right networks” is under 30 seconds, including picking networks and a time. |
| Fit | The same idea is adapted to each network’s limit, media rule, and tone. It is not one caption pasted twelve times. |
| Recovery | A failed target can be retried alone. A double-click cannot double-post. The idempotency key already exists for this. |
| Memory | Next week the operator can answer “what did we say, who approved it, what happened” from the audit log and the job, not from memory. |
| Exit | CSV of history, inbox, analytics, and audit already exists. The finished product adds a full account export and a documented restore. |

If a feature does not move one of those six tests, it does not ship.

## 3. Who it is for

Three operators. Design every screen so the first one is fast, and the other two are not blocked.

**The desk.** One person, two to six networks, posts most days. They want the composer, the calendar, and the inbox. They do not want a setup wizard with fourteen steps.

**The desk plus one.** A founder and someone who must approve, or a writer and an analyst. Roles already exist as names (`admin`, `member`, `analyst`). The finished product enforces them.

**The newsroom.** Several brands, a queue, an audit, an API. Same publisher. More workspaces later. Not a different app.

Not the customer: agencies that need white-label for fifty brands on day one, ad buyers, and people looking for a public social network. Those products already exist and they are worse at the desk’s job because they were built for the agency.

## 4. The loop

Everything in the console is one loop. The nav is just the loop cut into pages.

```text
Listen  →  Decide  →  Write  →  Approve  →  Deliver  →  Learn  →  Reply
 feed       overview   composer  approvals   targets    analytics  inbox
 rss        best time  drafts    roles       cron       reports    saved replies
```

Today the loop is real up to the edge of the network. `runPublish` in `src/lib/nexus/data.ts` writes the job, writes one target per network, and then calls `simulatePublish` in `src/lib/nexus/demo.ts`. That function is the only fictional part. Replacing it per network, without touching the screens, is how this becomes real. The help page already says so. The architecture holds.

### 4.1 Listen

The feed is chronological on purpose. Algorithmic “for you” feeds are how the networks keep people inside their own apps. NEXUS is the operator’s desk, so time order is the default. Filters narrow. They do not reshuffle.

Shipped: search, network filter, like, bookmark, reply, RSS in, SSRF guard (`assertPublicHttps` rejects localhost, private ranges, and metadata hosts).

World-class:

- Each item shows network, author, time, and whether it is the operator’s own post.
- A listener can pin a keyword. New matches become inbox items of kind `mention`, not a second product.
- RSS stays listen-only. The schema already refuses it as a publish target.
- Pull is on a schedule, not only on a click. The operator should open the feed and find it current.
- Own posts and other people’s posts are visually distinct. They already have `is_own`.

### 4.2 Decide

Overview is not a vanity wall. It answers four questions:

- What is waiting (unread inbox, pending approvals, drafts)?
- What is about to go out (next 24 hours)?
- What failed (targets in `failed` since yesterday)?
- Where should the next post go (best-time heatmap, already computed)?

The best overview is a list of next actions, each one click from the thing it names. Counts are secondary. The current overview already has the counts. The next version leads with the queue.

### 4.3 Write

The composer is the product. It already has the right controls: networks, body, up to four media items, schedule, first comment, UTM, drafts, templates, approval, and a user-initiated rewrite. It selects every connected network by default and uses the tightest character limit of the selection.

World-class composer, still one drawer:

- A live per-network preview. X at 280, Bluesky at 300, LinkedIn long, Instagram requiring media. The limits already live in `PLATFORM_META`.
- If one network would cut the text, say so before send. Offer “adapt this network” rather than blocking the others.
- Threads are first-class on X, Threads, Bluesky, and Mastodon: several segments, each under that network’s limit, one job.
- Media rules are enforced before the call. Instagram and TikTok do not accept text-only. The error appears in the drawer, not as a failed target five seconds later.
- The rewrite button stays user-initiated and slow on purpose (it is already throttled). It never auto-posts. The world-class version rewrites per selected network, shows a diff, and lets the operator accept one network and reject another.
- UTM is appended, which the publisher already does. The world-class version parses links in the body and shows the final URL.
- Idempotency key is minted when the drawer opens (`crypto.randomUUID` in the composer). Keep that. It is why approve-then-publish cannot double-fire.

### 4.4 Approve

Approvals are for the second person, not for friction. A solo operator publishes. A team sends for approval. The queue shows the body, the networks, the time, and the note. Approve calls the same `runPublish`. Reject stores the note and does not.

World-class: the analyst role cannot reach this button. The member can submit. The admin can decide. Both decisions are audit rows. A pending item older than the scheduled time is flagged, not silently dropped.

### 4.5 Deliver

Delivery is a state machine that already has the right states.

```text
job created
  → each target pending
      → success (external id stored, own post in the feed)
      → failed (error string stored, siblings unaffected)
      → cancelled (operator stopped it before send)
```

World-class delivery:

- A clock, not a person, releases due jobs and due series. The calendar already can release one. The clock calls that same function every minute.
- Retry is per target, max three, with backoff. The job is not “failed” if four of five networks succeeded.
- First comment is posted only after the parent target is `success`.
- The operator can open a target and see the error in the network’s own words, plus the latency already stored.
- Simulated networks stay available so the console is usable with zero developer apps. The chip says “Simulated.” When a real client exists for that id, the chip says “Live.”

### 4.6 Learn

Analytics today measure delivery: attempts, success, failure, rate, latency, 14-day volume, best time. That is the right first graph, because a post that never left cannot have reach.

World-class measurement is two layers that are never mixed:

| Layer | Question | Source |
| --- | --- | --- |
| Delivery | Did it leave, how long did it take, which network broke | `publish_targets` |
| Audience | Who saw it, what they did | that network’s API, fetched and timestamped |

Delivery is shipped. Audience is added per network as the live client lands, in its own section, with “as of” time. A simulated network has no audience numbers. It does not get fake ones.

Reports stay CSV. The best export is the one an operator can open in a spreadsheet without asking anyone. History, inbox, analytics, and audit are already there.

### 4.7 Reply

The inbox is mention, reply, DM, and like. Filter, mark read, reply, insert a saved reply. Today the reply is stored on the item. When the network is live, the same button sends.

World-class inbox:

- One thread, not twelve inboxes with the same layout.
- Saved replies are short and titled. They already are.
- Assignment and an internal note arrive with real teams, not before.
- The person who replied is on the audit row.

## 5. The machine, as built

Keep this shape. Do not re-scaffold.

| Piece | Where | Role |
| --- | --- | --- |
| Screens | `src/routes` | Landing, auth, thirteen console pages, privacy, terms |
| Shell | `src/routes/dashboard.tsx` | Nav, unread, approvals, command palette, composer, theme |
| Publisher | `runPublish` | The only way a post is born |
| Network edge | `simulatePublish` | The function each real client replaces |
| Listen and cadence | `src/lib/nexus/pipeline.ts` | RSS, series, CSV |
| Identity | `src/lib/nexus/identity.ts` | Username `^[a-z][a-z0-9_]{2,19}$` |
| Ops | `src/lib/nexus/ops.ts` | Drafts, library, approvals, keys, webhooks, rewrite |
| Schema | `migrations/0001`–`0004` | Auth, product, ops, username, RSS, series |
| Database | `src/lib/db.ts` | Neon when a URL exists, embedded Postgres otherwise |
| Deploy | Nitro on Vercel, `npm run build` | Migrates against the direct Neon URL |

Every product table is keyed by `user_id`. There is no shared demo tenant. That is already the right isolation model for a world-class tool. Team membership, when it becomes real, is a join. It is not a second copy of the data.

### Networks

| Id | Name | Limit | How a live client authenticates | Media rule to enforce |
| --- | --- | --- | --- | --- |
| twitter | X | 280 | OAuth 2.0 | Text, or up to 4 images |
| threads | Threads | 500 | Meta OAuth | Text, or image, or video |
| bluesky | Bluesky | 300 | App password | Text, images |
| mastodon | Mastodon | 500 | OAuth on that instance | Text, media, instance-specific limits |
| instagram | Instagram | 2200 | Meta OAuth | Image or video required |
| linkedin | LinkedIn | 3000 | OAuth 2.0 | Text, image, document |
| facebook | Facebook | 5000 | Meta OAuth | Text, image, video |
| youtube | YouTube | 5000 | OAuth 2.0 | Video required for a publish; text is the description |
| tiktok | TikTok | 2200 | OAuth 2.0 | Video required |
| reddit | Reddit | 10000 | OAuth 2.0 | Title plus body, subreddit stored on the connection |
| pinterest | Pinterest | 500 | OAuth 2.0 | Image required, board stored on the connection |
| telegram | Telegram | 4096 | Bot token | Text, image, or video |
| rss | RSS | none | Public https URL | Listen only |

Bluesky and Telegram are first because the operator can create the credential alone. Meta, TikTok, and X wait on developer-app review. The console must not stall on the slowest network.

### What is already true in production

- Register, username, sign-in by email or username, sign-out.
- Neon Postgres, direct connection for migrations and for Better Auth.
- The full console: overview, feed, inbox, calendar, analytics, library, approvals, connections, team, developers, reports, help, settings.
- RSS, recurring series, CSV schedule import.
- API keys hashed, shown once, prefix `nxk_`.
- Webhooks https-only, test ping signed with `x-nexus-signature`.
- `GET /api/v1/health`, `GET` and `POST /api/v1/posts`.
- Audit log, notifications, command palette, dark and light, mobile tab bar, PWA.

### What is still theater

`demo.ts` invents authors, snippets, inbox items, and publish latency. It is good theater: the rest of the product is exercisable. It is not a network. The world-class product deletes a network’s theater only when that network’s client is in place, and it labels what remains.

## 6. The finished experience

A week in the life of the desk, on the finished product.

**Monday, 8:10.** Open the console. Overview says: 3 unread, 1 approval waiting, 2 posts in the next 24 hours, 1 failed TikTok target from Sunday. Click the failure. The error is the upstream message. Retry that target only. X and LinkedIn from the same job stay `success`.

**Monday, 8:14.** Feed is current. An RSS item from the operator’s own site is at the top of listen, not mixed into “you posted.” A keyword hit from overnight is in the inbox.

**Monday, 8:20.** Composer. Paste the idea. X, Bluesky, and LinkedIn are selected. The preview shows X needs a second post to fit, LinkedIn can take the full text, Bluesky fits in one. Accept the split. Add one image. Instagram is off because there is no second image and the rule says it needs media. Schedule 12:30 in the workspace timezone. Save. The drawer closes in one motion.

**Monday, 12:30.** Nobody is at the keyboard. The clock releases the job. Three targets succeed. The first comment goes out on X only, because that was the network it was marked for. A notification says it landed. The feed shows the three own-posts.

**Wednesday.** A teammate submits a draft. The admin approves from their phone on the mobile tab bar. The idempotency key means a double tap does not double-post.

**Friday.** Reports. Download the week. Delivery analytics show TikTok failed once and recovered. Audience analytics, in a separate panel, show impressions for the networks that are live, each with the time they were fetched. Simulated networks are absent from that panel.

**Any day.** Developers. A script the operator wrote calls `POST /api/v1/posts` with the same body the composer sends. It shows up on the calendar like a post they typed.

That week is the spec. Every feature below exists to make that week true.

## 7. Complete capability map

Status words: **now** (in production), **next** (build on the current seams), **later** (after the loop is real), **never** (out of the product).

### Identity

| Capability | Status | Note |
| --- | --- | --- |
| Email and password | now | Better Auth, hashed |
| Username, unique, sign-in by it | now | |
| Google and X via broker | now | Optional env |
| Sign out, session cookie | now | |
| Change password | next | Requires current password |
| Email verification | next | Needs SMTP |
| Password reset | next | The forgot page stays honest until SMTP exists |
| Session list and revoke | next | |
| TOTP and recovery codes | later | Optional, off by default |
| SAML, SCIM | later | Enterprise, after roles are real |
| Magic-link login | never | |

### Workspace

| Capability | Status | Note |
| --- | --- | --- |
| One workspace per account | now | |
| Profile, theme, timezone | now | |
| Audit log | now | |
| Delete product data | now | |
| Delete the auth user in the same action | next | |
| Invites stored with a role | now | No email yet |
| Email invite, accept link, membership | next | |
| Enforce admin / member / analyst | next | |
| Several brands under one account | later | After membership works |
| Custom domain | later | Update `BETTER_AUTH_URL` and redeploy |

### Listen

| Capability | Status | Note |
| --- | --- | --- |
| Unified chronological feed | now | |
| Search, filter, bookmark, like, reply | now | Reply is local |
| RSS add, refresh, remove, SSRF guard | now | https only |
| Scheduled ingest | next | |
| Keyword streams into the inbox | next | |
| Live home timelines | next | Per network, as clients land |
| Muted keywords, blocked authors | later | |

### Write and deliver

| Capability | Status | Note |
| --- | --- | --- |
| Multi-network composer and limits | now | |
| Drafts, templates, first comment, UTM | now | |
| Schedule, cancel, publish now | now | Release is manual |
| Approvals with idempotency | now | |
| Series, daily or weekly | now | Tick is manual |
| CSV import | now | |
| Per-target status, error, latency | now | |
| AI rewrite, user-initiated | now | Degrades with no key |
| Clock that releases due jobs and series | next | Same function the calendar calls |
| Retry one failed target | next | |
| Per-network preview and adapt | next | |
| Media rules before send | next | |
| Threads (multi-segment) | next | X, Threads, Bluesky, Mastodon |
| Real client per network | next | Start Bluesky, then Telegram |
| Object storage for media | next | Private bucket, not data URLs |
| Link unfurl and UTM preview | later | |
| Best-time suggestion inside the composer | later | Heatmap already exists |
| A/B of two texts | later | Only after delivery is real |

### Engage

| Capability | Status | Note |
| --- | --- | --- |
| Inbox kinds and filters | now | |
| Saved replies | now | |
| Local reply | now | |
| Send reply to the network | next | With the live client |
| Assign and internal note | later | With membership |

### Measure

| Capability | Status | Note |
| --- | --- | --- |
| Delivery analytics and heatmap | now | |
| CSV of history, inbox, analytics, audit | now | |
| Audience analytics, separated | next | Only live networks |
| Compare to previous period | later | |
| Scheduled report email | later | Needs SMTP |

### Platform

| Capability | Status | Note |
| --- | --- | --- |
| Health check | now | |
| Key-authenticated posts API | now | |
| Signed webhook test | now | |
| Live webhook events | next | `post.published`, `post.failed`, `inbox.received` |
| OpenAPI | next | |
| Idempotency-Key header on POST | next | Column already exists |
| Rate limit and 429 | later | |
| Official CLI | later | Thin client, not a second product |

## 8. Requirements of the finished system

These are the requirements that sit on top of `PRODUCT.md`. Each one is testable.

1. A scheduled post whose time has passed is delivered within two minutes with no one on the calendar page.
2. A job with three networks and one failure shows two successes and one failure. Retry touches only the failure.
3. Clicking publish twice with the same idempotency key creates one job.
4. The composer shows each selected network’s limit and refuses a send that breaks a media rule, naming the network.
5. A rewrite is never posted by itself. The operator accepts the text.
6. An analyst account can export analytics and cannot publish, approve, create keys, or delete the workspace.
7. An invite email contains one link. The link expires. Accepting it creates a member row and no second copy of the posts.
8. RSS refresh on a schedule does not fetch private hosts. The current guard remains on every fetch, including the clock.
9. Delivery charts and audience charts are separate components. A simulated network cannot appear in the audience chart.
10. `POST /api/v1/posts` and the composer call `runPublish`. There is no second publisher.
11. Health reports `db: "neon"` in production after every deploy.
12. Settings → export downloads the account’s jobs, targets, inbox, connections (without secrets), and audit as one archive.
13. Settings → delete removes product rows and the auth user, then the session is gone.
14. Every live network client lives behind the `simulatePublish` signature. Screens do not import a network SDK.
15. Tokens are encrypted at rest, absent from API responses, and absent from logs.

## 9. Data to add, and nothing else

Do not redesign the current tables. Add only what the loop needs.

| Addition | Why |
| --- | --- |
| `network_tokens` | Encrypted access and refresh tokens, one row per connection. Never selected by a screen. |
| `workspace_members` | The invite becomes a person with a role. |
| `delivery_attempts` | One row per try of a target: time, status, error, latency. The target keeps the latest. |
| `audience_snapshots` | Network, external id, metric, value, fetched_at. Kept apart from `publish_targets`. |
| `export_jobs` | So a large export does not run inside the request that clicked the button. |

New columns go in `migrations/0005_….sql` and onward. Applied files are never edited.

## 10. Security and trust

The best tool in this category is trusted with the keys to someone’s public voice. The bar:

- The browser never receives a network token. Server functions read the token inside the publisher.
- API keys stay hashed. The full value is shown once, which is already the behavior.
- Webhooks stay https-only. The signature header stays.
- RSS stays on the public-host guard, on every path, including the future clock.
- SQL stays parameterized.
- Production origin is `BETTER_AUTH_URL`. Credentialed auth posts from other origins fail.
- Audit rows are append-only from the app. Delete-account is the only wipe, and it is explicit.
- A pentest and an SBOM are how the claim “we take this seriously” becomes evidence. They are not claimed before they exist.
- Backups are Neon’s. The operating bar is a written restore drill with a time on it. Until that drill is done, uptime is a hope.

## 11. Design bar

The current console is already the right material: dark by default, light as a setting, one accent, real type, no card-in-card stacks, mobile tab bar, 44px targets, keyboard for the palette and for closing dialogs.

The world-class version does not restyle for its own sake. It tightens.

- Overview becomes a queue of actions. Empty states say the next click, not “nothing here.”
- The composer is the fastest surface in the product. Open, type, send. Advanced fields (UTM, first comment, approval) stay one disclosure away, as they are.
- Status color is semantic and only for status: success, failure, waiting. Network identity is the glyph, not a rainbow.
- Motion is limited to open, close, and a result arriving. No decorative loops.
- Every primary action has a visible result: toast plus a row that changed.
- Simulated versus live is a word next to the network, not a tooltip someone might miss.

## 12. Build sequence

Each phase ends when its test passes on production. Do not start the next phase by faking this one.

### Phase 1 — The clock

No new product surface. A scheduled function calls the existing release path for due jobs and due series.

Test: schedule a post three minutes ahead, close the laptop, see the target leave `pending`.

### Phase 2 — Bluesky, for real

App password, stored encrypted. `simulatePublish` is no longer called for `bluesky`. Other ids unchanged. The connection chip reads Live.

Test: the post is visible on the operator’s Bluesky profile, and the target row has the real external id. A bad password becomes status `error` on the connection and a failed target, not a crash.

### Phase 3 — Telegram, then the slow networks

Bot token next, for the same reason: the operator can mint it. Then Mastodon (the instance is already a field), then X, LinkedIn, Reddit, Pinterest, YouTube, TikTok, and Meta (Instagram, Facebook, Threads) as each developer app is approved.

Test, per network: one real post, one real failure shown in the network’s words, the other networks unaffected.

### Phase 4 — The composer tells the truth

Per-network preview, media rules, adapt, retry-one-target.

Test: an Instagram selection with no image cannot send, and the message names Instagram. A failed X target can be retried without resending LinkedIn.

### Phase 5 — People

SMTP. Invite email. Accept link. `workspace_members`. Roles enforced on publish, approve, keys, and delete. Password reset becomes real. The forgot-password page changes only then.

Test: an analyst can download a report and receives an error on publish.

### Phase 6 — Audience, separated

For each live network that exposes metrics, a snapshot job writes `audience_snapshots`. Analytics gains a second section.

Test: a Bluesky post shows delivery in one section and likes-as-fetched in the other. A still-simulated network appears in neither audience number.

### Phase 7 — The platform is finished

OpenAPI. Webhook events on real publish and failure. Idempotency-Key header. Account export. Account delete removes the auth user. Restore drill written down.

Test: a script written against the OpenAPI file can schedule a post. A second person can restore yesterday’s database from the drill without asking the author.

After phase 7 the six tests in section 2 pass. That is the point at which “best in the world” is a description instead of a direction.

## 13. Ninety days

This is the operating calendar, assuming one builder and the operator supplying Bluesky and Telegram credentials in week two.

| Week | Outcome |
| --- | --- |
| 1 | Clock in production. A scheduled post leaves on its own. |
| 2 | Bluesky live. Chip says Live. One real post from the composer and one from the API. |
| 3 | Telegram live. Retry of a single failed target. |
| 4 | Composer preview and media rules. Instagram-without-image is blocked in the drawer. |
| 5 | Mastodon, using the instance field that already exists. |
| 6 | SMTP, invite email, password reset. Forgot-password page updated the same day, not before. |
| 7 | Roles enforced. Analyst test in section 12 passes. |
| 8 | X or LinkedIn, whichever developer app is approved. If neither is, spend the week on threads for Bluesky and Mastodon. |
| 9 | Audience section for the live networks only. |
| 10 | Webhook events, OpenAPI, Idempotency-Key. |
| 11 | Account export and full delete. |
| 12 | Restore drill. The six tests in section 2 run as a written script against production. |

Weeks 8 and beyond slip if a network’s review slips. The calendar does not invent a client to stay on schedule. A slipped network stays simulated and labeled.

## 14. What we will not build

- A native iOS, Android, or Electron app. The PWA is the install.
- An ads manager, a pixel, or a boosted-post flow.
- A public timeline of NEXUS users.
- Magic-link login.
- AI that posts by itself, auto-replies, or invents engagement.
- Fake analytics for simulated networks.
- A white-label agency console before a single real network is boringly reliable.
- A rewrite of the stack. TanStack Start, Better Auth, Postgres, and `runPublish` stay.

## 15. How to know we got there

Run this on production. Write down the time. If any step fails, the product is not finished, regardless of how many networks are listed on the landing page.

1. Register a new account. Land on the overview.
2. Connect Bluesky with a real app password. The chip says Live.
3. Compose a post to Bluesky and one simulated network. Send.
4. See the Bluesky post on Bluesky. See the other target labeled simulated.
5. Schedule a second post two minutes out. Do not touch the calendar. Confirm it landed.
6. Force a failure (revoke the app password, retry). See the error. Restore the password. Retry only that target. Confirm one new post, not two.
7. Invite an analyst. Sign in as them. Export a report. Confirm publish is refused.
8. Call `POST /api/v1/posts` with a key. See the job on the calendar.
9. Export the account. Delete it. Confirm sign-in fails and the rows are gone.
10. Open analytics. Delivery and audience are separate. The simulated network has no audience number.

That script is the definition of done. `PRODUCT.md` remains the inventory of the system. This document is the reason to finish it, and the order to finish it in.
