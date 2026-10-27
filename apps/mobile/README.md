# HealthX Women's Wellness — Mobile (Expo / React Native)

iOS + Android app (Expo SDK 58, Expo Router, TypeScript). By default it signs in to the HealthX API
(`apps/api`) and keeps the account's data there, shared with the web app. An **offline demo** mode
keeps the original device-only behaviour (sample data in AsyncStorage, nothing sent anywhere).

```bash
npm install
npx expo start        # scan the QR code with Expo Go, or press w for the web preview
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
```

## Connecting to the HealthX API

Start the API first (`cd apps/api && npm run dev`; see `apps/api/README.md` for the demo accounts).
The app reads the API address from `EXPO_PUBLIC_API_URL` (default `http://127.0.0.1:4000`):

| Where the app runs | `EXPO_PUBLIC_API_URL` |
|---|---|
| Web preview or iOS simulator on the same PC | `http://127.0.0.1:4000` (default) |
| Android emulator | `http://10.0.2.2:4000` |
| Physical phone (Expo Go) | `http://<your PC's LAN IP>:4000`, e.g. `http://192.168.1.20:4000`; start the API with `HOST=0.0.0.0` so it listens on the LAN |

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npx expo start --clear
```

`127.0.0.1` on a phone or emulator means the device itself, not your PC. Plain HTTP is for local
development with the synthetic demo accounts only; use HTTPS for anything else. Native apps send no
`Origin` header; the API's `ALLOWED_ORIGINS` only matters for the web preview.

How the app uses the API (`src/lib/api.ts`, `src/lib/store.tsx`):

- **Sessions:**
  - The shared `ApiClient` (`client: 'mobile'`) keeps the access token in memory only.
  - The rotating refresh token goes in the OS keystore via **expo-secure-store** (Keychain / Android Keystore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`).
  - SecureStore isn't available on web, so the web preview keeps the refresh token in `sessionStorage` instead.
- **Data:**
  - On launch the app restores the session and loads `GET /v1/me/state`; a loading cover shows until then.
  - Each change is applied on screen straight away, then sent in order to `POST /v1/me/actions` with an idempotent id.
  - Once queued writes finish, the app re-fetches the state. The shared reducer creates ids separately on the device and on the server, so this is how a new entry gets its server id before you edit or delete it.
  - A change the server refuses (400/404/409/413/429), or one that can't be delivered, is dropped (never retried). The app shows the reason, and the re-fetch rolls the change back.
  - In API mode, health data is **not** cached on the device.
- **Sync:** the app re-fetches when it returns to the foreground and every 30 s, so changes made on the web app appear here.
- **Sign-out:**
  - Profile → Sign out ends this device's session only.
  - Settings → Sign out of all devices ends every session.
  - When a session ends elsewhere, the app returns to Log in with a message.
- **Staff accounts** are told to use the Web Admin; the app never holds a staff session.
- **Email confirmation:**
  - Until a new account confirms its email, Home shows a small "Confirm your email · Resend" hint.
  - Confirmation links open the web app. In the web preview they open this app's `/verify-email` screen.
- **Development emails** (confirmation, magic link, password reset) go to the API's dev outbox, `GET /v1/dev/outbox`. It only answers on the PC running the API (loopback), not from a phone or emulator.

### Offline demo

If the server can't be reached, the app shows **Can’t reach the HealthX server** with *Try again* and
*Use offline demo*. The choice is remembered, a banner stays visible, and **Connect** (banner or Settings)
returns to the server. `EXPO_PUBLIC_DEMO_MODE=true` always starts in the offline demo.

## Structure

```
src/app/            Expo Router routes (every file is a screen)
  index.tsx         animated splash → welcome / onboarding / home
  welcome, login, signup, forgot-password, onboarding
  (tabs)/           bottom tabs: home · cycle · wellness · insights · profile
  log-period, calendar, cycle-history, fertility (Phase 3 preview)
  check-in, symptoms, hydration, sleep, nutrition (Phase 2), fitness, workout/[id], workout/personalize
  habits, plan, weekly-report, learn/, learn/[id], coach (Phase 2, simulated)
  notifications, notification-settings, profile-edit, preferences, life-stages, life-stage/[mode]
  premium (Phase 2, simulated), privacy, settings
src/components/     UI kit (Text, Button, Card, Inputs, Sheet, Charts, Art, cycle/…)
src/lib/            api (ApiClient + token storage), store (server sync / offline demo), theme, photos, icons, toast
```

`metro.config.js` adds `../../packages/shared` to Metro's watch folders and maps `@healthx/shared`
to it; `tsconfig.json` has the matching path alias.

## Notes

- With the API, "Explore demo" opens Log in with the synthetic demo account filled in. In the offline
  demo it signs straight in with ~75 days of sample history.
- **Profile → Settings → Replace my data with sample history** restores the sample data. With the
  API it only affects your own account.
- These run on the server in API mode: sign-up, log in, forgot password, magic link, export, account
  deletion and the free trial.
- These still need server-side services and stay simulated or unavailable:
  - Apple/Google sign-in (the API reports it isn't configured)
  - opening magic links in the native app (links open the web address; there is no app deep link yet)
  - store billing and push notifications
  - HealthKit / Health Connect syncing and the AI coach
- Data export: the web preview downloads a JSON file. iOS/Android hand the JSON to the system share
  sheet (expo-file-system / expo-sharing aren't installed).
- Windows note: if code edits don't show up in `expo start`, restart with `npx expo start --clear`
  (Metro's watcher can miss changes in paths containing an apostrophe).
