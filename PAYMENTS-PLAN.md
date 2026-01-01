# Payments Plan (FLASH) — Free / Premium / Pro + Schools + Web

Last updated: 2025-12-16

## Goals
- Ship a **simple, Apple-safe** monetization setup for v1 (Feb 1, 2026).
- Support **three tiers** (Free / Premium / Pro) with clean upgrade paths.
- Preserve a path to **school bulk licensing** (codes/seats) without blocking launch.
- Keep the option to unify **iOS + Android + Web** billing later (RevenueCat Web Billing).

---

## Guiding principles (keep launch low-risk)
- **Use Apple IAP for iOS digital features** (avoid “pay on the web to unlock in iOS” for consumers).
- Prefer **one canonical entitlements model** across platforms:
  - Free = no entitlement
  - Premium = `premium`
  - Pro = `pro` (and Pro includes Premium)
- Start with **Monthly + Annual** (and handle “2-year courses” with renewal offers + school licensing, not a 2-year iOS duration).
- Defer complex edge cases until after a stable v1:
  - Ads in Free
  - Multi-seat school management UI
  - 2-year consumer plans
  - Advanced discount segmentation

---

## Tier definitions (what users get)

### Free (no purchase)
Recommended “v1 Free” scope:
- **1 subject**
- **1 topic**
- **10 cards**
- **No papers**
- **No AI**
- **No voice**
- **No export**
- Gamification: optional (keep minimal if you want retention; otherwise remove from Free)

Notes:
- Free tier is purely an **app-side ruleset** (not a store product).
- Ads can be added later but increase review + privacy complexity.

### Premium (subscription)
Premium unlocks:
- Unlimited (or higher) limits on cards/subjects/topics (as defined in `SubscriptionContext.tsx`).
- Everything needed to be “fully useful” without the most expensive features (optional).

Recommended v1:
- **Monthly** + **Annual**
- **14-day free trial** (introductory offer)

### Pro (subscription)
Pro unlocks everything in Premium plus the “power features”:
- Past papers & mark schemes
- AI features (card generation, marking, voice analysis, etc.)
- Advanced analytics (if present)

Recommended v1:
- **Monthly** + **Annual**
- Trial: optional (either **none** or **7 days**)

---

## Short-term (v1 for Feb 1, 2026) — “Ship the basics”

### Decisions to lock
- Billing cadence: **Monthly + Annual** for Premium and Pro.
- Trials:
  - Premium: **14 days**
  - Pro: **none** (or 7 days; pick one)
- Pricing (exact numbers can be tuned later):
  - Premium monthly / annual
  - Pro monthly / annual

### App Store Connect (iOS) setup
1) Create **Subscription Group**: “FLASH Subscriptions”
2) Create 4 products:
   - Premium Monthly
   - Premium Annual
   - Pro Monthly
   - Pro Annual
3) Configure:
   - Pricing
   - Localization strings
   - Intro offer / free trial for Premium (14 days)
4) Ensure App Store Connect “Agreements, Tax, and Banking” are complete if the app is paid/IAP.

### Product IDs (recommended convention)
Use stable IDs that you also mirror on Android where possible:
- `flash_premium_monthly`
- `flash_premium_annual`
- `flash_pro_monthly`
- `flash_pro_annual`

If you prefer a prefix, keep it consistent forever (e.g. `com.foursighteducation.flash.premium.monthly`).

### RevenueCat setup (iOS)
**Entitlements**
- `premium`
- `pro`

**Rule**: Pro includes Premium  
Map Pro products to grant **both** entitlements: `pro` **and** `premium`.

**Offering**
- Offering ID: `default`
- Packages:
  - Premium Monthly (custom package)
  - Premium Annual (custom package)
  - Pro Monthly (custom package)
  - Pro Annual (custom package)

Why custom packages: RevenueCat’s default `monthly`/`annual` package names collide if you have two tiers with the same duration.

### App logic (how the app decides the tier)
At runtime:
1) If user has entitlement `pro` → Pro
2) Else if user has entitlement `premium` → Premium
3) Else → Free

