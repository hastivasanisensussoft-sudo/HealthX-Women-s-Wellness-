# HealthX Women's Wellness

Implementation of the HealthX Women's Wellness SRS v1.0 (platforms: iOS, Android, Web Admin):
- a **mobile app** (iOS + Android): where end users use HealthX;
- a **Web Admin** for the three staff roles (Content Manager, Medical Content Reviewer, Admin), plus the public website;
- a **minimal in-memory API** (`apps/api`): authentication, the four SRS roles, owner-only wellness data, the app-activity log, the content review workflow and the audit log.

The end-user web dashboard was retired on 2026-10-27. Its routes redirect to **Get the app**; the email-link pages (password reset, email confirmation, magic-link hand-off) stay on the web. There is **no database** (by decision — API data resets on restart), and no real AI, payments, push or email delivery.

```
apps/
  web/        React 18 + Vite + TypeScript + Tailwind CSS + Recharts + lucide-react
    src/
      site/         1) Public website — home, features, pricing, FAQ, contact
      account/      2) Account links from emails — reset password, confirm email, magic-link hand-off
      admin/        3) Web Admin — role-based staff portal at /admin/*
      components/   Shared design system (ui, charts, brand, cycle ring/calendar)
      lib/ theme/   API clients, helpers, theme engine
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
npm run shared:test   # unit tests for the shared logic (cycle, dates, score, streaks, life stages, reminders, coach safety…)

# Mobile (scan the QR code with Expo Go, or press w for web preview)
cd apps/mobile
npx expo start
```

Without the API, the Web Admin and the mobile app offer an **offline demo** (local data, nothing enforced).

| Area | Web routes |
|---|---|
| Public website | `/` Home · `/about` · `/features` · `/how-it-works` · `/pricing` · `/contact` · `/faq` · `/get-the-app` (navbar has **Staff login** and **Get the app**, with a mobile menu below 1280 px) |
| Account links | `/reset-password?token=…` · `/verify-email?token=…` · `/login?magic=…` (hands the link to the app; the token is never redeemed on the web) |
| Retired end-user web app | `/app/*` · `/signup` · `/login` · `/onboarding` · `/forgot-password` → redirect to `/get-the-app` |
| Web Admin | `/admin/login` · `/admin/*` (role-specific dashboards, users and their app activity, content and medical review, daily plans, notifications, subscriptions, analytics, roles and permissions, settings, appearance and audit log) |

**Admin sidebar:** Dashboard · User Management (users, **app activity**, support, privacy requests) · Content Management (library, create, review queue, compliance, publishing calendar, **daily plans**, media library, categories & tags, version history) · Subscriptions · Notifications · Analytics & Reports · Roles & Permissions · Settings & Audit Logs (settings, configuration, flags, audit log, **appearance**, my account). Each role sees only the sections it can use. Admin login also has a staff "Forgot password" screen.

**Mobile app → Web Admin (added 2026-10-27):**
- **App activity:** the API records every account action (sign-up, sign-in, password reset…) and every record saved from the mobile app as an activity event: its type and time, never its value. Screen views, video plays and coach questions are recorded only when the person allows product analytics. Admins see a live feed (`/admin/activity`), KPIs on the dashboard and in Analytics, and each person's timeline on their profile (`/admin/users/:id`). Activity is erased with the account.
- **Health records:** Admins who hold the per-account break-glass (health-records) permission can open a person's records (cycle, symptoms, mood, fertility, life stage, fitness, nutrition, hydration, sleep, habits and goals) after giving a ticket and a reason. Access lasts 30 minutes, and every grant and view goes in the audit log. Admins without that permission, Content Managers and Medical Content Reviewers can't open them.
- **Web Admin → app:** daily-plan templates (Content Manager writes, Medical Content Reviewer approves), Wellness Score weights, insight rules, staff-added symptoms and tracking defaults reach the app through the API, and campaigns can be delivered to people's in-app inbox.

**Mobile app modules (completed 2026-10-27; checklist in `docs/reports/2026-10-27-module-checklist.md`):**
- **Life stages:** pregnancy week and estimated due date counted from the last period (decision D-21), appointment reminders, questions for a provider; perimenopause and menopause show the share of target over the last 7 days (D-36), hot-flash and symptom charts, a weight log and a menopause routine. Pregnancy mode pauses period estimates and reminders.
- **Tracking:** cycle settings ("Not sure" saves nothing, so no 28-day assumption), symptoms on any past date with per-symptom notes, period severity, optional stress and anxiety, 14 days of fertility logging with trends, an editable sleep goal.
- **Reminders on the phone:** local notifications (`expo-notifications`) built from the shared, unit-tested `reminderPlan()`. They respect consent, quiet hours, discreet mode and pregnancy mode. Server push still needs the backend.
- **Premium (SRS §49):** the coach, advanced insights, monthly and cycle reports, advanced cycle history, nutrition and meal ideas, personalised workouts and Premium themes are locked on Free. The 7-day trial is granted by the server. The UI lock is not a security control, and paid plans need store billing.
- **Kept on the phone (the API can't store it yet):** profile photo (camera or gallery), weight history, questions for a provider, grocery list, integration data types and the trial end date. It is stored in secure storage, or in this tab's session storage in the web preview. It is never sent to the server and is removed when the account is deleted.

Useful commands (in `apps/web`): `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`.

**Roles — the four from SRS §6:** End User (§6.1), Content Manager (§6.2), Medical Content Reviewer (§6.3) and Admin (§6.4).
- The former Super Admin, Support Agent and Analyst roles were merged into Admin on 2026-10-26.
- The most sensitive Admin powers are privileged permissions held by individual Admins: manage staff, edit the permission matrix, change security settings, and break-glass (health-records access).
- See `apps/api/README.md` for the full model.

**Demo access (synthetic accounts, development only)**
- **Mobile app (with the API):** sign in as `aisha@example.com` or `riya.test@example.com` with the demo password printed by the API on start-up. Or **Sign up** for a new account, then follow onboarding.
  - The API keeps everything in memory, so it resets when it restarts.
- **Admin portal (with the API):** `/admin/login` with a seeded staff account (listed in `apps/api/README.md`) and the demo password, then the 6-digit code.
  - In development the current code is available from the API's dev helper.
  - Each role gets its own dashboard and navigation. Every permission is enforced by the API, so typing a URL or calling the API directly doesn't get around it.
  - Staff see what people did and when, never the values. Only an Admin with the break-glass permission can open a person's health records: reason required, 30 minutes, audited.
- **Offline demo:** if the API isn't running, the Web Admin offers an offline demo with simulated activity.
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

People pick an accent theme and a Light, Dark or System mode in the mobile app; staff do the same in the Web Admin (Settings → Appearance). **Evergreen** (the default), **Sage** and **Ocean** are free. **Lavender**, **Blush** and **Sunrise** are Premium in the app; the Premium plan here is the simulated demo plan and no real payment is taken. Staff can use every theme. The definitions and colour maths are in `packages/shared/src/themes.ts`.

- **Web (Web Admin and website):** every Tailwind colour is a CSS variable, so a theme change re-colours every page instantly (`apps/web/src/theme/`).
- **Mobile:** the theme is applied at start-up, before any screen loads (`apps/mobile/src/lib/themeBoot.ts`), so applying a new one restarts the app briefly. A saved Premium theme switches back to Evergreen if the plan no longer includes it.

## Demo vs backend boundary

- App state comes from `packages/shared/src/state.ts`: a pure reducer over seeded mock data generated relative to *today*. With the API it lives on the server; in the offline demo the mobile app keeps it on the device. **Settings → Reset demo data** restores it.
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
