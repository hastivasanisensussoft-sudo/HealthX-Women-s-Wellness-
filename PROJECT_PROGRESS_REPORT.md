# HealthX Women’s Wellness — Project Progress Report

> Audit-only report. No application code, data, API behaviour or configuration was changed to produce it.

## A. Project Overview

| Item | Detail |
|---|---|
| Project | HealthX Women’s Wellness |
| Purpose | Privacy-first consumer wellness app for women: cycle and period tracking, symptoms, mood, hydration, sleep, nutrition, fitness, life stages (fertility, pregnancy, perimenopause, menopause), insights and a wellness coach, plus a role-based Web Admin for content and platform management. Wellness information only, not diagnosis. |
| Primary scope source | *HealthX Women’s Wellness — Detailed Software Requirements Specification (SRS) v1.0* (73 sections), provided as a PDF outside the repository |
| Repository | Git, branch `jenil-gadhiya`, commit `be8812d` (latest `main`, pulled 2026-10-27), plus uncommitted scroll fixes (mouse-wheel scrolling for horizontal lists, one overflow fix) that do not change any requirement status |
| Architecture | Monorepo: `apps/mobile` (Expo SDK 58, React Native 0.88, Expo Router, TypeScript) — **the end-user app**; `apps/web` (React 18, Vite 6, TypeScript, Tailwind; public website + Web Admin; the end-user web app was retired in `be8812d`), `apps/api` (Node.js + TypeScript, built-ins only, **in-memory, no database**), `packages/shared` (types, cycle engine, life stages, reminder plan, selectors, reducer, design tokens, mock data, **unit tests**), `tests/e2e` (browser suites) |
| Audit date | 2026-10-28 (re-audit of 2026-10-27 report after commit `be8812d`) |
| Scope reviewed | SRS §6–§58, §61–§70, §72 (feature, security, data, architecture, testing and release requirements); all four apps/packages; API and E2E tests; READMEs and docs/reports |

**Key differences between the SRS and the implementation**
- The SRS header specifies React Native; §55–§57 and §71 describe Flutter. The repo uses React Native (Expo) — open decision D-01 in README.
- The SRS specifies NestJS + PostgreSQL + AWS. The API is a single in-memory Node.js service with no database or deployment, by an explicit decision recorded in `apps/api/README.md`.
- AI, payments, push notifications, email delivery, OAuth and Apple Health / Health Connect are **simulated and labelled** in the UI, not integrated. Local (on-device) reminders are implemented with expo-notifications but not yet verified on a device.
- The SRS lists "Web Admin" as a platform; the end-user web app was retired (`be8812d`), so web user-app items are Not Applicable.

**Change since the 2026-10-27 report (commit `81519e7`):** strict completion rose from 50.7% to 60.2% (estimated 64.1% → 72.6%); 28 requirement statuses changed after re-verification (life stages, cycle settings, reminders, Premium locks, profile photo, workout builder, analytics events, unit tests), and 3 web user-app items became Not Applicable.

## B. Executive Summary

| Metric | Count |
|---|---:|
| Requirements inventoried | 214 |
| Not applicable (excluded) | 8 |
| **In-scope requirements** | **206** |
| Completed (verified) | 124 |
| Partially completed | 49 |
| Pending | 22 |
| Blocked | 9 |
| Needs verification | 2 |
| **Strict completion** | **60.2%** |
| **Estimated implementation progress** | **72.6%** |
| Remaining work (strict / estimated) | 39.8% / 27.4% |

**How the percentages are calculated**
- Denominator = in-scope requirements (all statuses except Not Applicable) = 206.
- **Strict completion** = Completed ÷ in-scope = 124 ÷ 206.
- **Estimated implementation progress** = (Completed × 1.0 + Partially Completed × 0.5 + Needs Verification × 0.5) ÷ in-scope = (124 + 49 × 0.5 + 2 × 0.5) ÷ 206. Pending and Blocked count 0.
- The 0.5 weight is a uniform estimate. Partial items vary from "UI only" to "nearly done", so treat the estimated figure as ±5 percentage points.

**Limitations**
- One row = one SRS requirement or bullet group. Rows are not weighted by effort: "PostgreSQL database" and "AI disclaimer" each count once. Effort-weighted remaining work is much larger than the count suggests (see section J).
- "Completed" means the code was inspected and the behaviour exists end-to-end in this repository's architecture (in-memory API), backed by a passing test or by code review. Items that work only against the in-memory store are still Completed for their own requirement; persistence is tracked separately as R-55.3.
- Native iOS/Android behaviour was **not** verified (R-69.9 Blocked). All UI verification ran on the Expo web export and the web app.
- The mobile app was audited feature by feature; the Web Admin was verified through the mobile-admin suite but not page by page, so it is Needs Verification.

## C. Module-wise Progress

| Module | Total Items | Completed | Partial | Pending | Blocked | Needs Verification | Progress % (strict) | Progress % (estimated) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Roles & Navigation (SRS §6–7) | 5 | 5 | 0 | 0 | 0 | 0 | 100.0% | 100.0% |
| Onboarding & Profile (SRS §8–10) | 14 | 11 | 3 | 0 | 0 | 0 | 78.6% | 89.3% |
| Cycle & Period Tracking (SRS §11–13, 18–19) | 16 | 12 | 4 | 0 | 0 | 0 | 75.0% | 87.5% |
| Symptoms, Mood & Daily Check-in (SRS §14–17, 32–33) | 11 | 9 | 1 | 1 | 0 | 0 | 81.8% | 86.4% |
| Fertility & Life Stages (SRS §20–25) | 25 | 20 | 4 | 0 | 1 | 0 | 80.0% | 88.0% |
| Wellness Modules (SRS §26–31) | 20 | 15 | 4 | 1 | 0 | 0 | 75.0% | 85.0% |
| AI Coach, Insights, Reports & Education (SRS §34–38) | 15 | 8 | 6 | 1 | 0 | 0 | 53.3% | 73.3% |
| Notifications (SRS §41) | 4 | 2 | 2 | 0 | 0 | 0 | 50.0% | 75.0% |
| Privacy & Data Rights (SRS §42, 68) | 13 | 10 | 2 | 0 | 1 | 0 | 76.9% | 84.6% |
| Health & Business Integrations (SRS §43–44, 50) | 6 | 0 | 4 | 2 | 0 | 0 | 0.0% | 33.3% |
| Content Management & Medical Review (SRS §39–40) | 7 | 5 | 1 | 0 | 1 | 0 | 71.4% | 78.6% |
| Accounts & Security (SRS §47–48) | 17 | 7 | 2 | 5 | 3 | 0 | 41.2% | 47.1% |
| Subscription, Community & Gamification (SRS §49, 51–52) | 17 | 6 | 5 | 5 | 1 | 0 | 35.3% | 50.0% |
| Analytics & KPIs (SRS §53–54) | 7 | 0 | 6 | 1 | 0 | 0 | 0.0% | 42.9% |
| Architecture, Data & Platform (SRS §45–46, 55–58) | 9 | 2 | 4 | 3 | 0 | 0 | 22.2% | 44.4% |
| Testing (SRS §69–70) | 11 | 8 | 1 | 0 | 2 | 0 | 72.7% | 77.3% |
| Web App & Web Admin (platform coverage) | 2 | 1 | 0 | 0 | 0 | 1 | 50.0% | 75.0% |
| Definition of Done & Release Readiness (SRS §72) | 7 | 3 | 0 | 3 | 0 | 1 | 42.9% | 50.0% |
| **Total** | **206** | **124** | **49** | **22** | **9** | **2** | **60.2%** | **72.6%** |

Not applicable items (8) are listed at the end of section D and are excluded from every total above.

## D. Detailed Feature Checklist

Status values: Completed · Partially Completed · Pending · Blocked · Needs Verification · Not Applicable. Paths are relative to the repository root; `(tabs)/…`, `onboarding.tsx` etc. are under `apps/mobile/src/app/`; `catalog.ts`, `cycle.ts`, `selectors.ts`, `state.ts` are under `packages/shared/src/`.

