// @ts-nocheck
// Supabase Edge Functions run on Deno. This repo's TS tooling is configured for RN/Node and
// doesn't understand Deno URL imports or the global `Deno`, so we disable TS checking here.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      title: 'FLASH — Pro access ends today',
      body: 'Your free Pro access ends today. Upgrade now to keep Pro features and avoid your cards being reset.',
    };
  }
  if (days === 1) {
    return {
      title: 'FLASH — 1 day left of Pro',
      body: 'Your free Pro access ends tomorrow. Upgrade to keep Pro features and avoid your cards being reset.',
    };
  }
  return {
    title: `FLASH — ${days} days left of Pro`,
    body: `Your free Pro access ends in ${days} days. Upgrade to keep Pro features and avoid your cards being reset.`,
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
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const gotSecret = (req.headers.get('x-trial-expiry-secret') || '').trim();
    const authorized = (!!serviceKey && bearer === serviceKey) || (!!expectedSecret && gotSecret === expectedSecret);
    if (!authorized) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
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

    // 2) Process expiries (wipe + downgrade)
    const { data: expiredData, error: expiredErr } = await sb.rpc('get_expired_trial_users', { p_limit: 200 });
    if (expiredErr) throw expiredErr;
    const expiredUsers: Array<{ user_id: string }> = (expiredData as any) || [];

    const processed: Array<{ user_id: string; ok: boolean; reason: string }> = [];
    for (const u of expiredUsers) {
      const userId = u.user_id;
      try {
        const { data, error } = await sb.rpc('process_expired_trial_user', { p_user_id: userId });
        if (error) {
          processed.push({ user_id: userId, ok: false, reason: error.message });
        } else {
          const row = Array.isArray(data) ? data[0] : data;
          processed.push({ user_id: userId, ok: !!row?.ok, reason: String(row?.reason || '') });
        }
      } catch (e: any) {
        processed.push({ user_id: userId, ok: false, reason: String(e?.message || e) });
      }
    }

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

