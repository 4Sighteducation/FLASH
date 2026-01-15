# Pro-only + 30-day free access remodel (2026-01)

## Goal (new business rules)

- **Single paid tier**: only **Pro** (“Revise like a Pro”).
- **Pricing**: **£3.99 / month** or **£39.99 / year** (2 months free).
- **Default experience**: all new users get **Pro features for 30 days**.
- **Nudges**: show time-remaining progress + gentle purchase prompts (see cadence below).
- **Expiry**: if not upgraded at day 30:
  - account remains (login/profile stays)
  - user falls back to **Free** limits
  - **all user content is wiped** (cards/subjects/topics/progress). (You’ve chosen hard wipe because AI cards are regeneratable.)

This doc inventories what exists today and what must change to reach the target state safely.

---

## Important product/compliance decision (must pick one)

### Option A — “True store trial” (industry standard)
- User starts a Pro subscription with an introductory trial in App Store / Google Play / RevenueCat.
- Typically **requires a payment method** up-front.
- Pros: highest compliance clarity, clean entitlement logic (RevenueCat handles expiry), standard UX.
- Cons: conflicts with “no credit card required” marketing.

### Option B — “30 days of free Pro access” (no payment method)
- App grants Pro server-side for 30 days (e.g., DB override) without starting a store subscription.
- Pros: matches “no card required”, simpler onboarding.
- Cons: you must implement **expiry**, **anti-time-cheat**, **downgrade wipe**, and **conversion UX** yourselves.

Everything below assumes **Option B** because that matches your message, but we can still configure store trials later.

---

## Current state (what exists today)

### 1) App tier model + enforcement

- **Tier type**: `free | premium | pro` with legacy mapping `lite -> free`, `full -> pro`.
  - `src/contexts/SubscriptionContext.tsx`
- **Limits** are enforced client-side (subjects/topics/cards) via `checkLimits()`.
- **Gating** examples:
  - Past Papers tab is gated to Pro and shows a “launch offer” message.
    - `src/navigation/MainNavigator.tsx`
  - “Difficulty mode” is gated to Pro (profile).
    - `src/screens/main/ProfileScreen.tsx`

### 2) Paywall + RevenueCat coupling

- RevenueCat offering id: **`default`**
- Package identifiers are assumed to be: `premium_monthly`, `premium_annual`, `pro_monthly`, `pro_annual`
  - `src/services/revenueCatService.ts` (`purchaseFromOffering`, `getOfferingPackagePricing`)
- Paywall UI currently shows **Free + Premium + Pro** and “Launch offer” messaging.
  - `src/screens/paywall/PaywallScreen.tsx`

### 3) Server-side overrides / access systems

- `public.beta_access` table (allowlist) can grant `premium` or `pro` until `expires_at`.
  - `supabase/migrations/20260106_beta_access.sql`
  - App reads this as highest-priority override in `SubscriptionContext`.
- `public.access_codes` + `redeem_access_code()` can grant `tier` + `expires_at`.
  - `supabase/migrations/20260106_access_codes.sql`
  - `supabase/migrations/20260108_security_hardening_phase1.sql`
- Edge functions / admin tooling currently support `tier: 'premium' | 'pro'` in places.
  - e.g. `supabase/functions/access-code-admin/index.ts`

### 4) Subscription persistence table drift (critical risk)

- There is an old `user_subscriptions` definition in `supabase/create-subscriptions-table.sql` with `tier IN ('lite','full')`.
- The app + newer migrations already assume `user_subscriptions.tier` can be `free/premium/pro` in some environments.
- Result: environments may differ; any new work must **standardize `user_subscriptions` via a migration**.

---

## Target architecture (recommended)

### A) Keep the tier model simple in app

- `SubscriptionTier = 'free' | 'pro'`
- Treat any legacy `premium` entitlement as **Pro** during a transition period (see migration plan).

### B) Store trial window server-side (Option B)

Create/standardize a **single “entitlement source of truth”**:

- `user_subscriptions` (or a new `access_grants` table) stores:
  - `tier` = `'pro'` (during the 30 days) then `'free'`
  - `starts_at`, `expires_at`
  - `source` (`'trial' | 'revenuecat' | 'code' | 'beta' | 'stripe_parent' | ...`)

App displays:
- **days remaining** \(expires_at - now\)
- **progress bar** (elapsed / 30 days)

### C) Expiry behavior (“wipe”)

At expiry, you need two parts:

1) **Access downgrade**: ensure app resolves to Free when trial expires.
2) **Data wipe / archive**:
   - Implement a server-side job (Supabase cron Edge Function) that:
     - finds users whose trial expired and are not Pro via RevenueCat/beta/code
     - deletes (or archives) their user content
   - Also run a “just-in-time” check on app start/login as a fallback.

Note: hard wipe is doable and “clean”, but it’s still irreversible. The runbook below makes it safe/atomic and prevents partial wipes.

---

## Reminder cadence (your suggestion vs typical patterns)

There is no single universal standard, but common practice is:
- **few prompts early** (let value land),
- **more frequent near expiry**,
- trigger prompts at **high-intent moments** (creating cards, opening Papers, exporting, etc.).

Your cadence is reasonable:
- day 10, day 20, then daily for last 3 days.

Suggested “least annoying” implementation:
- 1 in-app modal at day 10, 1 at day 20, 1 at day 27, 1 at day 29, **final hard gate** at expiry.
- Optional: use banners/toasts instead of modals for the daily last-3 touches.

---

## Migration strategy (don’t break existing paying users)

Even if you “remove Premium”, you must avoid stripping access from:
- existing Premium subscribers
- codes/beta rows that grant Premium

Safer transition:

1) **Stop selling Premium**:
   - hide it in paywall UI
   - remove it from marketing copy
2) **Keep compatibility**:
   - in app: treat `premium` as `pro` for access checks (until Premium subs churn out)
   - in RevenueCat: map Premium products to the **Pro entitlement** (or keep both entitlements but app only uses Pro)
3) **After 3–6 months**:
   - remove Premium products/entitlement when no active users remain

---

## Concrete “unpick & rebuild” checklist

### 1) RevenueCat + Stores
- Create/update products:
  - Pro monthly: **£3.99**
  - Pro annual: **£39.99**
- Offering `default` should expose only:
  - `pro_monthly`, `pro_annual`
- Decide what to do with `premium_*` products:
  - keep but not offered, or map to Pro entitlement

### 2) App code changes (FLASH)
- **Remove Premium from UI**:
  - Paywall: Pro-only
  - Profile: show “Free” vs “Pro”, button label “View plans”
  - Remove “Launch offer / Premium Annual includes Pro” copy
- **Refactor tier type**:
  - `SubscriptionTier` becomes `free | pro` (keep a temporary normalizer for legacy)
  - `resolveTierFromCustomerInfo()` maps any Premium to Pro during transition
- **Add trial state**:
  - expose `expiresAt` (and `startsAt`) from `SubscriptionContext`
  - implement progress bar UI + reminder scheduler
- **Expiry enforcement**:
  - on app start and on sign-in, if trial expired and not Pro: trigger backend wipe and downgrade locally.

### 3) Supabase changes
- Add a migration to **standardize `user_subscriptions`**:
  - broaden tier enum/check to include `free/pro` (and optionally `premium` temporarily)
  - add `starts_at`, `expires_at`, `source`, `updated_at` rules
- Add a function/RPC to start the trial on first real use:
  - grant 30-day Pro trial (best-effort, never block signups)
- Add a server-side “wipe user content” function (service_role only)
- Add a scheduled job (cron) to run wipes for expired trial users

### 4) Marketing site (FLASH_marketing)
- Update homepage pricing section:
  - remove Premium column
  - show **Pro** pricing (monthly/annual) + “1 month free Pro access” messaging
- Ensure messaging matches Option A vs B:
  - if Option B: you can keep “No credit card required”
  - if Option A: must remove/adjust that claim

