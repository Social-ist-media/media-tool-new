# ENTERPRISE readiness — NEXUS

Evidence-or-it-did-not-happen. Sandbox constraints are named, not hidden.

## Reliability
| Requirement | Status | Evidence |
|---|---|---|
| Health check | [x] | `GET /api/v1/health` |
| Zero-downtime multi-region | [ ] | Vercel+Neon is single-region unless operator configures; next: Neon HA + Vercel failover |
| RTO/RPO | [ ] | Operator-owned Neon backups; next: document restore drill on Neon console |

## Scale
| Requirement | Status | Evidence |
|---|---|---|
| Per-user scoped queries | [x] | `authMiddleware` + `user_id` on every table |
| Indexes | [x] | `migrations/0002_nexus.sql`, `0003_ops.sql` |
| 10x load test | [ ] | Not run in sandbox; next: k6 against deployed URL |

## Security
| Requirement | Status | Evidence |
|---|---|---|
| Auth (email + OAuth broker) | [x] | Better Auth, `src/lib/auth/*` |
| Password hashing | [x] | Better Auth default (scrypt) |
| Parameterized SQL | [x] | tagged `sql\`\`` in data.ts/ops.ts |
| CSRF/session | [x] | Better Auth cookies |
| API keys hashed | [x] | SHA-256, prefix only stored in UI |
| Webhook https-only + signature | [x] | `saveWebhook` rejects non-https; `x-nexus-signature` |
| No hardcoded secrets | [x] | No `.env`; `XAI_API_KEY` server-only |
| Magic links | n/a | Forbidden by auth skill |
| SAML/SCIM/MFA | [ ] | Needs IdP; next: Better Auth organization plugin |
| Pentest / SBOM published | [ ] | Next: `npm audit` + CycloneDX in CI |

## Observability
| Requirement | Status | Evidence |
|---|---|---|
| Audit log | [x] | `audit_events` + Settings viewer + CSV |
| In-app notifications | [x] | `notifications` table |
| Status page / on-call | [ ] | Next: status.nexus + PagerDuty |

## Performance
| Requirement | Status | Evidence |
|---|---|---|
| Preview on :8080 | [x] | `startup.sh` |
| Charts | [x] | recharts analytics |
| Bundle budgets | [ ] | Next: Vite stats after `npm run build` |

## Quality
| Requirement | Status | Evidence |
|---|---|---|
| Typecheck | [x] | npm run typecheck passed |
| Auth invariant | [x] | `npm run check:auth` expected on |
| E2E every journey | [~] | browser-smoke after this slice |

## Operability / launch
| Requirement | Status | Evidence |
|---|---|---|
| Privacy + Terms | [x] | `/privacy`, `/terms` |
| Help | [x] | `/dashboard/help` |
| PWA | [x] | grok-pwa injector |
| Store listings / Electron | [ ] | Out of sandbox; PWA is the install path |
