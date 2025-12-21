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
  due_box_1?: number;
  due_box_2?: number;
  due_box_3?: number;
  due_box_4?: number;
  due_box_5?: number;
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

    // Optional debug payload (useful when the function returns sent: 0)
    let debugEmail: string | null = null;
    try {
      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({} as any));
        debugEmail = typeof body?.user_email === 'string' ? body.user_email : null;
      }
    } catch {
      // ignore
    }

    const { data, error } = await supabase.rpc('get_due_cards_push_targets', { p_limit: 500 });
    if (error) throw error;

    const rows: DueRow[] = (data as any) || [];
    if (!rows.length) {
      // Extra debug info for a specific user, if provided
      if (debugEmail) {
        const { data: userRow } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', debugEmail)
          .maybeSingle();

        const userId = (userRow as any)?.id as string | undefined;

        const { data: tokenRow } = userId
          ? await supabase
              .from('user_push_tokens')
              .select('enabled, expo_push_token, platform, updated_at')
              .eq('user_id', userId)
              .eq('enabled', true)
              .maybeSingle()
          : { data: null as any };

        const { data: prefRow } = userId
          ? await supabase
              .from('user_notification_preferences')
              .select('push_enabled, daily_due_cards_enabled, daily_due_cards_hour, timezone, last_daily_due_cards_sent_at')
              .eq('user_id', userId)
              .maybeSingle()
          : { data: null as any };

        let hourNowInTz: number | null = null;
        try {
          if (prefRow?.timezone) {
            const parts = new Intl.DateTimeFormat('en-GB', {
              timeZone: prefRow.timezone,
              hour: '2-digit',
              hour12: false,
            }).formatToParts(new Date());
            const hourPart = parts.find((p) => p.type === 'hour')?.value;
            hourNowInTz = hourPart ? parseInt(hourPart, 10) : null;
          }
        } catch {
          hourNowInTz = null;
        }

        // Due count for this user (best-effort)
        let dueNow = 0;
        if (userId) {
          const { data: subjects } = await supabase
            .from('user_subjects')
            .select('subject:exam_board_subjects(subject_name)')
            .eq('user_id', userId);

          const subjectNames =
            (subjects || [])
              .map((s: any) => s?.subject?.subject_name)
              .filter(Boolean) as string[];

          if (subjectNames.length) {
            const { count } = await supabase
              .from('flashcards')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('in_study_bank', true)
              .lte('next_review_date', new Date().toISOString())
              .in('subject_name', subjectNames);
            dueNow = count || 0;
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            sent: 0,
            debug: {
              now: new Date().toISOString(),
              debugEmail,
              resolvedUserId: userId || null,
              token: tokenRow || null,
              prefs: prefRow || null,
              hourNowInTz,
              dueNow,
              note:
                'If hourNowInTz != daily_due_cards_hour, or token/prefs missing, or dueNow=0, then the user is not eligible right now.',
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = rows.map((r) => {
      const b1 = r.due_box_1 ?? 0;
      const b2 = r.due_box_2 ?? 0;
      const b3 = r.due_box_3 ?? 0;
      const b4 = r.due_box_4 ?? 0;
      const b5 = r.due_box_5 ?? 0;

      const breakdownParts = [
        `B1 ${b1}`,
        `B2 ${b2}`,
        `B3 ${b3}`,
        `B4 ${b4}`,
        `B5 ${b5}`,
      ].filter((p) => !p.endsWith(' 0'));

      const breakdown = breakdownParts.length ? ` (${breakdownParts.join(' • ')})` : '';

      return {
      to: r.expo_push_token,
      sound: 'default',
      title: 'FLASH',
      body: `You have ${r.due_count} cards due for review today.${breakdown}`,
      badge: r.due_count,
      data: {
        type: 'daily_due_cards',
        dueCount: r.due_count,
        dueByBox: { 1: b1, 2: b2, 3: b3, 4: b4, 5: b5 },
      },
    };
    });

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


