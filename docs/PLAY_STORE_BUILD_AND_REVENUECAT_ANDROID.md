# Play Store Build + RevenueCat (Android) Setup (FLASH)

This guide walks you through building an Android release for Google Play and configuring RevenueCat for Android subscriptions.

## 0) What stays the same vs iOS

- **Same app**: package/bundle is `com.foursighteducation.flash`
- **Same entitlement names** (recommended): `premium`, `pro`
- **Same offering id** (recommended): `default` with packages `premium_monthly`, `premium_annual`, `pro_monthly`, `pro_annual`

**But** Google Play products are separate objects from App Store products — you must create Android subscriptions in Play Console and add them to RevenueCat’s Android Product Catalog.

---

## 1) Create the app in Google Play Console

1. Go to **Google Play Console** → **All apps** → **Create app**
2. App name: `FLASH` (or your chosen display name)
3. Default language, App/Game, Free/Paid → continue.
4. Complete the initial **App setup** items until Google allows uploads.

---

## 2) Create subscriptions in Google Play Console

1. **Monetize** → **Products** → **Subscriptions**
2. Create these subscriptions (suggested IDs — you can pick your own, but keep them consistent everywhere):
   - `flash_premium_monthly`
   - `flash_premium_annual`
   - `flash_pro_monthly`
   - `flash_pro_annual`
3. For each subscription:
   - Create at least one **Base plan**
   - Set billing period (monthly/annual)
   - Set price(s) for your target countries
   - Activate the base plan

**Testing note**: Google subscriptions require you to use **Internal testing** (or other test tracks) and license testers.

---

## 3) Connect Google Play to RevenueCat

1. In Play Console: **Settings** → **Developer account** → **API access**
2. Create / choose a **Service account**
3. Grant it access:
   - Minimum recommended: *View financial data* / *Manage orders* / subscription visibility (RevenueCat docs specify exact roles)
4. Download the **JSON key** (this is sensitive)

### Put the JSON in your repo (locally only)

- Save it at: `FLASH/google-play-service-account.json`
- **Do not commit it** (it is gitignored already via `.gitignore`).

---

## 4) Configure RevenueCat Android app + products

1. RevenueCat → **Apps** → **+ New**
2. Platform: **Android**
3. Package name: `com.foursighteducation.flash`
4. Connect the app to **Google Play** using the service account JSON from step 3
5. RevenueCat → **Product Catalog**:
   - Add the four Android subscriptions
   - Ensure the **Product IDs exactly match** the Play Console product IDs
6. RevenueCat → **Offerings**:
   - Offering id: `default`
   - Packages:
     - `premium_monthly` → map to `flash_premium_monthly`
     - `premium_annual` → map to `flash_premium_annual`
     - `pro_monthly` → map to `flash_pro_monthly`
     - `pro_annual` → map to `flash_pro_annual`
7. RevenueCat → **Entitlements**:
   - `premium` entitlement should unlock Premium features
   - `pro` entitlement should unlock Pro features

---

## 5) Add the Android RevenueCat public SDK key to EAS

RevenueCat gives you an **Android public SDK key** (usually starts with `gpl_...`).

Run this from `FLASH/`:

```bash
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value "gpl_XXXX"
```

(You already have the iOS one configured; Android needs its own.)

---

## 6) Build Android for Play Store (AAB)

Important:
- You must bump `android.versionCode` for each Play upload.
- Current value is in `app.config.js`.

Build:

```bash
npm run build:android
```

This produces an **Android App Bundle (AAB)** using your `eas.json` production config.

---

## 7) Upload to Internal testing + install

1. Play Console → **Testing** → **Internal testing**
2. Create a release, upload the AAB, and publish to the internal track
3. Add testers (your Gmail / test accounts)
4. Install from the tester link

---

## 8) (Optional) Submit to Play via EAS

If you want EAS to submit, ensure `google-play-service-account.json` exists locally and run:

```bash
eas submit --profile production --platform android
```

---

## 9) Sanity checks in the Android build

- Open **Profile → Manage / View plans**
- Confirm paywall shows **real prices** (not “Price unavailable”)
- Test:
  - Purchase Premium monthly
  - Restore purchases
  - Upgrade to Pro






