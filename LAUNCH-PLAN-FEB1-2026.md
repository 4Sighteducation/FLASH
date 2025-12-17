# Feb 1, 2026 Launch Plan (FLASH)

## Goal
Ship a stable v1 to **App Store + Google Play** by **Feb 1, 2026**, with:
- Working subscription purchase/restore (**Free / Premium / Pro**)
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
- **Database cleanup plan + migration list** (see section “Database cleanup + data refresh”)
- Kill the last major UX bugs (Papers, extraction, keyboard, timers)
- Add basic crash/error reporting (Sentry or Expo equivalent)
- **Scraping + embeddings plan**: confirm exam boards scope, rerun pipeline, and validate vector search quality

### Week 2–3 (~Dec 24 → ~Jan 10): Store readiness + subscription implementation
- Implement real purchase flow + restore
- Implement tester entitlement flow (free Full subscription for beta cohort)
- **Execute DB cleanup + ship required indexes** (so beta data stays sane)
- **Finish remaining exam-board scrapers**, rerun scrapes, and **rebuild embeddings** used for vector search
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
- `SubscriptionContext.tsx` now uses **`free` / `premium` / `pro`** (with legacy `lite/full` mapped for compatibility).
- RevenueCat SDK is integrated; purchase + restore are wired to RevenueCat packages (monthly/annual).
- Backend expects `public.user_subscriptions` with `tier` and `expires_at`.

### What to ship for v1
- **Free**: 1 subject, 1 topic, 10 cards (core AI card generation allowed).
- **Premium**: unlimited study essentials (monthly + annual; Premium annual has 14-day trial).
- **Pro**: everything in Premium + Past Papers + AI marking/voice/advanced features (monthly + annual).

### Tasks
- Define products in:
  - **App Store Connect** (IAP product IDs)
  - **Google Play Console** (in-app products or subscriptions)
- Ensure `SubscriptionProvider` (RevenueCat):
  - Checks entitlements on app start
  - Handles purchase + restore reliably
  - Syncs tier to Supabase (best-effort; webhooks can become source of truth later)
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

---

## Railway notes (Papers extraction + marking API)
### Dev server warning (“This is a development server…”)
- Railway is currently starting Flask via `python api-server.py`, which uses Flask’s built-in dev server.
- **OK for beta/testing**, but for launch you should switch to a production WSGI server (**Gunicorn**) for better concurrency and stability.

**Recommended launch start command (example):**
- Add `gunicorn` to `scrapers/requirements.txt`
- Change Railway start command to something like:
  - `cd scrapers && gunicorn -w 2 -k gthread -t 300 -b 0.0.0.0:$PORT api-server:app`

### Hobby vs Pro plan (expected ~1,000 users)
- The real load driver is **concurrent first-time extractions**, not total user count (cached papers are cheap).
- Hobby may be fine early if extraction concurrency is low, but as usage grows you’ll want:
  - Better worker/job architecture (background jobs) and/or
  - More CPU/RAM headroom (plan upgrade) depending on concurrency.

**If under-provisioned, UX usually degrades as:**
- Extractions become slow / appear stuck
- More timeouts / retries
- “Queueing” effect (multiple extractions slow each other down)

### Build determinism / dependency pinning (avoid surprise crashes)
- Railway/Nixpacks can reuse cached layers. If dependency installs aren’t clean, you can get mismatched packages.
- We already saw this with OpenAI SDK: container crashed on import (`ImportError ... omit`).
- Mitigation:
  - Pin critical deps in `scrapers/requirements.txt`
  - Force clean installs in Railway build (e.g. `pip install --no-cache-dir --upgrade --force-reinstall -r scrapers/requirements.txt`)
  - Keep the extraction service dependency file (`scrapers/requirements.txt`) as the “source of truth”.

### Wiring Railway into iOS/Android builds (Expo)
- Both iOS and Android builds just call the same HTTPS API base URL.
- Add a single env var (e.g. `EXPO_PUBLIC_PAPERS_API_URL`) in Expo/EAS and point it to your Railway service URL.
- Ensure the app uses that env var everywhere it calls:
  - `POST /api/extract-paper`
  - `POST /api/mark-answer`

---

## H) Database cleanup + curriculum data refresh (scrapes + embeddings)
### Why this matters
By launch, data issues become user-facing quickly (missing/duplicated content, broken joins, poor search results). A short, deliberate cleanup + refresh prevents “death by a thousand cuts” during beta.

### Database cleanup (recommended scope for v1)
- **Consistency + constraints**
  - Normalize/standardize identifiers for: exam boards, subjects, qualifications, paper codes.
  - Add/verify key constraints (unique keys for “paper identity”), and foreign keys where safe.
- **De-duplication + archival**
  - Remove duplicates created by repeated scrapes.
  - Archive or mark stale rows instead of hard-deleting where you need auditability.
- **Performance**
  - Add indexes needed for your most common queries (papers listing, question lookup, vector search joins).
  - Vacuum/analyze (or Supabase equivalent maintenance) after large deletes/updates.

### Scraping exam boards (finish + rerun)
- **Define “done”**
  - List target exam boards and confirm coverage (which subjects/papers/years).
  - Confirm failure handling (retries, partial runs) and idempotent upserts.
- **Run refresh**
  - Rerun scrapes into staging/preview first (spot-check counts + spot-check a few papers end-to-end).
  - Then promote to prod once counts and samples look right.

### Embeddings refresh (vector search)
- **Rebuild strategy**
  - Decide the embedding unit (question-only vs question+markscheme vs chunked passages).
  - Store embedding model/version metadata so future migrations are easier.
- **Quality gates**
  - Small “golden set” of representative queries with expected top results.
  - Measure basic recall manually (top 5/10 contains what you expect) before beta.

### Suggested timing (to protect Feb 1)
- **Week 1**: finalize scope + write migrations/cleanup scripts + confirm exam board coverage list
- **Week 2–3**: run cleanup + complete scrapers + run full scrape + rebuild embeddings + validate vector search
- **Week 4**: only incremental fixes during beta (avoid big reshapes unless critical)


