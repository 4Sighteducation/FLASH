import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-revenuecat-webhook-secret',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type RcEvent = {
  id?: string;
  event_id?: string;
  type?: string;
  product_id?: string;
  app_user_id?: string;
  environment?: string;
  purchased_at_ms?: number;
  event_timestamp_ms?: number;
};

function extractEvent(payload: any): RcEvent {
  const e = payload?.event ?? payload ?? {};
  return {
    id: e?.id ?? e?.event_id ?? payload?.id,
    event_id: e?.event_id ?? e?.id,
    type: e?.type ?? payload?.type,
    product_id: e?.product_id ?? payload?.product_id,
    app_user_id: e?.app_user_id ?? payload?.app_user_id,
    environment: e?.environment ?? payload?.environment,
    purchased_at_ms: Number((e?.purchased_at_ms ?? payload?.purchased_at_ms) ?? 0) || undefined,
    event_timestamp_ms: Number((e?.event_timestamp_ms ?? payload?.event_timestamp_ms) ?? 0) || undefined,
  };
}

function parseIsoEnv(name: string): number | null {
  const v = (Deno.env.get(name) || '').trim();
  if (!v) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    // Auth: shared secret (recommended for RevenueCat webhooks)
    const expected = (Deno.env.get('REVENUECAT_WEBHOOK_SECRET') || '').trim();
    const gotHeader = req.headers.get('x-revenuecat-webhook-secret') || '';
    const auth = req.headers.get('authorization') || '';
    const gotBearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';

    if (!expected || (gotHeader !== expected && gotBearer !== expected)) {
      return json(401, { ok: false, error: 'Unauthorized' });
    }

    const payload = await req.json().catch(() => ({}));
    const ev = extractEvent(payload);

    const promoKey = 'premium_annual_grants_pro_v1';
    const targetProduct = 'flash_premium_annual';
    const eligibleTypes = new Set(['INITIAL_PURCHASE']);

    // Launch window is configurable via env.
    // NOTE: you said Feb–Jun 2025; this is enforced against purchase/event timestamp, not "now".
    const startMs = parseIsoEnv('PRO_PROMO_START_ISO');
    const endMs = parseIsoEnv('PRO_PROMO_END_ISO');

    const tsMs = ev.purchased_at_ms || ev.event_timestamp_ms || Date.now();
    const withinWindow =
      (startMs === null || tsMs >= startMs) &&
      (endMs === null || tsMs <= endMs);

    if (!eligibleTypes.has(String(ev.type || ''))) {
      return json(200, { ok: true, ignored: true, reason: 'event_type', type: ev.type });
    }
    if (String(ev.product_id || '') !== targetProduct) {
      return json(200, { ok: true, ignored: true, reason: 'product_id', product_id: ev.product_id });
    }
    if (!withinWindow) {
      return json(200, { ok: true, ignored: true, reason: 'outside_window', tsMs });
    }
    if (!ev.app_user_id) {
      return json(400, { ok: false, error: 'Missing app_user_id' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Once per lifetime: check if promo already granted for this user.
    const { data: existing, error: exErr } = await sb
      .from('revenuecat_promo_grants')
      .select('user_id, expires_at')
      .eq('user_id', ev.app_user_id)
      .eq('promo_key', promoKey)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (existing?.user_id) {
      return json(200, { ok: true, ignored: true, reason: 'already_granted', expires_at: existing.expires_at });
    }

    // Grant Pro entitlement for 1 year from purchase timestamp.
    const expiresAtMs = tsMs + 365 * 24 * 60 * 60 * 1000;

    const rcApiKey = (Deno.env.get('REVENUECAT_SECRET_API_KEY') || '').trim();
    const rcProjectId = (Deno.env.get('REVENUECAT_PROJECT_ID') || '').trim();
    const rcProEntitlementId = (Deno.env.get('REVENUECAT_PRO_ENTITLEMENT_ID') || '').trim();

    if (!rcApiKey || !rcProjectId || !rcProEntitlementId) {
      return json(500, { ok: false, error: 'Missing RevenueCat server config' });
    }

    const rcBase = 'https://api.revenuecat.com/v2';
    const customerId = encodeURIComponent(ev.app_user_id);

    // If they already have a granted pro entitlement (e.g., from a code), don't overwrite it.
    const active = await revenueCatGet<any>({
      url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/active_entitlements`,
      apiKey: rcApiKey,
    });
    const items = active?.items ?? active?.active_entitlements?.items ?? [];
    const current = Array.isArray(items) ? items.find((x: any) => x?.entitlement_id === rcProEntitlementId) : null;
    const currentExpMs = current && typeof current.expires_at === 'number' ? current.expires_at : null;
    if (currentExpMs && currentExpMs >= expiresAtMs) {
      // Still log promo record for idempotency tracking.
    } else if (!currentExpMs) {
      await revenueCatPost<any>({
        url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/actions/grant_entitlement`,
        apiKey: rcApiKey,
        body: { entitlement_id: rcProEntitlementId, expires_at: expiresAtMs },
      });
    } else {
      // Has pro but shorter: do NOT extend (once per lifetime) unless you intentionally want to.
      // We'll just record and exit.
    }

    // Record grant for "once per lifetime" enforcement
    await sb.from('revenuecat_promo_grants').insert({
      user_id: ev.app_user_id,
      promo_key: promoKey,
      source_product_id: targetProduct,
      granted_at: new Date(tsMs).toISOString(),
      expires_at: new Date(expiresAtMs).toISOString(),
      rc_event_id: ev.id || ev.event_id || null,
      rc_environment: ev.environment || null,
      rc_raw: payload,
    });

    return json(200, {
      ok: true,
      granted: true,
      user_id: ev.app_user_id,
      pro_expires_at: new Date(expiresAtMs).toISOString(),
      promo_key: promoKey,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    console.error('[revenuecat-webhook] error', e);
    return json(500, { ok: false, error: msg });
  }
});

