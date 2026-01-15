// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json(500, { ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) return json(401, { ok: false, error: 'Missing Authorization bearer token' });

    const sb = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json(401, { ok: false, error: 'Invalid session' });

    const userId = userData.user.id;

    // Confirm they are eligible for expiry processing (trial expired and not already processed)
    const { data: subRow, error: subErr } = await sb
      .from('user_subscriptions')
      .select('tier, source, expires_at, expired_processed_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (subErr) return json(500, { ok: false, error: subErr.message });

    const expiresAt = subRow?.expires_at ? new Date(subRow.expires_at) : null;
    const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : false;
    const isTrial = String(subRow?.source || '') === 'trial';
    const alreadyProcessed = !!subRow?.expired_processed_at;

    if (!isTrial) return json(400, { ok: false, error: 'Not a trial subscription' });
    if (alreadyProcessed) return json(200, { ok: true, alreadyProcessed: true });
    if (!isExpired) return json(400, { ok: false, error: 'Trial not expired yet' });

    const { data: rpcData, error: rpcErr } = await sb.rpc('process_expired_trial_user', { p_user_id: userId });
    if (rpcErr) return json(500, { ok: false, error: rpcErr.message });

    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    return json(200, { ok: true, result: row || null });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || 'Internal error' });
  }
});

