# HealthX browser tests

End-to-end checks for:
- the web user app
- the Web Admin
- the mobile app's **web export**

They drive the locally installed **Google Chrome** through `playwright-core` (pinned 1.64.0, no browser download).

```bash
cd tests/e2e && npm install
```

Ground rules:
- **Synthetic data only.** API-mode suites run against a **disposable in-memory API** (fresh seed data) on their own port, never the dev API on `:4000`.
- **They clean up after themselves.** Accounts a suite creates are deleted by that suite.
- **The mobile suites run the Expo web export in desktop Chrome.** That's not a native device or emulator.

## Web user app (API mode)

Start an API and a Vite server that proxies to it (defaults used by `hx-lib.mjs`):

```bash
cd apps/api && PORT=4101 ALLOWED_ORIGINS=http://localhost:5181,http://127.0.0.1:5181 node --import tsx src/main.ts
cd apps/web && HEALTHX_API_URL=http://127.0.0.1:4101 npx vite --port 5181 --strictPort --host 127.0.0.1
```

| Suite | Covers |
|---|---|
| `node e2e-api-user.mjs` | Sign-up/sign-in, wellness logging through the server, ownership/isolation between two users, export/delete, session handling |
| `node e2e.mjs` | Core journey: signup → onboarding → logging → coach → export (`--demo` runs it against the offline demo) |
| `node e2e-merge.mjs` | Mockup-merge features in a disposable account |
| `node navcrawl.mjs <shotsDir>` | Every nav item, rail, drawer and redirect; overflow check |
| `node e2e-api-down.mjs` | "Can't reach the server" and recovery. **Run it with the API stopped**; it starts and stops its own temporary API |

Every suite takes `--base=http://host:port` if Vite runs elsewhere.

## Web Admin

`admin-run.mjs` starts a **fresh API on :4102** for each suite. Vite must serve the web app on :5182 and proxy to it.

```bash
cd apps/web && HEALTHX_API_URL=http://127.0.0.1:4102 npx vite --port 5182 --strictPort --host 127.0.0.1
node admin-run.mjs ../../apps/api admin-api.mjs admin-navsmoke.mjs
```

| Suite | Covers |
|---|---|
| `admin-api.mjs` | **The four SRS roles against the real API.** For each staff persona, its role, dashboard, navigation, server-scoped data and privileged permissions. It also covers: <ul><li>refused crafted requests (Content Manager; Admin without privileged permissions)</li><li>the full content lifecycle (Content Manager → Medical Content Reviewer → Admin compliance → publish → visible in the app)</li><li>self-approval refused</li><li>masked emails and an audited reveal</li><li>user and staff deactivation</li><li>invite → accept → MFA sign-in</li><li>privileged permissions granted and revoked per Admin</li></ul> |
| `admin-navsmoke.mjs` | Every nav link for every persona at 1440 px and 390 px; row-menu keyboard; sign-out |

Offline-demo suites (no API; the login role picker lists the four roles):

```bash
node admin-flow2.mjs http://127.0.0.1:5182
node admin-flow3.mjs http://127.0.0.1:5182 <shotsDir>
node admin-flow4.mjs http://127.0.0.1:5182
node admin-indep.mjs http://127.0.0.1:5182
```

## Mobile app (Expo web export, API mode) and web ↔ mobile sync

```bash
cd apps/api && PORT=4103 ALLOWED_ORIGINS=http://127.0.0.1:8095,http://localhost:8095,http://127.0.0.1:5183,http://localhost:5183 node --import tsx src/main.ts
cd apps/web && HEALTHX_API_URL=http://127.0.0.1:4103 npx vite --port 5183 --strictPort --host 127.0.0.1
cd apps/mobile && EXPO_PUBLIC_API_URL=http://127.0.0.1:4103 npx expo export --platform web --output-dir <dist>
node spa-serve.mjs <dist> 8095
```

| Suite | Covers |
|---|---|
| `node core-e2e.mjs http://127.0.0.1:8095 <outDir>` | Core mobile interactions, checking what the server stored |
| `node content-flows.mjs http://127.0.0.1:8095` | Content screens; trial, export and delete in a disposable account |
| `node mobile-onboarding.mjs http://127.0.0.1:8095` | Sign-up + onboarding (consent before cycle data) |
| `node mobile-connection.mjs http://127.0.0.1:8095 <outDir>` | API unreachable → offline demo; staff blocked; magic link |
| `node sync-web-mobile.mjs http://127.0.0.1:8095 http://127.0.0.1:5183 <outDir>` | **Same account on web and mobile through the shared API**, in both directions; isolation from a second user; sign-out and "all devices" |

Set `HEALTHX_API=http://127.0.0.1:4103` for the mobile suites if the API runs elsewhere.

## Theme customization (offline demos)

`theme.mjs` runs entirely in the browser-only offline demos, so it never writes to a server. Point it at any Vite server, and optionally at a mobile web export:

```bash
node theme.mjs --base=http://127.0.0.1:5183 --mobile=http://127.0.0.1:8095
```

It covers:
- **Web:**
  - Evergreen light is the default.
  - The header light/dark toggle works.
  - Settings → Appearance: Light, Dark and System modes. Dark mode persists across a reload and applies on every page, including the public site.
  - A free theme (Ocean) re-colours every page while the fertile-window colour stays fixed.
  - Premium themes are locked on Free but can be previewed; the preview ends when you leave the page.
  - The simulated Premium plan unlocks them.
  - Cancelling Premium switches the theme back to Evergreen.
  - No horizontal overflow at phone width.
- **Mobile (`--mobile`):**
  - The Appearance screen lists 3 modes and 6 themes, with Premium themes locked on Free.
  - Applying dark mode or a free theme saves it and restarts the app.
  - Unlock opens Premium, and the trial unlocks Premium themes.
  - Switching back to Free resets a Premium theme to Evergreen.
