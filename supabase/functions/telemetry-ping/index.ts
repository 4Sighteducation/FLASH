import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  platform?: string | null;
  app_version?: string | null;
  build_version?: string | null;
  device_model?: string | null;
  os_name?: string | null;
  os_version?: string | null;
  locale?: string | null;
  timezone?: string | null;
};

function normalizeText(v: any, maxLen = 64): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return null;
  return s.slice(0, maxLen);
}

function inferCountry(req: Request): { country: string | null; source: string | null } {
  const candidates: Array<[string, string]> = [
    ['cf-ipcountry', 'cf-ipcountry'],
    ['x-vercel-ip-country', 'x-vercel-ip-country'],
    ['x-country', 'x-country'],
  ];
  for (const [h, source] of candidates) {
    const v = (req.headers.get(h) || '').trim();
    if (v && v !== 'XX') return { country: v.slice(0, 2).toUpperCase(), source };
  }
  return { country: null, source: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Supabase env not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing Authorization bearer token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Validate token with anon client, write with service role.
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const payload = (await req.json().catch(() => ({}))) as Payload;
    const { country, source } = inferCountry(req);

    const admin = createClient(supabaseUrl, serviceKey);
    const userId = userData.user.id;

    const up = await admin.from('user_last_seen').upsert({
      user_id: userId,
      last_seen_at: new Date().toISOString(),
      platform: normalizeText(payload.platform, 24),
      app_version: normalizeText(payload.app_version, 24),
      build_version: normalizeText(payload.build_version, 24),
      device_model: normalizeText(payload.device_model, 80),
      os_name: normalizeText(payload.os_name, 24),
      os_version: normalizeText(payload.os_version, 24),
      locale: normalizeText(payload.locale, 32),
      timezone: normalizeText(payload.timezone, 64),
      country,
      country_source: source,
      updated_at: new Date().toISOString(),
    });

    if (up.error) {
      return new Response(JSON.stringify({ ok: false, error: up.error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

