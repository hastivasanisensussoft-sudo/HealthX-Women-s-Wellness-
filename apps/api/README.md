# HealthX API (minimal, in-memory)

A small Node.js API that does only what can't be trusted to a browser or phone:

- authentication and sessions
- staff MFA
- **server-side permissions for the four SRS roles** (End User, Content Manager, Medical Content Reviewer, Admin)
- **owner-only access** to app users' wellness data
- the content review/publish workflow
- the audit log
- account data shared by web and mobile

**No database** (by request). Everything lives in memory and **resets when the process restarts**. The data shapes mirror the SRS entities (§45/§46), so a PostgreSQL-backed NestJS service (SRS §55/§56) can replace the store later without changing the HTTP contract.

There are no runtime dependencies (Node built-ins only). Dev tools: `tsx`, `typescript`, `@types/node`.

## Run

```bash
cd apps/api
npm install
npm run dev        # http://127.0.0.1:4000 (watch mode)
npm test           # 101 integration + unit tests, incl. 25 security regressions and the four-role checks (each file starts its own in-memory API on a random port)
npm run typecheck
```

From the repo root, `npm run dev` starts the API and the web app together. The web app reaches the API through the Vite proxy at `/api`.

| Env var | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | 4000 / 127.0.0.1 | Listen address |
| `ALLOWED_ORIGINS` | localhost:5173, :8081, :8094 | CORS allowlist (browser origins) |
| `NODE_ENV=production` | — | Turns off demo seed + dev helpers, adds HSTS |
| `DEMO_PASSWORD` | `HealthX-demo-2026` | Password of the **synthetic** demo accounts (dev only) |
| `ACCESS_TTL_MS` / `REFRESH_TTL_MS` | 15 min / 30 days | Token lifetimes |
| `UNVERIFIED_REFRESH_TTL_MS` | 24 h | Refresh lifetime until an app user verifies their email |
| `STAFF_ABSOLUTE_MS` | 12 h | Staff must sign in again (password + MFA) after this, however active |
| `DEV_TOOLS` | on for a loopback `HOST` outside production | `false` turns the dev helpers off; `true` on a non-loopback host is refused at start-up |
| `TRUST_PROXY` | loopback (dev) / none (production) | Peers whose `X-Forwarded-For` is trusted for client IPs (rate limits) |
| `MAX_USER_STATE_BYTES` | 1.5 MB | Per-account app data cap (413 above it) |
| `RATE_*` | see `src/config.ts` | Rate limits (window, login, MFA, writes, export, contact, register) |

**Roles — exactly the four from SRS §6** (`packages/shared/src/admin/rbac.ts`):

| Role (id) | SRS | What it can do |
|---|---|---|
| End User (`end_user`) | §6.1 | Their own wellness data in the app; no Web Admin access |
| Content Manager (`content_manager`) | §6.2 | Write, categorise and submit content; schedule/publish only after medical + compliance approval; draft notification copy |
| Medical Content Reviewer (`medical_content_reviewer`) | §6.3 | Review content and health-related copy; approve, reject or request changes; add references; safety checklist |
| Admin (`admin`) | §6.4 | Users & support, privacy requests, subscriptions, notifications, analytics & reports, configuration, flags, compliance approval, audit |

**Privileged permissions are held per Admin account, never by a role:**
- The four privileged permissions are `manage_staff`, `manage_permissions`, `manage_settings` and `break_glass`.
- An Admin can grant or remove only privileged permissions they hold themselves.
- An Admin can't change anyone who holds privileged permissions they lack, including renaming them.
- Nobody can change their own account, including their own name.
- Staff names are unique. Names that differ only in case, spacing, width or invisible characters count as the same name, and text-direction control characters are refused.

**Clinical sign-off** (`medical_review`, `review_templates`) is fixed to Medical Content Reviewers.

