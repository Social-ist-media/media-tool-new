# NEXUS Console — FEATURES

Master checklist. `[x]` done + verified in this workspace. `[~]` in progress. `[ ]` remaining. `[E]` enterprise-verified with evidence in ENTERPRISE.md.

## Core product

- [x] Email/password login + Google/X via Grok broker
- [x] Register, session, sign-out, forgot-password honesty
- [x] Per-user Postgres (Neon in deploy, PGLite in preview)
- [x] 12 network demo connectors (X, Threads, Bluesky, Mastodon, Instagram, LinkedIn, Facebook, YouTube, TikTok, Reddit, Pinterest, Telegram)
- [x] Unified chronological feed (search, filter, bookmark, like, reply)
- [x] Composer: multi-network, char limits, media, schedule, drafts, UTM, first comment, templates
- [x] Approval queue (submit / approve+publish / reject)
- [x] Inbox (filter, mark read, reply, canned replies)
- [x] Calendar month grid + queued list + publish-now + cancel
- [x] Analytics (success rate, latency, 14-day volume, best-time heatmap, CSV)
- [x] Library (templates, saved replies, media assets)
- [x] Team invites (owner + admin/member/analyst, no email delivery)
- [x] Settings (profile, theme, timezone, audit log, data delete)
- [x] Notifications bell
- [x] Command palette (⌘K)
- [x] Reports + CSV export (history, inbox, analytics, audit)
- [x] Developers: API keys, webhooks (https only), test ping
- [x] REST: `GET /api/v1/health`, `GET|POST /api/v1/posts` (Bearer `nxk_`)
- [x] AI rewrite (Grok, user-initiated, 2.5s throttle, degrades if no key)
- [x] Help center, privacy, terms, 404
- [x] Dark / light theme
- [x] Responsive dashboard + mobile tab bar
- [x] PWA install surface (platform injector)

## Not in this build (exact next step in RESUME.md)

- [ ] Live OAuth for Twitter/Meta/etc. (needs operator developer apps)
- [ ] Magic-link / MFA / SAML / SCIM (auth skill forbids magic links; SAML needs IdP)
- [ ] Native Electron/Tauri/iOS/Android (PWA is the install path)
- [ ] CLI/SDK packages published to npm
- [ ] Email delivery for invites and password reset
- [ ] Multi-region failover, 99.99% SLA, pentest report
