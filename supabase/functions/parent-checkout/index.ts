import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  childEmail: string;
};

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

function looksLikeEmail(email: string): boolean {
  // Intentionally lightweight; we mainly want to stop obvious garbage.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomBase32(bytesLen = 10): string {
  // Crockford-ish base32 alphabet (no I,L,O,U) for readability.
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = new Uint8Array(bytesLen);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function makeClaimCode(): string {
  // 20 chars, displayed as groups (e.g., ABCD-EFGH-JKLM-NPQR-STVW)
  const raw = randomBase32(20);
  return raw;
}

function formatClaimCode(code: string): string {
  const clean = (code || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1-').replace(/-$/, '');
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const stripeKeyTest = Deno.env.get('STRIPE_SECRET_KEY_TEST') || '';
    const stripeKeyLive = Deno.env.get('STRIPE_SECRET_KEY') || '';
    const useLive = (Deno.env.get('STRIPE_MODE') || '').toLowerCase() === 'live';
    const stripeKey = useLive ? stripeKeyLive : stripeKeyTest;
    if (!stripeKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Stripe key not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const priceId = useLive
      ? Deno.env.get('STRIPE_PARENT_PRICE_ID') || ''
      : Deno.env.get('STRIPE_PARENT_PRICE_ID_TEST') || '';
    if (!priceId) {
      return new Response(JSON.stringify({ ok: false, error: 'Stripe parent price id not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const payload = (await req.json()) as Payload;
    const childEmail = normalizeEmail(payload?.childEmail || '');
    if (!looksLikeEmail(childEmail)) {
      return new Response(JSON.stringify({ ok: false, error: 'Please enter a valid child email.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const claimCode = makeClaimCode();
    const { data: claim, error: insErr } = await supabase
      .from('parent_claims')
      .insert({
        child_email: childEmail,
        child_email_lower: childEmail,
        claim_code: claimCode,
        status: 'created',
      })
      .select('id, claim_code')
      .single();

    if (insErr || !claim?.id) {
      console.error('[parent-checkout] insert parent_claims failed', insErr);
      return new Response(JSON.stringify({ ok: false, error: 'Failed to create checkout.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const successUrl =
      Deno.env.get('PARENTS_SUCCESS_URL') ||
      'https://www.fl4shcards.com/parents/thanks?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = Deno.env.get('PARENTS_CANCEL_URL') || 'https://www.fl4shcards.com/parents?cancelled=1';

    const form = new URLSearchParams();
    form.set('mode', 'subscription');
    form.set('success_url', successUrl);
    form.set('cancel_url', cancelUrl);
    form.set('billing_address_collection', 'auto');
    form.set('customer_creation', 'if_required');

    form.set('line_items[0][price]', priceId);
    form.set('line_items[0][quantity]', '1');

    // Tie Stripe -> Supabase claim row so the webhook can mark it paid + email the child.
    form.set('subscription_data[metadata][parent_claim_id]', String(claim.id));
    form.set('subscription_data[metadata][child_email]', childEmail);

    const session = await stripePostForm<{ id: string; url: string | null }>({
      apiKey: stripeKey,
      path: '/v1/checkout/sessions',
      form,
    });

    if (!session?.url) {
      return new Response(JSON.stringify({ ok: false, error: 'Stripe did not return a checkout URL.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('[parent-checkout] created', { claimId: claim.id, childEmail, claimCode: formatClaimCode(claimCode) });

    return new Response(JSON.stringify({ ok: true, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('[parent-checkout] handler error', e);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to create checkout.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});


