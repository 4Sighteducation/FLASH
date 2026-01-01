import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  parentEmail?: string;
};

function sanitizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  // Good-enough validation for UX; SendGrid will still validate.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendSendGridEmail(params: { to: string; fromEmail: string; subject: string; html: string }): Promise<void> {
  const sendGridKey = Deno.env.get('SENDGRID_API_KEY') || '';
  if (!sendGridKey) {
    console.warn('[invite-parent] SENDGRID_API_KEY not set; skipping email');
    return;
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

function buildParentInviteHtml(params: {
  parentEmail: string;
  childEmail: string;
  childUsername?: string | null;
  marketingBase: string;
}): string {
  const marketingBase = params.marketingBase.replace(/\/$/, '');
  const purchaseLink = `${marketingBase}/parents?child_email=${encodeURIComponent(params.childEmail)}`;
  const childLabel = params.childUsername ? `${params.childUsername} (${params.childEmail})` : params.childEmail;

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>FL4SH — Parent invite</title>
      </head>
      <body style="margin:0;padding:0;background:#070A12;color:#E6EAF2;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          A student has invited you to unlock FL4SH Pro for their account.
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070A12;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:#0B1020;">
                <tr>
                  <td style="padding:22px 22px 14px 22px;text-align:center;">
                    <img src="https://www.fl4shcards.com/flash_assets/flash-logo-transparent.png" width="72" height="72" alt="FL4SH" style="display:block;margin:0 auto 10px auto;" />
                    <div style="font-size:22px;font-weight:800;letter-spacing:0.2px;">Help ${params.childUsername ? params.childUsername : 'your student'} unlock FL4SH</div>
                    <div style="margin-top:6px;font-size:14px;opacity:0.88;line-height:1.45;">
                      <strong>${childLabel}</strong> is using FL4SH for revision and has invited you to unlock Pro access.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 22px 18px 22px;">
                    <div style="height:1px;background:rgba(255,255,255,0.08);"></div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 22px 18px 22px;font-size:14px;line-height:1.7;">
                    <div style="font-weight:800;margin-bottom:6px;">How it works</div>
                    <ol style="margin:0 0 0 18px;padding:0;">
                      <li>Open the parent page below (the student email is pre-filled).</li>
                      <li>Complete the checkout on your device.</li>
                      <li>The student receives a code and redeems it in the app to unlock Pro.</li>
                    </ol>

                    <div style="margin-top:16px;text-align:center;">
                      <a href="${purchaseLink}" style="display:inline-block;padding:12px 16px;border-radius:12px;background:linear-gradient(90deg,#00E5FF,#FF4FD8);color:#0B1020;font-weight:800;text-decoration:none;">
                        Open parent page
                      </a>
                    </div>

                    <div style="margin-top:14px;font-size:12px;opacity:0.85;line-height:1.5;text-align:center;">
                      Tip: If you don’t see the email pre-filled, enter <strong>${params.childEmail}</strong> during checkout.
                    </div>

                    <div style="margin-top:16px;font-size:12px;opacity:0.75;text-align:center;line-height:1.5;">
                      If you didn’t request this, you can ignore this email.
                    </div>
                  </td>
                </tr>
              </table>

              <div style="max-width:640px;margin:12px auto 0 auto;font-size:11px;color:rgba(230,234,242,0.55);text-align:center;">
                © ${new Date().getFullYear()} FL4SH
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
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

    const { parentEmail } = (await req.json()) as Payload;
    const parentEmailNorm = sanitizeEmail(parentEmail || '');
    if (!parentEmailNorm || !isValidEmail(parentEmailNorm)) {
      return new Response(JSON.stringify({ ok: false, error: 'Please enter a valid parent/guardian email.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Supabase env not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const userId = userData.user.id;
    const childEmail = sanitizeEmail(userData.user.email || '');
    if (!childEmail) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing child email.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Basic rate limit: max 3 invites per 24h per user
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('parent_invites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sinceIso);

    if ((count || 0) >= 3) {
      return new Response(JSON.stringify({ ok: false, error: 'Invite limit reached. Please try again tomorrow.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    const { data: inviteRow } = await admin
      .from('parent_invites')
      .insert({
        user_id: userId,
        child_email: childEmail,
        parent_email: parentEmailNorm,
        parent_email_lower: parentEmailNorm,
        status: 'sending',
      })
      .select('id')
      .maybeSingle();

    const inviteId = inviteRow?.id as string | undefined;

    const marketingBase = Deno.env.get('FL4SH_MARKETING_BASE_URL') || 'https://www.fl4shcards.com';
    const fromEmail =
      Deno.env.get('SENDGRID_PARENTS_FROM_EMAIL') ||
      Deno.env.get('SENDGRID_FROM_EMAIL') ||
      'support@fl4shcards.com';

    const html = buildParentInviteHtml({
      parentEmail: parentEmailNorm,
      childEmail,
      childUsername: (userData.user.user_metadata as any)?.username ?? null,
      marketingBase,
    });

    try {
      await sendSendGridEmail({
        to: parentEmailNorm,
        fromEmail,
        subject: 'FL4SH — Parent/guardian invite',
        html,
      });

      if (inviteId) {
        await admin
          .from('parent_invites')
          .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
          .eq('id', inviteId);
      }
    } catch (e) {
      const msg = String(e?.message || e);
      console.warn('[invite-parent] send failed:', msg);
      if (inviteId) {
        await admin
          .from('parent_invites')
          .update({ status: 'failed', error: msg.slice(0, 1000) })
          .eq('id', inviteId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('[invite-parent] fatal:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