#### Roles & Navigation (SRS §6–7)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-6.1 | End User role | Track cycle, symptoms, mood, wellness; goals, insights, profile, privacy | Completed | apps/mobile/src/app/(tabs)/*, goals.tsx, privacy.tsx; mobile E2E suites (core-e2e, mobile-modules, content-flows) | — | Covered by passing mobile and web E2E suites |
| R-6.2 | Content Manager role | Create/categorise/schedule content, submit for review | Completed | packages/shared/src/admin/rbac.ts:84; apps/web/src/admin/pages/ContentEditor.tsx; apps/api/test/roles.test.ts | — | Server-enforced; API tests pass |
| R-6.3 | Medical Content Reviewer role | Review, approve/reject, references, safety wording | Completed | rbac.ts:85; apps/api/src/contentWorkflow.ts RULES; content.test.ts | — | Server-enforced; API tests pass |
| R-6.4 | Admin role | Users, subscriptions, content, config, analytics, flags | Completed | rbac.ts (all capabilities); apps/web/src/admin/pages/*; rbac.test.ts | — | Compliance step is an Admin capability (decision D-08 B) |
| R-7.1 | Bottom navigation | Home / Cycle / Wellness / Insights / Profile + quick log | Completed | apps/mobile/src/app/(tabs)/_layout.tsx | — |  |

#### Onboarding & Profile (SRS §8–10)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-8.1 | Welcome / purpose / privacy explainer | Explain app purpose, privacy, wellness-not-diagnosis | Completed | apps/mobile/src/app/onboarding.tsx (step 0); e2e mobile-onboarding.mjs | — | Onboarding order verified by E2E |
| R-8.2 | Goal selection (multi-select) | 10 goals, multi-select | Completed | packages/shared/src/catalog.ts:17-28; onboarding.tsx | — |  |
| R-8.3 | Goals personalise the experience | Selected goals change the app experience | Partially Completed | onboarding.tsx:155 (pregnancy/menopause goals skip cycle step only) | Use goals to adapt home, plan and content |  |
| R-9.1 | Name, date of birth, country | Collected and editable | Completed | onboarding.tsx; profile-edit.tsx | — | DOB is typed text (YYYY-MM-DD) |
| R-9.2 | Profile image | User can set a profile image | Completed | apps/mobile/src/lib/profilePhoto.ts (expo-image-picker); kept in phone secure storage, removed on account deletion | — | Phone-only; not uploaded to the server |
| R-9.3 | Timezone and language | Selectable; app respects them | Partially Completed | preferences.tsx (timezone auto-detected) | Translations; language setting has no effect | No i18n library present |
| R-9.4 | Height, weight, activity (optional) | Optional fields | Completed | onboarding.tsx; profile-edit.tsx | — |  |
| R-10.1 | Last period start | Captured at onboarding | Completed | onboarding.tsx (calendar + "I don't remember"); shared/src/state.ts seeds PeriodLog | — |  |
| R-10.2 | Typical cycle length | Captured, editable | Completed | onboarding.tsx (stepper 15–60, "Not sure") | — | Default pre-filled value 29 |
| R-10.3 | Typical period duration | Captured | Completed | onboarding.tsx | — |  |
| R-10.4 | Regularity | Yes / No / Not sure | Completed | onboarding.tsx | — |  |
| R-10.5 | Tracking history | Past cycles captured | Partially Completed | log-period.tsx "Past dates" (after onboarding only) | Optional history step in onboarding |  |
| R-10.6 | Edit cycle profile (mobile) | Change typical lengths/regularity after onboarding | Completed | cycle-settings.tsx dispatches UPDATE_CYCLE_PROFILE; E2E mobile-modules ("Not sure" saves no length) | — |  |
| R-10.7 | No fixed 28-day assumption | Estimates use user history / typical length | Completed | packages/shared/src/cycle.ts:90-111 | — | Unit test "no fixed 28-day assumption" (packages/shared/test/cycle.test.ts) |

#### Cycle & Period Tracking (SRS §11–13, 18–19)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-11.1 | Cycle day | Shown on dashboard | Completed | (tabs)/cycle.tsx; (tabs)/home.tsx | — |  |
| R-11.2 | Estimated phase | Shown and labelled as estimate | Completed | apps/mobile/src/lib/cycleText.ts; catalog.ts phase labels | — |  |
| R-11.3 | Next period estimate | "~N days*" | Completed | cycle.tsx; cycleText.ts | — | Late-period handling present |
| R-11.4 | Average cycle / period length | Shown | Completed | cycle.tsx (Avg cycle, Avg period with *) | — | Not on home dial |
| R-11.5 | Predictions labelled as estimates | Asterisks + estimate note | Completed | EstimateNote component; COPY in shared/src/copy.ts | — |  |
| R-12.1 | Phase education | Explain 4 phases | Completed | catalog.ts:142-171; phase sheet in cycle.tsx | — |  |
| R-12.2 | Estimated vs user-entered vs validated | Distinguish data provenance | Partially Completed | shared/src/types.ts Provenance; cycle.ts lengthProvenance | 'validated' never used; no per-value badge |  |
| R-12.3 | Ovulation never shown as confirmed | Calendar cannot confirm ovulation | Completed | COPY.ovulationNotConfirmed used in cycle, log-period, fertility screens | — |  |
| R-13.1 | Period logging | Start / end / past dates, edit, delete, validation | Completed | log-period.tsx; validatePeriodRange (cycle.ts:216); E2E logs a period | — |  |
| R-13.2 | Flow levels | Light / Medium / Heavy / Very heavy | Completed | catalog.ts:30-35; log-period.tsx | — |  |
| R-13.3 | Per-day flow | Flow per period day | Partially Completed | types support flowByDay; UI captures first/end day only | Per-day flow UI |  |
| R-13.4 | Period symptoms | 9 listed symptoms with severity | Partially Completed | Severity now selectable when logging a period (log-period.tsx; E2E mobile-modules) | "Digestive changes" still listed as "Appetite changes" |  |
| R-18.1 | Cycle history table | Per cycle: month, length, period | Completed | cycle-history.tsx | — |  |
| R-18.2 | History charts | Cycle length, period duration, symptom and mood trends | Completed | cycle-history.tsx charts | — | Mood trend is 30 days, not per cycle |
| R-19.1 | Irregular cycle detection | Detect recent variation vs previous cycles | Partially Completed | cycle.ts:120-121 (fixed 7-day spread, ≥3 cycles); cycle-history.tsx:19 uses ±4 days | Compare recent vs previous; single threshold; no data-backed message without data | Thresholds are placeholders pending decision D-09 |
| R-19.2 | Non-diagnostic wording | No condition names; suggest professional | Completed | COPY.irregular, COPY.concern | — |  |

#### Symptoms, Mood & Daily Check-in (SRS §14–17, 32–33)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-14.1 | Symptom framework | Categories, severity, notes, history | Completed | catalog.ts:43-80; symptoms.tsx; E2E logs a symptom | — | Past-date symptoms with notes (E2E mobile-modules) |
| R-14.2 | Symptom lists | Physical, digestive, skin, emotional, energy | Completed | catalog.ts:63-77 | — |  |
| R-15.1 | Custom symptoms | Create, archive, log custom symptom | Completed | symptom-new.tsx; ADD_/ARCHIVE_CUSTOM_SYMPTOM in state.ts | — |  |
| R-16.1 | Mood levels | 5 levels | Completed | catalog.ts:95-101; mood.tsx | — |  |
| R-16.2 | Optional stress / anxiety / energy | Saved only when the user sets them | Partially Completed | Stress and anxiety are now opt-in toggles (mood.tsx:29-30); energy is still saved with default 6; check-in saves stress default 4 | Make energy and check-in stress opt-in |  |
| R-17.1 | Energy–cycle pattern | Observed-pattern insight | Completed | selectors.ts rule R5 pre_period_energy | — |  |
| R-17.2 | Mood / symptom vs phase pattern | Correlate mood and symptoms with phase | Pending | Only energy correlated (R5) | Mood and symptom correlation rules |  |
| R-32.1 | Daily check-in | Mood, energy, stress, sleep, symptoms | Completed | check-in.tsx | — |  |
| R-32.2 | Check-in under 30 seconds | Single quick screen | Completed | check-in.tsx (elapsed time shown) | — |  |
| R-33.1 | Plan generated after check-in | Rules-based daily plan | Completed | SAVE_CHECKIN rebuilds plan (state.ts); shared/src/plan.ts | — |  |
| R-33.2 | Plan items | Water, walk, breathing, breakfast, sleep | Completed | plan.ts:8-62; plan.tsx | — |  |

#### Fertility & Life Stages (SRS §20–25)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-20.1 | Fertile-window estimate | Estimated and labelled | Completed | cycle.ts:169-170; fertility.tsx | — |  |
| R-20.2 | Cycle calendar | Logged vs estimated days | Completed | components/cycle/Calendar.tsx; calendar.tsx; classifyDay | — |  |
| R-20.3 | Mucus / BBT / ovulation-test logging | User-entered fertility signs | Completed | fertility.tsx; LOG_FERTILITY (state.ts) | — | Today only (no backdating) |
| R-20.4 | Not-contraception warning | Clear warning | Completed | COPY.notContraception; fertility.tsx | — |  |
| R-20.5 | Medical/legal review of fertility module | Reviewed before release | Blocked | BackendNote in fertility.tsx; screen marked "Phase 3 preview" | Clinical + legal review | Needs external reviewers |
| R-21.1 | Ovulation tracking fields | Test result, BBT, mucus | Completed | fertility.tsx; FertilityLog type | — |  |
| R-21.2 | Trends without confirmation claims | Trends of BBT, mucus, tests | Completed | fertility.tsx trend charts; BBT range follows the data (fixed range only when nothing is logged) | — |  |
| R-22.1 | Select pregnancy mode | User can switch to pregnancy | Completed | life-stage/[mode].tsx SET_MODE; E2E mobile-modules | — |  |
| R-22.2 | App adapts to pregnancy wellness | Home, content, reminders change | Completed | home.tsx / cycle tab read the stage (pregnancyEstimate); pregnancy mode pauses cycle estimates (E2E mobile-modules) | — |  |
| R-22.3 | Pregnancy week | Tracked and saved | Completed | shared/src/lifeStage.ts pregnancyEstimate; 4 unit tests; E2E mobile-modules (week, due date, corrected date) | — | Decision D-21 |
| R-22.4 | Pregnancy education, hydration, activity, nutrition | Pregnancy-specific support | Partially Completed | Links to generic article/hydration/nutrition | Pregnancy-specific content and tracking |  |
| R-22.5 | Appointment reminders | Create and receive reminders | Completed | Appointments become dated reminders (reminderPlan unit test; E2E mobile-modules) | — | Delivery on a real device not verified (R-69.9) |
| R-22.6 | Questions for provider | Saved list | Completed | Questions saved in phone secure storage (lib/deviceData.ts) | — |  |
| R-23.1 | "Does not replace prenatal care" | Safety copy | Completed | COPY.pregnancy shown in [mode].tsx | — |  |
| R-23.2 | Emergency → medical care | Route emergencies to care | Partially Completed | Static emergency card (COPY.emergency) | Actionable emergency routing |  |
| R-24.1 | Perimenopause cycle tracking | Cycle features keep working | Completed | Normal cycle features in any mode | — |  |
| R-24.2 | Hot flash / night sweats logging | Logged and charted | Completed | Hot flashes and night sweats charted from real logs (unit test "symptom series"); hard-coded array removed | — |  |
| R-24.3 | Perimenopause sleep / mood / energy / exercise / nutrition | Stage-specific views | Partially Completed | Link tiles to generic screens | Stage-specific views |  |
| R-24.4 | Weight tracking (perimenopause) | Weight over time | Completed | Weight log in phone secure storage (lib/deviceData.ts) | — | Phone-only data |
| R-24.5 | Perimenopause dashboard % | Sleep / Energy / Mood / Activity % | Completed | Share of target over 7 days (D-36 decided); 2 unit tests; nothing logged → no percentages | — |  |
| R-25.1 | Menopause symptoms | Symptom tracking and chart | Completed | Symptom charts from real logs | — |  |
| R-25.2 | Menopause sleep / activity / strength / nutrition / mood | Stage-specific support | Partially Completed | Link tiles; bone-strength workout; article | Stage-specific views |  |
| R-25.3 | Weight tracking (menopause) | Weight over time | Completed | Weight log (same as R-24.4) | — |  |
| R-25.4 | Menopause wellness goals | Goals / routine saved | Completed | Routine saved | — |  |
| R-25.5 | Lifestyle / provider-conversation focus | Disclaimer + provider questions | Completed | [mode].tsx disclaimer | — | Provider questions not saved (R-22.6) |

#### Wellness Modules (SRS §26–31)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-26.1 | Fitness categories | 8 categories | Completed | catalog.ts:113; shared/src/mock/workouts.ts; fitness.tsx | — | E2E: workout session logs |
| R-26.2 | Fitness integrated with cycle | Cycle-aware fitness | Partially Completed | Wellness side done (insights/report); no cycle input in fitness | Cycle-aware suggestions without hormonal prescriptions |  |
| R-26.3 | No prescriptions from assumed hormones | Safety rule | Completed | workout/personalize.tsx ignores phase | — |  |
| R-27.1 | Workout builder inputs | Goal, level, duration, equipment, location, preference | Completed | workout/personalize.tsx:32-37 | — |  |
| R-27.2 | Personalised workout output | Generated plan | Completed | shared/src/workoutBuilder.ts builds blocks that add up to the chosen time (unit test) | — |  |
| R-27.3 | 20-minute home workout example | Example routine | Completed | mock/workouts.ts w_home_20; player | — |  |
| R-28.1 | Nutrition dashboard + meal logging | Calories, macros, fibre, water | Completed | nutrition.tsx; selectors nutritionTotals | — | Targets fixed, not editable |
| R-28.2 | Future nutrition features | Meal planning, recipes, grocery, Indian food DB, vegetarian plans | Partially Completed | meal-ideas.tsx + shared/src/meals.ts: vegetarian filter, varied plan, merged grocery list (unit test) | Recipes, Indian food database, pregnancy/menopause nutrition education | SRS: future |
| R-28.3 | No individualised medical claims | Disclaimer | Completed | nutrition.tsx disclaimer | — |  |
| R-29.1 | Hydration target | Editable daily target | Completed | hydration.tsx SET_WATER_TARGET | — |  |
| R-29.2 | Water logging | Quick + custom amounts | Completed | hydration.tsx; E2E logs and removes water on server | — |  |
| R-29.3 | Hydration reminders | Reminders delivered | Partially Completed | Local reminders scheduled with expo-notifications (lib/localReminders.ts; reminderPlan unit tests) | Verify delivery on a device (R-69.9) |  |
| R-29.4 | Hydration progress | Progress + 7-day chart | Completed | hydration.tsx | — |  |
| R-29.5 | Hydration streak | Streak | Completed | selectors waterStreak | — |  |
| R-30.1 | Sleep logging | Bedtime, wake, duration, quality, waking | Completed | sleep.tsx LOG_SLEEP | — |  |
| R-30.2 | Sleep from Apple Health / Health Connect / wearables | Imported sleep | Pending | source always "manual" | Depends on R-43.x | SRS: future |
| R-31.1 | Wellness Score /100 | Computed and shown | Completed | selectors.ts wellnessScore; home + insights | — |  |
| R-31.2 | Score components and weights | Activity 20, Sleep 20, Hydration 10, Nutrition 20, Habits 15, Mood 15 | Completed | state.ts DEFAULT_WEIGHTS | — | Sub-formulas marked as demo placeholders in code |
| R-31.3 | Configurable weights end-to-end | Admin change reaches users | Partially Completed | Admin Config.tsx (local); API refuses SET_WEIGHTS (userActions.ts:40) | Server-side config consumed by apps |  |
| R-31.4 | Non-medical framing | Engagement metric copy | Completed | shared/src/copy.ts | — |  |

#### AI Coach, Insights, Reports & Education (SRS §34–38)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-34.1 | AI coach answers wellness questions | Real AI answers | Partially Completed | shared/src/coach.ts keyword rules; coach.tsx labelled "Simulated" | AI provider integration, safety evals | E2E covers simulated coach |
| R-34.2 | Coach declines diagnosis / medication | Safe refusals | Partially Completed | coach.ts keyword lists | Robust (non-substring) safety layer |  |
| R-34.3 | Emergency redirect | Redirect to emergency care | Partially Completed | coach.ts emergency keywords → red bubble text | Call/crisis-line action; robust detection |  |
| R-34.4 | AI disclaimer | Shown | Completed | COPY.aiDisclaimer in coach.tsx | — |  |
| R-35.1 | AI uses permitted user context | Personalised answers | Partially Completed | Coach adds personal notes from the user's logs only with AI-personalisation consent (unit test) | Real AI provider | Rules-based |
| R-35.2 | AI-generated suggestions / summaries | Daily suggestions, weekly summary, habits | Partially Completed | Rules-based plan + weekly summary | AI layer; habit recommendations |  |
| R-35.3 | Consent controls personalisation | Consent gates AI use | Completed | Consent gates personal notes (shared coach unit test); AI data screen (ai-data.tsx) | — |  |
| R-36.1 | Weekly report metrics | Cycle day, steps, workouts, sleep, hydration %, mood | Completed | selectors.ts weeklySummary; WeeklyReport.tsx | — |  |
| R-36.2 | Pattern + suggested focus | Correlational wording | Completed | selectors.ts R2; WeeklyReport.tsx | — |  |
| R-36.3 | AI-written weekly report | AI narrative | Partially Completed | Labelled "Rules-based summary" | AI narrative |  |
| R-37.1 | Rules engine | Deterministic insights, dismissible | Completed | selectors.ts computeInsights R1–R6 | — | No unit tests |
| R-37.2 | Example rule (sleep + low energy) | Rule R1 | Completed | selectors.ts:207-226 | — |  |
| R-37.3 | AI personalisation stage | data → rules → insights → AI | Pending | No AI stage | AI stage |  |
| R-38.1 | Education categories | Cycle, fitness, nutrition, mental, life stages | Completed | catalog.ts CONTENT_CATEGORIES; mock/articles.ts | — | Sample content, not medically reviewed (R-40.3) |
| R-38.2 | Library browsing | Filters, reader, bookmarks, FAQ | Completed | learn/index.tsx, learn/[id].tsx, learn/faq.tsx; E2E content-flows | — |  |

#### Notifications (SRS §41)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-41.1 | Configurable notification types | Per-type on/off and time | Completed | notification-settings.tsx; catalog.ts:173-179 | — |  |
| R-41.2 | Notification delivery | Push / local notifications | Partially Completed | Local notifications via expo-notifications (lib/localReminders.ts); no push (no push token) | Push notifications; device verification |  |
| R-41.3 | Data-driven notifications | e.g. behind hydration goal | Partially Completed | reminderPlan(): period reminder 2 days before the estimate, weekly report, appointments (unit tests) | More data-driven triggers (e.g. behind hydration goal); device verification |  |
| R-41.4 | Discreet mode, quiet hours, custom reminders | Privacy-aware settings | Completed | notification-settings.tsx | — |  |

#### Privacy & Data Rights (SRS §42, 68)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-42.1 | Privacy & Data screen | Dedicated centre | Completed | apps/mobile/src/app/privacy.tsx | — |  |
| R-42.2 | Data collected view | Live record counts | Completed | privacy.tsx | — |  |
| R-42.3 | Consent toggles | AI, analytics, notifications, sharing | Completed | privacy.tsx; versioned Consent type | — |  |
| R-42.4 | Export data | Download own data | Completed | GET /v1/me/export (apps/api/src/routes/me.ts); E2E content-flows; ownership.test.ts | — |  |
| R-42.5 | Delete account | Password + confirmation, server delete | Completed | delete-account.tsx; DELETE /v1/me; E2E content-flows | — |  |
| R-42.6 | Disconnect health integration | Revoke connection | Partially Completed | TOGGLE_CONNECTION (simulated) | Real integrations (R-43.x) |  |
| R-42.7 | Withdraw optional consent | Per consent | Completed | privacy.tsx; state.ts:497-502 | — |  |
| R-68.1 | Explicit, versioned consent | Consent before data | Completed | ownership.test.ts:103; onboarding consent before cycle step | — |  |
| R-68.2 | Data minimisation | Admin sees no health data | Completed | rbac.test.ts:138 (masked emails, no health data) | — |  |
| R-68.3 | Encryption in transit and at rest | TLS + at-rest encryption | Partially Completed | HSTS in production only (http.ts:173); README lists no at-rest encryption | TLS deployment; encrypted storage |  |
| R-68.4 | Owner-only access | Users access only own data | Completed | /v1/me routes; ownership.test.ts; E2E isolation between two users | — |  |
| R-68.5 | Auditability | Server audit log | Completed | Server-written audit; security.test.ts:99 | — |  |
| R-68.6 | AI data usage policy | Clear policy | Blocked | One consent line only; README D-12 open | Write and approve policy | Blocked by open decision D-12 |

#### Health & Business Integrations (SRS §43–44, 50)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-43.1 | Apple HealthKit | Steps, distance, HR, sleep, weight, workouts | Partially Completed | integrations.tsx connect toggle (simulated); no HealthKit code | Native HealthKit module + import | Needs native build (R-72.5) |
| R-43.2 | Android Health Connect | Same data types | Partially Completed | integrations.tsx toggle (simulated) | Native Health Connect module + import | Needs native build (R-72.5) |
| R-43.3 | Minimal permissions | Request only required types | Partially Completed | Consent sheet; per-type toggles are screen state only | Persist choices; OS permission requests |  |
| R-44.1 | Sync pipeline | Connector → normalisation → health data → engine | Pending | Only a "source" field on types | Connector + normalisation layer |  |
| R-50.1 | HealthX Business connection | Optional employer link | Pending | Static "Not connected" row (web); disabled flag | Integration | SRS: future |
| R-50.2 | Employer sees aggregate only | No individual cycle data | Partially Completed | COPY.employerPrivacy; admin analytics aggregate-only | Enforce in integration |  |

#### Content Management & Medical Review (SRS §39–40)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-39.1 | Content types | Article, Video, Infographic, FAQ, Podcast, Program | Completed | shared/src/types.ts:47; contentWorkflow.ts:20 | — |  |
| R-39.2 | Content fields | Title … status, author, reviewer, references, dates | Completed | admin/data.ts:87-117; ContentEditor.tsx | — |  |
| R-39.3 | Content statuses | Draft, Review, Approved, Published, Archived | Completed | admin/data.ts:38-47 (extended with medical/compliance review) | — |  |
| R-39.4 | Media upload | Upload media files | Partially Completed | ContentEditor.tsx "Upload simulated"; metadata only | File storage + scanning |  |
| R-40.1 | Review workflow | Writer → Medical → Compliance → Published | Completed | contentWorkflow.ts RULES; content.test.ts; regressions.test.ts | — | Separation of duties enforced |
| R-40.2 | Review metadata kept | Reviewer, date, references, version, updated | Completed | ContentItem versions[]/history[]; learn/[id].tsx | — |  |
| R-40.3 | Medically reviewed content | Real reviewed articles | Blocked | Seed articles flagged as not medically reviewed | Clinician review of content | Needs medical reviewers |

#### Accounts & Security (SRS §47–48)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-47.1 | TLS | Encrypted transport | Partially Completed | HSTS header in production only | Deploy behind TLS |  |
| R-47.2 | Encryption at rest | Encrypted storage | Pending | apps/api/README.md "Not included" | With database (R-55.3) |  |
| R-47.3 | Secure authentication | Hashing, rotating tokens | Completed | apps/api/src/crypto.ts (scrypt), routes/auth.ts; auth.test.ts | — |  |
| R-47.4 | OAuth / OIDC | Standard provider login | Pending | oauth/:provider returns 501 | Provider integration |  |
| R-47.5 | MFA for admin | TOTP for staff | Completed | routes/auth.ts:114; unit.test.ts; regressions.test.ts | — | No backup codes |
| R-47.6 | RBAC | Four roles server-side | Completed | rbac.ts; adminPolicy.ts; rbac.test.ts; roles.test.ts | — |  |
| R-47.7 | Audit logs | Server-written, no health values | Completed | security.test.ts:99 | — |  |
| R-47.8 | Rate limiting | Login and API limits | Completed | store.ts RateLimiter; security.test.ts:87 | — | Single instance (no Redis) |
| R-47.9 | Secure token storage | Secure store / HttpOnly cookie | Completed | apps/mobile/src/lib/api.ts (expo-secure-store); web HttpOnly SameSite cookie | — |  |
| R-47.10 | Secure file handling | Validated, scanned uploads | Pending | No real uploads | With R-39.4 |  |
| R-47.11 | Database backups | Automated backups | Blocked | No database exists | Database first (R-55.3) | Blocked by R-55.3 |
| R-47.12 | Secrets management | Managed secrets | Pending | config.ts: no secrets required yet; MFA secrets in memory | Secret store for deployment |  |
| R-48.1 | Email / password | Sign up, sign in, reset | Completed | API + web + mobile; auth.test.ts; E2E | — |  |
| R-48.2 | Apple Sign-In | Working provider login | Blocked | Button present (SocialButtons.tsx); server 501 | Apple developer credentials, then integration | Blocked by credentials |
| R-48.3 | Google Sign-In | Working provider login | Blocked | Button present; server 501 | Google OAuth credentials, then integration | Blocked by credentials |
| R-48.4 | Magic link | Email link sign-in | Partially Completed | Works via dev outbox only (auth.test.ts:154; E2E mobile-connection) | Real email delivery |  |
| R-48.5 | Enterprise SSO / Passkeys | Future auth methods | Pending | Not present | Future phase | SRS: future |

#### Subscription, Community & Gamification (SRS §49, 51–52)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-49.1 | Plans screen + trial | Free vs Premium; trial | Completed | premium.tsx; me.ts trial/cancel; E2E content-flows (trial → active → free) | — | Prices labelled as examples |
| R-49.2 | Premium feature gating | Premium features locked for Free | Partially Completed | components/PremiumGate.tsx locks features on Free; trial unlocks the coach (E2E mobile-modules) | Server-side entitlement checks (lock is UI only) |  |
| R-49.3 | Payments / store billing | Real purchases, restore | Blocked | "Restore purchases" stub; README: no payments | App Store / Play billing accounts, then integration | Blocked by store accounts |
| R-49.4 | Family plan | Family subscription | Pending | Marketing card on web only | Implement plan |  |
| R-49.5 | Enterprise plan | Future plan | Pending | Not present | Future phase | SRS: future |
| R-51.1 | Community groups | Fitness, Nutrition, Menopause, Running, Yoga, Wellness | Partially Completed | catalog.ts:219 has "Sleep" instead of "Wellness" | Fix list; real feed | Phase-4 preview |
| R-51.2 | Moderation | Moderated posts | Partially Completed | Copy only | Moderation service |  |
| R-51.3 | Report content / block user | User safety tools | Completed | community.tsx REPORT_POST, BLOCK_AUTHOR (local) | — | Local only |
| R-51.4 | Community privacy controls | Visibility / anonymity | Partially Completed | Advice copy only | Settings |  |
| R-51.5 | Medical-misinformation controls | Flag/filter misinformation | Pending | Banner only | Filtering / flagging |  |
| R-51.6 | Anecdotes not presented as advice | Banner | Completed | community.tsx banner | — |  |
| R-52.1 | Streaks | Check-in and water streaks | Completed | selectors.ts:98-108; achievements.tsx | — |  |
| R-52.2 | Badges | Five SRS badges awarded | Partially Completed | Static seed data (mock/generate.ts:315-321); nothing awards them | Award logic |  |
| R-52.3 | Goals | Create and track goals | Completed | goals.tsx; goalProgress; E2E creates a goal | — |  |
| R-52.4 | Milestones | Milestones | Pending | Not present | Implement |  |
| R-52.5 | Wellness points | Points | Pending | Not present | Implement |  |
| R-52.6 | No gamification of reproductive events | Safety rule | Completed | achievements.tsx note; no cycle badges | — |  |

#### Analytics & KPIs (SRS §53–54)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-53.1 | Product analytics events | 15 events emitted | Partially Completed | 7 of 15 events emitted (lib/track.ts: app_opened, screen_viewed, content_opened, video_played, workout_started, weekly_report_viewed, ai_question_asked); shown in Web Admin App activity | Remaining 8 events |  |
| R-54.1 | Acquisition KPIs | New users, conversion, source | Partially Completed | Analytics.tsx badged "Simulated data" | Real data source (R-53.1) |  |
| R-54.2 | Activation KPIs | Onboarding, first cycle, first check-in | Partially Completed | Analytics.tsx (hard-coded values) | Real data |  |
| R-54.3 | Engagement KPIs | DAU/WAU/MAU, check-ins | Partially Completed | Analytics.tsx (simulated) | Real data |  |
| R-54.4 | Retention KPIs | 7/30/90-day | Partially Completed | Analytics.tsx RETENTION_COHORTS (simulated) | Real data |  |
| R-54.5 | Monetisation KPIs | Trial/premium conversion, MRR, churn | Partially Completed | Analytics.tsx, Subscriptions.tsx (simulated) | Real data |  |
| R-54.6 | LTV | Lifetime value KPI | Pending | Not present | Implement |  |

#### Architecture, Data & Platform (SRS §45–46, 55–58)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-45.1 | Data model entities | User … AuditLog | Partially Completed | TypeScript types in shared/src/types.ts; CycleDay, WellnessProfile, Subscription not separate entities | Persisted schema | In-memory by design |
| R-46.1 | Cycle data model fields | Cycle/Period/SymptomLog with ids, cycle_id, source, timestamps | Partially Completed | Cycles derived, not stored; no cycle_id/user_id/source/timestamps | Persisted model |  |
| R-55.1 | Mobile technology: React Native | SRS header | Completed | apps/mobile: Expo 58, React Native 0.88, TypeScript | — | Decision D-01 still open in README |
| R-55.2 | Backend: Node.js / NestJS | NestJS service | Partially Completed | Node.js + TypeScript, no framework (apps/api) | NestJS modules (§56) | Actions annotated with future NestJS modules |
| R-55.3 | Database: PostgreSQL | Persistent DB | Pending | In-memory store (apps/api/src/store.ts); no DB dependency | Schema, migrations, persistence | No database "by request" (README) |
| R-55.4 | Redis / S3 | Cache and object storage | Pending | Not present | Infrastructure |  |
| R-55.5 | Cloud: AWS deployment | Deployed environment | Pending | No deployment configuration | Infrastructure as code + deploy |  |
| R-55.6 | Flutter architecture (§57) | lib/core, features, shared | Not Applicable | Conflicts with SRS header (React Native); README decision D-01 | — | Excluded from denominator |
| R-58.1 | Design system components | Calendar, ring, score, charts, cards | Completed | docs/design/healthx-design-system.md; shared tokens; components on web + mobile | — |  |
| R-58.2 | Reusable components across products | Shared component library | Partially Completed | Tokens shared; components duplicated per platform | Shared component package |  |

#### Testing (SRS §69–70)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-69.1 | Unit tests: cycle and date calculations | Automated | Completed | packages/shared/test/cycle.test.ts (dates: month/year boundaries, leap years, DST); shared tests 38/38 | — |  |
| R-69.2 | Unit tests: wellness score, streaks, goals | Automated | Completed | packages/shared/test/wellness.test.ts (score, weights, streaks, goals) | — |  |
| R-69.3 | Subscription logic tests | Automated | Completed | Premium logic unit test + server trial tests | — | Billing tests once billing exists |
| R-69.4 | API integration tests | Automated | Completed | apps/api/test: 111/111 passed on 2026-10-28 | — |  |
| R-69.5 | Authentication tests | Automated | Completed | auth.test.ts, regressions.test.ts (passed) | — |  |
| R-69.6 | HealthKit / Health Connect integration tests | Automated | Blocked | No integration exists | After R-43.1/R-43.2 | Blocked by R-43.x |
| R-69.7 | Notification integration tests | Automated | Partially Completed | reminderPlan and consent unit tests | Device-level notification tests (blocked by R-69.9) |  |
| R-69.8 | UI tests (onboarding, logging, coach, subscription) | Automated | Completed | site-nav 8/8, core-e2e 14/14, mobile-onboarding OK, content-flows 19/19, mobile-modules 13/13, mobile-connection 8/8, mobile-admin 39/39 (2026-10-28) | — | Expo web export, not native |
| R-69.9 | Native device testing (iOS/Android) | App runs on devices | Blocked | Emulator needs VT-x (disabled in BIOS); phone Expo Go 57 vs SDK 58 | Enable VT-x or update Expo Go; then device test | Confirmed 2026-10-27 |
| R-69.10 | Security tests | AuthN/AuthZ/isolation/exposure | Completed | security.test.ts, rbac.test.ts, ownership.test.ts, regressions.test.ts (passed) | — | No file-upload security tests (no uploads) |
| R-70.1 | Critical cycle-engine test cases | 13 cases incl. irregular, leap year, DST, edits | Completed | cycle.test.ts: regular, irregular, short/long, missing data, missed period, multiple, edited/deleted, historical, leap year, DST, month boundaries | — |  |

#### Web App & Web Admin (platform coverage)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-W.1 | Public website | Home, features, pricing, FAQ, contact | Completed | apps/web/src/site; site-nav.mjs 8/8; production build passed | — |  |
| R-W.2 | Web user app core journey | Signup → onboarding → logging → coach → export | Not Applicable | End-user web app retired in be8812d; routes redirect to "Get the app" | — | Product decision; excluded from totals |
| R-W.3 | Web user app parity for every module | All modules on web | Not Applicable | End-user web app retired in be8812d | — | Excluded from totals |
| R-W.4 | Web Admin pages (26) | All admin pages work per role | Needs Verification | mobile-admin.mjs 39/39 covers App activity, timeline, audited health-records access, daily plans; admin-run suites not run | Run admin-run.mjs suites for all pages |  |
| R-W.5 | Offline demo mode | Works without API | Not Applicable | Web offline demo retired with the web app; mobile offline demo verified (mobile-connection 8/8) | — | Excluded from totals |

#### Definition of Done & Release Readiness (SRS §72)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-72.1 | Loading, empty and error states | Handled | Completed | States.tsx, ConnectionStates.tsx; E2E mobile-connection | — |  |
| R-72.2 | Documentation | READMEs and design docs | Completed | README.md, apps/*/README.md, docs/design, docs/reports | — |  |
| R-72.3 | Security review | Documented review | Needs Verification | docs/reports/ (incl. the security review) was removed from the tree in be8812d; security regression tests remain (API 111/111) | Restore or re-issue the security review document |  |
| R-72.4 | Localisation readiness | i18n-ready strings | Pending | No i18n library; strings hard-coded | Extract strings, add i18n |  |
| R-72.5 | Mobile store build | Signed iOS/Android builds | Pending | No eas.json / native project; no JDK on this machine | EAS or native build setup |  |
| R-72.6 | Web production build | Builds successfully | Completed | npm --prefix apps/web run build passed (2026-10-27) | — |  |
| R-72.7 | Continuous integration | Automated checks on push | Pending | No .github/workflows or other CI config | CI pipeline running typecheck, lint, tests | Not explicit in SRS; required for release |

