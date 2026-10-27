# HealthX "Evergreen" Design System

The visual language of the HealthX Women's Wellness web app, Web Admin and mobile app (redesign of 26 October 2026). Tokens live in `packages/shared/src/tokens.ts` and are read by both platforms (Tailwind on web, `apps/mobile/src/lib/theme.ts` on mobile).

**References.**
- **Product screens:** Mira (teal-and-white tracker, cycle dial, week strip, range calendar, arch portrait with leaves), Myflo (tinted quick-log tiles, mood and symptom chips) and Moonly (phase ring).
- **Website:** Healix (deep-green hero, butter call-to-action), Balanza (photo hero, glass stat cards, arch photo), MindWell (sage washes, handwritten accents, "How it works" steps) and Mariah (serif-and-script headings, numbered services, testimonials).

## 1. Principles

1. **Calm, not clinical.** Generous white space, soft corners, natural photography and gentle motion.
2. **Readable at every age.** Body text is 16 px on web and 15 px on mobile, with high-contrast text. Touch targets are at least 44 px.
3. **Honest data.** Every estimate is labelled with "*" or "estimate", and dashed shapes mean estimate. HealthX never implies diagnosis, confirmed ovulation or contraception (see the safety rules in §9).
4. **One system, two platforms.** The same tokens, shapes and patterns appear on web and mobile.

## 2. Colour

| Token | Use | Key values |
|---|---|---|
| `green` (evergreen-teal) | Brand, primary actions, navigation, success | 50 `#F0F8F5` · 100 `#DDF0E8` · 300 `#93CFB8` · 500 `#3A9A7B` · 600 `#227F63` · **700 `#186A53` (primary)** · 800 `#125643` · 900 `#0D4336` · 950 `#082D24` |
| `rose` | Period and menstrual phase | 100 `#FFE3EA` · 500 `#DF5C80` · 700 `#9E2E4E` |
| `sky` | Hydration and follicular phase | 100 `#DCEFFC` · 500 `#3693D3` |
| `fertile` (fixed mint) | Fertile-window estimate, always drawn dashed | 100 `#DDF0E8` · 300 `#93CFB8` · 500 `#3A9A7B` · 700 `#186A53` (the Evergreen scale, kept in every theme) |
| `lavender` | Luteal phase, mood, estimate markers | 100 `#ECE8FE` · 500 `#8572DE` |
| `peach` | Energy and nutrition | 100 `#FFEAD8` · 500 `#EE8442` |
| `indigo` | Sleep | 100 `#E5E8FB` · 500 `#6673D6` |
| `butter` | Warm call to action (website, highlights) | 300 `#FAD772` · 400 `#F4C548` |
| `ink` | Text, borders, surfaces | 100 `#EDF2F0` · 200 `#DDE6E2` · 500 `#6F807A` · 900 `#14211D` |
| Surfaces | App canvas `#F3F8F6`, cards white, website bands `cream` `#FAF7F1` / `sage` `#E3EFE8`, forest panels `green-950` | — |

**Rules:**
- White text sits only on `green-700` or darker.
- Use the `*-700` shade for coloured text on tinted backgrounds (for example `rose-700` on `rose-50`).
- Data colours are fixed: period rose, fertile-window mint, hydration sky, sleep indigo, energy and nutrition peach, mood lavender. They keep their meaning in every theme; only `green` (the brand) follows the accent theme.
- Tint backgrounds go no stronger than `*-100`.

### Themes and dark mode

Settings → Appearance offers six accent themes and three modes on web and mobile. Definitions and colour maths live in `packages/shared/src/themes.ts`.

| Theme | Plan | Brand 700 |
|---|---|---|
| Evergreen (default) | Free | `#186A53` |
| Sage | Free | `#3A6334` |
| Ocean | Free | `#1B586D` |
| Lavender | Premium | `#573FA6` |
| Blush | Premium | `#962E4C` |
| Sunrise | Premium | `#9A3F20` |

- **Modes:** Light, Dark and System (follows the device).
- **Premium:** Premium themes are locked on the Free plan, and the web app lets people preview them first. The plan is simulated in this build. A saved Premium theme switches back to Evergreen when the plan no longer includes it.
- **How a theme changes:** only the brand scale (`green`) and the surfaces. Data hues and the fertile mint stay fixed.
- **Dark mode:**
  - Surfaces become deep brand-tinted greys.
  - Tints 50–300 become deep tints.
  - Coloured text shades (600–950) are lifted so they stay readable.
  - Forest panels (`green-900`/`950`) stay deep.
  - Shadows turn black and stronger.
