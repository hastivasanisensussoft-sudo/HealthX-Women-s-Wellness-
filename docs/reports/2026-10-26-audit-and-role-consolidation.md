# HealthX Women’s Wellness — Audit, Role Consolidation and Verification Report

**Date:** 26 October 2026
**Repository:** `C:\New folder\HealthX Women's Wellness`. This is not a Git repository.
**Test environment:**
- Windows 10 Pro, Node 24.17.0
- Google Chrome driven by playwright-core 1.64.0
- Android emulator: Pixel 7 profile, Android 16 (API 36), x86_64

**Data used:** synthetic accounts only. Every test ran against a local, in-memory API. Nothing was deployed, and nothing was sent to an external service.

**Status labels** (as defined in the audit brief):

| Label | Meaning |
|---|---|
| **PASS** | Implemented and verified with evidence. |
| **PARTIAL** | Works in part. |
| **FAIL** | Missing or wrong. |
| **MOCKED** | Simulated where real behaviour is required. |
| **NOT VERIFIED** | Could not be tested safely or with the available resources. |
| **NOT APPLICABLE** | Out of scope, with the reason given. |

The report has two parts:
- **Part A** — the audit brief: 16 sections and the 12 final questions.
- **Part B** — the request to consolidate seven roles into the four SRS roles.

Test commands and file lists are in the appendix.

---

## Part A — Audit, gap analysis, implementation and verification

### 1. Executive summary

**Before this work, the app had no security boundary.**
- The web app and the Expo mobile app were front-end-only demos.
- Each user’s data lived in that browser’s `localStorage` or on the device. Nothing reached a server.
- Any password signed you in.
- The Web Admin login let anyone pick any of the seven roles.
- The browser wrote the audit log itself.
- Separation of duties in the content workflow existed only in the UI.

Every “permission” could be bypassed from the browser.

**What was done.** The project owner decided: front end first, a backend only where it’s needed, and no database. Within that:
1. **A minimal API (`apps/api`).** It uses Node built-ins and keeps its data in memory. It owns:
   - authentication and sessions
   - the role and permission model
   - the content workflow
   - record ownership
   - the audit log

   The web user app, the Web Admin and the mobile app use it (“API mode”). The old browser-only behaviour remains as an explicit, labelled **offline demo**.
2. **Seven roles consolidated into the four SRS roles** (Part B).
3. **Two independent adversarial security reviews of the API.** Every confirmed finding was fixed and has a regression test: 25 in total, labelled A–S.

**Evidence on the final code (26 Oct 2026):**
- **API:** 101 of 101 tests pass; typecheck clean.
- **Web:** typecheck clean; lint has 0 errors; production build succeeds.
- **Mobile:** typecheck and lint clean.
- **Browser suites:** 16 suites, 1,025 checks, 0 failures (§13).
- **Native Android:** the HealthX mobile app ran in Expo Go on an Android emulator against the API. Checked:
  - sign-in and every tab
  - a write from the device stored on the server
  - device ↔ web synchronisation for the same account: 5 of 5 checks

**Verdict.** Ready for internal QA of the functional flows in a development environment. **Not ready for staging or production:**
- There is no database, so all data is lost when the API restarts.
- Email, Apple and Google sign-in, payments, push, health-data sync and the AI coach are simulated or not connected.
- There is no deployment setup or TLS.
- The legal pages are drafts.
- There is no standalone mobile build and no iOS testing.
- There has been no external security assessment.
- One session-robustness issue is open: a lost refresh response signs the user out (§10, item O1).

### 2. Original architecture and technology stack (before this work)

Pre-change snapshot: `backup/102231`, taken before any backend work.

| Part | Technology | Notes |
|---|---|---|
| `apps/web` | React 18.3.1, Vite 6.4.5, TypeScript 5.9.3, Tailwind 3.4.19, Recharts 2.15.4, react-router 6.30.6 | Public website, web user app and Web Admin in one SPA |
| `apps/mobile` | Expo SDK ~58.0.17, React Native 0.88.0, React 19.3.0, expo-router ~58.0.25, AsyncStorage 2.2.0 | React Native / Expo app; state on the device only |
| `packages/shared` | Dependency-free TypeScript | Shared state reducer, dates and content |
| Backend, API, database, auth service | **None** | — |
| Tests | Browser scripts in a temporary folder, not in the repo | No unit or integration tests, no CI |
| Version control | None | Git is installed, but the folder is not a repository |
| Secrets | None in the source, no `.env` files | — |

### 3. Initial audit findings

Line numbers refer to the pre-change snapshot.

| ID | Severity | Finding (before) | Evidence | Now |
|---|---|---|---|---|
| C1 | Critical | Admin login let anyone choose any role; any 8+ character password and any 6-digit MFA code were accepted; a “Switch demo role” control existed | `AdminLogin.tsx:33, :49, :57, :69, :302–303`; `AdminLayout.tsx:333, :371, :385` | **Fixed.** Real staff accounts with password plus authenticator (TOTP) checked by the API. The role comes from the server. A role picker remains only in the labelled offline demo, which enforces nothing. |
| C2 | Critical | The browser wrote the audit log (`LOG` action with a fake IP); entries could be forged or deleted | `adminState.ts:205–207` | **Fixed.** Only the server writes audit entries, with the real actor id and email. A client `LOG` is ignored. |
| C3 | High | Separation of duties existed only in the UI; any status could be set with `UPSERT_CONTENT` | `ContentEditor.tsx:273` | **Fixed.** A server-side transition table, checks by account id, and medical and compliance approval by two different people. |
| C4 | High | No authentication: login dispatched `SIGN_IN` after a simulated delay; any password worked unless it contained “wrong” | `Login.tsx:27, :42–47` | **Fixed.** scrypt hashes, rate limits, opaque hashed tokens, rotating refresh tokens, staff MFA. |
| C5 | High | All data in `localStorage` (web) or `AsyncStorage` (mobile): no server persistence, no sync, no multi-user isolation | — | **Fixed for API mode:** data stored by the server and synced across devices, per account. No database, by decision (§7). |
| H1 | Medium | Dead legal links (`#terms`, `#privacy`); no Terms or Privacy pages | `Signup.tsx:113–114`, `Onboarding.tsx:430–431` | **Partial.** Terms and Privacy pages exist and are linked, but are marked “Draft — requires legal review before launch”. |
| H2 | Medium | Contact form was simulated | `site/pages/Contact.tsx:17, :38` | **Fixed.** Messages go to the API’s support queue: validated, rate-limited, sender marked unverified. |
| M1 | Medium | Tests lived only in a temporary folder | — | **Fixed.** `apps/api/test` holds 101 tests; `tests/e2e` holds 16 browser suites. No CI is configured. |
| M2 | Medium | No version control | — | **Unchanged.** Git was not initialised (not requested). |
| L1 | Low | Open decision D-01: the SRS mentions Flutter in places, but React Native is implemented | — | **Unchanged.** Still an open decision. |

### 4. Platform areas and their status