#### Out of Scope (excluded from totals)

| ID | Feature | Expected behaviour | Status | Evidence | Remaining work | Verification notes |
|---|---|---|---|---|---|---|
| R-59 | R&D modules (§59) | Research directions | Not Applicable | Strategy section, not a deliverable feature | — |  |
| R-60 | R&D product opportunities (§60) | Future products | Not Applicable | Strategy section | — |  |
| R-71 | Recommended development team (§71) | Staffing | Not Applicable | Organisational | — |  |
| R-73 | Final product architecture (§73) | Vision diagram | Not Applicable | Covered by §55 items | — |  |

## E. Completed Work

Only items with code evidence plus a passing test or a code-level review of the full behaviour.

**Roles & Navigation (SRS §6–7)**
- **R-6.1 End User role**: apps/mobile/src/app/(tabs)/*, goals.tsx, privacy.tsx; mobile E2E suites (core-e2e, mobile-modules, content-flows)
- **R-6.2 Content Manager role**: packages/shared/src/admin/rbac.ts:84; apps/web/src/admin/pages/ContentEditor.tsx; apps/api/test/roles.test.ts
- **R-6.3 Medical Content Reviewer role**: rbac.ts:85; apps/api/src/contentWorkflow.ts RULES; content.test.ts
- **R-6.4 Admin role**: rbac.ts (all capabilities); apps/web/src/admin/pages/*; rbac.test.ts
- **R-7.1 Bottom navigation**: apps/mobile/src/app/(tabs)/_layout.tsx

**Onboarding & Profile (SRS §8–10)**
- **R-8.1 Welcome / purpose / privacy explainer**: apps/mobile/src/app/onboarding.tsx (step 0); e2e mobile-onboarding.mjs
- **R-8.2 Goal selection (multi-select)**: packages/shared/src/catalog.ts:17-28; onboarding.tsx
- **R-9.1 Name, date of birth, country**: onboarding.tsx; profile-edit.tsx
- **R-9.2 Profile image**: apps/mobile/src/lib/profilePhoto.ts (expo-image-picker); kept in phone secure storage, removed on account deletion
- **R-9.4 Height, weight, activity (optional)**: onboarding.tsx; profile-edit.tsx
- **R-10.1 Last period start**: onboarding.tsx (calendar + "I don't remember"); shared/src/state.ts seeds PeriodLog
- **R-10.2 Typical cycle length**: onboarding.tsx (stepper 15–60, "Not sure")
- **R-10.3 Typical period duration**: onboarding.tsx
- **R-10.4 Regularity**: onboarding.tsx
- **R-10.6 Edit cycle profile (mobile)**: cycle-settings.tsx dispatches UPDATE_CYCLE_PROFILE; E2E mobile-modules ("Not sure" saves no length)
- **R-10.7 No fixed 28-day assumption**: packages/shared/src/cycle.ts:90-111

**Cycle & Period Tracking (SRS §11–13, 18–19)**
- **R-11.1 Cycle day**: (tabs)/cycle.tsx; (tabs)/home.tsx
- **R-11.2 Estimated phase**: apps/mobile/src/lib/cycleText.ts; catalog.ts phase labels
- **R-11.3 Next period estimate**: cycle.tsx; cycleText.ts
- **R-11.4 Average cycle / period length**: cycle.tsx (Avg cycle, Avg period with *)
- **R-11.5 Predictions labelled as estimates**: EstimateNote component; COPY in shared/src/copy.ts
- **R-12.1 Phase education**: catalog.ts:142-171; phase sheet in cycle.tsx
- **R-12.3 Ovulation never shown as confirmed**: COPY.ovulationNotConfirmed used in cycle, log-period, fertility screens
- **R-13.1 Period logging**: log-period.tsx; validatePeriodRange (cycle.ts:216); E2E logs a period
- **R-13.2 Flow levels**: catalog.ts:30-35; log-period.tsx
- **R-18.1 Cycle history table**: cycle-history.tsx
- **R-18.2 History charts**: cycle-history.tsx charts
- **R-19.2 Non-diagnostic wording**: COPY.irregular, COPY.concern

**Symptoms, Mood & Daily Check-in (SRS §14–17, 32–33)**
- **R-14.1 Symptom framework**: catalog.ts:43-80; symptoms.tsx; E2E logs a symptom
- **R-14.2 Symptom lists**: catalog.ts:63-77
- **R-15.1 Custom symptoms**: symptom-new.tsx; ADD_/ARCHIVE_CUSTOM_SYMPTOM in state.ts
- **R-16.1 Mood levels**: catalog.ts:95-101; mood.tsx
- **R-17.1 Energy–cycle pattern**: selectors.ts rule R5 pre_period_energy
- **R-32.1 Daily check-in**: check-in.tsx
- **R-32.2 Check-in under 30 seconds**: check-in.tsx (elapsed time shown)
- **R-33.1 Plan generated after check-in**: SAVE_CHECKIN rebuilds plan (state.ts); shared/src/plan.ts
- **R-33.2 Plan items**: plan.ts:8-62; plan.tsx

**Fertility & Life Stages (SRS §20–25)**
- **R-20.1 Fertile-window estimate**: cycle.ts:169-170; fertility.tsx
- **R-20.2 Cycle calendar**: components/cycle/Calendar.tsx; calendar.tsx; classifyDay
- **R-20.3 Mucus / BBT / ovulation-test logging**: fertility.tsx; LOG_FERTILITY (state.ts)
- **R-20.4 Not-contraception warning**: COPY.notContraception; fertility.tsx
- **R-21.1 Ovulation tracking fields**: fertility.tsx; FertilityLog type
- **R-21.2 Trends without confirmation claims**: fertility.tsx trend charts; BBT range follows the data (fixed range only when nothing is logged)
- **R-22.1 Select pregnancy mode**: life-stage/[mode].tsx SET_MODE; E2E mobile-modules
- **R-22.2 App adapts to pregnancy wellness**: home.tsx / cycle tab read the stage (pregnancyEstimate); pregnancy mode pauses cycle estimates (E2E mobile-modules)
- **R-22.3 Pregnancy week**: shared/src/lifeStage.ts pregnancyEstimate; 4 unit tests; E2E mobile-modules (week, due date, corrected date)
- **R-22.5 Appointment reminders**: Appointments become dated reminders (reminderPlan unit test; E2E mobile-modules)
- **R-22.6 Questions for provider**: Questions saved in phone secure storage (lib/deviceData.ts)
- **R-23.1 "Does not replace prenatal care"**: COPY.pregnancy shown in [mode].tsx
- **R-24.1 Perimenopause cycle tracking**: Normal cycle features in any mode
- **R-24.2 Hot flash / night sweats logging**: Hot flashes and night sweats charted from real logs (unit test "symptom series"); hard-coded array removed
- **R-24.4 Weight tracking (perimenopause)**: Weight log in phone secure storage (lib/deviceData.ts)
- **R-24.5 Perimenopause dashboard %**: Share of target over 7 days (D-36 decided); 2 unit tests; nothing logged → no percentages
- **R-25.1 Menopause symptoms**: Symptom charts from real logs
- **R-25.3 Weight tracking (menopause)**: Weight log (same as R-24.4)
- **R-25.4 Menopause wellness goals**: Routine saved
- **R-25.5 Lifestyle / provider-conversation focus**: [mode].tsx disclaimer

**Wellness Modules (SRS §26–31)**
- **R-26.1 Fitness categories**: catalog.ts:113; shared/src/mock/workouts.ts; fitness.tsx
- **R-26.3 No prescriptions from assumed hormones**: workout/personalize.tsx ignores phase
- **R-27.1 Workout builder inputs**: workout/personalize.tsx:32-37
- **R-27.2 Personalised workout output**: shared/src/workoutBuilder.ts builds blocks that add up to the chosen time (unit test)
- **R-27.3 20-minute home workout example**: mock/workouts.ts w_home_20; player
- **R-28.1 Nutrition dashboard + meal logging**: nutrition.tsx; selectors nutritionTotals
- **R-28.3 No individualised medical claims**: nutrition.tsx disclaimer
- **R-29.1 Hydration target**: hydration.tsx SET_WATER_TARGET
- **R-29.2 Water logging**: hydration.tsx; E2E logs and removes water on server
- **R-29.4 Hydration progress**: hydration.tsx
- **R-29.5 Hydration streak**: selectors waterStreak
- **R-30.1 Sleep logging**: sleep.tsx LOG_SLEEP
- **R-31.1 Wellness Score /100**: selectors.ts wellnessScore; home + insights
- **R-31.2 Score components and weights**: state.ts DEFAULT_WEIGHTS
- **R-31.4 Non-medical framing**: shared/src/copy.ts

**AI Coach, Insights, Reports & Education (SRS §34–38)**
- **R-34.4 AI disclaimer**: COPY.aiDisclaimer in coach.tsx
- **R-35.3 Consent controls personalisation**: Consent gates personal notes (shared coach unit test); AI data screen (ai-data.tsx)
- **R-36.1 Weekly report metrics**: selectors.ts weeklySummary; WeeklyReport.tsx
- **R-36.2 Pattern + suggested focus**: selectors.ts R2; WeeklyReport.tsx
- **R-37.1 Rules engine**: selectors.ts computeInsights R1–R6
- **R-37.2 Example rule (sleep + low energy)**: selectors.ts:207-226
- **R-38.1 Education categories**: catalog.ts CONTENT_CATEGORIES; mock/articles.ts
- **R-38.2 Library browsing**: learn/index.tsx, learn/[id].tsx, learn/faq.tsx; E2E content-flows

**Notifications (SRS §41)**
- **R-41.1 Configurable notification types**: notification-settings.tsx; catalog.ts:173-179
- **R-41.4 Discreet mode, quiet hours, custom reminders**: notification-settings.tsx

**Privacy & Data Rights (SRS §42, 68)**
- **R-42.1 Privacy & Data screen**: apps/mobile/src/app/privacy.tsx
- **R-42.2 Data collected view**: privacy.tsx
- **R-42.3 Consent toggles**: privacy.tsx; versioned Consent type
- **R-42.4 Export data**: GET /v1/me/export (apps/api/src/routes/me.ts); E2E content-flows; ownership.test.ts
- **R-42.5 Delete account**: delete-account.tsx; DELETE /v1/me; E2E content-flows
- **R-42.7 Withdraw optional consent**: privacy.tsx; state.ts:497-502
- **R-68.1 Explicit, versioned consent**: ownership.test.ts:103; onboarding consent before cycle step
- **R-68.2 Data minimisation**: rbac.test.ts:138 (masked emails, no health data)
- **R-68.4 Owner-only access**: /v1/me routes; ownership.test.ts; E2E isolation between two users
- **R-68.5 Auditability**: Server-written audit; security.test.ts:99

**Content Management & Medical Review (SRS §39–40)**
- **R-39.1 Content types**: shared/src/types.ts:47; contentWorkflow.ts:20
- **R-39.2 Content fields**: admin/data.ts:87-117; ContentEditor.tsx
- **R-39.3 Content statuses**: admin/data.ts:38-47 (extended with medical/compliance review)
- **R-40.1 Review workflow**: contentWorkflow.ts RULES; content.test.ts; regressions.test.ts
- **R-40.2 Review metadata kept**: ContentItem versions[]/history[]; learn/[id].tsx

**Accounts & Security (SRS §47–48)**
- **R-47.3 Secure authentication**: apps/api/src/crypto.ts (scrypt), routes/auth.ts; auth.test.ts
- **R-47.5 MFA for admin**: routes/auth.ts:114; unit.test.ts; regressions.test.ts
- **R-47.6 RBAC**: rbac.ts; adminPolicy.ts; rbac.test.ts; roles.test.ts
- **R-47.7 Audit logs**: security.test.ts:99
- **R-47.8 Rate limiting**: store.ts RateLimiter; security.test.ts:87
- **R-47.9 Secure token storage**: apps/mobile/src/lib/api.ts (expo-secure-store); web HttpOnly SameSite cookie
- **R-48.1 Email / password**: API + web + mobile; auth.test.ts; E2E

**Subscription, Community & Gamification (SRS §49, 51–52)**
- **R-49.1 Plans screen + trial**: premium.tsx; me.ts trial/cancel; E2E content-flows (trial → active → free)
- **R-51.3 Report content / block user**: community.tsx REPORT_POST, BLOCK_AUTHOR (local)
- **R-51.6 Anecdotes not presented as advice**: community.tsx banner
- **R-52.1 Streaks**: selectors.ts:98-108; achievements.tsx
- **R-52.3 Goals**: goals.tsx; goalProgress; E2E creates a goal
- **R-52.6 No gamification of reproductive events**: achievements.tsx note; no cycle badges

**Architecture, Data & Platform (SRS §45–46, 55–58)**
- **R-55.1 Mobile technology: React Native**: apps/mobile: Expo 58, React Native 0.88, TypeScript
- **R-58.1 Design system components**: docs/design/healthx-design-system.md; shared tokens; components on web + mobile

**Testing (SRS §69–70)**
- **R-69.1 Unit tests: cycle and date calculations**: packages/shared/test/cycle.test.ts (dates: month/year boundaries, leap years, DST); shared tests 38/38
- **R-69.2 Unit tests: wellness score, streaks, goals**: packages/shared/test/wellness.test.ts (score, weights, streaks, goals)
- **R-69.3 Subscription logic tests**: Premium logic unit test + server trial tests
- **R-69.4 API integration tests**: apps/api/test: 111/111 passed on 2026-10-28
- **R-69.5 Authentication tests**: auth.test.ts, regressions.test.ts (passed)
- **R-69.8 UI tests (onboarding, logging, coach, subscription)**: site-nav 8/8, core-e2e 14/14, mobile-onboarding OK, content-flows 19/19, mobile-modules 13/13, mobile-connection 8/8, mobile-admin 39/39 (2026-10-28)
- **R-69.10 Security tests**: security.test.ts, rbac.test.ts, ownership.test.ts, regressions.test.ts (passed)
- **R-70.1 Critical cycle-engine test cases**: cycle.test.ts: regular, irregular, short/long, missing data, missed period, multiple, edited/deleted, historical, leap year, DST, month boundaries

**Web App & Web Admin (platform coverage)**
- **R-W.1 Public website**: apps/web/src/site; site-nav.mjs 8/8; production build passed

**Definition of Done & Release Readiness (SRS §72)**
- **R-72.1 Loading, empty and error states**: States.tsx, ConnectionStates.tsx; E2E mobile-connection
- **R-72.2 Documentation**: README.md, apps/*/README.md, docs/design, docs/reports
- **R-72.6 Web production build**: npm --prefix apps/web run build passed (2026-10-27)

