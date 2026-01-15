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

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildWarningMessage(days: number): { title: string; body: string } {
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

    // 2) NOTE: We intentionally do NOT hard-wipe here.
    // Rationale: push notifications may be disabled; the authoritative warning should be shown in-app
    // on next login/open, then the user confirms the reset.
    const expiredUsers: Array<{ user_id: string }> = [];
    const processed: Array<{ user_id: string; ok: boolean; reason: string }> = [];

    return new Response(
      JSON.stringify({
        ok: true,
        warningsAttempted: warnRows.length,
        warningReceipts,
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