| Area | Before | Now | Status | Main evidence |
|---|---|---|---|---|
| Public website | Static pages; contact simulated; dead legal links | Contact goes to the support queue; legal pages linked | **PARTIAL** (legal pages are drafts) | `security.test.ts` (contact); `e2e-api-down.mjs` (site works while the API is down) |
| Web user app | Browser-only, no authentication | API mode: server auth, ownership and storage; offline demo opt-in with a banner | **PASS** (development) | `e2e-api-user`, `e2e`, `e2e-merge`, `navcrawl`, `e2e-api-down`; `ownership.test.ts` |
| Web Admin | Pick-a-role login, client audit log | Four server-enforced roles, MFA, server audit, per-Admin privileged permissions | **PASS** (development) | `admin-api` (152 checks), `admin-navsmoke`, `admin-flow2/3/4`, `admin-indep`; `rbac`, `roles` and `regressions` tests |
| Mobile app (Expo / React Native) | Device-only | API mode with the same backend; device keystore for the refresh token | **PASS** on Android in Expo Go; **NOT VERIFIED** as a standalone build and on iOS | Mobile web-export suites (§13); native Android check (§8) |
| API | None | `apps/api`, 38 routes | **PASS** (development and test) | 101 API tests |
| Database | None | None, by the project owner’s decision | **NOT APPLICABLE** (the SRS expects one, so this is required before production) | — |
| Automated tests | Temporary folder only | In the repo | **PASS**; CI **NOT VERIFIED** (none configured) | §12–13 |

### 5. Authorization matrix

The brief asked for a seven-role matrix. The roles were then consolidated into the four SRS roles (Part B), so this is the four-role matrix the API enforces. It comes from `packages/shared/src/admin/rbac.ts`. Every check runs on the server, on every request.

**Default role matrix.**

Key:
- ✓ granted by default
- — not granted
- **fixed** cannot be changed in the matrix
- **per Admin** held by individual Admin accounts, never by a role

| Capability | End User | Content Manager | Medical Content Reviewer | Admin |
|---|---|---|---|---|
| `admin_access` (open the Web Admin) | — fixed | ✓ | ✓ | ✓ fixed |
| `view_content` | — fixed | ✓ | ✓ | ✓ |
| `edit_content` (write, edit, submit, media, taxonomy) | — fixed | ✓ | — | ✓ |
| `medical_review` (approve, reject, request changes, safety checklist) | — fixed | — fixed | ✓ fixed | — fixed |
| `compliance_review` (§40 compliance step) | — fixed | — | — | ✓ |
| `publish_content` (schedule, publish or archive **approved** content) | — fixed | ✓ | — | ✓ |
| `view_notifications` | — fixed | ✓ | ✓ | ✓ |
| `edit_templates` (draft notification copy) | — fixed | ✓ | — | ✓ |
| `review_templates` (approve health-related copy) | — fixed | — fixed | ✓ fixed | — fixed |
| `manage_notifications` (campaigns) | — fixed | — | — | ✓ |
| `view_analytics`, `export_reports` | — fixed | — | — | ✓ |
| `view_users`, `manage_user_status`, `resend_verification` | — fixed | — | — | ✓ |
| `process_data_requests` (privacy export and deletion) | — fixed | — | — | ✓ |
| `manage_support`, `manage_subscriptions` | — fixed | — | — | ✓ |
| `view_staff`, `view_audit`, `view_settings` | — fixed | — | — | ✓ |
| `manage_config`, `manage_flags` | — fixed | — | — | ✓ |
| `manage_staff`, `manage_permissions`, `manage_settings`, `break_glass` | — | — | — | **per Admin** (privileged) |

Rules around the matrix (`apps/api/src/adminPolicy.ts`, `apps/api/src/auth.ts`):
- Capabilities are re-read from the account on every request. Tokens are opaque and carry no role claims. A role change, a revoked privileged permission or a deactivation takes effect on the next request.
- Nobody can edit their own role’s row, or any fixed cell.
- Privileged permissions:
  - They can never be put in a role row.
  - Only someone who holds a privileged permission can grant it.
  - Nobody can change, or rename, a person who holds privileged permissions they lack.
  - Nobody can change their own account.

  Together these mean an active holder of each privileged permission always remains.
- **End Users** reach only `/v1/me/*`, and only for their own data. Staff accounts can’t use the app-user endpoints, so there is no staff back door to health data.
- **Server projection** (`apps/api/src/projection.ts`): each role receives only its own Web Admin data.
  - Content roles see no user accounts.
  - Admin views never contain health values.
  - Emails are masked; revealing one is audited.
  - Break-glass returns only category counts, and is audited.

**Server enforcement by endpoint.** Every route under `/v1/admin/*` requires a staff session that has completed MFA.

| Endpoint or admin action | Required capability (server) |
|---|---|
| `GET /v1/admin/state` | `admin_access`; content is projected per capability |
| `UPSERT_CONTENT` | Depends on the transition. Every capability the transition lists is required (`contentWorkflow.ts:217`). Authors and editors can’t approve. Medical approver ≠ compliance approver. |
| `UPDATE_USER` | `manage_user_status`; deletion needs `process_data_requests`; complimentary access needs `manage_subscriptions` |
| `INVITE_STAFF`, `UPDATE_STAFF` | `manage_staff` (privileged), plus the staff rules above |
| `SET_PERMISSION`, `RESET_PERMISSIONS` | `manage_permissions` (privileged) |
| `UPDATE_SETTINGS` | `manage_settings` (privileged) |
| `UPDATE_FLAG` | `manage_flags` |
| `TOGGLE_RULE`, `ADD_SYMPTOM`, `SET_DEFAULTS` | `manage_config` |
| `UPSERT_SUPPORT` | `manage_support` (staff can’t create tickets or reassign the requester) |
| `UPSERT_TEMPLATE` | `edit_templates` to propose; `review_templates` to approve, which publishes exactly the proposed wording |
| `UPSERT_CAMPAIGN` | `manage_notifications` (status “sent” is refused because there is no delivery service) |
| `ADD_REFUND` | `manage_subscriptions` |
| `UPSERT_PRIVACY` | `process_data_requests`; a deletion is completed by a different person from the one who opened it |
| `ADD_MEDIA`, `UPDATE_MEDIA`, `DELETE_MEDIA`, `SET_TAXONOMY` | `edit_content` |
| `UPDATE_ACCOUNT` | Your own preferences only |
| `POST /v1/admin/users/:id/reveal-email` | `view_users`; audited |
| `POST /v1/admin/users/:id/break-glass` | `break_glass` (privileged); reason required; audited |
| `GET /v1/admin/audit` | `view_audit` |

Evidence:
- `rbac.test.ts`: every staff account checked against the matrix with direct API calls; crafted requests refused; escalation refused; revocation takes effect on the next request.
- `roles.test.ts`, `regressions.test.ts` (K, P, R, S).
- `admin-api.mjs`: each persona’s navigation, server-scoped data and refused crafted requests in the browser.

### 6. Workflow-by-workflow verification table

The test files cited live in `apps/api/test/` (`*.test.ts`) and `tests/e2e/` (`*.mjs`).

**End User**

