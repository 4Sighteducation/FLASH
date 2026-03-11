// @ts-nocheck
// Supabase Edge Functions run on Deno. This repo's TS tooling is configured for RN/Node and
// doesn't understand Deno URL imports or the global `Deno`, so we disable TS checking here.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trial-expiry-secret',
};

type WarnRow = {
  user_id: string;
  expo_push_token: string;
  days_remaining: number;
  expires_at: string;
};

type EmailRow = {
  user_id: string;
  email: string;
  username: string | null;
  days_remaining: number;
  expires_at: string;
  reminder_type: 'trial_halfway' | 'trial_expiring_3d';
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildWarningMessage(days: number): { title: string; body: string } {
  if (days === 15) {
    return {
      title: 'FLASH — Halfway through your free Pro month',
      body: 'Tap to lock in Pro and keep your progress.',
    };
  }
  if (days === 3) {
    return {
      title: 'FLASH — 3 days left of Pro',
      body: 'Tap to keep your study progress.',
    };
  }
  if (days <= 0) {
    return {
      title: 'FLASH — Pro ends today',
      body: 'Tap to keep your study progress.',
    };
  }
  if (days === 1) {
    return {
      title: 'FLASH — Pro ends tomorrow',
      body: 'Tap to keep your study progress.',
    };
  }
  return {
    title: `FLASH — Pro ends in ${days} days`,
    body: 'Tap to keep your study progress.',
  };
}

function sanitizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendSendGridEmail(params: { to: string; fromEmail: string; subject: string; html: string; customArgs?: any }) {
  const sendGridKey = Deno.env.get('SENDGRID_API_KEY') || '';
  if (!sendGridKey) {
    console.warn('[trial-expiry-sweep] SENDGRID_API_KEY not set; skipping email');
    return;
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendGridKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: params.to }],
          custom_args: params.customArgs || undefined,
        },
      ],
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

