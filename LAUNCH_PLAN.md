Plan of action (now → Feb 1, 2026)

Status (as of Dec 17, 2025)
- [x] RevenueCat dashboard configured (iOS app, keys, entitlements, Offering `default`, packages)
- [x] App Store Connect subscriptions created/configured (Premium/Pro monthly+annual; Ready to Submit)
- [x] In-app paywall screen added (neon themed) + reachable from Profile
- [x] Guardrails in-app:
  - [x] Free limits enforced (subjects + flashcards) with upsell → Paywall
  - [x] Past Papers gated to Pro (tab-level + screen-level defense)
- [x] RevenueCat SDK integrated in app:
  - [x] Tier auto-sync via entitlements (`free`/`premium`/`pro`)
  - [x] Paywall purchases wired (monthly default, annual option)
  - [x] Restore purchases wired
- [x] iOS build pipeline working (EAS Build + EAS Submit → TestFlight)
- [ ] Payment testing on-device (TestFlight + sandbox accounts):
  - [ ] Premium monthly + annual (confirm Premium annual trial)
  - [ ] Pro monthly + annual
  - [ ] Upgrade/downgrade behavior
  - [ ] Restore purchases on fresh install
- [ ] Android: set up Play Console products + RevenueCat Android app + EAS build
- [ ] Decide subscription “source of truth” (RevenueCat webhooks vs best-effort app sync only)
0) This week (now → Dec 23): “Decisions + stability first”
Payments decision (must unblock everything)
Pick one for v1: RevenueCat (recommended) + paid tiers (Premium/Pro) with a Free tier.
Confirm product model: subscriptions (monthly + annual) for Premium and Pro.
Define canonical IDs (keep stable):
- Entitlements: `premium`, `pro`
- Offering: `default`
- Packages: `premium_monthly`, `premium_annual`, `pro_monthly`, `pro_annual`
Schema + backend readiness freeze (minimum launch set)
Confirm public.user_subscriptions fields/flows (tier, expires_at, source, status).
Add a clean “tester entitlement” mechanism (e.g., full with far-future expires_at, or a distinct beta_full).
Database cleanup + data refresh plan (new)
Define DB cleanup scope (dedupe, standardize identifiers, constraints/indexes) + list migrations/scripts needed.
Define scraping scope: which exam boards/subjects/papers are “in” for v1; ensure scrapes are idempotent.
Define embeddings refresh plan: embedding unit, model/version metadata, and a small “golden query set” for QA.
App hardening (kill last major UX bugs)
Triage the “Papers / extraction / keyboard / timers” issues into a short hit list and fix the top-risk items.
Add crash/error reporting (Sentry or Expo equivalent) and verify it captures: auth failures, API timeouts, purchase errors.
Railway extraction service production switch (launch requirement)
Add/verify Gunicorn and set Railway start command accordingly (as noted in your plan).
Add dependency pinning to reduce “cached layer mismatch” surprises.
Exit criteria by Dec 23
Payments direction locked, product IDs chosen, minimal schema confirmed, extraction service runs production-grade, and the app feels stable for testers.
1) Week 2–3 (Dec 24 → Jan 10): “Store-ready builds + real purchase/restore”
Implement purchases end-to-end
Integrate RevenueCat SDK (or your chosen rail).
On app start: check entitlement, set app state, sync to Supabase (user_subscriptions).
Implement restore flow and test across fresh install + re-login scenarios.
Add a consistent Paywall screen/modal that cleanly explains Lite vs Full limits.
Execute DB cleanup + rebuild data (new)
Run dedupe/normalization + add required indexes/constraints so beta data stays stable.
Finish remaining exam-board scrapers, rerun scrapes, and rebuild embeddings used for vector search.
Validate search quality with the golden query set (top results look right).
Tester entitlement flow
Add an automated way to grant Full access to the beta cohort by email.
Ensure testers never get stuck behind a paywall.
Internal distribution
Set up TestFlight Internal + Play Internal builds.
Confirm bundle IDs, icons, splash, permissions strings, privacy labels basics.
Operational checks
Add build/version display in Settings + include it in bug reports.
Add minimal analytics (optional but useful): screen views + key actions (extraction started/completed, purchase started/completed, study session completed).
Exit criteria by Jan 10
You can install internal builds, buy/restore reliably, and the backend reflects entitlements correctly.
2) Week 4 (Jan 11 → Jan 24): “Beta rollout (10 students) + feedback loop”
Move to external testing
iOS: TestFlight External group “Beta Students”
Android: Play Closed Testing
Onboarding + feedback ops
One-page onboarding doc: install link, login instructions, “what to test”, how to report bugs.
Google Form: device/OS, scenario tested, bugs + screenshots, UX rating.
A weekly 15-min review loop with a tiny prioritized fix list.
Notifications (push + in-app)
Add expo-notifications if needed.
Store device tokens in Supabase per user/device.
Implement server-side sending (Railway/cron/Vercel cron):
Extraction completed
Daily “cards due”
Optional streak reminder
Build Settings toggles + respect opt-outs (quiet hours optional).
Exit criteria by Jan 24
Real users are using it on-device; you’re getting structured feedback; push notifications work end-to-end.
3) Week 5 (Jan 25 → Feb 1): “Release candidate + submissions”
Release candidate hardening
Fix top beta issues, especially: purchase edge cases, extraction reliability, timers, crashes.
Final pass on Settings to remove anything “dev/admin-y” and ensure support/legal sections exist.
Store submission readiness
App Store: screenshots (6–8), short/long description, privacy labels, IAP metadata, review notes.
Play: feature graphic, screenshots, data safety, closed test status requirements met.
Marketing assets
Record the 2 × ~30s videos you outlined:
“Study fast” (cards → study → XP/rank)
“Past Papers” (timer → submit → AI marking → summary)
Submit
EAS Build + EAS Submit, then monitor review feedback and respond fast.
Exit criteria by Feb 1
Approved builds (or in final review), stable entitlement/push flows, and launch checklist complete.
Highest-risk items to tackle early (to protect the Feb 1 date)
Payments/entitlements (always the biggest schedule risk)
Push notification delivery + token storage
Extraction service concurrency/stability (Gunicorn + timeouts + retry behavior)
Beta ops (if the feedback loop isn’t ready, you lose the value of the beta window)
Quick clarifying questions (so I can tighten this into a concrete task board)
Payments: Do you want RevenueCat for v1 (yes/no), and do you prefer subscription or one-time for Full?
Backend: Are you already using Supabase exclusively for subscription state, or do you also want RevenueCat webhooks to be the source of truth?
Notifications: Are you okay shipping only “extraction completed” + “cards due” for v1, skipping streak reminders if time gets tight?
If you want, I can turn this into a week-by-week checklist in a new LAUNCH-CHECKLIST.md and (if you say so) add/commit/push it to your repo.