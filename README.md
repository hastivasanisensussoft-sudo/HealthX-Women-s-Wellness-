# HealthX Women's Wellness

Implementation of the HealthX Women's Wellness SRS v1.0: a **web app** (landing page, user dashboard, admin/CMS), a **mobile app** (iOS + Android) and a **minimal in-memory API** (`apps/api`) for authentication, the four SRS roles, owner-only wellness data, the content review workflow and the audit log. There is **no database** (by decision — API data resets on restart), and no real AI, payments, push or email delivery.

```
apps/
  web/        React 18 + Vite + TypeScript + Tailwind CSS + Recharts + lucide-react
    src/
      site/         1) Public website — home, features, pricing, FAQ, contact
      user/         2) User application — auth, onboarding, /app/* wellness modules
      admin/        3) Admin panel — role-based staff portal at /admin/*
      components/   Shared design system (ui, charts, brand, cycle ring/calendar)
      store/ lib/   Demo store (shared reducer + localStorage), helpers
  mobile/     Expo (React Native) + Expo Router + TypeScript + react-native-svg
              — the user application for iOS & Android
  api/        Node.js (built-ins only) in-memory API — auth + staff MFA, the four roles
              enforced server-side, /v1/me/* owner-only data, CMS workflow, audit (see apps/api/README.md)
packages/
  shared/     Dependency-free TypeScript shared by the apps and the API:
              design tokens, domain types, demo cycle engine, selectors,
              mock-data generator, demo state reducer, safety copy, photos
```

## Run it

```bash
npm run install:all   # web, mobile and api dependencies
npm run dev           # API on http://127.0.0.1:4000 + web on http://localhost:5173 (the web app reaches the API via /api)
npm run api:test      # API unit + integration tests

# Mobile (scan the QR code with Expo Go, or press w for web preview)
cd apps/mobile
npx expo start
```

Without the API the web app offers an **offline demo** (local data, nothing enforced).

| Area | Web routes |
|---|---|
| Public website | `/` Home · `/about` · `/features` · `/how-it-works` · `/pricing` · `/contact` · `/faq` (navbar also has Login and Sign Up, with a mobile menu below 1280 px) |
| User application | `/login` · `/signup` · `/forgot-password` · `/onboarding` · `/app/*` (the green-and-white dashboard and every wellness module; see the sidebar map below) |
| Admin panel | `/admin/login` · `/admin/*` (role-specific dashboards, users and support, content and medical review, notifications, subscriptions, analytics, roles and permissions, settings and audit log) |

**User app sidebar** (`apps/web/src/user/layout/nav.ts`). Groups are expandable, the active page is highlighted, the sidebar collapses to an icon rail with flyout menus on desktop, and it becomes a drawer on tablet and phone.

| Group | Pages |
|---|---|
| Overview | `/app` Home dashboard · `/app/check-in` · `/app/wellness-score` |
| Cycle & Period | `/app/cycle` · `/app/cycle/calendar` · `/app/cycle/history` · `/app/cycle/insights` |
| Symptoms & Mood | `/app/symptoms` · `/app/mood` · `/app/stress` |
| Daily Wellness | `/app/hydration` · `/app/sleep` · `/app/fitness` · `/app/nutrition` |
| Goals & Habits | `/app/goals` · `/app/habits` · `/app/plan` · `/app/achievements` (P2) |
| Insights & Reports | `/app/insights/weekly` · `/app/insights/progress` · `/app/insights/trends` |
| Learn | `/app/learn` (library with Quick Help, medium & time filters) · `/app/learn/womens-wellness` · `/app/learn/fertility-pregnancy` (links to `/app/fertility` and `/app/life-stages`) · `/app/learn/faq` · `/app/community` (P4) |
| Profile & Settings | `/app/profile` · `/app/notifications` · `/app/privacy` · `/app/integrations` (P2) · `/app/subscription` (and `/app/settings` from the profile menu) |

The AI coach (`/app/coach`) opens from the top bar. Old links redirect: `/app/insights` → trends, `/app/premium` → subscription.

**Admin sidebar:** Dashboard · User Management (users, support, privacy requests) · Content Management (library, create, review queue, compliance, publishing calendar, media library, categories & tags, version history) · Subscriptions · Notifications · Analytics & Reports · Roles & Permissions · Settings & Audit Logs (settings, configuration, flags, audit log, my account). Each role sees only the sections it can use. Admin login also has a staff "Forgot password" screen.

Useful commands (in `apps/web`): `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`.

**Roles — the four from SRS §6:** End User (§6.1), Content Manager (§6.2), Medical Content Reviewer (§6.3) and Admin (§6.4).
- The former Super Admin, Support Agent and Analyst roles were merged into Admin on 2026-10-26.
- The most sensitive Admin powers are privileged permissions held by individual Admins: manage staff, edit the permission matrix, change security settings, and break-glass.
- See `apps/api/README.md` for the full model.

**Demo access (synthetic accounts, development only)**
- **User app (with the API):** sign in as `aisha@example.com` or `riya.test@example.com` with the demo password printed by the API on start-up. Or **Sign up** for a new account, then follow onboarding.
  - The API keeps everything in memory, so it resets when it restarts.
