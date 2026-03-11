import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ResponseBody =
  | { ok: true; hasClaim: false }
  | { ok: true; hasClaim: true; code: string; expiresAt: string | null; expiresAtMs: number | null }
  | { ok: false; error: string };

function json(status: number, body: ResponseBody) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeEmail(email: string | null | undefined): string {
  return String(email || '').trim().toLowerCase();
}

function safeIsoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    console.log('[pending-parent-claim] request', { method: req.method });
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return json(401, { ok: false, error: 'Missing Authorization bearer token.' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceKey) return json(500, { ok: false, error: 'Server not configured.' });

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user?.id) return json(401, { ok: false, error: 'Invalid session.' });

    const emailLower = normalizeEmail(authData.user.email);
    console.log('[pending-parent-claim] user', { userId: authData.user.id, hasEmail: !!emailLower });
    if (!emailLower) return json(200, { ok: true, hasClaim: false });

    const { data: claim, error: claimErr } = await supabase
      .from('parent_claims')
      .select('claim_code, paid_expires_at_ms')
      .eq('child_email_lower', emailLower)
      .eq('status', 'paid')
      .is('claimed_by', null)
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (claimErr) {
      console.error('[pending-parent-claim] lookup failed', claimErr);
      return json(500, { ok: false, error: 'Lookup failed.' });
    }

    console.log('[pending-parent-claim] result', { hasClaim: !!claim?.claim_code });
    if (!claim?.claim_code) return json(200, { ok: true, hasClaim: false });

    const expiresAtMs = Number((claim as any).paid_expires_at_ms || 0);
    const expiresAtIso = Number.isFinite(expiresAtMs) && expiresAtMs > 0 ? safeIsoFromMs(expiresAtMs) : null;

    return json(200, {
      ok: true,
      hasClaim: true,
      code: String((claim as any).claim_code),
      expiresAt: expiresAtIso,
      expiresAtMs: expiresAtIso ? expiresAtMs : null,
    });
  } catch (e) {
    console.error('[pending-parent-claim] handler error', e);
    return json(500, { ok: false, error: 'Internal error' });
  }
});

