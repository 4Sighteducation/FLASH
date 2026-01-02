import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@4.20.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-curriculum-ops-secret',
};

type RebuildBody = {
  exam_board_subject_id: string;
  delete_first?: boolean; // default true
  batch_size?: number; // default 64
  run_id?: string; // optional curriculum_ops_runs.id to update
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let runId = '';
  let supabase: any = null;
  try {
    const secret = req.headers.get('x-curriculum-ops-secret') || '';
    const expected = Deno.env.get('CURRICULUM_OPS_SECRET') || '';
    if (!expected || secret !== expected) return json(401, { error: 'Unauthorized' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const openai = new OpenAIApi(new Configuration({ apiKey: openaiApiKey }));

    const body = (await req.json().catch(() => ({}))) as RebuildBody;
    const exam_board_subject_id = String(body.exam_board_subject_id || '').trim();
    if (!exam_board_subject_id) return json(400, { error: 'Missing exam_board_subject_id' });
    const deleteFirst = body.delete_first !== false;
    const batchSize = Math.max(1, Math.min(256, Number(body.batch_size || 64)));
    runId = body.run_id ? String(body.run_id).trim() : '';

    // Resolve subject (for filtering view)
    const { data: subj, error: subjErr } = await supabase
      .from('exam_board_subjects')
      .select('subject_code,subject_name,exam_board:exam_boards(code),qual:qualification_types(code)')
      .eq('id', exam_board_subject_id)
      .maybeSingle();
    if (subjErr) return json(500, { error: subjErr.message });
    if (!subj?.subject_code) return json(404, { error: 'Subject not found' });

    const board = subj.exam_board?.code;
    const qual = subj.qual?.code;
    const subjectCode = subj.subject_code;

    // Fetch topics from the view (includes full_path etc)
    const { data: topics, error: tErr } = await supabase
      .from('topics_with_context')
      .select('topic_id,topic_name,topic_level,full_path,subject_name,exam_board,qualification_level')
      .eq('subject_code', subjectCode)
      .eq('exam_board', board)
      .eq('qualification_level', qual);
    if (tErr) return json(500, { error: tErr.message });
    if (!topics || topics.length === 0) return json(400, { error: 'No topics found for subject' });

    const topicIds = topics.map((t: any) => t.topic_id).filter(Boolean);

    if (deleteFirst) {
      // Chunk deletes to avoid in() limits
      for (let i = 0; i < topicIds.length; i += 1000) {
        const chunk = topicIds.slice(i, i + 1000);
        const { error: delErr } = await supabase.from('topic_ai_metadata').delete().in('topic_id', chunk);
        if (delErr) return json(500, { error: delErr.message });
      }
    }

    const makeInput = (t: any) => {
      const path = Array.isArray(t.full_path) ? t.full_path.filter(Boolean).join(' > ') : '';
      return [
        `Topic: ${t.topic_name || ''}`.trim(),
        path ? `Path: ${path}` : '',
        `Subject: ${t.subject_name || ''}`.trim(),
        `Exam board: ${t.exam_board || ''}`.trim(),
        `Qualification: ${t.qualification_level || ''}`.trim(),
      ]
        .filter(Boolean)
        .join('\n');
    };

    let upserted = 0;
    for (let i = 0; i < topics.length; i += batchSize) {
      const batch = topics.slice(i, i + batchSize);
      const inputs = batch.map(makeInput);

      const embeddingResponse = await openai.createEmbedding({
        model: 'text-embedding-3-small',
        input: inputs,
      });
      const embeddings = embeddingResponse.data.data.map((d: any) => d.embedding);

      const rows = batch.map((t: any, idx: number) => {
        const path = Array.isArray(t.full_path) ? t.full_path.filter(Boolean) : [];
        const nicePath = path.length ? path.join(' > ') : '';
        return {
          topic_id: t.topic_id,
          embedding: embeddings[idx],
          plain_english_summary: nicePath ? `${t.topic_name} (${nicePath})` : String(t.topic_name || ''),
          difficulty_band: null,
          exam_importance: null,
          subject_name: String(t.subject_name || ''),
          exam_board: String(t.exam_board || ''),
          qualification_level: String(t.qualification_level || ''),
          topic_level: t.topic_level ?? null,
          full_path: path,
          is_active: true,
          spec_version: 'v1',
          last_updated: new Date().toISOString(),
        };
      });

      const { error: upErr } = await supabase.from('topic_ai_metadata').upsert(rows, { onConflict: 'topic_id' });
      if (upErr) return json(500, { error: upErr.message });

      upserted += rows.length;
    }

    const payload = {
      ok: true,
      exam_board_subject_id,
      subject_code: subjectCode,
      total_topics: topics.length,
      upserted,
      deleted_first: deleteFirst,
      note: 'This rebuilds embeddings + minimal metadata (summary derived from name/path).',
    };

    if (runId) {
      try {
        await supabase
          .from('curriculum_ops_runs')
          .update({ status: 'success', finished_at: new Date().toISOString(), summary_json: payload })
          .eq('id', runId);
      } catch {
        // ignore
      }
    }

    return json(200, payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    try {
      if (runId && supabase) {
        await supabase.from('curriculum_ops_runs').update({ status: 'error', finished_at: new Date().toISOString(), error_text: msg }).eq('id', runId);
      }
    } catch {
      // ignore
    }
    return json(500, { error: msg });
  }
});

