import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type Tier = 'premium' | 'pro';

type Payload = {
  emails?: string[];
  userIds?: string[];
  tier?: Tier;
  expiresAtIso?: string | null;
  note?: string | null;
};

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function parseExpiresAtMs(expiresAtIso?: string | null): number | null {
  if (expiresAtIso === null) return null;
  const raw = (expiresAtIso || '').trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

async function revenueCatPost<T>(params: { url: string; apiKey: string; body: unknown }): Promise<T> {
  const res = await fetch(params.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[RevenueCat] ${res.status} ${text}`);
  return JSON.parse(text) as T;
}

async function listAllUsersByEmail(supabase: any, wanted: Set<string>) {
  // Supabase Admin API doesn't provide a direct "get by email", so we page listUsers.
  const found = new Map<string, { id: string; email: string | null }>();
  const perPage = 200;
  for (let page = 1; page <= 200; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    for (const u of users) {
      const em = normalizeEmail(u?.email || '');
      if (em && wanted.has(em) && !found.has(em)) {
        found.set(em, { id: u.id, email: u.email || null });
      }
    }
    if (users.length < perPage) break; // last page
    if (found.size === wanted.size) break;
  }
  return found;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    // Simple admin auth (for manual ops / scripts)
    const expected = (Deno.env.get('BETA_ACCESS_ADMIN_SECRET') || '').trim();
    const gotHeader = (req.headers.get('x-admin-secret') || '').trim();
    const auth = req.headers.get('authorization') || '';
    const gotBearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!expected || (gotHeader !== expected && gotBearer !== expected)) {
      return json(401, { ok: false, error: 'Unauthorized' });
    }

    const payload = (await req.json().catch(() => ({}))) as Payload;
    const tier: Tier = payload.tier === 'premium' || payload.tier === 'pro' ? payload.tier : 'pro';
    const expiresAtMs = parseExpiresAtMs(payload.expiresAtIso);
    const note = payload.note ? String(payload.note) : null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const emailSet = new Set((payload.emails || []).map(normalizeEmail).filter(Boolean));
    const explicitUserIds = new Set((payload.userIds || []).map((x) => String(x || '').trim()).filter(Boolean));

    // Resolve emails -> user IDs
    const emailToUser = emailSet.size > 0 ? await listAllUsersByEmail(supabase, emailSet) : new Map();

    const targets: Array<{ userId: string; email: string | null }> = [];
    for (const [email, u] of emailToUser.entries()) targets.push({ userId: u.id, email });
    for (const userId of explicitUserIds) targets.push({ userId, email: null });

    if (targets.length === 0) {
      return json(400, { ok: false, error: 'Provide emails[] or userIds[]' });
    }

    const rcApiKey = (Deno.env.get('REVENUECAT_SECRET_API_KEY') || '').trim();
    const rcProjectId = (Deno.env.get('REVENUECAT_PROJECT_ID') || '').trim();
    const rcProEntitlementId = (Deno.env.get('REVENUECAT_PRO_ENTITLEMENT_ID') || '').trim();
    const rcPremiumEntitlementId = (Deno.env.get('REVENUECAT_PREMIUM_ENTITLEMENT_ID') || '').trim();
    if (!rcApiKey || !rcProjectId) return json(500, { ok: false, error: 'Missing RevenueCat server config' });

    const entitlementId =
      tier === 'pro'
        ? rcProEntitlementId
        : tier === 'premium'
          ? rcPremiumEntitlementId
          : '';
    if (!entitlementId) {
      return json(500, {
        ok: false,
        error: tier === 'premium' ? 'Missing REVENUECAT_PREMIUM_ENTITLEMENT_ID' : 'Missing REVENUECAT_PRO_ENTITLEMENT_ID',
      });
    }

    const rcBase = 'https://api.revenuecat.com/v2';

    const results: any[] = [];
    for (const t of targets) {
      try {
        const customerId = encodeURIComponent(t.userId);
        const expires_at = expiresAtMs ?? null;

        // RevenueCat grant endpoint requires an expiry timestamp.
        // If none provided, default to 10 years.
        const safeExpiry = expires_at ?? Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;

        await revenueCatPost<any>({
          url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/actions/grant_entitlement`,
          apiKey: rcApiKey,
          body: { entitlement_id: entitlementId, expires_at: safeExpiry },
        });

        // Keep a DB record (used for fallback + debugging)
        await supabase.from('beta_access').upsert({
          user_id: t.userId,
          email: t.email,
          tier,
          expires_at: new Date(safeExpiry).toISOString(),
          note,
        });

        // Also upsert user_subscriptions so the app's DB fallback is consistent
        await supabase.from('user_subscriptions').upsert({
          user_id: t.userId,
          tier,
          platform: 'server',
          expires_at: new Date(safeExpiry).toISOString(),
          updated_at: new Date().toISOString(),
        });

        results.push({ ok: true, userId: t.userId, email: t.email, tier, expiresAt: new Date(safeExpiry).toISOString() });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ ok: false, userId: t.userId, email: t.email, error: msg });
      }
    }

    return json(200, { ok: true, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    console.error('[beta-access-grant] error', e);
    return json(500, { ok: false, error: msg });
  }
});

