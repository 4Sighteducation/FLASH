import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function parseStripeSignatureHeader(sigHeader: string | null): { timestamp: number; signatures: string[] } | null {
  if (!sigHeader) return null;
  const parts = sigHeader.split(',').map((s) => s.trim());
  let t: number | null = null;
  const v1: string[] = [];
  for (const p of parts) {
    const [k, ...rest] = p.split('=');
    const v = rest.join('=');
    if (!k || !v) continue;
    if (k === 't') {
      const parsed = Number(v);
      if (Number.isFinite(parsed)) t = parsed;
    } else if (k === 'v1') {
      v1.push(v);
    }
  }
  if (!t || v1.length === 0) return null;
  return { timestamp: t, signatures: v1 };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyStripeSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
  toleranceSeconds?: number;
}): Promise<boolean> {
  const parsed = parseStripeSignatureHeader(params.signatureHeader);
  if (!parsed) return false;

  const tolerance = typeof params.toleranceSeconds === 'number' ? params.toleranceSeconds : 5 * 60;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > tolerance) return false;

  const signedPayload = `${parsed.timestamp}.${params.rawBody}`;
  const expected = await hmacSha256Hex(params.secret, signedPayload);

  for (const s of parsed.signatures) {
    if (timingSafeEqual(s, expected)) return true;
  }
  return false;
}

type StripeEvent = { id: string; type: string; created?: number; data?: { object?: unknown } };

type StripeInvoice = {
  object: 'invoice';
  livemode?: boolean;
  subscription?: string | null;
  lines?: { data?: Array<{ period?: { end?: number } }> };
};

type StripeSubscription = { id: string; metadata?: Record<string, string> };

function isStripeInvoice(x: any): x is StripeInvoice {
  return x && x.object === 'invoice';
}

function getInvoicePeriodEndMs(inv: StripeInvoice): number | null {
  const endSec = inv?.lines?.data?.[0]?.period?.end;
  if (!endSec || typeof endSec !== 'number') return null;
  return endSec * 1000;
}

async function stripeGet<T>(params: { url: string; apiKey: string }): Promise<T> {
  const res = await fetch(params.url, { headers: { Authorization: `Bearer ${params.apiKey}` } });
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
    const signatureHeader = req.headers.get('stripe-signature');
    const rawBody = await req.text(); // raw required for signature verification

    const liveSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    const testSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST') || '';
    const secrets = [liveSecret, testSecret].filter(Boolean);

    if (secrets.length === 0) {
      console.error('[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET_TEST');
      return new Response(JSON.stringify({ ok: false, error: 'Webhook secret not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    let verified = false;
    for (const secret of secrets) {
      if (await verifyStripeSignature({ rawBody, signatureHeader, secret })) {
        verified = true;
        break;
      }
    }

    if (!verified) {
      console.warn('[stripe-webhook] Signature verification failed');
      return new Response(JSON.stringify({ ok: false, error: 'Invalid signature.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const evt = JSON.parse(rawBody) as StripeEvent;
    console.log('[stripe-webhook] verified event', { id: evt?.id, type: evt?.type });

    switch (evt.type) {
      case 'checkout.session.completed':
        // We intentionally do NOT grant access here. Some flows can complete without money collected.
        break;

      case 'invoice.paid':
        try {
          const invObj = (evt?.data as any)?.object;
          if (!isStripeInvoice(invObj)) {
            console.warn('[stripe-webhook] invoice.paid: unexpected payload');
            break;
          }

          const subscriptionId = invObj.subscription;
          if (!subscriptionId) {
            console.warn('[stripe-webhook] invoice.paid: missing subscription id');
            break;
          }

          const expiresAtMs = getInvoicePeriodEndMs(invObj);
          if (!expiresAtMs) {
            console.warn('[stripe-webhook] invoice.paid: missing invoice period end');
            break;
          }

          const stripeKey = invObj.livemode ? Deno.env.get('STRIPE_SECRET_KEY') : Deno.env.get('STRIPE_SECRET_KEY_TEST');
          if (!stripeKey) {
            console.error('[stripe-webhook] invoice.paid: missing Stripe secret key', { livemode: !!invObj.livemode });
            break;
          }

          const rcApiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY') || '';
          const rcProjectId = Deno.env.get('REVENUECAT_PROJECT_ID') || '';
          const rcProEntitlementId = Deno.env.get('REVENUECAT_PRO_ENTITLEMENT_ID') || '';

          if (!rcApiKey || !rcProjectId || !rcProEntitlementId) {
            console.error('[stripe-webhook] invoice.paid: missing RevenueCat env vars', {
              hasApiKey: !!rcApiKey,
              hasProjectId: !!rcProjectId,
              hasProEntitlementId: !!rcProEntitlementId,
            });
            break;
          }

          const sub = await stripeGet<StripeSubscription>({
            url: `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
            apiKey: stripeKey,
          });

          const studentUserId = (sub?.metadata?.student_user_id || '').trim();
          if (!studentUserId) {
            console.warn('[stripe-webhook] invoice.paid: subscription missing metadata.student_user_id', { subscriptionId });
            break;
          }

          const customerId = encodeURIComponent(studentUserId);
          const rcBase = 'https://api.revenuecat.com/v2';

          const active = await revenueCatGet<any>({
            url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/active_entitlements`,
            apiKey: rcApiKey,
          });

