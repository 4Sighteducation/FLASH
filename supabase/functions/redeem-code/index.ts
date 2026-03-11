import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type Tier = 'premium' | 'pro';

type Payload = {
  code: string;
};

function normalizeCode(code: string): string {
  return (code || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
}

async function revenueCatGet<T>(params: { url: string; apiKey: string }): Promise<T> {
  const res = await fetch(params.url, { headers: { Authorization: `Bearer ${params.apiKey}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`[RevenueCat] ${res.status} ${text}`);
  return JSON.parse(text) as T;
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

function safeIsoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

async function grantEntitlement(params: { userId: string; tier: Tier; expiresAtMs: number }) {
  const rcApiKey = (Deno.env.get('REVENUECAT_SECRET_API_KEY') || '').trim();
  const rcProjectId = (Deno.env.get('REVENUECAT_PROJECT_ID') || '').trim();
  const rcProEntitlementId = (Deno.env.get('REVENUECAT_PRO_ENTITLEMENT_ID') || '').trim();
  const rcPremiumEntitlementId = (Deno.env.get('REVENUECAT_PREMIUM_ENTITLEMENT_ID') || '').trim();

  if (!rcApiKey || !rcProjectId) throw new Error('Missing RevenueCat server config');
  const entitlementId =
    params.tier === 'pro'
      ? rcProEntitlementId
      : params.tier === 'premium'
        ? rcPremiumEntitlementId
        : '';
  if (!entitlementId) {
    throw new Error(params.tier === 'premium' ? 'Missing REVENUECAT_PREMIUM_ENTITLEMENT_ID' : 'Missing REVENUECAT_PRO_ENTITLEMENT_ID');
  }

  const rcBase = 'https://api.revenuecat.com/v2';
  const customerId = encodeURIComponent(params.userId);

  // If they already have the entitlement with longer expiry, don't shorten it.
  const active = await revenueCatGet<any>({
    url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/active_entitlements`,
    apiKey: rcApiKey,
  });
  const items = active?.items ?? active?.active_entitlements?.items ?? [];
  const current = Array.isArray(items) ? items.find((x: any) => x?.entitlement_id === entitlementId) : null;
  const currentExpMs = current && typeof current.expires_at === 'number' ? current.expires_at : null;
  if (currentExpMs && currentExpMs >= params.expiresAtMs) return;

  await revenueCatPost<any>({
    url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/actions/grant_entitlement`,
    apiKey: rcApiKey,
    body: { entitlement_id: entitlementId, expires_at: params.expiresAtMs },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return json(401, { ok: false, error: 'Missing Authorization bearer token.' });

    const payload = (await req.json().catch(() => ({}))) as Payload;
    const code = normalizeCode(payload?.code || '');
    if (code.length < 8) return json(400, { ok: false, error: 'Invalid code.' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate caller (and get user id)
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user?.id) return json(401, { ok: false, error: 'Invalid session.' });
    const userId = authData.user.id;

    // 1) Try tester/free access code
    const { data: access, error: accessErr } = await supabase
      .from('access_codes')
      .select('id, tier, expires_at, max_uses, uses_count')
      .eq('code', code.replace(/-/g, ''))
      .maybeSingle();
    if (accessErr) throw new Error(accessErr.message);

    if (access?.id) {
      const maxUses = Number((access as any).max_uses ?? 1);
      const usesCount = Number((access as any).uses_count ?? 0);
      if (Number.isFinite(maxUses) && usesCount >= maxUses) return json(409, { ok: false, error: 'This code has reached its usage limit.' });

      const expIso = (access as any).expires_at ? new Date((access as any).expires_at).toISOString() : null;
      const expMs = expIso ? Date.parse(expIso) : Date.now() + 30 * 24 * 60 * 60 * 1000;
      if (expIso && expMs < Date.now()) return json(410, { ok: false, error: 'This code has expired.' });

      const tier = (String((access as any).tier) === 'premium' ? 'premium' : 'pro') as Tier;

      // Record redemption (idempotent per user)
      const { data: redemption, error: redErr } = await supabase
        .from('access_code_redemptions')
        .insert({ code_id: (access as any).id, user_id: userId })
        .select('id')
        .maybeSingle();
      if (redErr) {
        const msg = String((redErr as any).message || '');
        if (!(msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique'))) throw new Error(msg);
      } else if (redemption?.id) {
        await supabase.from('access_codes').update({ uses_count: usesCount + 1 }).eq('id', (access as any).id);
      }

      // Grant in RevenueCat + store beta_access for immediate override in app
      await grantEntitlement({ userId, tier, expiresAtMs: expMs });
      await supabase.from('beta_access').upsert({
        user_id: userId,
        email: authData.user.email || null,
        tier,
        expires_at: safeIsoFromMs(expMs),
        note: `redeemed:${code}`,
      });
      await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        tier,
        platform: 'server',
        expires_at: safeIsoFromMs(expMs),
        updated_at: new Date().toISOString(),
      });

      return json(200, { ok: true, kind: 'access_code', tier, expiresAt: safeIsoFromMs(expMs) });
    }

    // 2) Fallback: parent claim code (existing flow)
    const { data: claim, error: claimErr } = await supabase
      .from('parent_claims')
      .select('id, status, claimed_by, paid_expires_at_ms')
      .eq('claim_code', code)
      .maybeSingle();
    if (claimErr) return json(500, { ok: false, error: 'Lookup failed.' });
    if (!claim?.id) return json(404, { ok: false, error: 'Code not found.' });

    const status = String((claim as any).status);
    const claimedBy = ((claim as any).claimed_by as string | null) || null;
    const expiresAtMs = Number((claim as any).paid_expires_at_ms || 0);

    if (status === 'claimed' && claimedBy && claimedBy !== userId) return json(409, { ok: false, error: 'This code has already been used.' });
    if (status !== 'paid' && !(status === 'claimed' && (!claimedBy || claimedBy === userId))) return json(400, { ok: false, error: 'This code is not ready to redeem yet.' });
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) return json(500, { ok: false, error: 'This code is missing billing details. Please contact support.' });

    await grantEntitlement({ userId, tier: 'pro', expiresAtMs });
    await supabase.from('beta_access').upsert({
      user_id: userId,
      email: authData.user.email || null,
      tier: 'pro',
      expires_at: safeIsoFromMs(expiresAtMs),
      note: `claim:${code}`,
    });
    await supabase.from('user_subscriptions').upsert({
      user_id: userId,
      tier: 'pro',
      platform: 'web',
      expires_at: safeIsoFromMs(expiresAtMs),
      updated_at: new Date().toISOString(),
    });

    await supabase.from('parent_claims').update({ status: 'claimed', claimed_by: userId, claimed_at: new Date().toISOString() }).eq('id', (claim as any).id);

    return json(200, { ok: true, kind: 'parent_claim', tier: 'pro', expiresAt: safeIsoFromMs(expiresAtMs) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    console.error('[redeem-code] error', e);
    return json(500, { ok: false, error: msg });
  }
});

