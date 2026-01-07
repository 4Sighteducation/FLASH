// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // SendGrid signed webhook headers (plus content-type for OPTIONS)
  'Access-Control-Allow-Headers':
    'content-type, x-twilio-email-event-webhook-signature, x-twilio-email-event-webhook-timestamp',
};

function sanitizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function toIsoFromSendGridTimestamp(ts: unknown): string | null {
  const n = typeof ts === 'number' ? ts : Number(ts);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

type SendGridEvent = {
  event?: string;
  email?: string;
  timestamp?: number;
  reason?: string;
  response?: string;
  status?: string;
  sg_event_id?: string;
  sg_message_id?: string;
  // SendGrid may flatten custom_args into top-level keys depending on payload version.
  user_id?: string;
  email_type?: string;
  custom_args?: Record<string, string>;
};

function mapDeliveryStatus(ev: string): string | null {
  const e = (ev || '').toLowerCase();
  if (e === 'processed') return 'processed';
  if (e === 'delivered') return 'delivered';
  if (e === 'deferred') return 'deferred';
  if (e === 'bounce') return 'bounce';
  if (e === 'dropped') return 'dropped';
  if (e === 'blocked') return 'blocked';
  if (e === 'spamreport') return 'spamreport';
  return null;
}

function chooseError(evt: SendGridEvent): string | null {
  const reason = String(evt.reason || '').trim();
  const response = String(evt.response || '').trim();
  const status = String(evt.status || '').trim();
  const bits = [status ? `status=${status}` : null, reason || null, response || null].filter(Boolean) as string[];
  if (!bits.length) return null;
  return bits.join(' | ').slice(0, 1000);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = String(pem || '')
    .trim()
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');

  const bin = atob(cleaned);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function verifySendGridSignature(params: {
  publicKeyPem: string;
  signatureB64: string;
  timestamp: string;
  rawBodyBytes: Uint8Array;
}): Promise<boolean> {
  try {
    const keyBuf = pemToArrayBuffer(params.publicKeyPem);
    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      keyBuf,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const sigBytesDer = Uint8Array.from(atob(params.signatureB64), (c) => c.charCodeAt(0));
    const tsBytes = new TextEncoder().encode(String(params.timestamp || ''));
    const msg = new Uint8Array(tsBytes.length + params.rawBodyBytes.length);
    msg.set(tsBytes, 0);
    msg.set(params.rawBodyBytes, tsBytes.length);

    // WebCrypto expects ECDSA signatures as raw P1363 (r||s), but SendGrid provides DER.
    // We'll try DER->raw conversion first; if it fails, fall back to assuming it's already raw.
    const rawLen = 32; // P-256 => 32-byte r and 32-byte s

    const derToRaw = (der: Uint8Array): Uint8Array | null => {
      // Minimal ASN.1 DER parser for: SEQUENCE { INTEGER r; INTEGER s }
      // Ref: RFC 3279 / typical ECDSA DER encoding.
      let i = 0;
      if (der[i++] !== 0x30) return null; // SEQUENCE
      const seqLen = der[i++];
      if (seqLen & 0x80) {
        // Long-form length: support up to 2 bytes
        const n = seqLen & 0x7f;
        if (n === 0 || n > 2) return null;
        i += n;
      }

      const readInt = (): Uint8Array | null => {
        if (der[i++] !== 0x02) return null; // INTEGER
        let len = der[i++];
        if (len & 0x80) {
          const n = len & 0x7f;
          if (n === 0 || n > 2) return null;
          len = 0;
          for (let k = 0; k < n; k++) len = (len << 8) | der[i++];
        }
        const out = der.slice(i, i + len);
        i += len;
        return out;
      };

      const r = readInt();
      const s = readInt();
      if (!r || !s) return null;

      const toFixed = (x: Uint8Array): Uint8Array => {
        // Remove leading 0x00 sign byte if present
        let v = x;
        while (v.length > 0 && v[0] === 0x00 && v.length > rawLen) v = v.slice(1);
        if (v.length > rawLen) v = v.slice(v.length - rawLen);
        const padded = new Uint8Array(rawLen);
        padded.set(v, rawLen - v.length);
        return padded;
      };

      const rr = toFixed(r);
      const ss = toFixed(s);
      const raw = new Uint8Array(rawLen * 2);
      raw.set(rr, 0);
      raw.set(ss, rawLen);
      return raw;
    };

    const sigBytesRaw = derToRaw(sigBytesDer) || sigBytesDer;

    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, sigBytesRaw, msg);
    if (ok) return true;

    // Fallback: if conversion happened and failed verification, try original bytes in case SendGrid changes formats.
    if (sigBytesRaw !== sigBytesDer) {
      return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, sigBytesDer, msg);
    }

    return false;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Always log that we received a request (helps debug "no logs" cases).
    // Note: Do NOT log full payloads or secrets.
    console.log('[sendgrid-events] request', {
      method: req.method,
      hasSignature: !!(
        req.headers.get('x-twilio-email-event-webhook-signature') ||
        req.headers.get('X-Twilio-Email-Event-Webhook-Signature')
      ),
      hasTimestamp: !!(
        req.headers.get('x-twilio-email-event-webhook-timestamp') ||
        req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp')
      ),
      contentType: req.headers.get('content-type'),
    });

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // SECURITY:
    // SendGrid’s current Event Webhook UI may not support custom headers,
    // so we authenticate via Signed Event Webhook (signature + timestamp headers).
    const publicKeyPem = Deno.env.get('SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY') || '';
    if (!publicKeyPem) {
      console.warn('[sendgrid-events] missing public key env var');
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            'Missing SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY env var. Enable "Signed Event Webhook" in SendGrid and paste the public key here.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const signature =
      req.headers.get('x-twilio-email-event-webhook-signature') ||
      req.headers.get('X-Twilio-Email-Event-Webhook-Signature') ||
      '';
    const timestamp =
      req.headers.get('x-twilio-email-event-webhook-timestamp') ||
      req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp') ||
      '';

    // Use raw bytes; do NOT JSON.parse before verifying.
    const rawBuf = new Uint8Array(await req.arrayBuffer());
    console.log('[sendgrid-events] body received', { bytes: rawBuf.length });

    // Basic replay protection: timestamp must be within 10 minutes
    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum)) {
      console.warn('[sendgrid-events] invalid timestamp header', { timestamp });
      return new Response(JSON.stringify({ ok: false, error: 'Missing/invalid webhook timestamp' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - tsNum) > 10 * 60) {
      console.warn('[sendgrid-events] timestamp outside tolerance', { timestamp: tsNum, nowSec });
      return new Response(JSON.stringify({ ok: false, error: 'Webhook timestamp outside tolerance' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (!signature) {
      console.warn('[sendgrid-events] missing signature header');
      return new Response(JSON.stringify({ ok: false, error: 'Missing webhook signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const okSig = await verifySendGridSignature({
      publicKeyPem,
      signatureB64: signature,
      timestamp: String(timestamp),
      rawBodyBytes: rawBuf,
    });
    if (!okSig) {
      console.warn('[sendgrid-events] invalid signature', { timestamp });
      return new Response(JSON.stringify({ ok: false, error: 'Invalid webhook signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceKey) {
      console.warn('[sendgrid-events] missing supabase env vars');
      return new Response(JSON.stringify({ ok: false, error: 'Supabase env not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const payload = JSON.parse(new TextDecoder().decode(rawBuf)) as unknown;
    const events: SendGridEvent[] = Array.isArray(payload) ? (payload as SendGridEvent[]) : [];
    if (!Array.isArray(events) || events.length === 0) {
      console.log('[sendgrid-events] no events in payload');
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    let processed = 0;
    let ignored = 0;

    // Process sequentially to keep writes simple and deterministic.
    for (const evt of events) {
      const deliveryStatus = mapDeliveryStatus(String(evt.event || ''));
      if (!deliveryStatus) {
        ignored += 1;
        continue;
      }

      const userId = String(evt.user_id || evt.custom_args?.user_id || '').trim();
      const emailType = String(evt.email_type || evt.custom_args?.email_type || 'welcome').trim() || 'welcome';
      const email = sanitizeEmail(evt.email || '');
      if (!userId || !email) {
        ignored += 1;
        continue;
      }

      const deliveryEventAt = toIsoFromSendGridTimestamp(evt.timestamp) || new Date().toISOString();
      const deliveryError = chooseError(evt);
      const sgMessageId = String(evt.sg_message_id || '').trim() || null;
      const sgEventId = String(evt.sg_event_id || '').trim() || null;

      // Upsert the email event row and attach delivery outcome.
      const { error } = await admin.from('user_email_events').upsert(
        {
          user_id: userId,
          email,
          type: emailType,
          status: 'sent',
          sent_at: deliveryStatus === 'delivered' ? deliveryEventAt : null,
          delivery_status: deliveryStatus,
          delivery_event_at: deliveryEventAt,
          delivery_error: deliveryError,
          sendgrid_message_id: sgMessageId,
          sendgrid_event_id: sgEventId,
        },
        { onConflict: 'user_id,type' }
      );

      if (!error) processed += 1;
    }

    console.log('[sendgrid-events] processed summary', { processed, ignored, total: events.length });
    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    console.error('[sendgrid-events] fatal:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