## F. Partially Completed Work

**Onboarding & Profile (SRS §8–10)**
- **R-8.3 Goals personalise the experience**: done: onboarding.tsx:155 (pregnancy/menopause goals skip cycle step only). Remaining: Use goals to adapt home, plan and content.
- **R-9.3 Timezone and language**: done: preferences.tsx (timezone auto-detected). Remaining: Translations; language setting has no effect.
- **R-10.5 Tracking history**: done: log-period.tsx "Past dates" (after onboarding only). Remaining: Optional history step in onboarding.

**Cycle & Period Tracking (SRS §11–13, 18–19)**
- **R-12.2 Estimated vs user-entered vs validated**: done: shared/src/types.ts Provenance; cycle.ts lengthProvenance. Remaining: 'validated' never used; no per-value badge.
- **R-13.3 Per-day flow**: done: types support flowByDay; UI captures first/end day only. Remaining: Per-day flow UI.
- **R-13.4 Period symptoms**: done: Severity now selectable when logging a period (log-period.tsx; E2E mobile-modules). Remaining: "Digestive changes" still listed as "Appetite changes".
- **R-19.1 Irregular cycle detection**: done: cycle.ts:120-121 (fixed 7-day spread, ≥3 cycles); cycle-history.tsx:19 uses ±4 days. Remaining: Compare recent vs previous; single threshold; no data-backed message without data.