### UX (paywall / upgrade)
Recommended:
- One paywall screen showing Free vs Premium vs Pro, with:
  - Clear feature differences
  - Monthly/Annual toggle per tier
  - Restore purchases
  - Legal links (Terms/Privacy)

### Testing checklist (v1)
- Purchase Premium monthly + annual (sandbox)
- Purchase Pro monthly + annual (sandbox)
- Upgrade Premium → Pro
- Downgrade Pro → Premium
- Cancel and confirm entitlements update
- Restore on fresh install
- Verify Free tier limits are enforced

---

## Medium-term (post-launch) — “Schools + year-2 incentives”

### Year-2 discounts (no 2-year tier required)
Goal: support “most courses are 2 years” without introducing 2-year iOS subscription duration.

Approach:
- Keep **Annual** subscriptions.
- Track subscription start/end in your backend (Supabase) from RevenueCat events.
- Use SendGrid to email an **Offer Code / Promotional Offer** near renewal:
  - e.g. “Year 2 discount” for Premium/Pro annual

Benefits:
- Apple-safe
- Keeps product catalog small
- Works for both individual users and schools

### School licensing (v1.5)
Target outcome: a school buys **N seats**, students receive access without needing card payments.

Recommended iOS-safe path:
- Use **Apple Subscription Offer Codes** for school cohorts when feasible, OR
- Treat school deals as **institutional licensing** (admin purchase) with:
  - seat management in backend
  - codes distributed by the school

Implementation options:
- **Codes**:
  - School buys seats (invoice/Stripe)
  - Backend generates N unique codes
  - Student redeems code in-app → backend grants access (e.g. sets `pro` entitlement in your DB)
- **Managed accounts** (later):
  - School uploads roster
  - Students provisioned automatically

Important iOS note:
- Avoid presenting “pay on web to unlock Pro” as a consumer workaround inside the iOS app.
- Keep school flows clearly “institutional access provided by your school”.

### Discount segmentation
Once you have stable cohorts:
- Student discount campaigns (Offer Codes / Promo Offers)
- Retention campaigns (win-back discounts)
- Regional pricing (store-managed) + occasional codes

---

## Long-term — “Unify iOS/Android/Web + advanced monetization”

### Web app billing via RevenueCat Web Billing (Stripe)
Goal: sell Premium/Pro on the web and keep entitlements consistent.

Recommended model:
- Use RevenueCat Web Billing to create web plans (Stripe-backed).
- Use the same entitlement names (`premium`, `pro`) so your apps share logic.
- Unify identity:
  - set RevenueCat `app_user_id` to your Supabase user id (stable)

Important Apple constraint:
- On iOS, still offer IAP.
- Avoid aggressive “go subscribe on the web” CTAs inside the iOS app.

### Ads in Free
Possible after stability:
- Add ad SDK
- Update privacy disclosures and App Privacy details
- Consider a “remove ads” add-on later (optional)

### More tiers / add-ons (optional)
If you later want add-ons:
- “Papers Pack”, “AI Pack”, “School Pack”
These can be implemented as additional entitlements, but keep v1 simple.

---

## Risks + mitigations
- **Store review risk (iOS)**:
  - Mitigation: keep consumer purchases inside IAP; position school licensing appropriately.
- **Tier complexity**:
  - Mitigation: entitlements-first model; keep 2-year as discount/renewal strategy.
- **Pricing changes**:
  - Mitigation: stable product IDs; new products for major structural changes.

---

## Next actions (practical checklist)
- [ ] Confirm Premium/Pro pricing (monthly + annual)
- [ ] Decide Pro trial (none vs 7 days)
- [ ] Create iOS subscription group + 4 products in App Store Connect
- [ ] Configure Premium intro offer (14 days)
- [ ] Import products into RevenueCat; create entitlements + offering
- [ ] Implement paywall + purchase/restore flows + entitlement gating
- [ ] Add a minimal “year-2 discount” note to roadmap (Offer Codes via email)
- [ ] Design school licensing v1.5 (codes + seat tracking)



