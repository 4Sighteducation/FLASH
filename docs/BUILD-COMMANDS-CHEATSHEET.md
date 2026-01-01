# Build Commands Cheat‑Sheet (FLASH + Web)

This is a **quick reference** for the common build/run commands for:

- `FLASH` (Expo / EAS): iOS, Android, and Expo Web
- `FLASH_marketing` (Next.js): marketing website

---

## FLASH (Expo / EAS)

### Install deps

```bash
npm install
```

---

### Development: run locally (Metro)

- **Native (dev client / custom development build)**:

```bash
npx expo start --dev-client --clear
```

If you’re on restrictive Wi‑Fi and the phone can’t see your PC:

```bash
npx expo start --dev-client --tunnel
```

- **Web (Expo)**:

```bash
npm run web
```

---

### Development: build a dev client (opens to “Development Build” screen until Metro is running)

- **Android dev client**:

```bash
npm run build:android:dev
```

- **iOS dev client (Simulator)**:

```bash
npm run build:ios:dev
```

> Note: `build:ios:dev` uses the `development` EAS profile, which is currently **simulator-only** (`ios.simulator: true` in `eas.json`).

- **iOS dev client (Real iPhone / device via QR)**:

```bash
eas build --platform ios --profile development-device
```

Shortcut (your `package.json` script; also flips IAP to real):

```bash
npm run build:ios:device:dev
```

Then run Metro on your PC:

```bash
npx expo start --dev-client
```

---

### Preview / QA: installable build that runs without Metro

Use `eas build --profile preview` when you want a **standalone build** for testing:

- **Android preview APK**:

```bash
eas build --platform android --profile preview
```

- **iOS preview (simulator)**:

```bash
eas build --platform ios --profile preview
```

> Note: your `eas.json` currently sets iOS preview as simulator builds and Android preview as APK (`android.buildType = "apk"`).

---

### Production: App Store / Play Store builds

- **Android production (AAB for Play Store)**:

```bash
eas build --platform android --profile production
```

- **iOS production (App Store/TestFlight)**:

```bash
eas build --platform ios --profile production
```

Shortcut (your `package.json` scripts; also flips IAP to real):

```bash
npm run build:android
npm run build:ios
```

---

### Submitting store builds (optional)

- **iOS submit (App Store Connect)**:

```bash
eas submit --platform ios --profile production
```

- **Android submit (Google Play)**:

```bash
eas submit --platform android --profile production
```

> Your `eas.json` is configured to submit Android to the `internal` track and expects `google-play-service-account.json` in the project root.

---

### IAP mode toggle (your repo uses this)

- **Mock IAP (local/dev)**:

```bash
npm run iap:mock
```

- **Real IAP (store builds / real purchases)**:

```bash
npm run iap:real
```

The standard build scripts already flip to real IAP automatically:

- `npm run build:android`
- `npm run build:ios`
- `npm run build:android:dev`
- `npm run build:ios:dev`

---

### Expo Web (the `fl4sh.cards` app web build)

- **Build web bundle**:

```bash
npm run build:web
```

- **Deploy web to Vercel**:

```bash
npm run deploy:web
```

---

## FLASH_marketing (Next.js)

From the `FLASH_marketing` folder:

### Development

```bash
npm install
npm run dev
```

> Your marketing dev server runs on port **4321** (`next dev -p 4321`).

### Production build (local)

```bash
npm run build
npm run start
```

---

## “Which one should I use?”

- **You want to run on your phone while coding** → build a **dev client** once, then use `npx expo start --dev-client`.
- **You want a build that opens by itself (no Metro)** → use **`preview`**.
- **You want to upload to Play Store / App Store** → use **`production`**.