function buildTrialReminderHtml(params: {
  reminderType: 'trial_halfway' | 'trial_expiring_3d';
  username?: string | null;
  daysRemaining: number;
  expiresAtIso: string;
  upgradeUrl: string;
}): { subject: string; html: string } {
  const name = (params.username || '').trim();
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const upgradeUrl = params.upgradeUrl;

  const headline =
    params.reminderType === 'trial_halfway'
      ? 'You’re halfway through your free Pro month'
      : 'Your free Pro trial ends in 3 days';

  const body1 =
    params.reminderType === 'trial_halfway'
      ? `You’ve got <strong>${params.daysRemaining} days</strong> left to get the most out of Pro. If you want to keep everything exactly as it is after the trial, you can upgrade now.`
      : `You’ve got <strong>${params.daysRemaining} days</strong> left of Pro. To keep your study progress and Pro features, choose an option now.`;

  const subject =
    params.reminderType === 'trial_halfway'
      ? 'FL4SH — Halfway through your free Pro month'
      : 'FL4SH — 3 days left of Pro';

  const footer = `Trial expiry: ${new Date(params.expiresAtIso).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC`;

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#070A12;color:#E6EAF2;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          ${headline}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070A12;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:#0B1020;">
                <tr>
                  <td style="padding:22px 22px 14px 22px;text-align:center;">
                    <img src="https://www.fl4shcards.com/flash_assets/flash-logo-transparent.png" width="72" height="72" alt="FL4SH" style="display:block;margin:0 auto 10px auto;" />
                    <div style="font-size:20px;font-weight:800;letter-spacing:0.2px;">${headline}</div>
                    <div style="margin-top:10px;font-size:14px;opacity:0.9;line-height:1.6;text-align:left;">
                      <p style="margin:0 0 10px 0;">${greeting}</p>
                      <p style="margin:0 0 10px 0;">${body1}</p>
                      <p style="margin:0 0 0 0;">Tap below to upgrade:</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 22px 18px 22px;text-align:center;">
                    <a href="${upgradeUrl}" style="display:inline-block;padding:12px 16px;border-radius:12px;background:linear-gradient(90deg,#00E5FF,#FF4FD8);color:#0B1020;font-weight:800;text-decoration:none;">
                      View Pro options
                    </a>
                    <div style="margin-top:12px;font-size:11px;opacity:0.65;line-height:1.4;">${footer}</div>
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

  return { subject, html };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth: callable only by internal schedulers / operators.
    // Allow either:
    // - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>, OR
    // - x-trial-expiry-secret: <TRIAL_EXPIRY_JOB_SECRET>
    const serviceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
    const expectedSecret = (Deno.env.get('TRIAL_EXPIRY_JOB_SECRET') || '').trim();
    const debugAuth = (Deno.env.get('TRIAL_EXPIRY_DEBUG') || '').trim() === 'true';
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const gotSecret = (req.headers.get('x-trial-expiry-secret') || '').trim();
    const authorized = (!!serviceKey && bearer === serviceKey) || (!!expectedSecret && gotSecret === expectedSecret);
    if (!authorized) {
      const debug = debugAuth
        ? {
            expectedSecretSet: expectedSecret.length > 0,
            expectedSecretLen: expectedSecret.length,
            headerPresent: gotSecret.length > 0,
            headerLen: gotSecret.length,
            serviceKeySet: serviceKey.length > 0,
            bearerPresent: bearer.length > 0,
            bearerLen: bearer.length,
          }
        : undefined;
      if (debugAuth) {
        console.log('[trial-expiry-sweep] unauthorized', debug);
      }
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized', debug }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const sb = createClient(supabaseUrl, serviceKey);

    const purchaseUrl =
      (Deno.env.get('TRIAL_UPGRADE_URL') || '').trim() ||
      // Fallback: website download page (better than nothing)
      'https://www.fl4shcards.com/download';

    const fromEmail =
      (Deno.env.get('SENDGRID_TRIAL_FROM_EMAIL') || '').trim() ||
      (Deno.env.get('SENDGRID_FROM_EMAIL') || '').trim() ||
      'support@fl4shcards.com';

    // 1) Send warnings
    const { data: warnData, error: warnErr } = await sb.rpc('get_trial_expiry_push_targets', { p_limit: 500 });
    if (warnErr) throw warnErr;
    const warnRows: WarnRow[] = (warnData as any) || [];

    const messages = warnRows.map((r) => {
      const msg = buildWarningMessage(Number(r.days_remaining) || 0);
      return {
        to: r.expo_push_token,
        sound: 'default',
        title: msg.title,
        body: msg.body,
        data: {
          type: 'trial_expiry',
          daysRemaining: Number(r.days_remaining) || 0,
          expiresAt: r.expires_at,
          upgradeUrl: purchaseUrl,
          action: 'open_paywall',
        },
      };
    });

    let warningReceipts: any[] = [];
    if (messages.length) {
      const chunks = chunk(messages, 100);
      for (const batch of chunks) {
        const resp = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });
        const json = await resp.json();
        warningReceipts.push(json);
      }

      // Record "last warning" in user_subscriptions (best-effort).
      // We do it per-user because days_remaining differs.
      for (const r of warnRows) {
        try {
          await sb
            .from('user_subscriptions')
            .update({
              trial_last_warning_days_remaining: Number(r.days_remaining) || 0,
              trial_last_warning_sent_at: new Date().toISOString(),
            })
            .eq('user_id', r.user_id);
        } catch {
          // ignore
        }
      }
    }

    // 1b) Send trial reminder emails (halfway + 3 days)
    const emailResults: Array<{ user_id: string; type: string; ok: boolean; reason?: string }> = [];
    try {
      const { data: emailData, error: emailErr } = await sb.rpc('get_trial_reminder_email_targets', { p_limit: 500 });
      if (emailErr) throw emailErr;
      const rows: EmailRow[] = (emailData as any) || [];

      for (const r of rows) {
        const email = sanitizeEmail(r.email || '');
        const reminderType = (r.reminder_type || '') as any;
        if (!email || !isValidEmail(email)) {
          emailResults.push({ user_id: r.user_id, type: String(reminderType || 'unknown'), ok: false, reason: 'invalid_email' });
          continue;
        }
        if (reminderType !== 'trial_halfway' && reminderType !== 'trial_expiring_3d') {
          emailResults.push({ user_id: r.user_id, type: String(reminderType || 'unknown'), ok: false, reason: 'invalid_type' });
          continue;
        }

        // Idempotency gate + audit row
        try {
          await sb.from('user_email_events').upsert(
            {
              user_id: r.user_id,
              email,
              type: reminderType,
              status: 'pending',
            },
            { onConflict: 'user_id,type' }
          );

          // Claim "sending"
          const { data: claimed, error: claimErr } = await sb
            .from('user_email_events')
            .update({ status: 'sending', error: null })
            .eq('user_id', r.user_id)
            .eq('type', reminderType)
            .in('status', ['pending', 'failed'])
            .select('id,status')
            .maybeSingle();
          if (claimErr) throw claimErr;
          if (!claimed?.id) {
            // Someone else claimed it, or it's already sent
            emailResults.push({ user_id: r.user_id, type: reminderType, ok: true, reason: 'already_claimed_or_sent' });
            continue;
          }

          const built = buildTrialReminderHtml({
            reminderType,
            username: r.username,
            daysRemaining: Number(r.days_remaining) || 0,
            expiresAtIso: r.expires_at,
            upgradeUrl: purchaseUrl,
          });

          await sendSendGridEmail({
            to: email,
            fromEmail,
            subject: built.subject,
            html: built.html,
            customArgs: { user_id: r.user_id, email_type: reminderType },
          });

          await sb
            .from('user_email_events')
            .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
            .eq('user_id', r.user_id)
            .eq('type', reminderType);

          emailResults.push({ user_id: r.user_id, type: reminderType, ok: true });
        } catch (e: any) {
          const msg = String(e?.message || e).slice(0, 1000);
          try {
            await sb
              .from('user_email_events')
              .update({ status: 'failed', error: msg })
              .eq('user_id', r.user_id)
              .eq('type', reminderType);
          } catch {
            // ignore
          }
          emailResults.push({ user_id: r.user_id, type: reminderType, ok: false, reason: msg });
        }
      }

      console.log('[trial-expiry-sweep] trial reminder emails complete', { attempted: rows.length });
    } catch (e: any) {
      console.warn('[trial-expiry-sweep] trial reminder emails failed:', e?.message || e);
    }

    // 2) Process expiries where the user already chose "ask someone else to pay" after expiry
    // AND the 7-day grace has ended.
    //
    // We still do NOT wipe users who simply stop opening the app at day 30 without taking action.
    const expiredUsers: Array<{ user_id: string }> = [];
    const processed: Array<{ user_id: string; ok: boolean; reason: string }> = [];

    const { data: expData, error: expErr } = await sb.rpc('get_expired_trial_users', { p_limit: 500 });
    if (expErr) throw expErr;
    expiredUsers.push(...(((expData as any) || []) as Array<{ user_id: string }>));

    for (const u of expiredUsers) {
      const uid = (u as any)?.user_id;
      if (!uid) continue;
      try {
        const { data: res, error: procErr } = await sb.rpc('process_expired_trial_user', {
          p_user_id: uid,
          p_force: false,
        });
        if (procErr) {
          processed.push({ user_id: uid, ok: false, reason: procErr.message });
        } else {
          const row = Array.isArray(res) ? res[0] : res;
          processed.push({ user_id: uid, ok: !!row?.ok, reason: String(row?.reason || 'processed') });
        }
      } catch (e: any) {
        processed.push({ user_id: uid, ok: false, reason: e?.message || 'error' });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        warningsAttempted: warnRows.length,
        warningReceipts,
        trialReminderEmails: emailResults,
        expiriesFound: expiredUsers.length,
        expiriesProcessed: processed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('trial-expiry-sweep error:', e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

