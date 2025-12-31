# Parent-first purchase flow (marketing website → child claims in app)

## Goal
Allow a parent to start on the marketing website, pay for an annual subscription, and then let the child unlock **Pro** inside the app.

Key design constraint: **don’t rely on matching the child’s email inside the app**, because *Sign in with Apple* may use a private relay email. Instead, we deliver a **claim code** to the child’s email, and the child redeems it after signing in.

## Components

### Database
Migration: `supabase/migrations/20251231_parent_claims.sql`

Table: `public.parent_claims`
- Stores the child email the parent entered
- Stores a one-time claim code
- Tracks Stripe ids and paid period end

### Edge functions

#### 1) `parent-checkout` (public)
Path: `supabase/functions/parent-checkout/index.ts`
- Input: `{ childEmail }`
- Creates a `parent_claims` row (status `created`)
- Creates a Stripe Checkout Session (subscription mode)
- Sets Stripe subscription metadata:
  - `parent_claim_id`
  - `child_email`

Config: `supabase/functions/parent-checkout/supabase.functions.config.json` → `{ "verify_jwt": false }`

#### 2) `stripe-webhook` (public)
Path: `supabase/functions/stripe-webhook/index.ts`
Handles 2 cases on `invoice.paid`:
- If `subscription.metadata.student_user_id` exists → grant/extend RevenueCat Pro (current working flow)
- Else if `subscription.metadata.parent_claim_id` exists →
  - mark `parent_claims` row as `paid`
  - email the **claim code + claim link** to the child via SendGrid

### Marketing website
- `/parents` → parent enters child email, redirected to Stripe checkout
- `/claim?code=...` → shows code + buttons to open app / install app

Files:
- `marketing/app/parents/page.tsx`
- `marketing/app/parents/thanks/page.tsx`
- `marketing/app/claim/page.tsx`
- `marketing/app/api/parent-checkout/route.ts` (proxies to Supabase Edge Function)

## Required Supabase secrets
These are in **Supabase Dashboard → Edge Functions → Secrets**:

### Stripe
- `STRIPE_SECRET_KEY_TEST`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET_TEST`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PARENT_PRICE_ID_TEST` (Stripe `price_...` for annual)
- `STRIPE_PARENT_PRICE_ID` (live `price_...`)
- `STRIPE_MODE` = `test` (default) or `live`

### RevenueCat
- `REVENUECAT_SECRET_API_KEY` (V2 secret key with Customer info read/write)
- `REVENUECAT_PROJECT_ID`
- `REVENUECAT_PRO_ENTITLEMENT_ID`

### SendGrid
- `SENDGRID_API_KEY`
- `SENDGRID_PARENTS_FROM_EMAIL` (e.g. `tony@fl4shcards.com`)

### Marketing base URL (optional)
- `FL4SH_MARKETING_BASE_URL` (default `https://www.fl4shcards.com`)

## Next implementation step (still pending)
Child redemption inside the app:
- Edge function `claim-pro` (verify JWT true)
- App screen to paste code / open deep link → calls `claim-pro`
- `claim-pro` grants RevenueCat Pro to the signed-in user id, then updates Stripe subscription metadata `student_user_id` for future renewals.