**Retired roles.** Super Admin, Support Agent, Analyst and the old Medical Reviewer id were merged on 2026-10-26.
- Their ids are refused everywhere with a message naming their replacement.
- Stored data that still uses them is mapped by `migrateLegacyAccounts` (API) and `migrateAdminState` (offline Web Admin state):
  - A former Super Admin keeps those powers as privileged permissions.
  - Former Support Agents and Analysts become Admins without privileged permissions, even if a stored record lists some.

**Demo accounts (development only, synthetic):**
- App users: `aisha@example.com`, `riya.test@example.com`.
- Staff accounts all require MFA:

  | Account | Role | Privileged permissions | Before the consolidation |
  |---|---|---|---|
  | `sam.rivera@healthx.example` | Admin | all four | Super Admin |
  | `alex.morgan@healthx.example`, `ritu.sharma@healthx.example` | Admin | none | Admin |
  | `neha.joshi@healthx.example`, `tom.becker@healthx.example` | Admin | none | Support Agent |
  | `kenji.watanabe@healthx.example` | Admin | none | Analyst |
  | `priya.nair@healthx.example`, `daniel.okafor@healthx.example` | Content Manager | — | Content Manager / Writer |
  | `meera.iyer@healthx.example`, `sarah.thompson@healthx.example` | Medical Content Reviewer | — | Medical Reviewer |

- In development, `GET /v1/dev/mfa-code?email=…` returns a staff account's current authenticator code, and `GET /v1/dev/outbox` shows emails that would have been sent (verification, reset, magic-link and invite links). Both routes are **not registered** in production or on a non-loopback `HOST`, and they answer only to a loopback peer with a loopback `Host` header and no non-loopback proxy hop (so a remote client or a DNS-rebinding page can't read them).

## Security model

- **Passwords:** scrypt (memory-hard, per-user salt) run asynchronously on the thread pool, constant-time comparison, policy of 8–128 characters with no common passwords. Staff passwords also follow the Admin settings minimum.
- **Email ownership:**
  - Registration sends a verification link (`POST /v1/auth/verify-email`). Unverified accounts get a 24-hour refresh lifetime.
  - The first magic-link sign-in or password reset on an unverified account ends every other session and clears the password, so registering someone else's email first can't pre-hijack their account.
  - A password change or reset invalidates outstanding reset and magic links.
- **Tokens:**
  - The access token is random, lasts 15 minutes, is held in memory and sent as `Authorization: Bearer …`.
  - The refresh token is random and rotates on every use. Reusing a rotated token revokes the whole session family (theft detection).
  - The server stores only token hashes.
  - Web gets the refresh token as an `HttpOnly; SameSite=Strict` cookie: `hx_rt` for the app and `hx_rta` for the Web Admin. Mobile gets it in the body and stores it in the OS keystore.
- **Staff sessions:**
  - MFA uses TOTP (RFC 6238). A code can't be replayed.
  - Wrong codes are counted per account, not per sign-in attempt. Ten in a row lock MFA for 15 minutes; this is audited.
  - The idle timeout comes from Admin settings, and there's a 12-hour absolute lifetime. Both are enforced on refresh.
  - Magic links are app-user only.
- **Authorization:**
  - The role and status are re-read from the server on every request, so deactivation, role changes and permission edits apply immediately.
  - The browser never supplies its role.
  - `/v1/me/*` serves only the session's own data; there are no user-id parameters. Records fetched by id return 404 for anything that isn't the caller's.
  - `/v1/admin/*` requires an MFA-verified staff session plus capabilities from the server-held permission matrix.
- **App-user writes:** the shared reducer runs behind an allowlist with per-action validation.
  - Refused outright: `SET_ROLE`, `SET_PLAN`, `HYDRATE`, `RESET_DEMO`, `SET_WEIGHTS`, `SIGN_*`.
  - Profile edits can't touch email, plan or role.
  - References must point at existing records: habits, symptoms, published articles, posts. Anything else is 404, so clients can't grow their state with junk.
  - Each account's data is capped (413) and has a write budget (429).
  - Retries are idempotent via a client action id.