### 5) QA / rollout
- Test matrix:
  - new user day 0 → Pro access
  - day 10/20/27/28/29 prompts
  - day 30 expiry → downgrade + wipe
  - paying Pro overrides trial expiry
  - legacy Premium still treated as Pro
  - restore purchases flow still works

---

## Engineering runbook (detailed implementation map)

This is an ordered checklist you can execute end-to-end.

### Phase 0 — Definitions (set these constants once)

- **Trial length**: 30 days
- **Reminder schedule**:
  - day 10, day 20 (modal)
  - last 3 days (banner or lighter modal)
- **Outcome at expiry**: hard wipe + downgrade to Free
- **Single paid plan**: Pro monthly/annual

### Phase 1 — RevenueCat + stores (stop selling Premium)

- [ ] **RevenueCat entitlements**
  - [ ] Ensure `pro` entitlement exists and is the only one the app will care about going forward.
  - [ ] (Transition) If `premium` entitlement exists, keep it temporarily but the app should treat it as Pro if seen.
- [ ] **Products / packages**
  - [ ] Create/adjust products for:
    - [ ] Pro monthly £3.99
    - [ ] Pro annual £39.99
  - [ ] Update offering `default` to include only packages:
    - [ ] `pro_monthly`
    - [ ] `pro_annual`
  - [ ] Remove/hide `premium_*` packages from the offering (do not delete yet unless you are sure no one has them).

### Phase 2 — Supabase schema (trial as server source-of-truth)

#### 2.1 Standardize `public.user_subscriptions`

You currently have drift between an old `lite/full` table definition and newer expectations. Fix this with a migration.

- [ ] Create a new migration `supabase/migrations/YYYYMMDD_pro_trial_v1.sql` that:
  - [ ] Ensures `public.user_subscriptions` exists
  - [ ] Makes `user_id` the unique key (1 row per user)
  - [ ] Updates the allowed tiers to include at least: `free`, `pro`
    - [ ] (Optional for transition) allow `premium` temporarily
  - [ ] Adds fields (if missing):
    - [ ] `source` text
    - [ ] `started_at` timestamptz
    - [ ] `expires_at` timestamptz
    - [ ] `trial_used_at` timestamptz
    - [ ] `expired_processed_at` timestamptz
    - [ ] `updated_at` timestamptz default now()
  - [ ] Adds/updates RLS:
    - [ ] user can `select` their own row
    - [ ] only service_role can `insert/update/delete` (recommended; app doesn’t need to write directly)

#### 2.2 Start trial on first real use (RPC)

- [ ] Add a function `public.ensure_pro_trial_started()`
  - Input: none (uses `auth.uid()`)
  - Behaviour:
    - [ ] If caller not authenticated → error
    - [ ] If caller has an active higher-priority grant (e.g., `beta_access` Pro, code Pro) → do nothing
    - [ ] If `trial_used_at` is null:
      - set `trial_used_at = now()`
      - set `started_at = now()`
      - set `expires_at = now() + interval '30 days'`
      - set `tier = 'pro'`
      - set `source = 'trial'`
    - [ ] If `trial_used_at` already set → do nothing (prevents repeat)

Design note: this avoids starting the trial at sign-up (wasted days) and prevents “make a new password reset flow, get another month” behaviour for the same account.

#### 2.3 Hard-wipe function (service role only)

- [ ] Add a service-role-only function `public.hard_wipe_user_study_data(p_user_id uuid)` that:
  - [ ] Deletes user-owned rows across all relevant tables in a safe order
  - [ ] Does **not** delete `auth.users`
  - [ ] Uses a transaction so it’s all-or-nothing

Minimum expected delete set (verify against your actual schema before implementing):
- `flashcards` (user’s cards)
- `card_reviews`
- `study_sessions`
- `user_topics`
- `user_subjects` (if present)
- `paper_progress` (if present)
- `paper_question_xp_awards` / `paper_xp_awards` (if present)
- `user_stats` (or reset)
- `user_settings` (optional reset)
- any other user-owned progress tables added by later migrations

