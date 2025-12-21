import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DueRow = {
  user_id: string;
  expo_push_token: string;
  timezone: string;
  daily_due_cards_hour: number;
  last_daily_due_cards_sent_at: string | null;
  due_count: number;
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.rpc('get_due_cards_push_targets', { p_limit: 500 });
    if (error) throw error;

    const rows: DueRow[] = (data as any) || [];
    if (!rows.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = rows.map((r) => ({
      to: r.expo_push_token,
      sound: 'default',
      title: 'FLASH',
      body: `You have ${r.due_count} cards due for review today.`,
      badge: r.due_count,
      data: { type: 'daily_due_cards', dueCount: r.due_count },
    }));

    // Expo recommends chunking
    const chunks = chunk(messages, 100);
    let receipts: any[] = [];
    for (const batch of chunks) {
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      const json = await resp.json();
      receipts.push(json);
    }

    // Mark as sent (best-effort)
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    await supabase
      .from('user_notification_preferences')
      .update({ last_daily_due_cards_sent_at: new Date().toISOString() })
      .in('user_id', userIds);

    return new Response(JSON.stringify({ ok: true, attempted: rows.length, receipts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('send-daily-due-cards error:', e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});