- **Admin writes:** per-action policy in `src/adminPolicy.ts`.
  - Only the fields an action may change are read. The server writes ids of new records, identities, authors, timestamps and metrics.
  - A request that changes nothing writes nothing and is not audited.
  - Content workflow (`src/contentWorkflow.ts`):
    - Only legal transitions are accepted.
    - Nobody who created or edited the current version can approve it, and medical and compliance approval must come from two different people (checked by account id).
    - The safety checklist is completed only by the medical reviewer during review and gates approval.
    - The reviewer name, history and version snapshots are written by the server.
  - Template approval publishes exactly the reviewed proposal.
  - Accounts are erased only by completing a tracked deletion request, which also scrubs the user's name and email from support requests, refunds and queued emails.
  - Escalation guards:
    - Nobody edits their own role or its permissions.
    - Privileged permissions (`manage_staff`, `manage_permissions`, `manage_settings`, `break_glass`) are held per Admin and never by a role. They can only be granted or removed by an Admin who holds them, and nobody can change their own account, so an active holder always remains.
    - Clinical sign-off is fixed to Medical Content Reviewers.
    - Staff deactivation ends sessions and invite links at once.
    - Staff names are unique.
  - Audit entries record the actor's account id and email. The log is never truncated; a per-account write budget bounds it.
- **Privacy:**
  - Admin views never include health data. Emails are masked; revealing one is audited.
  - Roles that don't work with individual accounts (Content Manager, Medical Content Reviewer) get no user rows at all.
  - Break-glass (Admins holding the break-glass permission) needs a reason, returns categories and counts only, and is audited.
  - Audit entries hold no health values, and IPs are truncated.
  - Contact-form messages are never linked to an account by the typed email.
- **Transport:**
  - CORS allowlist; foreign-origin writes are refused (CSRF defence).
  - Security headers and `Cache-Control: no-store`.
  - 512 KB JSON-only bodies, nested at most 32 levels.
  - Rate limits:
    - global per IP
    - login per IP+account, per account and per IP across accounts (spraying)
    - MFA per account
    - register, forgot-password, magic link, verification resend, contact, export
    - app-user and admin writes per account
  - Client IPs come from `X-Forwarded-For` only when the peer is a trusted proxy.
  - Errors never expose internals; malformed paths and cookies are handled without crashing.

## Endpoints

| Area | Endpoints |
|---|---|
| Public | `GET /v1/health` · `GET /v1/content` · `GET /v1/content/:id` (published only) · `POST /v1/contact` |
| Auth | `POST /v1/auth/register` · `verify-email` · `verify-email/resend` · `login` · `mfa/verify` · `refresh` · `logout` · `logout-all` · `GET me` · `GET sessions` · `DELETE sessions/:id` · `POST password/change` · `password/forgot` · `password/reset` · `magic-link` · `magic-link/verify` · `invite/accept` · `oauth/:provider` (501 — needs Apple/Google credentials) |
| App user | `GET /v1/me/state` · `POST /v1/me/actions` · `GET /v1/me/records/:collection/:id` · `GET /v1/me/export` · `DELETE /v1/me` · `POST /v1/me/subscription/trial` · `…/cancel` · `POST /v1/me/data/sample` · `…/clear` |
| Web Admin | `GET /v1/admin/state` (role-scoped) · `POST /v1/admin/actions` · `POST /v1/admin/users/:id/reveal-email` · `POST /v1/admin/users/:id/break-glass` · `GET /v1/admin/audit` |

The shared client used by web and mobile is in `packages/shared/src/api/client.ts`.

## Not included (needs infrastructure or decisions outside this repo)

- Persistent database (PostgreSQL per SRS).
- Apple/Google OAuth credentials.
- Email/SMS delivery: links go to the dev outbox.
- Payments and billing (the free trial is the only plan change the server makes).
- Push notifications: campaigns can be drafted and scheduled, but "send now" returns 501 and nothing is delivered.
- File storage for the media library: metadata only.
- MFA backup codes.
- Health-platform sync (HealthKit/Health Connect).
- Real AI.
- Encryption at rest, backups, multi-instance rate limiting (Redis) and deployment.