#### 2.4 “Process expiry” function + scheduled job

- [ ] Add `public.process_expired_trial_user(p_user_id uuid)` (service_role only):
  - [ ] Confirms the trial is expired by server time
  - [ ] Confirms user is not Pro via:
    - RevenueCat webhook writes (if you write paid access to DB), OR
    - `beta_access`, OR
    - a “paid Pro” marker in `user_subscriptions`
  - [ ] If already processed (`expired_processed_at` not null) → no-op
  - [ ] Calls `hard_wipe_user_study_data(p_user_id)`
  - [ ] Sets `tier='free'`, `source='free'`, `expired_processed_at=now()`, clears `expires_at` if you want
- [ ] Add a Supabase scheduled Edge Function (cron) that runs daily:
  - [ ] Finds users with `expires_at < now()` and `expired_processed_at is null`
  - [ ] Calls the process function for each

### Phase 3 — App changes (FLASH)

#### 3.1 Remove Premium, keep compatibility

- [ ] `src/services/revenueCatService.ts`
  - [ ] Change `Plan` type to only `'pro'`
  - [ ] Update package parsing to only accept `pro_monthly` / `pro_annual`
  - [ ] `resolveTierFromCustomerInfo`: treat any `premium` entitlement as `pro` (transition safety)
- [ ] `src/screens/paywall/PaywallScreen.tsx`
  - [ ] Remove Premium card + “launch offer” messaging
  - [ ] Pro card uses the updated copy and pricing lines
  - [ ] Only calls `purchasePlan('pro', billing)`
- [ ] `src/navigation/MainNavigator.tsx`
  - [ ] Update the Papers-tab gate message to “Pro feature” (remove Premium/offer wording)
- [ ] `src/screens/main/ProfileScreen.tsx`
  - [ ] Display only Free vs Pro
  - [ ] Keep CTA label “View plans” (already present)

#### 3.2 Trial start + state

- [ ] `src/contexts/AuthContext.tsx`
  - [ ] After login/session refresh, call `supabase.rpc('ensure_pro_trial_started')` best-effort
- [ ] `src/contexts/SubscriptionContext.tsx`
  - [ ] Fetch `user_subscriptions` row (tier + expires_at + source)
  - [ ] Expose `expiresAt` to UI
  - [ ] If now > expires_at and tier is still Pro and not paid/beta/code:
    - [ ] invoke a server function/edge endpoint to process expiry (best-effort)
    - [ ] refresh the subscription state afterward

#### 3.3 Progress bar + reminders

- [ ] Add a small “Pro free month” progress component to Home (and/or Profile):
  - [ ] show “X days left” and a progress bar
  - [ ] include a “View plans” CTA
- [ ] Implement reminder scheduling:
  - [ ] Compute `dayNumber = floor((now - started_at)/1 day) + 1` and/or days remaining from server `expires_at`
  - [ ] Use AsyncStorage flags per user to avoid repeat prompts
  - [ ] Prompts open paywall via existing `navigateToPaywall()`

### Phase 4 — Marketing site updates (FLASH_marketing)

- [ ] `app/page.tsx`
  - [ ] Remove Premium pricing and Premium references
  - [ ] Update Pro pricing to £3.99/mo and £39.99/yr
  - [ ] Update CTA copy to “Get Pro free for 30 days”
- [ ] Search the repo for “Premium”, “trial”, “launch offer”, “£2.99/£4.99/£29.99/£49.99” and update.

### Phase 5 — QA checklist (must-pass)

- [ ] New user logs in → trial starts → tier resolves to Pro
- [ ] Trial day 10 prompt shows once
- [ ] Trial day 20 prompt shows once
- [ ] Last 3 days prompts show once per day
- [ ] Day 30 expiry:
  - [ ] user becomes Free
  - [ ] user cards/topics/progress are wiped
  - [ ] app doesn’t crash on missing data (fresh onboarding works)
- [ ] Paid Pro purchase overrides expiry and prevents wipe
- [ ] Restore purchases keeps Pro access