**Symptoms, Mood & Daily Check-in (SRS §14–17, 32–33)**
- **R-16.2 Optional stress / anxiety / energy**: done: Stress and anxiety are now opt-in toggles (mood.tsx:29-30); energy is still saved with default 6; check-in saves stress default 4. Remaining: Make energy and check-in stress opt-in.

**Fertility & Life Stages (SRS §20–25)**
- **R-22.4 Pregnancy education, hydration, activity, nutrition**: done: Links to generic article/hydration/nutrition. Remaining: Pregnancy-specific content and tracking.
- **R-23.2 Emergency → medical care**: done: Static emergency card (COPY.emergency). Remaining: Actionable emergency routing.
- **R-24.3 Perimenopause sleep / mood / energy / exercise / nutrition**: done: Link tiles to generic screens. Remaining: Stage-specific views.
- **R-25.2 Menopause sleep / activity / strength / nutrition / mood**: done: Link tiles; bone-strength workout; article. Remaining: Stage-specific views.

**Wellness Modules (SRS §26–31)**
- **R-26.2 Fitness integrated with cycle**: done: Wellness side done (insights/report); no cycle input in fitness. Remaining: Cycle-aware suggestions without hormonal prescriptions.
- **R-28.2 Future nutrition features**: done: meal-ideas.tsx + shared/src/meals.ts: vegetarian filter, varied plan, merged grocery list (unit test). Remaining: Recipes, Indian food database, pregnancy/menopause nutrition education.
- **R-29.3 Hydration reminders**: done: Local reminders scheduled with expo-notifications (lib/localReminders.ts; reminderPlan unit tests). Remaining: Verify delivery on a device (R-69.9).
- **R-31.3 Configurable weights end-to-end**: done: Admin Config.tsx (local); API refuses SET_WEIGHTS (userActions.ts:40). Remaining: Server-side config consumed by apps.

