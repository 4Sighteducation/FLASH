## Security Review & Remediation Playbook (FLASH)

This document is designed to be worked through systematically. It includes:
- What to check
- Why it matters
- What “good” looks like
- How to fix
- How to verify

## 0) Executive summary

### Current security posture (high-level)

- **Strengths**
  - Several sensitive tables are protected by RLS and/or fully locked down (e.g. `parent_claims` is “no access” to clients).
  - Key webhooks (Stripe / SendGrid signed webhook) are verified and behaving as expected.

- **Top risks**
  1) SECURITY DEFINER functions in the DB not explicitly locked down → privilege escalation risk.
  2) Public-cost / high-impact Edge Functions using service role (and OpenAI) need airtight access control.
  3) Mobile auth session tokens stored in AsyncStorage (not encrypted) + verbose logging of auth URLs/tokens.

## 1) Inventory (what we’re protecting)

### Assets
- **User accounts**: Supabase auth users + sessions
- **Entitlements**: Pro/Premium access via RevenueCat/beta access/codes
- **User content**: flashcards, progress, reviews
- **PII**: emails, parent email flows, device telemetry
- **Secrets**:
  - Supabase service role keys (server-only)
  - Stripe webhook secrets
  - RevenueCat webhook secret / server API key
  - SendGrid API key / signed webhook public key
  - OpenAI API key

### Main attack surfaces
- **Mobile app**: auth session storage, deep links, logging
- **Supabase**: RLS policies, DB functions (especially SECURITY DEFINER), Edge Functions
- **3rd-party webhooks**: SendGrid / Stripe / RevenueCat

## 2) Mobile app review checklist

### 2.1 Auth session storage (High)
- **Finding**: Supabase client stores session in AsyncStorage (not encrypted).
- **Risk**: On compromised devices (root/jailbreak), tokens can be extracted → account takeover.
- **Fix**:
  - Switch Supabase auth storage to `expo-secure-store` (already installed).
  - Keep only non-sensitive preferences in AsyncStorage.
- **Verify**:
  - Re-login and confirm session persists.
  - Confirm tokens are not visible in AsyncStorage.

### 2.2 Sensitive logging (High)
- **Finding**: OAuth callback URL is logged verbatim, which can include auth codes/tokens.
- **Risk**: Logs can leak auth codes/tokens via device logs, crash reports, analytics pipelines, or support screenshots.
- **Fix**:
  - Add a `logger.ts` wrapper:
    - Production: no raw URLs, no tokens, no keys.
    - Always redact `code`, `access_token`, `refresh_token` if present.
  - Ensure production builds don’t enable debug logging.
- **Verify**:
  - Run through OAuth flow; confirm logs do not contain codes/tokens.
  - Confirm release build logs are minimal.

### 2.3 Deep links / password reset links (Medium)
- **Finding**: Deep link handler parses `access_token` and `refresh_token` from links (fallback path).
- **Risk**: Malicious apps can try to invoke deep links; tokens still must be valid but hardening reduces risk.
- **Fix**:
  - Accept recovery links only when `type=recovery` is present and matches expected format.
  - Consider dropping implicit-token parsing if PKCE is sufficient.
- **Verify**:
  - Valid reset link works; random deep link does nothing.

## 3) Supabase review checklist

### 3.1 SECURITY DEFINER DB functions (Critical)
These are the highest priority if exposed.

- **`redeem_access_code(text, uuid)`**
  - Risk: if callable by users and they can choose `p_user_id`, they can redeem on behalf of others.
  - Fix: enforce `p_user_id = auth.uid()` for non-service role; lock down EXECUTE privileges.

- **`grant_pro_to_user(...)` and `waitlist_auto_pro_on_auth_user_insert()`**
  - Risk: direct “grant pro” escalation if callable.
  - Fix: revoke execute for `authenticated`/`public`; only internal trigger paths/service role should run them.

- **`ensure_user_profile(uuid, text, text)`**
  - Risk: SECURITY DEFINER + user-supplied `p_user_id`/`p_email` can corrupt profiles or spoof email.
  - Fix: enforce `auth.uid() = p_user_id` for non-service role; prefer email from `auth.users`.

### 3.2 Edge Functions: auth, service role use, and cost controls (Critical/High)

- **`search-topics`**
  - Risk: service role + OpenAI costs + potential data access if public.
  - Fix: require JWT, validate user session, add rate limiting.

- **`send-daily-due-cards`**
  - Risk: could leak debug data / send push at scale if public.
  - Fix: require internal secret or service-role authorization; disable debug output in prod.

### 3.3 RLS policy coverage (High)
- Build an **RLS coverage matrix** for every table the app touches.
- Verify:
  - RLS enabled where appropriate
  - user-scoped policies use `auth.uid()`
  - no unintended “public read” policies exist

## 4) Dependencies

### 4.1 `node-forge` (resolved)
- `npm audit --omit=dev` flagged `node-forge <= 1.3.1`.
- Fix: pinned via npm overrides to `node-forge@^1.3.2`.
- Verify: `npm audit --omit=dev` shows 0 vulnerabilities.

## 5) Remediation plan (Critical + High) — step-by-step

### Phase 1 (same day): Close critical escalation paths
1) DB hardening migration (SECURITY DEFINER privilege + caller checks)
2) Lock down `search-topics` (JWT + explicit auth)
3) Lock down `send-daily-due-cards` (internal auth + disable debug in prod)

### Phase 2 (1–3 days): Mobile high-risk items
1) Use SecureStore for auth tokens
2) Production logging policy (redaction + minimal logs)
3) Ensure production build disables debug

### Phase 3 (1–2 weeks): Hardening + governance
- Full RLS matrix and automated checks
- Abuse prevention: rate limits, anomaly alerts
- Incident playbook: key rotation, emergency disable

