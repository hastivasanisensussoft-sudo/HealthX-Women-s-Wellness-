# HealthX Women’s Wellness — Redesign, Theming and Verification Report

**Dates:** 26–27 October 2026
**Repository:** `C:\New folder\HealthX Women's Wellness` (not a Git repository; nothing was committed, pushed or deployed).
**Test environment:** Windows 10 Pro, Node 24, Google Chrome driven by playwright-core 1.64.0. Every browser suite ran against a fresh, disposable in-memory API with synthetic data, on its own ports.

This report covers two requests:
- **The redesign request:** completely redesign the web and mobile UI/UX using the reference images and the HTML mockup.
- **The completion request:** finish the whole app, frontend only. This adds theme customization with free and premium themes, the four roles, media, performance work and full verification.

The work stays frontend-first. The only backend is the existing minimal in-memory `apps/api`, and it was not changed. Simulated features are labelled in the UI (Phase badges, “simulated”, “offline demo”, “Premium is simulated”).

---

## 1. Summary

| Area | Result |
|---|---|
| **Design system** | New “Evergreen” system, with tokens shared by web and mobile. Spec: [docs/design/healthx-design-system.md](../design/healthx-design-system.md). |
| **Web app** | Every page rebuilt: public site, auth, onboarding, dashboard and all modules. Library, account and settings pages too. |
| **Web Admin** | Shell, login, dashboards and all 26 admin pages redesigned. The four SRS roles and their gating are unchanged. |
| **Mobile app (Expo)** | 46 screens and the shared kit rebuilt: onboarding, cycle, wellness, learn and account. |
| **Theme customization** | Settings → Appearance on web and mobile. Six accent themes (three free, three Premium), plus Light / Dark / System modes, live previews, and Premium lock / preview / unlock. |
| **Media** | 7 short guided-session video previews with posters and step fallbacks, and 10 new photos. Every image and video has a fallback. |
| **Performance** | Unused dependencies removed and images re-encoded. Ambient videos load lazily. Per-second re-renders were removed from two pages. |
| **Tests** | All existing suites pass. A new theme suite was added. Results are in §6. |

---

## 2. Design system (“Evergreen”)

- **Colour:** evergreen-teal brand (`green-700 #186A53`, primary) on white. Soft data accents: blush period, sky follicular and hydration, a fixed mint for the fertile-window estimate, lavender luteal and mood, peach energy, indigo sleep, butter calls to action.
- **Type:** Outfit (display), DM Sans (UI), DM Mono (eyebrows and numbers), Caveat (rare accents on the website).
- **Shapes:** 26 px cards, 34 px hero panels, pill controls, arch photo frames, leaves, frosted-glass stats over photos.
- **Patterns from the references:**
  - Mira: week strip, cycle dial, range calendar, arch portrait with leaves
  - Myflo: tinted quick-log tiles
  - Moonly: phase ring
  - Healix and Balanza: forest and photo heroes
  - MindWell and Mariah: website sections
- **Safety language is unchanged:** estimates carry “*” and dashed shapes, there is no “confirmed ovulation”, nothing is presented as contraception, the wellness score is an engagement metric, and insights are observed patterns. A sweep of all copy found only disclaimers (§7).

---

## 3. Theme customization

**Themes:** Evergreen (default), Sage and Ocean are free. Lavender, Blush and Sunrise are Premium. Modes are Light, Dark and System.

**What changes:**
- **What a theme changes:** only the brand scale and the surfaces.
- **What stays fixed:** period, fertile-window, hydration, sleep and mood colours, so charts keep their meaning.

**Web:**
- **How it works:** every Tailwind colour is a CSS variable, so a change re-colours every page instantly. That covers the user app, the public site and the Web Admin.
- **Where to change it:** Settings → Appearance (`/app/settings/appearance`), or the sun/moon toggle in the header.
- **Persistence:** the choice is saved in the browser and synced across tabs.
- **Premium on the Free plan:** Premium themes can be previewed. The preview ends when you leave the page.