**AI Coach, Insights, Reports & Education (SRS §34–38)**
- **R-34.1 AI coach answers wellness questions**: done: shared/src/coach.ts keyword rules; coach.tsx labelled "Simulated". Remaining: AI provider integration, safety evals.
- **R-34.2 Coach declines diagnosis / medication**: done: coach.ts keyword lists. Remaining: Robust (non-substring) safety layer.
- **R-34.3 Emergency redirect**: done: coach.ts emergency keywords → red bubble text. Remaining: Call/crisis-line action; robust detection.
- **R-35.1 AI uses permitted user context**: done: Coach adds personal notes from the user's logs only with AI-personalisation consent (unit test). Remaining: Real AI provider.
- **R-35.2 AI-generated suggestions / summaries**: done: Rules-based plan + weekly summary. Remaining: AI layer; habit recommendations.
- **R-36.3 AI-written weekly report**: done: Labelled "Rules-based summary". Remaining: AI narrative.

**Notifications (SRS §41)**
- **R-41.2 Notification delivery**: done: Local notifications via expo-notifications (lib/localReminders.ts); no push (no push token). Remaining: Push notifications; device verification.
- **R-41.3 Data-driven notifications**: done: reminderPlan(): period reminder 2 days before the estimate, weekly report, appointments (unit tests). Remaining: More data-driven triggers (e.g. behind hydration goal); device verification.

