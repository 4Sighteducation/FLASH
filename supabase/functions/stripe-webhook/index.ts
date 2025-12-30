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

    // Stub routing (real logic comes next)
    switch (evt.type) {
      case 'checkout.session.completed':
      case 'invoice.paid':
      case 'customer.subscription.deleted':
        break;
      default:
        break;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('[stripe-webhook] handler error', e);
    return new Response(JSON.stringify({ ok: false, error: 'Webhook handler failed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
