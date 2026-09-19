# ENTERPRISE readiness — NEXUS

Evidence-or-it-did-not-happen. Sandbox constraints are named, not hidden.

## Reliability
| Requirement | Status | Evidence |
|---|---|---|
| Health check | [x] | `GET /api/v1/health` |
| Zero-downtime multi-region | [ ] | Vercel+Neon is single-region unless operator configures |
| RTO/RPO | [ ] | Operator-owned Neon backups |

## Scale
| Requirement | Status | Evidence |
|---|---|---|
| Per-user scoped queries | [x] | `authMiddleware` + `user_id` on every table |
| Indexes | [x] | `migrations/0002_nexus.sql`, `0003_ops.sql` |
| 10x load test | [ ] | Not run in sandbox |

## Security
| Requirement | Status | Evidence |
|---|---|---|
| Auth (email + OAuth broker) | [x] | Better Auth |
| Password hashing | [x] | Better Auth default (scrypt) |
| Parameterized SQL | [x] | tagged SQL in data.ts/ops.ts |
| API keys hashed | [x] | SHA-256, prefix only stored in UI |
| Webhook https-only + signature | [x] | `saveWebhook` rejects non-https |
| Magic links | n/a | Forbidden by platform auth rules |
| SAML/SCIM/MFA | [ ] | Needs IdP |

## Quality
| Requirement | Status | Evidence |
|---|---|---|
| Typecheck | [x] | npm run typecheck passed |
| Auth invariant | [x] | sign-in on |
