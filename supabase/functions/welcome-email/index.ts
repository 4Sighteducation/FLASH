import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

async function sendSendGridEmail(params: {
  to: string;
  fromEmail: string;
  subject: string;
  html: string;
  templateId?: string | null;
  dynamicTemplateData?: Record<string, unknown>;
}): Promise<void> {
  const sendGridKey = Deno.env.get('SENDGRID_API_KEY') || '';
  if (!sendGridKey) {
    console.warn('[welcome-email] SENDGRID_API_KEY not set; skipping email');
    return;
  }

  const body: any = {
    personalizations: [{ to: [{ email: params.to }] }],
    from: { email: params.fromEmail, name: 'FL4SH' },
    subject: params.subject,
    tracking_settings: {
      click_tracking: { enable: false, enable_text: false },
      open_tracking: { enable: false },
    },
  };

  if (params.templateId) {
    body.template_id = params.templateId;
    body.personalizations[0].dynamic_template_data = params.dynamicTemplateData || {};
  } else {
    body.content = [{ type: 'text/html', value: params.html }];
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendGridKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[SendGrid] ${res.status} ${text}`);
  }
}

function buildWelcomeHtml(params: { firstName?: string | null }): string {
  const firstName = (params.firstName || '').trim();
  const greeting = firstName ? `Welcome, ${firstName}!` : 'Welcome to FL4SH!';

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Welcome to FL4SH</title>
      </head>
      <body style="margin:0;padding:0;background:#070A12;color:#E6EAF2;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Welcome to FL4SH — build smarter flashcards, faster.</div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070A12;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:#0B1020;">
                <tr>
                  <td style="padding:22px 22px 14px 22px;text-align:center;">
                    <img src="https://www.fl4shcards.com/flash_assets/flash-logo-transparent.png" width="72" height="72" alt="FL4SH" style="display:block;margin:0 auto 10px auto;" />
                    <div style="font-size:22px;font-weight:800;letter-spacing:0.2px;">${greeting}</div>
                    <div style="margin-top:6px;font-size:14px;opacity:0.88;line-height:1.45;">
                      You’re in — let’s turn your syllabus into confidence.
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
                    <div style="font-weight:800;margin-bottom:6px;">Quick start</div>
                    <ol style="margin:0 0 0 18px;padding:0;">
                      <li>Add your subjects.</li>
                      <li>Pick a topic and create your first flashcard set.</li>
                      <li>Study a little every day — we’ll help you stay consistent.</li>
                    </ol>

                    <div style="margin-top:16px;font-weight:800;">Plans at a glance</div>
                    <div style="margin-top:10px;display:block;">
                      <div style="padding:14px;border-radius:14px;background:#070A12;border:1px solid rgba(255,255,255,0.10);margin-bottom:10px;">
                        <div style="font-weight:800;">Free</div>
                        <div style="opacity:0.9;margin-top:4px;">Perfect for trying FL4SH — build and study flashcards, and get into a daily habit.</div>
                      </div>
                      <div style="padding:14px;border-radius:14px;background:#070A12;border:1px solid rgba(255,255,255,0.10);margin-bottom:10px;">
                        <div style="font-weight:800;">Premium</div>
                        <div style="opacity:0.9;margin-top:4px;">For serious progress — unlock more flexibility across subjects and workflows.</div>
                      </div>
                      <div style="padding:14px;border-radius:14px;background:#070A12;border:1px solid rgba(255,255,255,0.10);">
                        <div style="font-weight:800;">Pro</div>
                        <div style="opacity:0.9;margin-top:4px;">Maximum support — everything in Premium plus the full Pro experience.</div>
                      </div>
                    </div>

                    <div style="margin-top:18px;text-align:center;">
                      <a href="https://www.fl4shcards.com" style="display:inline-block;padding:12px 16px;border-radius:12px;background:linear-gradient(90deg,#00E5FF,#FF4FD8);color:#0B1020;font-weight:800;text-decoration:none;">
                        Explore Premium & Pro
                      </a>
                    </div>

                    <div style="margin-top:16px;font-size:12px;opacity:0.8;text-align:center;line-height:1.5;">
                      Need help? Reply to this email — we’re happy to support.
                    </div>
                  </td>
                </tr>
              </table>
              <div style="max-width:640px;margin:12px auto 0 auto;font-size:11px;color:rgba(230,234,242,0.55);text-align:center;">
                © ${new Date().getFullYear()} FL4SH • You’re receiving this because you created an account.
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
    const emailRaw = userData.user.email || '';
    const email = sanitizeEmail(emailRaw);
    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing user email.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Ensure row exists
    await admin.from('user_email_events').upsert(
      {
        user_id: userId,
        email,
        type: 'welcome',
        status: 'pending',
      },
      { onConflict: 'user_id,type' }
    );

    // Claim "sending" (idempotency gate)
    const { data: claimed, error: claimErr } = await admin
      .from('user_email_events')
      .update({
        status: 'sending',
        error: null,
      })
      .eq('user_id', userId)
      .eq('type', 'welcome')
      .is('sent_at', null)
      .in('status', ['pending', 'failed'])
      .select('id')
      .maybeSingle();

    if (claimErr) {
      console.warn('[welcome-email] failed to claim send slot (non-fatal):', claimErr);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!claimed?.id) {
      // Already sent or another invocation is in-flight.
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'support@fl4shcards.com';
    const templateId = Deno.env.get('SENDGRID_WELCOME_TEMPLATE_ID') || '';

    const html = buildWelcomeHtml({
      firstName: (userData.user.user_metadata as any)?.username ?? null,
    });

    try {
      await sendSendGridEmail({
        to: email,
        fromEmail,
        subject: 'Welcome to FL4SH',
        html,
        templateId: templateId || null,
        dynamicTemplateData: {
          username: (userData.user.user_metadata as any)?.username ?? null,
          app_url: 'https://www.fl4shcards.com',
        },
      });

      await admin
        .from('user_email_events')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq('id', claimed.id);
    } catch (e) {
      const msg = String(e?.message || e);
      console.warn('[welcome-email] send failed:', msg);
      await admin
        .from('user_email_events')
        .update({
          status: 'failed',
          error: msg.slice(0, 1000),
        })
        .eq('id', claimed.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('[welcome-email] fatal:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