**Mobile:**
- **How it works:** `lib/themeBoot.ts` runs first, from the new `index.js` entry, and re-colours the shared palette before any screen builds its styles.
- **Where to change it:** Settings or Profile → Appearance.
- **Applying a theme:** this saves it and restarts the app. The dialog says so.
- **System mode:** reads the phone’s setting at start-up. `app.json` now uses `userInterfaceStyle: automatic`.

**Plan rule:** Premium themes need the (simulated) Premium plan or trial. If the plan returns to Free, a saved Premium theme switches back to Evergreen and the user is told.

---

## 4. Roles and navigation

The four SRS roles from the earlier consolidation are unchanged: End User, Content Manager, Medical Content Reviewer and Admin. The admin redesign kept the navigation DOM, labels and gating. They are verified by:
- `admin-api.mjs`: each role against the real API, 152 checks.
- `admin-navsmoke.mjs`: every nav link for every persona at 1440 px and 390 px, 230 checks.

UI checks only shape the screen. Permissions are enforced by the API.

---

## 5. Performance work (each change verified before keeping it)

| Change | Evidence |
|---|---|
| **Removed 4 unused font packages** (Fraunces and Plus Jakarta Sans, on web and mobile). | No source references remained. The web build bundles only Outfit, DM Sans, DM Mono and Caveat. |
| **Removed 5 unused mobile packages:** `@expo/vector-icons`, `expo-device`, `expo-web-browser`, `@expo/ui`, `expo-symbols`. | None is imported anywhere. The web, Android and iOS bundle exports all succeed afterwards. |
| **Kept `react-native-reanimated`, `-worklets` and `-gesture-handler` pinned.** | npm installs them anyway as peers of `expo-router` and `expo-modules-core`. Unpinning would let versions drift away from the SDK. |
| **Re-encoded photos.** | Long edge at most 1200 × 1800, quality 0.82: total 7.0 → 4.6 MB. A file was replaced only when at least 10% smaller. Originals are backed up outside the project. |
| **Ambient videos:** load only when near the screen and pause off-screen. A still poster shows with reduced motion, Data Saver or a failed clip. Player videos use `preload="metadata"`. | The clips are already web-optimized: moov atom first, no audio, 8–16 s. |
| **Check-in page:** the elapsed-time chip ticks in its own component, so the form no longer re-renders every second. | Typecheck and lint clean; the check-in suites pass. |
| **Admin session timer:** the countdown and warning tick in small components. The admin shell re-renders only when the warning flips. | A fake-clock check passed 8/8: countdown, warning, “Stay signed in”, auto sign-out with its toast. |
| **Continuous animations** (`ping`, `sway`) are motion-safe. A global reduced-motion rule stops all others. | — |
| **Deduplicated the distance estimate:** one shared `estimateDistanceKm` (0.75 m average stride, always labelled an estimate) replaces copies on web and mobile. | — |

**Build sizes (web):**
- main JS: 308 KB (100 KB gzipped)
- CSS: 159 KB (23 KB gzipped)
- Recharts and the Web Admin are separate lazy chunks: 118 KB and 129 KB gzipped

---

## 6. Verification results (final code)