- **Admin portal (with the API):** `/admin/login` with a seeded staff account (listed in `apps/api/README.md`) and the demo password, then the 6-digit code.
  - In development the current code is available from the API's dev helper.
  - Each role gets its own dashboard and navigation. Every permission is enforced by the API, so typing a URL or calling the API directly doesn't get around it.
  - Staff never see an individual user's cycle, fertility, symptom or mood records. Break-glass shows data categories and record counts only.
- **Offline demo:** if the API isn't running, the web app offers an offline demo.
  - Admin sign-in there takes any email, any 8+ character password and any 6-digit code, then lets you pick one of the four roles.
  - **These are mock permissions for demonstration only, not real security.**
- **Error and empty states:**
  - In the offline demo, a password containing "wrong" previews the login error.
  - **Settings → Start with empty data** shows first-run empty states.
  - `/admin/content?simulateError=1` shows the CMS error state.

## Technology choices

- **Mobile = React Native (Expo).** The SRS header specifies React Native; several later sections mention Flutter (open decision **D-01**). React Native also lets web and mobile share one TypeScript package (`packages/shared`).
- **Web stack** isn't specified in the SRS (D-16); React + Vite + TypeScript keeps it consistent with the mobile app and with a NestJS backend.
- The shared package has **no dependencies**, so both apps import it straight from source (Vite alias / Metro `watchFolders`). There are no npm workspaces, which keeps Expo's tooling simple.

## Design system

The visual language ("Evergreen", redesigned 2026-10-26) comes from the reference designs. The full specification is in [docs/design/healthx-design-system.md](docs/design/healthx-design-system.md).

- **Green and white** default theme: an evergreen-teal scale (`#F0F8F5` … `#186A53` … `#082D24`). `green-700` (`#186A53`) is the primary button colour, and white text on it passes WCAG AA. Deep evergreen panels (`green-900`) carry the hero areas and the sidebar, and a **butter-yellow** accent is used for calls to action.
- **Soft data accents** from the cycle-app references, with the same meaning in every theme: blush (period), sky (follicular, hydration), a fixed mint (estimated fertile window, always dashed), lavender (luteal, mood), peach (energy), indigo (sleep) and butter (nutrition).
- **Type:** Outfit (display), DM Sans (UI), DM Mono (eyebrow labels and numbers) and Caveat (handwritten accents on marketing pages).
- **Shapes:** 26 px cards, 34 px hero panels, pill controls, arch photo frames, leaf shapes, frosted-glass stat cards over photography and soft tinted shadows.
- **Media:** licence-free photos and short guided-session video clips (`packages/shared/assets`, credits alongside). Each has a poster or illustration fallback when it can't load.
- **Characters:** friendly mood faces, with geometry defined once in `packages/shared/src/illustrations.ts` and rendered by both apps.

All values live in `packages/shared/src/tokens.ts`. The web Tailwind theme and the mobile `theme.ts` both read from it.

### Themes (Settings → Appearance)

Users can pick an accent theme and a Light, Dark or System mode on both apps. **Evergreen** (the default), **Sage** and **Ocean** are free. **Lavender**, **Blush** and **Sunrise** are Premium; the Premium plan here is the simulated demo plan and no real payment is taken. The definitions and colour maths are in `packages/shared/src/themes.ts`.

- **Web:** every Tailwind colour is a CSS variable, so a theme change re-colours every page instantly (`apps/web/src/theme/`). Free-plan users can preview Premium themes on the Appearance page.
- **Mobile:** the theme is applied at start-up, before any screen loads (`apps/mobile/src/lib/themeBoot.ts`), so applying a new one restarts the app briefly.
- On both apps, a saved Premium theme switches back to Evergreen if the plan no longer includes it.

## Demo vs backend boundary

- All state comes from `packages/shared/src/state.ts`: a pure reducer over seeded mock data generated relative to *today*. Web persists it in `localStorage`, mobile in memory/AsyncStorage. **Settings → Reset demo data** restores it.
- Each reducer action is annotated with the NestJS module (SRS §56) that will own it.
- UI that would need a server (export, account deletion, AI, health-platform sync, payments, email) is labelled **"Requires backend — simulated"**.
- Features from later phases carry **Phase 2** or **Phase 3 preview** badges, following the SRS phase plan.

## Safety & privacy rules applied in the UI (SRS §5, §12, §19–§23, §31, §34, §67)

- Every prediction is labelled **Estimate\*** and explained with: *"This is an estimate based on the information you've provided."*
- Ovulation is never shown as confirmed, and fertility estimates are never presented as contraception.
- Insights are worded as **observed patterns**, never diagnoses.
- The Wellness Score is described as an **engagement metric**, not a medical score.
- The simulated AI coach declines diagnosis and medication questions and redirects emergencies.
- All approved wording lives in `packages/shared/src/copy.ts`.

> Note: one reference design shows "Ovulation in 1 day — High chance of getting pregnant". That wording conflicts with SRS §12/§20/§67, so the equivalent HealthX screens say "Estimated fertile window\*" instead.

## Content & photos

- Articles in `packages/shared/src/mock/articles.ts` are **sample content that has not been medically reviewed**. Reviewer names are placeholders.
- Photos are free Unsplash-licence images; see `packages/shared/assets/photos/CREDITS.md`.
- Testimonials on the landing page are clearly marked as illustrative placeholders.
