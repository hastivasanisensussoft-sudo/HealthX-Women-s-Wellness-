# HealthX browser tests

End-to-end checks for:
- the Web Admin (Content Manager, Medical Content Reviewer, Admin)
- the mobile app's **web export** — end users use HealthX only in the mobile app
- the public website and the account links from emails (password reset, email confirmation, magic link)

They drive the locally installed **Google Chrome** through `playwright-core` (pinned 1.64.0, no browser download).

```bash
cd tests/e2e && npm install
```

Ground rules:
- **Synthetic data only.** API-mode suites run against a **disposable in-memory API** (fresh seed data) on their own port, never the dev API on `:4000`.
- **They clean up after themselves.** Accounts a suite creates are deleted by that suite.
- **The mobile suites run the Expo web export in desktop Chrome.** That's not a native device or emulator.

## Website and account links (API mode)

The end-user web app was retired on 2026-10-27: people use the mobile app, and `/app/*`, `/signup`, `/login`, `/onboarding` and `/forgot-password` redirect to **Get the app**. The suites that drove it (`e2e.mjs`, `e2e-api-user.mjs`, `e2e-merge.mjs`, `navcrawl.mjs`, `e2e-api-down.mjs`, `sync-web-mobile.mjs`) were removed with it. Their coverage now lives in `site-nav.mjs`, `mobile-admin.mjs`, the mobile suites and the API tests (ownership and isolation).

```bash
cd apps/api && PORT=4104 ALLOWED_ORIGINS=http://127.0.0.1:8096,http://localhost:8096,http://127.0.0.1:5184,http://localhost:5184 node --import tsx src/main.ts
cd apps/web && HEALTHX_API_URL=http://127.0.0.1:4104 npx vite --port 5184 --strictPort --host 127.0.0.1
node site-nav.mjs --base=http://127.0.0.1:5184
```

| Suite | Covers |
|---|---|
| `site-nav.mjs` | Every public page at 1440 px and 390 px; header calls to action (Get the app, staff sign-in); retired routes redirect; magic-link hand-off (token never redeemed on the web); password reset end to end in a disposable account |

## Web Admin

`admin-run.mjs` starts a **fresh API on :4102** for each suite. Vite must serve the web app on :5182 and proxy to it.

```bash
cd apps/web && HEALTHX_API_URL=http://127.0.0.1:4102 npx vite --port 5182 --strictPort --host 127.0.0.1
node admin-run.mjs ../../apps/api admin-api.mjs admin-navsmoke.mjs
```

| Suite | Covers |
|---|---|
| `admin-api.mjs` | **The four SRS roles against the real API.** For each staff persona, its role, dashboard, navigation, server-scoped data and privileged permissions. It also covers: <ul><li>refused crafted requests (Content Manager; Admin without privileged permissions)</li><li>the full content lifecycle (Content Manager → Medical Content Reviewer → Admin compliance → publish → in the mobile app's Learn library)</li><li>self-approval refused</li><li>masked emails and an audited reveal</li><li>user and staff deactivation</li><li>invite → accept → MFA sign-in</li><li>privileged permissions granted and revoked per Admin</li></ul> |
| `admin-navsmoke.mjs` | Every nav link for every persona at 1440 px and 390 px; row-menu keyboard; sign-out |

Offline-demo suites (no API; the login role picker lists the four roles):

```bash
node admin-flow2.mjs http://127.0.0.1:5182
node admin-flow3.mjs http://127.0.0.1:5182 <shotsDir>
node admin-flow4.mjs http://127.0.0.1:5182
node admin-indep.mjs http://127.0.0.1:5182
```

## Mobile app (Expo web export, API mode) and mobile → Web Admin

Use the API and Vite from "Website and account links" (:4104 / :5184), plus a mobile web export that talks to the same API:

```bash
cd apps/mobile && EXPO_PUBLIC_API_URL=http://127.0.0.1:4104 npx expo export --platform web --output-dir <dist>
node spa-serve.mjs <dist> 8096
```

| Suite | Covers |
|---|---|
| `node core-e2e.mjs http://127.0.0.1:8096 <outDir>` | Core mobile interactions, checking what the server stored |
| `node content-flows.mjs http://127.0.0.1:8096` | Content screens; trial, export and delete in a disposable account |
| `node mobile-onboarding.mjs http://127.0.0.1:8096` | Sign-up + onboarding (consent before cycle data; skipping the cycle step saves nothing assumed) |
| `node mobile-modules.mjs http://127.0.0.1:8096 [<shotsDir>]` | In a disposable account, deleted at the end: <ul><li>cycle settings ("Not sure" saves no length)</li><li>period logging (past dates, flow, symptom severity) and the calendar</li><li>pregnancy mode: week and due-date estimate, a corrected date, appointments as dated reminders, paused cycle estimates</li><li>a one-date reminder and quiet hours</li><li>Premium locks on Free; the trial unlocks the coach</li><li>coach safety replies (emergency, diagnosis, contraception)</li></ul> |
| `node mobile-connection.mjs http://127.0.0.1:8096 <outDir>` | API unreachable → offline demo; staff blocked; magic link |
| `node mobile-admin.mjs http://127.0.0.1:8096 <outDir>` | **Mobile app → Web Admin.** A disposable person signs up, onboards and uses the app; an Admin sees it in App activity and on the profile timeline (never values); health records open only after an audited, reason-stated grant and close again; an Admin without the permission, Content Managers and Medical Content Reviewers can't. Then Web Admin → app: an approved daily-plan item appears in the person's plan and an in-app campaign in their notifications. The account is deleted at the end, with its activity |

Set `HEALTHX_API=http://127.0.0.1:4104` for the mobile suites, and also `HX_API=http://127.0.0.1:4104 HX_WEB=http://127.0.0.1:5184` for `mobile-admin.mjs`.

## Theme customization (offline demos)

`theme.mjs` runs entirely in the browser-only offline demos, so it never writes to a server. Point it at any Vite server, and optionally at a mobile web export:

```bash
node theme.mjs --base=http://127.0.0.1:5184 --mobile=http://127.0.0.1:8096
```

It covers:
- **Web (Web Admin and public website):**
  - Evergreen light is the default on the website and in the Web Admin.
  - Settings → Appearance in the Web Admin: Light, Dark and System modes. Dark mode persists across a reload and applies to the Web Admin and the public site.
  - A free theme (Ocean) re-colours every page while the fertile-window colour stays fixed.
  - Staff can use every theme, including the Premium ones (no lock in the Web Admin).
  - No horizontal overflow at phone width.
- **Mobile (`--mobile`):**
  - The Appearance screen lists 3 modes and 6 themes, with Premium themes locked on Free.
  - Applying dark mode or a free theme saves it and restarts the app.
  - Unlock opens Premium, and the trial unlocks Premium themes.
  - Switching back to Free resets a Premium theme to Evergreen.