| Check | Result |
|---|---|
| **API:** `npm test` / `npm run typecheck` | **101 / 101 pass** / clean |
| **Web:** `tsc -b --noEmit` | clean |
| **Web:** `npm run lint` | **0 errors**, 5 warnings. All are pre-existing react-refresh notices in `Card.tsx`, `Toast.tsx` and `AppStore.tsx`; the baseline before the redesign was 6. |
| **Web:** `npm run build` (output sent to a scratch folder, so `apps/web/dist` was not touched) | succeeds |
| **Mobile:** `npm run typecheck` / `npm run lint` | clean / clean |
| **Mobile:** `expo export` for web, Android and iOS | all succeed (entry `index.js`) |
| `e2e-api-user` (API mode) | 21 / 21 |
| `e2e` (core journey: signup → onboarding → logging → coach → export) | 11 / 11 |
| `e2e-merge` | 11 / 11 |
| `navcrawl` (every nav item, rail, drawer, flyout, redirects, overflow) | 394 / 394 |
| `e2e-api-down` | 7 / 7 |
| `admin-api` (four roles against the real API) | 152 / 152 |
| `admin-navsmoke` | 230 / 230 |
| `admin-flow2` / `admin-flow3` / `admin-flow4` / `admin-indep` | 23 checks pass / full content lifecycle passes / 59 / 59 / 41 / 41 |
| Mobile web export, API mode: `core-e2e` / `content-flows` / `mobile-onboarding` / `mobile-connection` / `sync-web-mobile` | 14 / 14 · 19 / 19 · 14 / 14 · 8 / 8 · 8 / 8 |
| **New:** `theme.mjs` (web and mobile) | **16 / 16** |

**No unexpected page, console or API errors** were reported by the suites above. `mobile-onboarding` logs one 409; it is the test's own deliberate duplicate-email registration.

**The theme suite found a real bug.** The mobile app passed selection state through `accessibilityState`, which React Native Web 0.21 ignores. So radios, tabs, chips, checkboxes and disabled buttons exposed no checked, selected or disabled state to assistive technology on the web build. All 35 uses were converted to the `aria-*` props (`aria-checked`, `aria-selected`, `aria-expanded`, `aria-disabled`, `aria-busy`), which work on native and web. The full mobile run then passed.

**Visual review:**
- **Web:** screenshots at 1440 px and 390 px, in light, dark and other accent themes, with no horizontal overflow on the pages checked.
- **Mobile:** the web export at 390 × 844, with every main screen reviewed in dark mode and two other accent themes.

---

## 7. Fixes made during review

**Dark-mode legibility:**
- Light text on always-dark panels (mobile heroes, splash, welcome, auth header, banners) now uses the theme’s light-mode tints (`onDark`) instead of tints that darken.
- White overlays inside the always-dark sidebars stay white (`.on-forest`), and their light popovers return to the card surface (`.surface-reset`).
- Mobile info toasts were unreadable in dark mode; they are fixed.

**Collapsed-sidebar flyouts:** they were clipped in the user app. The glows now clip in their own layer.

**Test contract:** the admin suite finds stat values by their `text-[28px]` class. `StatCard` had changed to 30 px; it is back to 28 px. No test was edited.

**Layout and theming:**
- Arch photo corners squared off on tall frames.
- Portrait photos stretched horizontal article cards.
- Several shadows used fixed Evergreen colours; they now follow the theme.

**Safety-language sweep:** no unsafe claims in web, mobile or shared copy.

---

## 8. Not done, limits and open items

- **Native device check: NOT VERIFIED.**
  - **Verified:** the Android and iOS bundles build, and Metro served the Android bundle to the emulator.
  - **Not verified:** the redesigned screens and the theme restart on a device. Expo Go on the emulator stalled at “Bundling 34%” twice while loading the 10 MB development bundle (Pixel 7 AVD with software GPU).
  - Every mobile visual and functional check here used the web export, which is **not** a native app.
- **Video sizes:** the 7 clips total about 29 MB. They are not re-encoded because no transcoder was available. On native builds they are bundled into the app. Re-encoding to about 1.5 Mbps would roughly halve this.
- **Web Admin chunk:** the admin console is one lazy chunk (129 KB gzipped). It is not split per page.
- **`npx expo install --check`:** reports 4 packages with newer patch versions. They were not changed.
- **Mobile System mode** is read at start-up. If the phone switches mode while the app is open, the change applies the next time HealthX starts.
- **Open item O1** (refresh grace window, from the earlier report) still needs a decision. It was not changed.
- **Premium:** the Premium plan, payments, social sign-in, integrations and the AI coach remain simulated and are labelled as such.
