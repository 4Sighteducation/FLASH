import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type Tier = 'premium' | 'pro';

type Payload =
  | {
      action: 'create';
      tier?: Tier;
      expiresAtIso?: string | null; // if omitted, defaults to 30 days
      maxUses?: number;
      note?: string | null;
    }
  | {
      action: 'bulk_create';
      count: number;
      tier?: Tier;
      expiresAtIso?: string | null; // if omitted, defaults to 30 days
      maxUses?: number;
      note?: string | null;
    }
  | {
      action: 'generate_for_waitlist_top_twenty';
      tier?: Tier;
      expiresAtIso?: string | null; // if omitted, defaults to 30 days
      note?: string | null;
    }
  | {
      action: 'list_waitlist_top_twenty_codes';
    };

function normalizeTier(t: any): Tier {
  return t === 'premium' ? 'premium' : 'pro';
}

function parseExpiresAtMs(expiresAtIso?: string | null): number {
  if (expiresAtIso === null) return Date.now() + 30 * 24 * 60 * 60 * 1000;
  const raw = (expiresAtIso || '').trim();
  if (!raw) return Date.now() + 30 * 24 * 60 * 60 * 1000;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : Date.now() + 30 * 24 * 60 * 60 * 1000;
}

function randomCode(groups = 4, groupLen = 4): string {
  // Base32-ish alphabet (no 0/1/O/I to reduce confusion)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(groups * groupLen);
  crypto.getRandomValues(bytes);
  let raw = '';
  for (const b of bytes) raw += alphabet[b % alphabet.length];
  const parts: string[] = [];
  for (let i = 0; i < groups; i++) parts.push(raw.slice(i * groupLen, (i + 1) * groupLen));
  return parts.join('-');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  try {
    const expected = (Deno.env.get('BETA_ACCESS_ADMIN_SECRET') || '').trim();
    const gotHeader = (req.headers.get('x-admin-secret') || '').trim();
    const auth = req.headers.get('authorization') || '';
    const gotBearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!expected || (gotHeader !== expected && gotBearer !== expected)) {
      return json(401, { ok: false, error: 'Unauthorized' });
    }

    const payload = (await req.json().catch(() => ({}))) as Payload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (payload.action === 'list_waitlist_top_twenty_codes') {
      const { data, error } = await supabase
        .from('waitlist')
        .select('email, position, is_top_twenty, early_access_code, early_access_code_created_at, early_access_code_sent_at')
        .eq('is_top_twenty', true)
        .order('position', { ascending: true });
      if (error) throw new Error(error.message);
      return json(200, { ok: true, items: data || [] });
    }

    if (payload.action === 'create') {
      const tier = normalizeTier((payload as any).tier);
      const maxUses = Math.max(1, Number((payload as any).maxUses ?? 1) || 1);
      const expMs = parseExpiresAtMs((payload as any).expiresAtIso);
      const note = (payload as any).note ? String((payload as any).note) : null;

      for (let attempt = 0; attempt < 8; attempt++) {
        const pretty = randomCode();
        const normalized = pretty.replace(/-/g, '');
        const { data, error } = await supabase
          .from('access_codes')
          .insert({
            code: normalized,
            tier,
            expires_at: new Date(expMs).toISOString(),
            max_uses: maxUses,
            uses_count: 0,
            note,
          })
          .select('code, tier, expires_at, max_uses')
          .maybeSingle();
        if (!error && data?.code) {
          return json(200, { ok: true, code: pretty, tier: data.tier, expiresAt: data.expires_at, maxUses: data.max_uses });
        }
      }

      return json(500, { ok: false, error: 'Failed to generate a unique code.' });
    }

    if (payload.action === 'bulk_create') {
      const tier = normalizeTier((payload as any).tier);
      const maxUses = Math.max(1, Number((payload as any).maxUses ?? 1) || 1);
      const expMs = parseExpiresAtMs((payload as any).expiresAtIso);
      const note = (payload as any).note ? String((payload as any).note) : null;
      const count = Math.min(500, Math.max(1, Number((payload as any).count || 0) || 0));
      if (!count) return json(400, { ok: false, error: 'Invalid count' });

      const items: Array<{ code: string; tier: Tier; expiresAt: string; maxUses: number }> = [];

      for (let i = 0; i < count; i++) {
        let createdPretty: string | null = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          const pretty = randomCode();
          const normalized = pretty.replace(/-/g, '');
          const { data, error } = await supabase
            .from('access_codes')
            .insert({
              code: normalized,
              tier,
              expires_at: new Date(expMs).toISOString(),
              max_uses: maxUses,
              uses_count: 0,
              note,
            })
            .select('code')
            .maybeSingle();
          if (!error && data?.code) {
            createdPretty = pretty;
            break;
          }
        }
        if (!createdPretty) {
          return json(500, { ok: false, error: `Failed to create code ${i + 1}/${count}` });
        }
        items.push({ code: createdPretty, tier, expiresAt: new Date(expMs).toISOString(), maxUses });
      }

      return json(200, { ok: true, count, tier, expiresAt: new Date(expMs).toISOString(), maxUses, items });
    }

    if (payload.action === 'generate_for_waitlist_top_twenty') {
      const tier = normalizeTier((payload as any).tier);
      const expMs = parseExpiresAtMs((payload as any).expiresAtIso);
      const note = (payload as any).note ? String((payload as any).note) : 'waitlist_top_twenty';

      const { data: rows, error: rowsErr } = await supabase
        .from('waitlist')
        .select('id, email, position, early_access_code')
        .eq('is_top_twenty', true)
        .order('position', { ascending: true });
      if (rowsErr) throw new Error(rowsErr.message);

      const out: any[] = [];
      for (const r of rows || []) {
        if ((r as any).early_access_code) {
          out.push({ email: (r as any).email, position: (r as any).position, code: (r as any).early_access_code, reused: true });
          continue;
        }

        let createdPretty: string | null = null;
        for (let attempt = 0; attempt < 8; attempt++) {
          const pretty = randomCode();
          const normalized = pretty.replace(/-/g, '');
          const { data, error } = await supabase
            .from('access_codes')
            .insert({
              code: normalized,
              tier,
              expires_at: new Date(expMs).toISOString(),
              max_uses: 1,
              uses_count: 0,
              note,
            })
            .select('code')
            .maybeSingle();
          if (!error && data?.code) {
            createdPretty = pretty;
            break;
          }
        }
        if (!createdPretty) {
          out.push({ email: (r as any).email, position: (r as any).position, error: 'failed_to_create_code' });
          continue;
        }

        await supabase
          .from('waitlist')
          .update({
            early_access_code: createdPretty,
            early_access_code_created_at: new Date().toISOString(),
          })
          .eq('id', (r as any).id);

        out.push({ email: (r as any).email, position: (r as any).position, code: createdPretty, reused: false });
      }

      return json(200, { ok: true, tier, expiresAt: new Date(expMs).toISOString(), items: out });
    }

    return json(400, { ok: false, error: 'Unknown action' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    console.error('[access-code-admin] error', e);
    return json(500, { ok: false, error: msg });
  }
});