- **Web mechanics:**
  - Every Tailwind colour is a CSS variable: `--c-<hue>-<shade>` for fills, borders and rings, and `--t-<hue>-<shade>` for text.
  - `bg-white` is the card surface, so it turns dark in dark mode. `text-white` always stays white.
  - The engine (`apps/web/src/theme/engine.ts`) writes the variables into `<style id="hx-theme">` and sets `data-theme` / `data-mode` on `<html>`.
  - Inline SVG uses `cv()` / `tv()` / `surfaceVar`, never hex values.
  - Previews scope a theme to `[data-preview="<id>-<light|dark>"]`.
- **Mobile mechanics:**
  - `apps/mobile/src/lib/themeBoot.ts` runs first (`index.js`). It re-colours the shared palette before any screen builds its styles.
  - Applying a theme saves it and restarts the app.
  - In dark mode, use `brandText` (not `green-800/900`) for brand-coloured text and icons, and `colors.surface` (not `'#fff'`) for card backgrounds.

## 3. Typography

| Role | Web | Mobile | Notes |
|---|---|---|---|
| Display and headings | `font-display` (Outfit Variable) | `font.display` / `font.displayBold` (Outfit 600/700) | Tight tracking (-0.01 to -0.02 em). Page titles 30–36 px. |
| Body and UI | `font-sans` (DM Sans Variable) | `font.regular` … `font.extrabold` (DM Sans) | Web body 16 px, labels 14 px. Mobile body 15 px. |
| Labels and eyebrows | `.eyebrow` / `font-mono` (DM Mono) | `variant="overline"` (DM Mono 500) | 10.5–11.5 px, uppercase, tracking 0.12–0.16 em. Use for section eyebrows, dates and small stat labels. |
| Accent | `font-script` (Caveat) | — | Rare handwritten accents on the website only. |
| Numbers | `.num` (Outfit, tabular) | Outfit | Rings, stats, calendars. |

Web helpers: `.heading-xl`, `.heading-lg`, `.heading-md`, `PageHeader` (with `eyebrow`) and `SectionTitle`.

## 4. Shape, depth and motion

- **Radii:**
  - cards `rounded-2xl` (26 px)
  - hero panels `rounded-[34px]`
  - inputs `rounded-xl` (18 px)
  - buttons, chips and tabs: pills
  - mobile cards 24 px
- **Shapes:**
  - `.arch` (rounded-top photo frame)
  - `.leaf` / `.leaf-alt`
  - `.blob`
  - `<LeafPair>` (pink and white leaves behind portraits)
  - `<Leaf>`
- **Shadows:**
  - `shadow-card` (soft, default for cards)
  - `shadow-lift` (menus, hero panels)
  - `shadow-soft` (chips, icon discs)
  - primary buttons have a green glow
- **Surfaces:**
  - `.card` (white, hairline border)
  - `.glass` (frosted white on photos)
  - `.glass-dark` (frosted on forest)
  - `.bg-forest` (deep evergreen hero with soft light)
  - `.bg-wash` (sage, blush and lavender wash)
  - `.panel-mint`
- **Motion:**
  - `animate-fade-up`
  - `animate-scale-in` (popovers)
  - `animate-slide-up` (sheets on phones)
  - `animate-breathe` (breathing circle)
  - `animate-sway` (leaves)
  - `animate-ken-burns` (photo zoom)
  - `animate-ping` on play buttons

  All motion is disabled under `prefers-reduced-motion`.

## 5. Components

**Web components:**
- **UI kit** (`apps/web/src/components/ui`): `Button` (primary, secondary, outline, ghost, butter, rose, danger, white, dark), `Card` / `CardHeader` / `StatCard`, `Badge` / `PhaseBadge` / `BackendBadge` / `EstimateMarker`, form controls (`Input`, `Select`, `Switch`, `ChipToggle`, `Segmented`, `RatingSlider`, `Stepper`), `PageHeader`, pill `Tabs` / `RouteTabs`, `Modal` (bottom sheet on phones), `Popover`, `EmptyState` / `ErrorState` / `Notice` / `Skeleton` / `CardSkeleton`, `ProgressRing` / `ProgressBar`, and `SectionTitle`, `IconTile`, `HScroll`, `MoreLink`.
- **Media** (`components/media`): `Photo` (shapes, fade-in, fallback panel) and `VideoCard` / `VideoPlayerModal` / `AmbientVideo` (preview clips with a steps fallback).
- **Cycle** (`components/cycle`): `CycleRing` (phase dial), `CycleCalendar` (range bands) and `WeekStrip`.
- **Brand:** `Logo`, `LogoMark`, `MoodFace`, `Avatar`, `Leaf`, `LeafPair`, `Blob`, `Sprig`, `Daisy`, `SparkleShape`, `Squiggle`.
- **User cards** (`user/components/Cards.tsx`): `CycleSummaryCard`, `WellnessScoreCard`, `CheckInCard`, `PlanList`, `InsightCard`, `ArticleCard`.

