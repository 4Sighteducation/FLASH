## iOS Payments (TestFlight) Checklist — RevenueCat

### Pre-flight (5 min)
- Confirm the build you’re installing is a **store build** (TestFlight), not Expo Go.
- In RevenueCat:
  - **Offering**: `default`
  - **Entitlements**: `premium`, `pro`
  - **Packages** (identifiers must match code): `premium_monthly`, `premium_annual`, `pro_monthly`, `pro_annual`
- In the app code, purchases are looked up by package identifier:
  - `purchaseFromOffering()` uses `pkgId = \`${plan}_${billing}\`` (e.g. `premium_monthly`)

### Test device setup
- Install the app from TestFlight.
- Use an **Apple sandbox tester** when prompted by the purchase sheet (not your real Apple ID for payment).
  - (If needed) iOS Settings → App Store → **Sandbox Account**

---

## Core purchase flows (run all)

### 1) Premium monthly purchase
- Log in as a normal test user (not the 4 reviewer override accounts).
- Go to Profile → **View plans** → choose **Monthly** → tap Premium.
- Expected:
  - Apple purchase sheet appears
  - Purchase succeeds
  - App shows tier = **Premium**
  - Premium features unlocked, Pro-only features still locked

### 2) Premium annual purchase (trial)
- On a fresh test user (or after cancelling/expiring monthly), choose **Annual** → tap Premium.
- Expected:
  - Trial messaging appears on Apple sheet (if configured in App Store Connect)
  - App shows tier = **Premium**

### 3) Pro monthly purchase
- Choose **Monthly** → tap Pro.
- Expected:
  - Purchase succeeds
  - App shows tier = **Pro**
  - Past Papers become accessible

### 4) Pro annual purchase
- Choose **Annual** → tap Pro.
- Expected: same as above, Pro active.

---

## Restore + fresh install

### 5) Restore purchases (same device)
- Delete the app.
- Reinstall from TestFlight.
- Log in to the same account.
- Go to Profile → **Restore Purchase** (or Paywall → Restore purchases).
- Expected:
  - Restore succeeds
  - Tier returns to Premium/Pro appropriately

### 6) Restore purchases (new device) — optional
- Install on a second device using same sandbox account.
- Log in with the same app user.
- Restore.
- Expected: tier restored.

---

## Edge cases (high value)

### 7) Upgrade & downgrade behavior
- Upgrade: Premium → Pro.
- Downgrade: Pro → Premium (via iOS Manage Subscriptions).
- Expected:
  - App reflects the correct tier after reopen (or after Restore)
  - No “stuck behind paywall” state

### 8) Cancellation / billing issues
- Cancel subscription in iOS Subscriptions settings.
- Wait for end of period (or use StoreKit config in local builds if you do later).
- Expected:
  - Tier drops when entitlement expires (may require reopen/restore)

---

## Notes (important)
- Your app currently ties RevenueCat identity to **Supabase user id** (`Purchases.logIn(user.id)`).
- The 4 special accounts can be overridden via DB (`public.user_subscriptions`) for App Review / testers.
- For production accuracy, plan to add **RevenueCat webhooks → Supabase** as the durable source of truth.