| Workflow | Status | Evidence |
|---|---|---|
| Sign up: server password policy, duplicate email refused, role can’t be chosen | PASS | `auth.test` (register ×2), `roles.test`, `e2e-api-user`, `e2e`, `mobile-onboarding` |
| Email verification (single-use link) | PASS for the logic; delivery **MOCKED** (development outbox) | `regressions` B, `e2e-api-user` |
| Sign in: generic errors, lockout, spraying limits | PASS | `auth.test`, `regressions` Q |
| Magic link sign-in (app users only) | PASS for the logic; delivery **MOCKED** | `auth.test`, `mobile-connection` |
| Password reset and change: other sessions end, old links stop working | PASS for the logic; delivery **MOCKED** | `auth.test`, `regressions`, `e2e-api-user` |
| Sign out; sign out of all devices; session list | PASS | `auth.test`, `client.test`, `sync-web-mobile` |
| Apple and Google sign-in | **FAIL** — not implemented; the API answers “not configured” (no fake success). Needs provider credentials. | `auth.test` |
| Onboarding: goals → about → consent → cycle → reminders, with consent before any cycle data | PASS | `e2e`, `mobile-onboarding` |
| Logging (period/cycle, symptoms, mood/check-in, water, sleep, workouts, habits, goals): stored by the server per account; writes must reference existing records | PASS | `ownership.test`, `regressions` G, `e2e`, `core-e2e`, native device check |
| Estimates and insights labelled as estimates or patterns, not diagnosis | PASS for the labelling; the clinical correctness of the estimate rules is **NOT VERIFIED** (needs clinical review) | Native device check: “Ovulatory window (estimated)*”, “Patterns from what you log — never a diagnosis”, “Engagement metric, not a medical score” |
| AI coach: declines to diagnose, redirects emergencies | Safety rules PASS; the coach itself is **MOCKED** (rule-based, no AI service) | `e2e` (two coach steps) |
| Export my data (only the caller’s data) | PASS | `ownership.test`, `e2e`, `content-flows` |
| Delete my account (password plus typing DELETE; wipes data, ends sessions) | PASS | `ownership.test`, `content-flows` |
| Consent rules: required consent can’t be withdrawn; withdrawing integrations consent disconnects every source | PASS | `ownership.test`, `regressions` M |
| Premium trial (decided by the server, once) | PASS; payments **MOCKED** (no payment provider) | `ownership.test`, `regressions`, `content-flows` |
| Reminders and push notifications | Reminders stored by the server per account: PASS. Push delivery: **MOCKED** (no push service). | `ownership.test` (another user’s reminder → 404), `e2e-api-user` (cross-account reminder) |
| Health integrations (HealthKit, Health Connect) | **MOCKED** — consent-gated toggles, no data sync | `ownership.test` (consent) |
| Community (Phase 4 preview) | **MOCKED** — per-user simulation | — |
| Web ↔ mobile synchronisation | PASS (§8) | `sync-web-mobile`, native device check |

**Content Manager, Medical Content Reviewer and Admin**

| Workflow | Status | Evidence |
|---|---|---|
| Staff sign-in with password plus authenticator; replayed or wrong codes refused; per-account lockout | PASS | `auth.test`, `regressions` A, `admin-api` |
| Staff invite → accept → MFA enrolment → sign-in | PASS; email delivery **MOCKED** | `rbac.test`, `admin-api` |
| Staff MFA recovery (backup codes, MFA reset, re-sending an invite) | **FAIL** — not available in API mode; the UI says “Not available yet” | `apps/web/src/admin/pages/Account.tsx:203`, `Staff.tsx:209–210` |
| Staff role change, deactivate or reactivate; privileged permissions granted or removed; renames | PASS | `roles.test`, `rbac.test`, `regressions` R, `admin-api` |
| Permission matrix edits (fixed cells, not your own role) | PASS | `regressions` (permission matrix), `rbac.test`, `roles.test` |
| Content lifecycle: draft → medical review → changes requested or rejected → compliance → approved, scheduled or published → visible in the app; archive; new version | PASS | `content.test` (7 tests), `admin-api`, `content-flows` |
| Separation of duties: authors and editors can’t approve; medical ≠ compliance approver | PASS | `content.test`, `regressions` D, `admin-api` |
| Safety checklist and references gate medical approval (reviewer only) | PASS | `content.test` |
| Scheduled publishing | PASS | `content.test` |
| Notification templates: propose → reviewer approves → exact wording published | PASS | `regressions` E |
| Campaigns | **PARTIAL** — create and schedule work; sending is refused (no delivery service); reach is computed by the server | `regressions` (campaigns), `rbac.test` |
| Users: list with masked emails, audited reveal, deactivate (ends sessions at once) | PASS | `rbac.test`, `admin-api` |
| Privacy requests: export and deletion; two-person deletion; erasure removes copies of the identity | PASS | `regressions` F, `rbac.test` |
| Support: contact form → queue; staff updates; staff can’t create or reassign tickets | PASS | `security.test`, `regressions` J, `roles.test` |
| Subscriptions: complimentary access, refunds | **PARTIAL** — refunds are recorded only (payments MOCKED); the UI allows ₹1–1,999 but the API caps refunds at ₹1,000; complimentary access has no automated test | `rbac.test` (refund permission); §10 item O7 |
| Analytics and reports | **MOCKED** — dashboards render, but KPIs are simulated aggregates | `admin-navsmoke` |
| Audit log: server-written, real actor, never truncated, readable only with `view_audit`, no health values | PASS | `rbac.test`, `regressions` K and P, `security.test` |
| Security settings (idle timeout and so on) | PASS (privileged `manage_settings`) | `rbac.test`, `regressions` (idle and absolute timeouts) |
| Break-glass: category counts only, reason required, audited | PASS | `rbac.test` |
| Media library | **PARTIAL** — metadata only, no file storage | `adminPolicy.ts` (`ADD_MEDIA`) |
| Feature flags and configuration | Flags: PASS. Configuration editors (rules, symptom list, defaults): permission enforced, but their behaviour has no dedicated test — **NOT VERIFIED**. | `regressions` K, `rbac.test` |

### 7. Backend, API and database integration

- **`apps/api`** uses Node built-ins only (`http`, `crypto`), TypeScript run through `tsx`, and an in-memory `Store`. It has 38 routes:

  | Group | Routes |
  |---|---|
  | **Public** | `GET /v1/health`, `GET /v1/content`, `GET /v1/content/:id`, `POST /v1/contact`. Two development helpers, `GET /v1/dev/outbox` and `GET /v1/dev/mfa-code`, answer only to the loopback address and are absent in the production configuration. |
  | **Auth** | `register`, `verify-email`, `verify-email/resend`, `login`, `mfa/verify`, `refresh`, `logout`, `logout-all`, `me`, `sessions` (list and revoke), `password/change`, `password/forgot`, `password/reset`, `magic-link`, `magic-link/verify`, `invite/accept`, `oauth/:provider` (answers 501 “not configured”) |
  | **Me** | `GET /v1/me/state`, `POST /v1/me/actions` (allowlisted, validated, idempotent by client action id), `GET /v1/me/records/:collection/:id`, `GET /v1/me/export`, `DELETE /v1/me`, subscription `trial` and `cancel`, `data/sample`, `data/clear` |
  | **Admin** | `GET /v1/admin/state`, `POST /v1/admin/actions`, `reveal-email`, `break-glass`, `GET /v1/admin/audit` |
- **Clients:** a single `ApiClient` (`packages/shared/src/api/client.ts`) is used by:
  - the web app (`apps/web/src/lib/api.ts`), through the Vite `/api` proxy
  - the mobile app (`apps/mobile/src/lib/api.ts`), through `EXPO_PUBLIC_API_URL`
- **Real backend connected:** PASS in development and test.
- **Database: NOT APPLICABLE by the project owner’s decision** (“no DB”). The SRS calls for a persistent database, so this is a **production blocker**. The store is a single module (`apps/api/src/store.ts`), which keeps a later switch to a database contained.

### 8. Data persistence and web/mobile synchronisation

**Where data lives**