**Mobile components** (`apps/mobile/src/components`):
- `AppText` (variants hero to overline), `Button`, `IconButton`
- `Card` (tones), `SectionHeader` (with eyebrow), `ListRow`
- `QuickTile`, `Photo`, `VideoCard` (opens `/video/[key]`)
- `CycleRing`, `MonthCalendar` (range bands), `WeekStrip`
- `Sheet`, `Screen`, inputs, charts and states

## 6. Layout patterns

- **Web app shell:**
  - deep-evergreen sidebar (8 accordion groups, mint active pill, collapsible 84 px rail)
  - frosted top bar (pill search, date chip, coach, notifications, account)
  - canvas background
  - floating round "+" quick log on desktop
  - bottom tab bar (Home, Cycle, centre +, Insights, Profile) below `lg`
- **Page anatomy:** `PageHeader` (eyebrow, title, subtitle, actions), then optional `RouteTabs` (pills), then content in a 12-column grid with gaps of 6 (24 px) and sections spaced 32 px apart (`space-y-8`). Use a forest or wash hero panel for the page's key metric where it helps.
- **Dashboards:**
  - a hero with the primary metric
  - a row of `IconTile` quick actions
  - cards in 3–4 columns
  - horizontal carousels (`HScroll`) for media
- **Mobile screens:**
  - `Screen` with 20 px padding
  - greeting or back header
  - hero card
  - `SectionHeader` (eyebrow and title)
  - 2–3-column tile grids
  - horizontal carousels
  - bottom tab bar with rounded top and an evergreen "+" button that opens the quick-log sheet
- **Website:**
  - forest or photo hero with glass stat cards and an arch portrait with leaves
  - alternating white, cream and sage bands
  - numbered steps, icon cards, testimonial and stat strips
  - butter call-to-action buttons on dark backgrounds, evergreen on light

## 7. Imagery and video

- **Photos:**
  - all are licensed and listed in `packages/shared/assets/photos/CREDITS.md`
  - frames: arch or rounded, faces kept in frame with `position`
  - text over photos gets a dark gradient
  - repeated images go only in different contexts
  - every photo has an `alt` (empty for decorative ones) and a fallback panel
- **Video previews:**
  - free Mixkit clips in `packages/shared/assets/videos` (see that folder's `CREDITS.md`)
  - keys and copy in `packages/shared/src/media.ts`
  - each preview opens a player with the routine's steps
  - if a clip fails or is missing, the poster and steps still show
  - label as "Video preview"
  - background (ambient) clips load only when their panel scrolls near the screen and pause off screen; a still poster shows instead with reduced motion, Data Saver, or a failed clip
- **Illustrative elements:** mood faces, leaves, the cycle dial, the breathing circle and soft blobs. No unrelated decoration.

## 8. Accessibility

- Visible focus rings (green).
- Every control has an accessible name. Icon buttons have `aria-label` on web and `accessibilityLabel` on mobile.
- Colour is never the only signal: dashed means estimate, plus text labels.
- Body text contrast at least 4.5:1.
- Touch targets at least 44 px.
- Reduced motion respected.
- Keyboard support in menus, tabs and dialogs.

## 9. Content and safety language (non-negotiable)

- Predictions are **estimates** ("Next period around Nov 13*", "Fertile window estimate*"). They never imply confirmed ovulation and are never contraception.
- No "high or low chance of getting pregnant" copy, no diagnosis and no outcome promises. The wellness score is an *engagement metric, not a medical score*.
- Insights are *observed patterns*. Emergencies direct people to medical care.
- Simulated features keep their `PhaseBadge` / `BackendBadge`, and the offline demo is always labelled.
