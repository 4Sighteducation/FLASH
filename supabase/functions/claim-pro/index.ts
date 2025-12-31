import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  code: string;
};

function normalizeCode(code: string): string {
  return (code || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
}

async function stripePostForm<T>(params: { apiKey: string; path: string; form: URLSearchParams }): Promise<T> {
  const res = await fetch(`https://api.stripe.com${params.path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.form.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[Stripe] ${res.status} ${text}`);
  return JSON.parse(text) as T;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing Authorization bearer token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const payload = (await req.json()) as Payload;
    const code = normalizeCode(payload?.code || '');
    if (code.length < 8) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid code.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate caller
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid session.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const userId = authData.user.id;

    const { data: claim, error: claimErr } = await supabase
      .from('parent_claims')
      .select('id, status, claimed_by, paid_expires_at_ms, stripe_subscription_id, livemode')
      .eq('claim_code', code)
      .maybeSingle();

    if (claimErr) {
      console.error('[claim-pro] claim lookup failed', claimErr);
      return new Response(JSON.stringify({ ok: false, error: 'Lookup failed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!claim?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'Code not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const status = String((claim as any).status);
    const claimedBy = ((claim as any).claimed_by as string | null) || null;
    const expiresAtMs = Number((claim as any).paid_expires_at_ms || 0);

    if (status === 'claimed' && claimedBy && claimedBy !== userId) {
      return new Response(JSON.stringify({ ok: false, error: 'This code has already been used.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409,
      });
    }

    // Edge case: if the original claimer user was deleted from Supabase Auth,
    // the FK sets claimed_by to NULL, but status stays "claimed". Treat that as "paid" so it can be reclaimed.
    if (status === 'claimed' && !claimedBy) {
      console.warn('[claim-pro] claim is marked claimed but claimed_by is null; allowing reclaim', {
        claimId: (claim as any).id,
      });
    }

    if (status !== 'paid' && !(status === 'claimed' && (!claimedBy || claimedBy === userId))) {
      console.warn('[claim-pro] claim not redeemable', { claimId: (claim as any).id, status, claimedByPresent: !!claimedBy });
      return new Response(JSON.stringify({ ok: false, error: 'This code is not ready to redeem yet.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'This code is missing billing details. Please contact support.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Grant in RevenueCat
    const rcApiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY') || '';
    const rcProjectId = Deno.env.get('REVENUECAT_PROJECT_ID') || '';
    const rcProEntitlementId = Deno.env.get('REVENUECAT_PRO_ENTITLEMENT_ID') || '';

    if (!rcApiKey || !rcProjectId || !rcProEntitlementId) {
      console.error('[claim-pro] missing RevenueCat env vars', {
        hasApiKey: !!rcApiKey,
        hasProjectId: !!rcProjectId,
        hasProEntitlementId: !!rcProEntitlementId,
      });
      return new Response(JSON.stringify({ ok: false, error: 'Server not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const customerId = encodeURIComponent(userId);
    const rcBase = 'https://api.revenuecat.com/v2';

    const active = await revenueCatGet<any>({
      url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/active_entitlements`,
      apiKey: rcApiKey,
    });

    const items = active?.items ?? active?.active_entitlements?.items ?? [];
    const current = Array.isArray(items) ? items.find((x: any) => x?.entitlement_id === rcProEntitlementId) : null;
    const currentExpMs =
      current && typeof current.expires_at === 'number'
        ? current.expires_at
        : current && typeof current.expire_at === 'number'
          ? current.expire_at
          : null;

    if (currentExpMs && currentExpMs >= expiresAtMs) {
      console.log('[claim-pro] pro already valid', { userId, expiresAt: safeIsoFromMs(currentExpMs) });
    } else {
      if (currentExpMs) {
        await revenueCatPost<any>({
          url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/actions/revoke_granted_entitlement`,
          apiKey: rcApiKey,
          body: { entitlement_id: rcProEntitlementId },
        });
      }

      await revenueCatPost<any>({
        url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/actions/grant_entitlement`,
        apiKey: rcApiKey,
        body: { entitlement_id: rcProEntitlementId, expires_at: expiresAtMs },
      });

      console.log('[claim-pro] granted pro', { userId, expiresAt: safeIsoFromMs(expiresAtMs) });
    }

    // Bind future renewals by writing student_user_id to the Stripe subscription metadata.
    const stripeSubscriptionId = ((claim as any).stripe_subscription_id as string | null) || null;
    const livemode = !!(claim as any).livemode;
    if (stripeSubscriptionId) {
      const stripeKey = livemode ? Deno.env.get('STRIPE_SECRET_KEY') : Deno.env.get('STRIPE_SECRET_KEY_TEST');
      if (stripeKey) {
        const form = new URLSearchParams();
        form.set('metadata[student_user_id]', userId);
        await stripePostForm<any>({
          apiKey: stripeKey,
    
          path: `/v1/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`,
          form,
        });
      } else {
        console.warn('[claim-pro] missing Stripe secret key; could not attach student_user_id', { livemode });
      }
    }

    // Mark claimed
    await supabase
      .from('parent_claims')
      .update({ status: 'claimed', claimed_by: userId, claimed_at: new Date().toISOString() })
      .eq('id', (claim as any).id);

    return new Response(JSON.stringify({ ok: true, expiresAt: safeIsoFromMs(expiresAtMs) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('[claim-pro] handler error', e);
    return new Response(JSON.stringify({ ok: false, error: 'Claim failed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
