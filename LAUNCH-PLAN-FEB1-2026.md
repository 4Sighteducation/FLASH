# Feb 1, 2026 Launch Plan (FLASH)

## Goal
Ship a stable v1 to **App Store + Google Play** by **Feb 1, 2026**, with:
- Working subscription purchase/restore (“Lite” vs “Full”)
- Reliable push notifications + in-app notifications
- Finished Settings screen (production-ready)
- A managed beta cohort (10 students) with clear onboarding + feedback loop
- Payments rails decided + implemented
- Two short demo videos to support marketing + store listings
- Skins Vault included (already shipped) + discoverability improved if needed

## Timeline (recommended)
### Week 1 (now → ~Dec 23): Stabilize + payments direction
- **Decide payment rails** (see section “Payments”)
- Freeze schema + migrations you need for launch (subscriptions + notifications)
- Kill the last major UX bugs (Papers, extraction, keyboard, timers)
- Add basic crash/error reporting (Sentry or Expo equivalent)

### Week 2–3 (~Dec 24 → ~Jan 10): Store readiness + subscription implementation
- Implement real purchase flow + restore
- Implement tester entitlement flow (free Full subscription for beta cohort)
- Create store listings drafts (copy + screenshots + privacy labels)
- Internal builds rolling (TestFlight internal + Play internal)

### Week 4 (~Jan 11 → ~Jan 24): Beta rollout + iteration
- Move testers to **TestFlight External** / **Play Closed Testing**
- Weekly feedback review + priority fixes
- Add notification reminders and verify delivery end-to-end

### Week 5 (~Jan 25 → Feb 1): Final polish + release
- Final “release candidate” build
- App Review submissions
- Marketing demo videos published
- Launch day checklist executed

---

## A) Subscription tiers (Lite vs Full)
### Current state (code)
- `SubscriptionContext.tsx` defines `lite` + `full` limits.
- Purchase and restore flows are **stubbed** (alerts only); Expo IAP calls are commented.
- Backend expects `public.user_subscriptions` with `tier` and `expires_at`.

### What to ship for v1
- **Lite**: 1 subject, 1 topic, 10 cards, no AI, no voice answers, no export.
- **Full**: unlimited + all features.
- Decide whether Full is:
  - **One-time purchase** (“Full Version”), or
  - **Subscription** (monthly/yearly), or
  - **Both** (recommended later; v1 pick one to reduce risk)

### Tasks
- Define products in:
  - **App Store Connect** (IAP product IDs)
  - **Google Play Console** (in-app products or subscriptions)
- Ensure `SubscriptionProvider`:
  - Checks entitlement on app start
  - Updates Supabase `user_subscriptions`
  - Handles restore reliably
- Add a “Paywall” screen/modal that’s consistent with your theme

---

## B) App Store + Google Play deployment
### Expo recommended path
- Use **EAS Build** + **EAS Submit**.
- Ensure consistent bundle IDs, icons, splash, privacy strings.

### Checklist
- App Store Connect:
  - Bundle ID, certificates, provisioning profiles
  - IAP/subscription products created and “Ready to Submit”
  - TestFlight internal + external groups set up
- Play Console:
  - App signing, closed testing track, internal testing track
  - In-app products/subscriptions configured

---

## C) Push notifications (iOS + Android)
### What to ship
- **Expo push notifications** (fastest) for:
  - “Extraction completed”
  - “Cards due” reminders (daily)
  - Optional streak reminder

### Tasks
- Add `expo-notifications` if not present
- Request permissions + store token in Supabase (per user + device)
- Server-side:
  - A small job runner (Railway/cron/Vercel cron) to send reminders
- In-app:
  - Settings toggles (global + per-category)
  - Respect quiet hours (optional)

---

## D) Finish/Update Settings screen (production-ready)
### Must-have sections
- **Account**: email, sign out, delete account (if feasible)
- **Subscription**: current tier, manage/restore purchase, upgrade CTA
- **Notifications**: push toggles, in-app toggles
- **Appearance**: theme, Cyber Mode unlock (or fold into skins)
- **Support**: contact, FAQs, report a bug
- **Legal**: Terms, Privacy, data usage

### Polish goals
- No “dev” admin tools visible to normal users
- Clear upgrade path and clear “limits” messaging for Lite

---

## E) Testing group rollout (10 students + vouchers + free subscription)
### Objective
Get real usage on-device before launch, collect structured feedback, and avoid chaos.

### Recommended approach
- **Distribution**
  - iOS: TestFlight External Group “Beta Students”
  - Android: Play Closed Testing list
- **Entitlement**
  - Create a “beta_full” entitlement in `user_subscriptions` (or use `full` tier with a far-future `expires_at`)
  - When a tester signs up (email), auto-grant entitlement
- **Onboarding**
  - One-page onboarding doc (Google Doc) with:
    - install link
    - login details
    - “what to test” checklist
    - how to report bugs
- **Feedback**
  - Google Form for structured feedback:
    - device model, OS version
    - what they tried
    - bugs (with screenshot)
    - UX rating
  - Weekly 15-min review loop (you + notes)

### Voucher ops
- Track testers in a spreadsheet:
  - email, platform, install date, feedback submitted, voucher sent date

---

## F) Payments rails (you need a clear solution)
### Recommended (lowest risk): RevenueCat
- Handles:
  - iOS + Android purchase flows
  - receipt validation
  - entitlements
  - restore
  - subscription renewals/cancellations
- Integrate app → RevenueCat SDK → webhook to Supabase (optional but recommended)

### Alternative (more engineering): Direct IAP + your backend validation
- You must handle:
  - iOS receipt validation
  - Android purchase tokens validation
  - edge cases (refunds, renewals, grace periods)
- Not recommended under a Feb 1 deadline unless you already have strong experience here.

### Recommendation for Feb 1
Use **RevenueCat**, ship a single tier (Full), and keep Lite limitations.

---

## G) Build-up to launch (Feb 1, 2026)
### Marketing demo videos (2 × 30s)
1) **“Study fast”**: pick subject → AI cards → Leitner study → XP/rank pops.
2) **“Past Papers”**: select paper → question view → timer → submit → AI marking → examiner insight → completion summary.

### Store assets checklist
- App icon, screenshots (6–8), short description, long description
- Promo text + keywords (iOS)
- Feature graphic (Android)
- Privacy policy URL + Terms URL

### Final hardening
- Crash reporting (Sentry)
- Analytics (minimal: screen views + key actions)
- “Report bug” with auto-included build/version string

---

## Skins Vault (included)
Already shipped:
- Rank icons (desk items)
- Skins Vault modal
- “Next skin” pill entry point on Home

Optional before launch:
- Add “Skins Vault” entry in Settings/Profile for discoverability


