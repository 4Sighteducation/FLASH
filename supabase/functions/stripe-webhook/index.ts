import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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

function formatClaimCode(code: string): string {
  const clean = (code || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

async function sendSendGridEmail(params: { to: string; subject: string; html: string; fromEmail: string }): Promise<void> {
  const sendGridKey = Deno.env.get('SENDGRID_API_KEY') || '';
  if (!sendGridKey) {
    // This webhook is responsible for delivering redeem codes. If this is misconfigured,
    // we want Stripe to retry and Surface the failure in Stripe webhook logs.
    throw new Error('[SendGrid] SENDGRID_API_KEY not set');
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendGridKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: params.fromEmail, name: 'FL4SH' },
      subject: params.subject,
      content: [{ type: 'text/html', value: params.html }],
      tracking_settings: {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[SendGrid] ${res.status} ${text}`);
  }
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
        {
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
          const parentClaimId = (sub?.metadata?.parent_claim_id || '').trim();

          // Parent-first flow: parent pays on web, child claims later. No immediate RevenueCat grant here.
          if (!studentUserId && parentClaimId) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, serviceKey);

            const invoiceId = String((invObj as any)?.id ?? '');
            const customerId = String((invObj as any)?.customer ?? '');

            const { data: claim, error: updErr } = await supabase
              .from('parent_claims')
              .update({
                status: 'paid',
                stripe_subscription_id: subscriptionId,
                stripe_invoice_id: invoiceId || null,
                stripe_customer_id: customerId || null,
                livemode: !!invObj.livemode,
                paid_expires_at_ms: expiresAtMs,
                paid_at: new Date().toISOString(),
              } as any)
              .eq('id', parentClaimId)
              .neq('status', 'claimed')
              .select('id, child_email, claim_code, status, redeem_email_sent_at, redeem_email_attempts')
              .maybeSingle();

            if (updErr) {
              console.error('[stripe-webhook] invoice.paid: failed to update parent_claims', updErr);
              throw updErr;
            }
            if (!claim?.id) {
              console.warn('[stripe-webhook] invoice.paid: parent_claim_id not found or already claimed', { parentClaimId });
              break;
            }

            // If we've already successfully sent the redeem email, don't send again.
            if ((claim as any).redeem_email_sent_at) {
              console.log('[stripe-webhook] invoice.paid: redeem email already sent; skipping', { parentClaimId });
              break;
            }

            const marketingBase = Deno.env.get('FL4SH_MARKETING_BASE_URL') || 'https://www.fl4shcards.com';
            const claimCode = String((claim as any).claim_code);
            const claimLink = `${marketingBase.replace(/\/$/, '')}/claim?code=${encodeURIComponent(claimCode)}`;
            const codePretty = formatClaimCode(claimCode);
            const toEmail = String((claim as any).child_email);

            const fromEmail =
              Deno.env.get('SENDGRID_PARENTS_FROM_EMAIL') ||
              Deno.env.get('SENDGRID_FROM_EMAIL') ||
              'support@fl4shcards.com';

            try {
              await sendSendGridEmail({
                to: toEmail,
                fromEmail,
                subject: 'Your FL4SH Pro access is ready',
                html: `
                <!doctype html>
                <html lang=\"en\">
                  <head>
                    <meta charset=\"utf-8\" />
                    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
                    <title>FL4SH Pro access</title>
                  </head>
                  <body style=\"margin:0;padding:0;background:#070A12;color:#E6EAF2;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;\">
                    <div style=\"display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;\">Your FL4SH Pro access is ready — redeem your code in the app.</div>

                    <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#070A12;padding:28px 12px;\">
                      <tr>
                        <td align=\"center\">
                          <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:640px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:#0B1020;\">
                            <tr>
                              <td style=\"padding:22px 22px 14px 22px;text-align:center;\">
                                <img src=\"https://www.fl4shcards.com/flash_assets/flash-logo-transparent.png\" width=\"72\" height=\"72\" alt=\"FL4SH\" style=\"display:block;margin:0 auto 10px auto;\" />
                                <div style=\"font-size:22px;font-weight:800;letter-spacing:0.2px;\">Your FL4SH Pro access is ready</div>
                                <div style=\"margin-top:6px;font-size:14px;opacity:0.85;line-height:1.45;\">A parent/guardian has purchased <strong>FL4SH Pro</strong> for you.</div>
                              </td>
                            </tr>

                            <tr>
                              <td style=\"padding:0 22px 18px 22px;\">
                                <div style=\"height:1px;background:rgba(255,255,255,0.08);\"></div>
                              </td>
                            </tr>

                            <tr>
                              <td style=\"padding:0 22px 18px 22px;font-size:14px;line-height:1.6;\">
                                <div style=\"font-weight:700;margin-bottom:6px;\">How to activate</div>
                                <ol style=\"margin:0 0 0 18px;padding:0;\">
                                  <li>Install FL4SH on your phone.</li>
                                  <li>Sign in / create an account in the app (Sign in with Apple is fine).</li>
                                  <li>Open <strong>Profile → Redeem code</strong> and enter your code.</li>
                                </ol>

                                <div style=\"margin-top:14px;font-weight:700;\">Your code</div>
                                <div style=\"margin-top:8px;padding:14px 14px;border-radius:14px;background:#070A12;border:1px solid rgba(255,255,255,0.10);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\"Liberation Mono\",\"Courier New\",monospace;font-size:18px;letter-spacing:1px;text-align:center;\">
                                  <strong>${codePretty}</strong>
                                </div>

                                <div style=\"margin-top:14px;text-align:center;\">
                                  <a href=\"${claimLink}\" style=\"display:inline-block;padding:12px 16px;border-radius:12px;background:linear-gradient(90deg,#00E5FF,#FF4FD8);color:#0B1020;font-weight:800;text-decoration:none;\">Open redeem page</a>
                                </div>

                                <div style=\"margin-top:14px;font-size:12px;opacity:0.75;line-height:1.5;\">
                                  If the button doesn’t work, open FL4SH and paste the code manually.
                                  <br />
                                  Need help? Reply to this email.
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td style=\"padding:16px 22px 20px 22px;background:rgba(255,255,255,0.03);font-size:12px;opacity:0.75;line-height:1.5;text-align:center;\">
                                FL4SH • Study Smarter
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
              `,
              });

              await supabase
                .from('parent_claims')
                .update({ redeem_email_sent_at: new Date().toISOString(), redeem_email_last_error: null })
                .eq('id', parentClaimId);

              console.log('[stripe-webhook] invoice.paid: parent-claim marked paid + emailed child', {
                parentClaimId,
                toEmail,
              });
              break;
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              const prevAttempts = Number((claim as any).redeem_email_attempts || 0);
              await supabase
                .from('parent_claims')
                .update({ redeem_email_attempts: prevAttempts + 1, redeem_email_last_error: msg })
                .eq('id', parentClaimId);

              // Fail the webhook so Stripe retries and you see the error in Stripe.
              throw e;
            }
          }

          if (!studentUserId) {
            console.warn('[stripe-webhook] invoice.paid: subscription missing metadata.student_user_id (and no parent_claim_id)', {
              subscriptionId,
            });
            break;
          }

          const customerId = encodeURIComponent(studentUserId);
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
            console.log('[stripe-webhook] invoice.paid: pro already valid', {
              studentUserId,
              expiresAt: safeIsoFromMs(currentExpMs),
            });
            break;
          }

          // RevenueCat grant endpoint is "grant unless one already exists".
          // To support "extend expiry", we revoke the existing grant (if present) and then grant with new expiry.
          if (currentExpMs) {
            console.log('[stripe-webhook] invoice.paid: revoke existing pro to extend', {
              studentUserId,
              from: safeIsoFromMs(currentExpMs),
              to: safeIsoFromMs(expiresAtMs),
            });
            await revenueCatPost<any>({
              url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/actions/revoke_granted_entitlement`,
              apiKey: rcApiKey,
              body: { entitlement_id: rcProEntitlementId },
            });
          }

          console.log('[stripe-webhook] invoice.paid: grant pro', {
            studentUserId,
            expiresAt: safeIsoFromMs(expiresAtMs),
          });

          await revenueCatPost<any>({
            url: `${rcBase}/projects/${encodeURIComponent(rcProjectId)}/customers/${customerId}/actions/grant_entitlement`,
            apiKey: rcApiKey,
            body: { entitlement_id: rcProEntitlementId, expires_at: expiresAtMs },
          });
        }
        break;

      case 'customer.subscription.deleted':
        // Do nothing: access will expire based on RevenueCat expires_at.
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