**Privacy & Data Rights (SRS §42, 68)**
- **R-42.6 Disconnect health integration**: done: TOGGLE_CONNECTION (simulated). Remaining: Real integrations (R-43.x).
- **R-68.3 Encryption in transit and at rest**: done: HSTS in production only (http.ts:173); README lists no at-rest encryption. Remaining: TLS deployment; encrypted storage.

**Health & Business Integrations (SRS §43–44, 50)**
- **R-43.1 Apple HealthKit**: done: integrations.tsx connect toggle (simulated); no HealthKit code. Remaining: Native HealthKit module + import.
- **R-43.2 Android Health Connect**: done: integrations.tsx toggle (simulated). Remaining: Native Health Connect module + import.
- **R-43.3 Minimal permissions**: done: Consent sheet; per-type toggles are screen state only. Remaining: Persist choices; OS permission requests.
- **R-50.2 Employer sees aggregate only**: done: COPY.employerPrivacy; admin analytics aggregate-only. Remaining: Enforce in integration.

**Content Management & Medical Review (SRS §39–40)**
- **R-39.4 Media upload**: done: ContentEditor.tsx "Upload simulated"; metadata only. Remaining: File storage + scanning.

**Accounts & Security (SRS §47–48)**
- **R-47.1 TLS**: done: HSTS header in production only. Remaining: Deploy behind TLS.
- **R-48.4 Magic link**: done: Works via dev outbox only (auth.test.ts:154; E2E mobile-connection). Remaining: Real email delivery.

**Subscription, Community & Gamification (SRS §49, 51–52)**
- **R-49.2 Premium feature gating**: done: components/PremiumGate.tsx locks features on Free; trial unlocks the coach (E2E mobile-modules). Remaining: Server-side entitlement checks (lock is UI only).
- **R-51.1 Community groups**: done: catalog.ts:219 has "Sleep" instead of "Wellness". Remaining: Fix list; real feed.
- **R-51.2 Moderation**: done: Copy only. Remaining: Moderation service.
- **R-51.4 Community privacy controls**: done: Advice copy only. Remaining: Settings.
- **R-52.2 Badges**: done: Static seed data (mock/generate.ts:315-321); nothing awards them. Remaining: Award logic.

**Analytics & KPIs (SRS §53–54)**
- **R-53.1 Product analytics events**: done: 7 of 15 events emitted (lib/track.ts: app_opened, screen_viewed, content_opened, video_played, workout_started, weekly_report_viewed, ai_question_asked); shown in Web Admin App activity. Remaining: Remaining 8 events.
- **R-54.1 Acquisition KPIs**: done: Analytics.tsx badged "Simulated data". Remaining: Real data source (R-53.1).
- **R-54.2 Activation KPIs**: done: Analytics.tsx (hard-coded values). Remaining: Real data.
- **R-54.3 Engagement KPIs**: done: Analytics.tsx (simulated). Remaining: Real data.
- **R-54.4 Retention KPIs**: done: Analytics.tsx RETENTION_COHORTS (simulated). Remaining: Real data.
- **R-54.5 Monetisation KPIs**: done: Analytics.tsx, Subscriptions.tsx (simulated). Remaining: Real data.

**Architecture, Data & Platform (SRS §45–46, 55–58)**
- **R-45.1 Data model entities**: done: TypeScript types in shared/src/types.ts; CycleDay, WellnessProfile, Subscription not separate entities. Remaining: Persisted schema.
- **R-46.1 Cycle data model fields**: done: Cycles derived, not stored; no cycle_id/user_id/source/timestamps. Remaining: Persisted model.
- **R-55.2 Backend: Node.js / NestJS**: done: Node.js + TypeScript, no framework (apps/api). Remaining: NestJS modules (§56).
- **R-58.2 Reusable components across products**: done: Tokens shared; components duplicated per platform. Remaining: Shared component package.

**Testing (SRS §69–70)**
- **R-69.7 Notification integration tests**: done: reminderPlan and consent unit tests. Remaining: Device-level notification tests (blocked by R-69.9).

## G. Pending Work

**Symptoms, Mood & Daily Check-in (SRS §14–17, 32–33)**
- **R-17.2 Mood / symptom vs phase pattern**: Correlate mood and symptoms with phase. Evidence: Only energy correlated (R5).

**Wellness Modules (SRS §26–31)**
- **R-30.2 Sleep from Apple Health / Health Connect / wearables**: Imported sleep. Evidence: source always "manual".

**AI Coach, Insights, Reports & Education (SRS §34–38)**
- **R-37.3 AI personalisation stage**: data → rules → insights → AI. Evidence: No AI stage.

**Health & Business Integrations (SRS §43–44, 50)**
- **R-44.1 Sync pipeline**: Connector → normalisation → health data → engine. Evidence: Only a "source" field on types.
- **R-50.1 HealthX Business connection**: Optional employer link. Evidence: Static "Not connected" row (web); disabled flag.

**Accounts & Security (SRS §47–48)**
- **R-47.2 Encryption at rest**: Encrypted storage. Evidence: apps/api/README.md "Not included".
- **R-47.4 OAuth / OIDC**: Standard provider login. Evidence: oauth/:provider returns 501.
- **R-47.10 Secure file handling**: Validated, scanned uploads. Evidence: No real uploads.
- **R-47.12 Secrets management**: Managed secrets. Evidence: config.ts: no secrets required yet; MFA secrets in memory.
- **R-48.5 Enterprise SSO / Passkeys**: Future auth methods. Evidence: Not present.

**Subscription, Community & Gamification (SRS §49, 51–52)**
- **R-49.4 Family plan**: Family subscription. Evidence: Marketing card on web only.
- **R-49.5 Enterprise plan**: Future plan. Evidence: Not present.
- **R-51.5 Medical-misinformation controls**: Flag/filter misinformation. Evidence: Banner only.
- **R-52.4 Milestones**: Milestones. Evidence: Not present.
- **R-52.5 Wellness points**: Points. Evidence: Not present.

**Analytics & KPIs (SRS §53–54)**
- **R-54.6 LTV**: Lifetime value KPI. Evidence: Not present.

**Architecture, Data & Platform (SRS §45–46, 55–58)**
- **R-55.3 Database: PostgreSQL**: Persistent DB. Evidence: In-memory store (apps/api/src/store.ts); no DB dependency.
- **R-55.4 Redis / S3**: Cache and object storage. Evidence: Not present.
- **R-55.5 Cloud: AWS deployment**: Deployed environment. Evidence: No deployment configuration.

**Definition of Done & Release Readiness (SRS §72)**
- **R-72.4 Localisation readiness**: i18n-ready strings. Evidence: No i18n library; strings hard-coded.
- **R-72.5 Mobile store build**: Signed iOS/Android builds. Evidence: No eas.json / native project; no JDK on this machine.
- **R-72.7 Continuous integration**: Automated checks on push. Evidence: No .github/workflows or other CI config.

## H. Blockers and Risks