| Place | What it holds |
|---|---|
| API (`apps/api/src/store.ts`) | All account data, in memory. It survives across clients and devices, but not an API restart. |
| Web, API mode | No health data in browser storage. The session uses an HttpOnly, `SameSite=Strict` refresh cookie (a separate cookie for the Web Admin). |
| Mobile, API mode | No health data on the device (`apps/mobile/src/lib/store.tsx:235`). The refresh token is in the device keystore (`expo-secure-store`, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`). |
| Offline demos (web and mobile) | Explicit opt-in with a banner. Data stays in `localStorage` / `AsyncStorage` and nothing is checked by a server. |

**How sync works:**
- Every write is a server action (`POST /v1/me/actions`).
- The web app re-fetches on focus or tab visibility and every 30 seconds (`apps/web/src/store/AppStore.tsx:197–201`).
- The mobile app re-fetches on returning to the foreground and every 30 seconds (`apps/mobile/src/lib/store.tsx:258–269`).

**Evidence:**

1. **`sync-web-mobile.mjs`** — the mobile web export and the web app, in Chrome, on a disposable API. Checks:
   - the same user signs in on both
   - web → mobile on returning to the foreground
   - web → mobile through the periodic sync
   - mobile → web for a custom symptom
   - a second user is isolated
   - signing out on mobile doesn’t sign out the web
   - “sign out of all devices” works in both directions

   Result in §13.
2. **Native Android device** — the HealthX app in **Expo Go** on the emulator, signed in as the synthetic demo user against the development API, with the web app on Vite :5173 using the same API. Result: **5 of 5 PASS.**
   - Device → server → web: 250 ml logged on the phone was stored and shown on the web.
   - Web → server → device: 123 ml added on the web appeared on the phone without any interaction after 8.7 s (periodic sync).
   - A delete on the phone removed the entry on the server and the web.
   - A delete on the web reached the phone after 23.3 s.
   - The entries ended exactly as they started.

   Also checked: the welcome, sign-in, Home, Cycle, Wellness, Water, Insights and Profile screens rendered server data, with the estimate and non-diagnostic labels shown.

**Status:**
- Synchronisation through the shared API: **PASS**.
- Persistence across restarts: **NOT APPLICABLE**, because there is no database by decision.

### 9. Security and sensitive health data review

**Controls in place, with their tests:**
- **Passwords and sign-in:**
  - scrypt hashing, run asynchronously
  - generic sign-in errors
  - rate limits per IP and account, per account, and per IP
  - staff authenticator codes with replay protection and a per-account lockout
  - email verification
  - protection against pre-registering someone else’s email

  Tests: `auth`, `unit`, `regressions` A, B, Q.
- **Sessions:**
  - opaque random tokens, stored only as hashes
  - 15-minute access tokens
  - rotating refresh tokens with reuse detection
  - HttpOnly `SameSite=Strict` cookies on the web; device keystore on mobile; a separate Web Admin cookie
  - staff idle timeout and a 12-hour absolute lifetime
  - tokens are never accepted from the URL

  Tests: `auth`, `client`, `security`, `regressions`.
- **Authorization:**
  - server checks on every request
  - per-account ownership
  - staff can’t use app-user endpoints
  - projection keeps health values out of Admin views
  - masked emails with an audited reveal
  - audited break-glass

  Tests: `ownership`, `rbac`, `roles`.
- **Requests:**
  - JSON only, with size and nesting-depth limits
  - allowlisted and validated actions
  - an allowlist for allowed browser origins; requests from other origins can’t change state
  - security headers (`Content-Security-Policy: default-src 'none'`, `nosniff`, `Cross-Origin-Resource-Policy`; HSTS and `Secure` cookies when `NODE_ENV=production`)
  - health data never cached
  - a global per-IP limit and per-account write budgets

  Tests: `security`, `regressions` G, P.
- **Audit:** written by the server with the real actor id and email; never truncated; never contains health values.
- **Privacy:** export, self-service deletion, two-person deletion by staff, and consent withdrawal take effect on the server. Tests: `ownership`, `regressions` F, M.
- **Independent reviews:** two adversarial reviews of the API. All confirmed findings are fixed and replayed as regression tests A–S. The second review (26 Oct) confirmed two issues, both fixed today:
  - **R:** a rename skipped the staff-change guards. An Admin who could manage staff could rename someone holding more privileged permissions, or rename themselves. Related fixes:
    - a rename combined with a role change could leave the role changed without an audit entry
    - lookalike names (invisible or full-width characters) passed the uniqueness check
  - **S:** legacy-role migration kept stray privileged permissions on former Support Agent and Analyst records.

**Gaps and limits:**
- **No encryption at rest**, because there is no database. This is required once one is added.
- **No TLS** in this environment. Production needs HTTPS; HSTS and `Secure` cookies switch on with `NODE_ENV=production`.
- **Offline demo modes** store data unencrypted in browser or device storage. They are meant for demos and should be removed from production builds.
- **Lost refresh response signs the user out** (open, §10 item O1).
- **Homoglyphs across scripts** (for example a Cyrillic “а” in a Latin name) are not detected in staff names. Invisible characters, width, case and direction controls are handled.
- **Former Support Agents and Analysts now hold the full Admin capability set**, as the consolidation mapping requires. Review who holds Admin (Part B, B7).
- **No external penetration test** and no regulatory assessment. **No compliance claim is made** (for example GDPR, HIPAA or India’s DPDP Act).

### 10. Bugs and missing features identified

**Fixed:**

| Source | Items |
|---|---|
| Initial audit | C1–C5, H1 (partial: drafts), H2, M1 (§3) |
| Security review 1 | A–Q (17 tests). Areas: authenticator code limits, pre-hijacking, server-written reviewer history, two-person content approval, exact template wording, tracked erasure, existence checks and size and rate caps on writes, development helpers limited to the local machine, support ticket ownership, audit actor id, prototype keys, consent effects, length limits, malformed taxonomy, audit growth, password spraying |
| Security review 2 (26 Oct) | R and S (§9) |
| Other fixes made during the work | Web Admin row-action menus closed whenever a background refresh scrolled anything (`admin/components.tsx`, now only when the menu’s own button moves); shared reducer: consent withdrawal disconnects integrations, dismissed insights are de-duplicated and capped, ending a period is validated |

**Open:**

| ID | Severity | Issue | Recommendation |
|---|---|---|---|
| O1 | Medium (availability) | **Lost refresh response signs the user out.** If the server rotates the refresh token but the response never arrives (a reload mid-request, an app killed mid-request, a network drop), the next request presents the old token. The server treats that as theft and revokes the whole session family. Reproduced deterministically: the next refresh gets 401 “Your session was ended for security” and the user is signed out. Method: in Playwright, let one `/api/v1/auth/refresh` request reach the server, restore the previous `hx_rt` cookie, then reload. This caused 2 of the 11 steps to fail in one of three `e2e.mjs` runs today. | Add a short grace window (about 10–30 s) for a session’s most recently rotated-out token; reuse outside the window still revokes. This changes a tested security control (`auth.test.ts:81`), so it needs a product or security decision. |
| O2 | Medium | Staff MFA recovery is missing: no backup codes, no MFA reset, no invite re-send in API mode | Add these endpoints, with audit and the two-person rule |
| O3 | Medium | Apple and Google sign-in not implemented | Needs provider credentials |
| O4 | Medium | “Today” and the times of entries come from the server’s time zone | Send the device’s date and time zone with actions |
| O5 | Low | Native deep links for magic links and email confirmation are missing; on a phone they open the web app | App scheme or universal links |
| O6 | Low | After `deleteAccount()` the client still holds tokens; the follow-up logout gets a harmless 401 | `ApiClient` should clear the session itself |
| O7 | Low | Refund limit: the UI allows ₹1–1,999, the API caps refunds at ₹1,000 | Agree the rule and align the UI and the API |
| O8 | Low | Data export has no re-authentication step | Ask for the password again before exporting |
| O9 | Low | Create actions use ids made by the shared reducer; an edit right after a create can briefly 404 until the next re-fetch | Client-generated ids, validated by the server |
| O10 | Low | `/auth/me` doesn’t expose `trialEndsAt` or `hasPassword` | Add them |
| O11 | Optional | No `ETag`/304 on `/v1/me/state` | Saves mobile data |
| O12 | Low | `Subscriptions.tsx:248` uses a type cast (`comp: null as unknown as undefined`) | Type the patch properly |

### 11. Changes implemented, with file paths

Compared with the pre-change snapshot: **80 files added (including this report), 78 modified, none deleted.** The private planning documents in `docs/development-plan/` were not modified. Full lists are in the appendix.

| Area | Main changes |
|---|---|
| **API (new)** | `apps/api/src/*`: `app`, `main`, `config`, `http` (CORS, origin checks, headers, limits), `crypto` (scrypt, TOTP, tokens), `store`, `seed`, `auth` (sessions, capabilities), `validate`, `userActions` (allowlist and validation), `contentWorkflow`, `accounts` (deletion, projection rows, legacy migration), `projection`, `adminPolicy` (every admin write), `content`, `routes/{auth,me,admin,public}`. Tests are in `apps/api/test/*`; usage is in `apps/api/README.md`. |
| **Shared** | `packages/shared/src/admin/{rbac,data,state,index}.ts`: the four-role model, privileged permissions, migrations and the admin domain. `packages/shared/src/api/client.ts`: the shared `ApiClient`. `packages/shared/src/state.ts` (app reducer): consent, insight and period fixes. |
| **Web** | `src/lib/api.ts` and `store/session.ts` (API mode and the offline-demo switch); `store/AppStore.tsx` (server state, re-fetch). New pages and components: `ApiGate`, `VerifyEmailBanner`, `AccountSecurity`, `ResetPassword`, `VerifyEmail`, `AcceptInvite`, `site/pages/Legal.tsx`. Web Admin: every page moved to the four roles and to server errors (`admin/*`). `vite.config.ts`: `/api` proxy. |
| **Mobile** | `src/lib/api.ts` (keystore token store, API mode), `src/lib/store.tsx` (server state, foreground and periodic sync), `ConnectionStates`, `VerifyEmailHint`, `verify-email.tsx`, and updated screens (`welcome`, `login`, `signup`, `forgot-password`, `onboarding`, `settings`, `privacy`, `delete-account`, `premium`, `integrations`, `community`, `(tabs)`, `AuthShell`, `SocialButtons`) |
| **Tests** | `apps/api/test/` (10 files, 101 tests); `tests/e2e/` (16 suites, 5 helpers, `README.md`) |
| **Docs and scripts** | Root `README.md` (how to run, roles, demo access), `apps/api/README.md`, `tests/e2e/README.md`, root `package.json` scripts, `scripts/dev.mjs` |

### 12. Tests added or updated

| File | Tests | Covers |
|---|---|---|
| `apps/api/test/auth.test.ts` | 16 | Registration, sign-in, MFA, refresh rotation and reuse, expiry, cookies, logout, sessions, reset, magic link, password change, OAuth “not configured”, separate admin cookie |
| `client.test.ts` | 5 | The shared `ApiClient`: login, write seen from a second device, transparent refresh, session end, staff MFA, offline errors |
| `content.test.ts` | 7 | Full lifecycle, separation of duties, illegal transitions, safety checklist, archive, new versions, scheduled publishing |
| `ownership.test.ts` | 11 | Anonymous refused, server persistence, idempotency, cross-user isolation, staff kept out of app endpoints, blocked actions, validation, consent, export, trial, deletion |
| `rbac.test.ts` | 11 | Every staff account against the matrix, crafted requests, privileged permissions, escalation, immediate revocation, deactivation, data minimisation, reveal and break-glass, audit, invites |
| `regressions.test.ts` | 25 | Findings from both security reviews (A–Q, R–S) and related session, trial, campaign and matrix checks. R and S were added today. K was updated: a self-rename is now refused outright, and taking a colleague’s name is still checked (409). |
| `roles.test.ts` | 7 | Four roles, seeded mapping, retired ids refused, registration can’t pick a role, in-place migration, merged Admin functions, privileged permissions, projection |
| `security.test.ts` | 9 | CORS, headers, request hygiene, no leaking of internals, no tokens in URLs, production configuration, contact form, global limit, audit without health values |
| `unit.test.ts` | 10 | Hashing, HOTP and TOTP, validators, the four-role model, retired roles, offline-state migration (including stray privileges, added today), workflow table, action allowlist |
| `tests/e2e/*.mjs` | 16 suites | See `tests/e2e/README.md` and §13 |

### 13. Actual test commands and results (final code, 26 Oct 2026)

| Command | Result |
|---|---|
| `cd apps/api && npm test` | **101 passed, 0 failed** (exit 0) |
| `cd apps/api && npx tsc --noEmit -p tsconfig.json` | exit 0 |
| `cd apps/web && npx tsc -b --noEmit` | exit 0 |
| `cd apps/web && npx eslint .` | 0 errors; 6 warnings, all `react-refresh/only-export-components` (Fast Refresh hints, not defects) |
| `cd apps/web && npx vite build` (output written outside the repo) | built successfully |
| `cd apps/mobile && npx tsc --noEmit` | exit 0 |
| `cd apps/mobile && npx expo lint` | exit 0, no findings |

**Browser suites.** All were run on the final code with the commands in `tests/e2e/README.md`, each against a disposable in-memory API.

| Suite | What it covers | Result |
|---|---|---|
| `e2e-api-user.mjs` | Web user app: sign-up, sign-in, logging through the server, isolation between two users, export and delete, sessions | 21 passed, 0 failed |
| `e2e.mjs` | Web user app: core journey (sign-up → onboarding → logging → coach → export) | 11 passed, 0 failed (see note) |
| `e2e-merge.mjs` | Web user app: features from the mockup merge | 11 passed, 0 failed |
| `navcrawl.mjs` | Web user app: every navigation item, rail, drawer and redirect; overflow | 394 passed, 0 failed |
| `e2e-api-down.mjs` | Web user app with the API stopped, then recovering | 7 passed, 0 failed |
| `admin-api.mjs` | Web Admin: the four roles against the real API | 152 passed, 0 failed |
| `admin-navsmoke.mjs` | Web Admin: every link for every role at 1440 px and 390 px | 230 passed, 0 failed |
| `admin-flow2.mjs` | Web Admin offline demo: per-role flows | 23 passed, 0 failed |
| `admin-flow3.mjs` | Web Admin offline demo: content lifecycle, restricted pages, break-glass | 13 of 13 checks passed |
| `admin-flow4.mjs` | Web Admin offline demo | 59 passed, 0 failed |
| `admin-indep.mjs` | Web Admin offline demo | 41 passed, 0 failed |
| `core-e2e.mjs` | Mobile web export: core interactions, checked against what the server stored | 14 passed, 0 failed |
| `content-flows.mjs` | Mobile web export: content screens, trial, export, delete | 19 passed, 0 failed |
| `mobile-onboarding.mjs` | Mobile web export: sign-up and onboarding (consent before cycle data) | 14 passed, 0 failed |
| `mobile-connection.mjs` | Mobile web export: API unreachable, staff blocked, magic link | 8 passed, 0 failed |
| `sync-web-mobile.mjs` | Web ↔ mobile web export through the shared API | 8 passed, 0 failed |

**Total: 16 suites, 1,025 checks, 0 failures.** Every exit code was 0.

Notes:
- **`e2e.mjs` ran three times today:** once 9 of 11, with 2 steps failing after a reload ended the session (open item O1), then 11 of 11 twice, including the run above.
- **`sync-web-mobile.mjs` logs some 401 responses.** They come from its own “sign out of all devices” steps.
- **`mobile-onboarding.mjs` logs one 409.** It comes from the step that signs up with an email that already exists.

**Native Android (HealthX app in Expo Go):**
- `npx expo start --android`, with `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`
- The bundle built in 68 s (3,409 modules).
- Navigation was driven with `adb` / uiautomator.
- `native-sync.mjs` (a session script, not in the repo): **5 of 5 PASS** (§8).

### 14. Remaining FAIL, PARTIAL, MOCKED and NOT VERIFIED items

| Status | Items |
|---|---|
| **FAIL** | Apple and Google sign-in (O3); staff MFA recovery (O2) |
| **PARTIAL** | Legal pages are drafts; campaigns can’t be sent; refunds recorded only, with a limit mismatch (O7); media library stores metadata only; Medical Content Reviewers see the whole review queue (no “assigned reviewer” in the SRS model) |
| **MOCKED** | Email delivery (development outbox); payments (trial only); push notifications; HealthKit and Health Connect sync; AI coach (rule-based); community (Phase 4 preview); analytics KPIs (simulated aggregates); offline demo modes (labelled, opt-in) |
| **NOT VERIFIED** | Standalone Android build (APK/AAB) of HealthX; iOS; clinical correctness of cycle estimates and insight rules; Web Admin configuration editors and complimentary access (no dedicated tests); performance and load; full accessibility audit; localisation; CI; production deployment and TLS |
| **NOT APPLICABLE** | Database persistence and database migrations (the project owner decided: no database) |
| **Open defect** | Lost refresh response signs the user out (O1); see O4–O12 for the smaller items |

### 15. External dependencies and testing limitations

- **Not available here:**
  - a production database
  - an email provider
  - Apple and Google OAuth credentials
  - a payment provider
  - push services (FCM/APNs)
  - HealthKit and Health Connect
  - an AI provider
  - legal review of the Terms and Privacy pages
  - clinical review of the health content and estimate rules
- **Mobile testing:**
  - The mobile browser suites run the Expo **web export** in desktop Chrome, which is not a phone.
  - The native check used **Expo Go** on an emulator (a development runtime), not a signed release build.
  - iOS can’t be tested on this Windows machine.
- **In-memory data:** each test run starts from synthetic seed data. Restarts lose data by design.
- **Local network only:** requests went over HTTP on the local machine (no TLS, proxies or CDN). Rate limits were tested with the loopback address.
- **Session-timing flakiness:** some steps can fail intermittently because of O1. One `e2e.mjs` run today failed 2 of 11 steps that way; the re-runs passed (§13).

### 16. Final verdict

- **Ready for further QA:** yes, in a development or test environment. The functional flows work against a real server, the role boundaries are enforced on the server, and the automated suites pass (§13).
- **Ready for staging:** not yet. It needs:
  - a database
  - real email delivery (sign-up, reset and invites depend on it)
  - TLS and deployment configuration
  - a decision on O1 and a fix for O2
  - offline demo modes disabled in production builds
- **Ready for production:** no. In addition to the staging items, it needs:
  - a standalone mobile build tested on Android and iOS devices
  - payments, push and health integrations as required by the release scope
  - legal sign-off on the Terms and Privacy pages
  - clinical review of the content and estimate rules
  - an external security assessment

### Answers to the 12 final questions

1. **Are all seven roles implemented according to the actual requirements?**
   The seven roles were consolidated into the **four SRS roles** (§6.1–§6.4), as the follow-up request asked. All four are implemented and enforced by the server, and the functions of the removed roles are kept (Part B). **PASS** for the four-role model.

2. **Does each role have the correct permissions enforced by the backend?**
   Yes. Capabilities are checked by the API on every request. `rbac.test` checks every staff account against the matrix with direct API calls; `roles.test` and `regressions` cover the rest. **PASS.**

3. **Do direct URL and API authorization checks work?**
   - API: yes — anonymous → 401, End User → 403, crafted staff requests → 403 (`rbac.test`, `regressions`).
   - Direct URLs in the Web Admin show “Access restricted” and receive no data, because the server projection is scoped (`admin-api`, `admin-navsmoke`, `admin-indep`).
   - App routes require a session.

   **PASS.**

4. **Are all required user and admin workflows functional?**
   Most of them, with real server behaviour (§6). The exceptions are the MOCKED integrations (email, payments, push, health sync, AI coach, community, analytics), the FAIL items (Apple and Google sign-in, staff MFA recovery), and the PARTIAL items (legal drafts, campaigns, refunds, media). **PARTIAL** overall.

5. **Does the medical content review and publishing lifecycle work?**
   Yes, end to end and enforced by the server:
   - draft → medical review (checklist and references; approve, reject or request changes)
   - → compliance (a different person)
   - → scheduled or published → visible in the app
   - plus archive and new versions

   Separation of duties is checked by account id. Evidence: `content.test`, `regressions` C and D, `admin-api`, `content-flows`. **PASS.**

6. **Is a real backend connected, and which APIs are operational?**
   Yes: `apps/api`, with 38 routes covering public, auth, me and admin (§7), used by the web, the Web Admin and the mobile app. **PASS** in development; no production deployment exists.

7. **Is data persisted in the intended database?**
   No. There is no database, by the project owner’s decision; data is held in memory and lost when the API restarts. **NOT APPLICABLE** under that decision. It is a production blocker against the SRS.

8. **Does web/mobile synchronization work, and what evidence confirms it?**
   Yes, through the shared API:
   - `sync-web-mobile.mjs` (mobile web export and web; result in §13)
   - a **native Android** check in Expo Go: 5 of 5, with propagation in 8.7 s and 23.3 s (§8)

   **PASS.**

9. **Are sensitive health records protected against cross-user access?**
   Yes:
   - per-account ownership on every `/v1/me/*` route
   - record lookups by id refuse other users’ ids (`ownership.test`)
   - staff can’t use the app endpoints
   - Admin views contain no health values; break-glass gives counts only and is audited
   - `sync-web-mobile` checks that a second user can’t see the first user’s data

   **PASS.** Encryption at rest is not applicable without a database.

10. **Which issues were fixed and which remain?**
    Fixed: C1–C5, H2, M1, review findings A–S, and the other fixes in §10. Remaining: H1 (drafts), M2 and L1 (unchanged), and O1–O12 (§10, §14).

11. **Which checks passed, failed, or could not be verified?**
    See §13 for the commands and results, and §14 for the remaining FAIL, PARTIAL, MOCKED and NOT VERIFIED items.

12. **Is the project ready for further QA, staging, or production, and what evidence supports that assessment?**
    Ready for internal QA in a development environment; not ready for staging or production (§16).

---

## Part B — Consolidating seven roles into the four SRS roles

### B1. The four final roles

| Role | Id | SRS |
|---|---|---|
| End User | `end_user` | §6.1 |
| Content Manager | `content_manager` | §6.2 |
| Medical Content Reviewer | `medical_content_reviewer` | §6.3 |
| Admin | `admin` | §6.4 |

These are defined once (`packages/shared/src/admin/rbac.ts`: `ALL_ROLES`, `ROLE_LABELS`) and used by the API and the Web Admin. The mobile app admits End Users only, and sends staff to the Web Admin.

### B2. Mapping from the seven roles

| Former role | Final role | Capabilities before → after |
|---|---|---|
| Super Admin | **Admin** | Every capability except clinical sign-off → the Admin role plus **all four privileged permissions on that person’s account**. Only the seeded owner (`sam.rivera@…`) was a Super Admin. |
| Admin | **Admin** | 21 capabilities → the same 21 (the Admin role row) |
| Support Agent | **Admin** | 5 capabilities (`admin_access`, `view_users`, `process_data_requests`, `resend_verification`, `manage_support`) → the Admin row (21), with no privileged permissions |
| Analyst / Read-only | **Admin** | 3 capabilities (`admin_access`, `view_analytics`, `export_reports`) → the Admin row (21), with no privileged permissions |
| Medical Reviewer | **Medical Content Reviewer** | Identical capabilities; the id was renamed |
| Content Manager / Writer | **Content Manager** | Unchanged |
| End User | **End User** | Unchanged |

**The most sensitive powers stay restricted inside Admin.** The four privileged permissions are `manage_staff`, `manage_permissions`, `manage_settings` and `break_glass`:
- They are held per Admin account, never by the role.
- They can be granted only by someone who holds them.
- Former Support Agents and Analysts received none.

So not every Admin gets the former Super Admin powers.

### B3. Functionality merged into each final role

- **Admin.** One merged dashboard (`apps/web/src/admin/pages/dashboards/RoleDashboards.tsx`) brings together:
  - the platform overview
  - support statistics, quick user lookup and urgent requests (former Support Agent)
  - analytics and reports (former Analyst)
  - the compliance queue, subscriptions, campaigns and pipeline
  - security posture and audit highlights
  - account actions

  It also gives access to user management, support, privacy requests, subscriptions, notifications and campaigns, configuration and flags, compliance approval, the audit log and security settings. Super Admin tools (staff, permission matrix, security settings, break-glass) are available to the Admins who hold the matching privileged permission.
- **Content Manager** — unchanged:
  - content dashboard
  - create and edit drafts
  - submit for medical review, see the review status and comments, handle requested changes
  - media and taxonomy
  - schedule or publish only content that has passed medical and compliance approval
  - draft notification copy
- **Medical Content Reviewer** — the former Medical Reviewer functions:
  - review dashboard and queue
  - inspect content and versions
  - approve, reject or request changes, with a required comment for authors
  - safety checklist and references
  - review of notification templates
  - review history
- **End User** — unchanged.

### B4. Pages, components, routes, APIs and permission rules changed

- **Shared model** (`packages/shared/src/admin/`):
  - `rbac.ts`: four roles, `PRIVILEGED_CAPABILITIES`, `CLINICAL_CAPABILITIES`, locked cells, `capabilitiesOf`, `LEGACY_ROLES`, `migrateRole`, `privilegesForLegacyRole`, `migratePermissionMatrix`
  - `data.ts`: `StaffMember.privileges`, `RecordedRole` (history and audit entries keep the role recorded at the time), seeded staff mapped
  - `state.ts`: `ADMIN_STATE_VERSION = 4`, session privileges, `migrateAdminState`
- **API:**
  - `auth.ts`: capabilities include the account’s privileges; `/auth/me` returns them
  - `adminPolicy.ts`:
    - retired role ids are refused with “merged into …”
    - the staff rules (privileges, not your own account, renames, unique names)
    - matrix locks
  - `accounts.ts`: `migrateLegacyAccounts`; staff rows include privileges
  - `projection.ts`: per-role data
  - `seed.ts`: seeded accounts mapped
  - No URL changed.
- **Web Admin:**
  - `rbac.ts` (labels; “Admin with the … permission”), `adminState.ts` (migration, privileges in `useAccess`)
  - `components.tsx`: `RoleBadge` shows legacy roles on old entries; the “Access restricted” text
  - `Dashboard.tsx` with the merged Admin dashboard
  - `Staff.tsx`: a privileged-permissions column and dialog, lock reasons
  - `AdminLogin.tsx` and `AdminLayout.tsx`: the offline demo lists four roles
  - Text updates in Analytics, ContentEditor, Account, Categories, MediaLibrary, Versions, Schedule, Notifications, Settings, Compliance, Reviews and Users
- **Docs:** root `README.md`, `apps/api/README.md`, `tests/e2e/README.md`.

### B5. Migrations performed

- **No database migration.** There is no database, by the project owner’s decision.
- **`migrateLegacyAccounts(store)`** (API, runs at start-up):
  - maps any stored legacy role id in place
  - keeps ids, credentials, sessions and app data
  - gives privileged permissions only to a former Super Admin
  - audits each mapping as `staff.role_migrated`
  - is idempotent and deletes nothing
- **`migratePermissionMatrix`:** canonical rows are kept; the Medical Reviewer row moves to Medical Content Reviewer; retired rows are dropped; locked cells are reset.
- **`migrateAdminState`** (the offline Web Admin state saved in the browser): version 3 → 4 using the same rules; unknown roles are dropped.
- The seed data (synthetic) was converted in the source.

### B6. Tests executed and results

**Test requirements 1–18 from the consolidation request:**

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Exactly four canonical roles | PASS | `unit` (permission model), `roles` (exactly four exist) |
| 2 | Correct dashboard and navigation per role | PASS | `admin-api` (per persona), `admin-navsmoke`, `admin-flow2` |
| 3 | Content Manager can create and submit | PASS | `content.test`, `admin-api` |
| 4 | Medical Content Reviewer review actions | PASS | `content.test`, `regressions` C and D, `admin-api` |
| 5 | Review and correction workflow end to end | PASS | `content.test` (full lifecycle, requested changes), `admin-api` |
| 6 | Admin keeps management, support, reporting and settings | PASS | `roles` (“Admin keeps the former Support Agent and Analyst functions”), `rbac`, `admin-api` |
| 7 | End User wellness workflows | PASS | `e2e-api-user`, `e2e`, `core-e2e`, native device check |
| 8 | No access to another user’s health records | PASS | `ownership` (A can’t read B), `sync-web-mobile` (isolation) |
| 9 | Direct URL access respects authorization | PASS | `admin-api`, `admin-navsmoke`, `admin-indep` |
| 10 | Direct API requests respect authorization | PASS | `rbac` (matrix on direct API calls, crafted requests) |
| 11 | No role escalation | PASS | `rbac` (escalation refused), `roles`, `regressions` R |
| 12 | Super Admin, Support Agent and Analyst → Admin | PASS | `roles` (seeded mapping, migration), `regressions` S, `unit` |
| 13 | Content Manager / Writer → Content Manager | PASS | `roles` |
| 14 | Medical Reviewer → Medical Content Reviewer | PASS | `roles`, `unit` |
| 15 | Admin and End User keep their role | PASS | `roles` |
| 16 | User data and unrelated functions intact | PASS | `roles` (app data untouched by migration); all suites in §13 |
| 17 | Removed roles can’t be assigned | PASS | `roles` (“retired role ids can never be assigned again”), `unit` |
| 18 | No broken routes, permissions, imports or pages | PASS | Typecheck, lint and build (§13), `admin-navsmoke` (every link for every persona), `navcrawl` |

### B7. Remaining failures, security concerns and unverified items

- **Wider access for former Support Agents and Analysts** (`neha.joshi@…`, `tom.becker@…`, `kenji.watanabe@…`). They now have the full Admin row: user status, publishing, configuration and the audit log, beyond what they had before. This follows the requested mapping, but an Admin who manages staff should confirm each of these people should be an Admin. Per-person narrowing exists only for the privileged permissions.
- **The Admin role row is fixed in practice.** Only Admins can edit the matrix, and nobody edits their own role’s row, so narrowing what every Admin can do requires a code change.
- **Not verified:** a migration of real stored data (none exists). Only synthetic legacy records were migrated, in tests.
- The other open items are listed in Part A §10 and §14.

### B8. Explicit confirmations

| Statement | Status |
|---|---|
| Only the four SRS roles remain as permanent roles | **Confirmed** (`roles.test`, `unit.test`; retired ids refused everywhere) |
| All required functionality of the three removed roles is preserved in the final roles | **Confirmed** (B2–B3; `roles.test` “Admin keeps …”; `admin-api`) |
| Role assignments and permission checks are consistent across front end and backend | **Confirmed.** One shared model (`packages/shared/src/admin/rbac.ts`). The server is authoritative; the UI only hides controls. |
| No unrelated user accounts or data were deleted | **Confirmed.** Migration test: same account ids, app data byte-identical. Repo diff: no files deleted. |
| The content review workflow still works | **Confirmed** (§6; `content.test`, `admin-api`) |
| The End User wellness workflow still works | **Confirmed** (`e2e-api-user`, `e2e`, `core-e2e`, native device check) |
| The application builds and the available tests pass | **Confirmed:** typecheck, lint and build clean; 101 of 101 API tests; 16 browser suites with 1,025 checks, 0 failures (§13). |

---

## Appendix

### A1. How to re-run

From the repository root:

```bash
(cd apps/api && npm test && npx tsc --noEmit -p tsconfig.json)   # API tests (101) + typecheck
(cd apps/web && npx tsc -b --noEmit && npx eslint . && npx vite build)
(cd apps/mobile && npx tsc --noEmit && npx expo lint)
# Browser suites: see tests/e2e/README.md (servers, ports and commands)
```

### A2. Files added since the pre-change snapshot (80)

- `apps/api/`: `README.md`, `package-lock.json`, `package.json`, `tsconfig.json`
- `apps/api/src/`: `accounts.ts`, `adminPolicy.ts`, `app.ts`, `auth.ts`, `config.ts`, `content.ts`, `contentWorkflow.ts`, `crypto.ts`, `http.ts`, `main.ts`, `projection.ts`, `seed.ts`, `store.ts`, `userActions.ts`, `validate.ts`
- `apps/api/src/routes/`: `admin.ts`, `auth.ts`, `me.ts`, `public.ts`
- `apps/api/test/`: `auth.test.ts`, `client.test.ts`, `content.test.ts`, `helpers.ts`, `ownership.test.ts`, `rbac.test.ts`, `regressions.test.ts`, `roles.test.ts`, `security.test.ts`, `unit.test.ts`
- `apps/mobile/src/app/`: `verify-email.tsx`
- `apps/mobile/src/components/`: `ConnectionStates.tsx`, `VerifyEmailHint.tsx`
- `apps/mobile/src/lib/`: `api.ts`, `saveJson.ts`
- `apps/web/src/admin/`: `apiErrors.ts`
- `apps/web/src/admin/pages/`: `AcceptInvite.tsx`
- `apps/web/src/lib/`: `api.ts`
- `apps/web/src/site/pages/`: `Legal.tsx`
- `apps/web/src/store/`: `apiErrors.ts`, `session.ts`
- `apps/web/src/user/components/`: `AccountSecurity.tsx`, `ApiGate.tsx`, `VerifyEmailBanner.tsx`
- `apps/web/src/user/pages/auth/`: `ResetPassword.tsx`, `VerifyEmail.tsx`
- `docs/reports/`: `2026-10-26-audit-and-role-consolidation.md`
- `packages/shared/src/admin/`: `data.ts`, `index.ts`, `rbac.ts`, `state.ts`
- `packages/shared/src/api/`: `client.ts`
- `scripts/`: `dev.mjs`
- `tests/e2e/`: `README.md`, `admin-api-lib.mjs`, `admin-api.mjs`, `admin-flow2.mjs`, `admin-flow3.mjs`, `admin-flow4.mjs`, `admin-indep.mjs`, `admin-navsmoke.mjs`, `admin-run.mjs`, `content-flows.mjs`, `core-e2e.mjs`, `e2e-api-down.mjs`, `e2e-api-user.mjs`, `e2e-merge.mjs`, `e2e.mjs`, `hx-lib.mjs`, `mobile-api.mjs`, `mobile-connection.mjs`, `mobile-onboarding.mjs`, `navcrawl.mjs`, `package-lock.json`, `package.json`, `spa-serve.mjs`, `sync-web-mobile.mjs`

### A3. Files modified since the pre-change snapshot (78)

- `(root)`: `README.md`, `package.json`
- `apps/mobile/`: `README.md`, `app.json`, `package-lock.json`, `package.json`
- `apps/mobile/src/app/(tabs)/`: `_layout.tsx`, `home.tsx`, `profile.tsx`
- `apps/mobile/src/app/`: `_layout.tsx`, `community.tsx`, `delete-account.tsx`, `forgot-password.tsx`, `integrations.tsx`, `login.tsx`, `onboarding.tsx`, `premium.tsx`, `privacy.tsx`, `settings.tsx`, `signup.tsx`, `welcome.tsx`
- `apps/mobile/src/components/`: `AuthShell.tsx`, `SocialButtons.tsx`
- `apps/mobile/src/lib/`: `store.tsx`
- `apps/web/src/`: `App.tsx`
- `apps/web/src/admin/`: `AdminLayout.tsx`, `AdminRoutes.tsx`, `AdminStore.tsx`, `adminData.ts`, `adminState.ts`, `components.tsx`, `rbac.ts`
- `apps/web/src/admin/pages/`: `Account.tsx`, `AdminLogin.tsx`, `Analytics.tsx`, `Categories.tsx`, `Compliance.tsx`, `Config.tsx`, `ContentEditor.tsx`, `ContentList.tsx`, `Dashboard.tsx`, `Flags.tsx`, `MediaLibrary.tsx`, `NoAccess.tsx`, `Notifications.tsx`, `PrivacyRequests.tsx`, `Reviews.tsx`, `Schedule.tsx`, `Settings.tsx`, `Staff.tsx`, `Subscriptions.tsx`, `Support.tsx`, `Users.tsx`, `Versions.tsx`
- `apps/web/src/admin/pages/dashboards/`: `RoleDashboards.tsx`
- `apps/web/src/components/`: `ErrorBoundary.tsx`
- `apps/web/src/site/`: `SiteLayout.tsx`
- `apps/web/src/site/pages/`: `Contact.tsx`
- `apps/web/src/store/`: `AppStore.tsx`
- `apps/web/src/user/`: `UserApp.tsx`
- `apps/web/src/user/layout/`: `AppLayout.tsx`, `AuthLayout.tsx`
- `apps/web/src/user/pages/`: `CheckIn.tsx`, `Dashboard.tsx`, `Learn.tsx`, `Premium.tsx`, `Privacy.tsx`, `Profile.tsx`, `Settings.tsx`, `Sleep.tsx`
- `apps/web/src/user/pages/auth/`: `ForgotPassword.tsx`, `Login.tsx`, `Signup.tsx`
- `apps/web/src/user/pages/onboarding/`: `Onboarding.tsx`
- `apps/web/`: `vite.config.ts`
- `packages/shared/`: `package.json`
- `packages/shared/src/`: `index.ts`, `state.ts`