### Confirmed blockers

| Blocker | Impact | Dependency | Recommended next step |
|---|---|---|---|
| No database (R-55.3); in-memory API resets on restart | Blocks backups (R-47.11), encryption at rest, real persistence, production use | Decision to add PostgreSQL (README: "no database by request") | Confirm the decision; design the schema from §45–§46; add migrations |
| Native builds cannot be tested (R-69.9) | No verification on iOS/Android; HealthKit/Health Connect impossible to test | VT-x is disabled in BIOS (emulator); phone has Expo Go 57.0.9 but the project needs SDK 58 (Expo Go 58.0.5) | Enable VT-x in BIOS **or** update Expo Go on the phone; add an EAS / native build (R-72.5) |
| Apple / Google sign-in (R-48.2, R-48.3) | Social login returns 501 | Apple Developer + Google OAuth credentials | Obtain credentials, implement provider flows |
| Store billing (R-49.3) | No real Premium purchases | App Store / Google Play billing accounts | Set up products, then integrate billing |
| Open product decisions | AI data policy (R-68.6, D-12), cycle thresholds (R-19.1, D-09), Flutter vs React Native (D-01). D-21 and D-36 were decided in `be8812d`. | Product owner / clinical input | Record decisions in README, then implement |
| External reviews | Fertility module (R-20.5) and education content (R-40.3) not medically / legally reviewed | Clinicians, legal | Schedule review before any release |
| Health integrations tests (R-69.6) | Cannot test without integrations | R-43.1, R-43.2 | Implement after native build exists |

### Potential risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Reminders unverified on devices (R-41.2, R-29.3, R-22.5) | Local notifications are scheduled in code but have never fired on a real phone | Verify once R-69.9 is unblocked |
| Phone-only data (R-9.2, R-22.6, R-24.4) | Profile photo, weight, provider questions and grocery list live only in the phone's secure storage; lost with the phone, not in export | Decide whether they belong on the server (needs R-55.3) |
| Premium lock is UI-only (R-49.2) | A modified client could use Premium features | Enforce entitlements on the server |
| Energy saved with a default (R-16.2) | An untouched energy slider records 6/10; check-in records stress 4 | Make them opt-in like stress/anxiety |
| Security review document removed (R-72.3) | `docs/reports/` was deleted in `be8812d` | Restore or re-issue it |
| Simulated features | AI, notifications, integrations, payments look real in places | Keep "simulated" labels until integrated |
| No CI (R-72.7) | Regressions are caught only when someone runs tests locally | Add CI running typecheck, lint, API and E2E tests |

## I. Testing and Verification

The checks below were **run on 2026-10-28** against commit `be8812d` (with the uncommitted scroll fixes) unless marked 2026-10-27. E2E suites used a disposable in-memory API on port 4104 (not the dev API) and deleted their own accounts.

| Check | Command | Result |
|---|---|---|
| Shared unit tests (cycle engine, wellness, modules) | `npm run shared:test` | **Passed** — 38 tests, 0 failed |
| API unit + integration tests | `npm --prefix apps/api test` | **Passed** — 111 tests, 0 failed |
| Typecheck API | `npm --prefix apps/api run typecheck` | **Passed** — 0 errors |
| Typecheck web | `npm --prefix apps/web run typecheck` | **Passed** — 0 errors |
| Typecheck mobile | `npm --prefix apps/mobile run typecheck` | **Passed** — 0 errors |
| Lint web / mobile | `npm --prefix apps/{web,mobile} run lint` | **Passed** (2026-10-27: web 0 errors, 5 warnings) and on the changed files 2026-10-28 |
| Web production build | `npm --prefix apps/web run build` | **Passed** (2026-10-27, before `be8812d`; not re-run) |
| Mobile web export | `npx expo export --platform web` | **Passed** |
| Website navigation | `tests/e2e/site-nav.mjs` | **Passed** — 8/8 |
| Mobile E2E: core | `tests/e2e/core-e2e.mjs` | **Passed** — 14/14 |
| Mobile E2E: onboarding | `tests/e2e/mobile-onboarding.mjs` | **Passed** — onboarding order OK |
| Mobile E2E: content flows | `tests/e2e/content-flows.mjs` | **Passed** — 19/19 |
| Mobile E2E: modules (cycle settings, pregnancy, reminders, Premium locks, coach safety) | `tests/e2e/mobile-modules.mjs` | **Passed** — 13/13 |
| Mobile E2E: connection / offline demo | `tests/e2e/mobile-connection.mjs` | **Passed** — 8/8 |
| Mobile → Web Admin (activity, timeline, audited health records, daily plans) | `tests/e2e/mobile-admin.mjs` | **Passed** — 39/39 |
| Scroll / responsive crawl (56 mobile screens × 390/820/1366 px; 8 website pages) | custom puppeteer script (not in repo) | **Passed** — 0 issues after the scroll fixes |

**Not run in this audit** (available but not executed): Web Admin page suites (`admin-run.mjs`, `admin-flow*.mjs`, `admin-navsmoke.mjs`, `admin-indep.mjs`, `admin-api.mjs`), `mobile-api.mjs`, `theme.mjs`.

**Unavailable** (no test exists): health-integration tests; device-level notification tests; native iOS/Android tests; mobile store build.

**Manual verification:** the API, website/Web Admin and mobile app were started locally and their main pages rendered in Chrome. Native device launch was attempted on 2026-10-27: no emulator could boot (VT-x disabled) and Expo Go on the connected phone was too old for SDK 58.

## J. Recommended Completion Plan

| Phase | Task | Priority | Depends on | Done when |
|---|---|---|---|---|
| 1. Critical blockers | Decide and add PostgreSQL persistence (R-55.3) with migrations | P0 | Product decision | Data survives API restart; API tests pass against the DB |
| 1. Critical blockers | Unblock native testing (R-69.9): enable VT-x or update Expo Go to 58.0.5; add EAS/native build (R-72.5) | P0 | BIOS access / phone | App launches on Android and iOS; main screens load |
| 1. Critical blockers | Resolve open decisions D-01, D-09, D-12 | P0 | Product owner | Decisions recorded in README |
| 2. Core functionality & integrations | Verify local reminders on a device; add push (R-41.2, R-41.3, R-29.3) | P1 | Native build | Reminders arrive on device; push token registered |
| 2. Core functionality & integrations | Apple Health / Health Connect + sync pipeline (R-43.x, R-44.1, R-30.2) | P1 | Native build | Steps/sleep import and normalise |
| 2. Core functionality & integrations | AI coach provider with consent-gated context and safety layer (R-34.x, R-35.x, R-37.3) | P1 | D-12 policy | Coach uses permitted context only when consent is on; safety evals pass |
| 2. Core functionality & integrations | Remaining 8 analytics events + real KPIs (R-53.1, R-54.x) | P1 | Database | All 15 events stored; admin KPIs read real data |
| 2. Core functionality & integrations | Billing + server-side Premium entitlements + social login (R-49.2, R-49.3, R-48.2, R-48.3) | P1 | Store/OAuth credentials | Purchase, restore and gated features work; server refuses Premium actions on Free |
| 3. Remaining features | Remaining life-stage support: pregnancy education, stage-specific sleep/mood/nutrition views, emergency routing (R-22.4, R-23.2, R-24.3, R-25.2) | P2 | — | Stage-specific content and actions |
| 3. Remaining features | Onboarding history, per-day flow, provenance badges (R-10.5, R-13.3, R-12.2) | P2 | — | Behaviour matches SRS |
| 3. Remaining features | Mood/symptom phase correlation; irregular detection per SRS (R-17.2, R-19.1) | P2 | D-09 | Rules covered by unit tests |
| 3. Remaining features | Gamification (badges award, milestones, points) and community moderation (R-52.x, R-51.x) | P3 | Database | Badges awarded from real activity |
| 4. Bug fixes & UI polish | Opt-in energy / check-in stress (R-16.2); community group list (R-51.1); "Digestive changes" symptom (R-13.4) | P2 | — | Behaviour matches SRS wording |
| 5. Testing & final verification | Run Web Admin page suites (R-W.4); restore the security review (R-72.3); add CI (R-72.7) | P1 | — | All suites green in CI, 3 consecutive runs |
| 6. Build & release readiness | TLS, encryption at rest, secrets, backups (R-47.x); localisation (R-72.4); medical/legal reviews (R-20.5, R-40.3) | P1 | Database, hosting | Security checklist signed off; content reviewed |

## K. Final Completion Summary

- **Finished:** the MVP end-user feature set on mobile (onboarding, profile with photo, cycle dashboard, calendar and editable cycle settings, period, symptom, mood, check-in, plan, hydration, sleep, nutrition, workouts with a builder, insights, weekly report, education, privacy centre with export/delete), most of the life-stage modes (pregnancy week and due date, appointments, perimenopause/menopause dashboards, weight log), the four SRS roles with a server-enforced content review workflow, Web Admin app activity with audited health-record access, staff MFA, RBAC, audit logging and rate limiting. Shared unit tests (38/38, including the SRS cycle-engine cases), API tests (111/111), typechecks and all 7 E2E suites run pass.
- **Partially finished:** features that depend on external services are simulated or local-only (AI coach, push notifications, health integrations, payments, social login, email); local reminders exist but are unverified on a device; Premium locks are UI-only; analytics cover 7 of 15 events; a few SRS details differ (energy default, irregular detection, per-day flow).
- **Remaining:** database and cloud infrastructure, native builds and device testing, real integrations, the rest of analytics, localisation and CI.
- **Biggest blockers:** no database; native testing impossible on this machine (VT-x off, Expo Go outdated); missing third-party credentials (Apple, Google, store billing); open product decisions (D-01, D-09, D-12).
- **Next three tasks:**
  1. Unblock native builds and device testing (R-69.9, R-72.5) — it also verifies the new reminders.
  2. Decide on and implement PostgreSQL persistence (R-55.3), which unblocks backups, analytics and production use.
  3. Server-side Premium entitlements and the remaining analytics events (R-49.2, R-53.1).
