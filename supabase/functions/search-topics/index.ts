// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@4.20.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeMode(mode: any): 'smart' | 'exact' | 'auto' {
  const m = String(mode || 'smart').toLowerCase().trim();
  if (m === 'exact' || m === 'auto' || m === 'smart') return m;
  return 'smart';
}

function clampInt(n: any, min: number, max: number, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLeafTopicName(fullPath: any, fallback: string) {
  if (Array.isArray(fullPath) && fullPath.length > 0) {
    const leaf = fullPath[fullPath.length - 1];
    if (typeof leaf === 'string' && leaf.trim()) return leaf.trim();
  }
  return fallback;
}

function computeExactConfidence(query: string, fullPath: any, topicName?: string) {
  const q = String(query || '').toLowerCase().trim();
  const leaf = String(topicName || getLeafTopicName(fullPath, '')).toLowerCase().trim();
  if (q && leaf && leaf === q) return 1.0;

  const pathStr = Array.isArray(fullPath) ? fullPath.join(' ').toLowerCase() : '';
  if (q && pathStr) {
    const re = new RegExp(`(^|\\s)${escapeRegex(q)}(\\s|$)`, 'i');
    if (re.test(pathStr)) return 0.9;
  }
  return 0.7;
}

async function runExactSearch({
  supabase,
  query,
  examBoard,
  qualificationLevel,
  subjectName,
  limit,
}: any) {
  const { data: rows, error } = await supabase.rpc('search_topics_exact_path', {
    search_query: query,
    p_exam_board: examBoard || null,
    p_qualification_level: qualificationLevel || null,
    p_subject_name: subjectName || null,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Exact search failed: ${error.message || String(error)}`);
  }

  const list = Array.isArray(rows) ? rows : [];
  const mapped = list.map((r: any) => {
    const fullPath = Array.isArray(r.full_path) ? r.full_path : [];
    const topicName = typeof r.topic_name === 'string' && r.topic_name.trim()
      ? r.topic_name.trim()
      : getLeafTopicName(fullPath, 'Unknown Topic');

    const confidence = computeExactConfidence(query, fullPath, topicName);

    return {
      id: r.topic_id,
      topic_name: topicName,
      plain_english_summary: r.plain_english_summary || '',
      difficulty_band: r.difficulty_band || '',
      exam_importance: typeof r.exam_importance === 'number' ? r.exam_importance : 0.5,
      full_path: fullPath,
      confidence,
      subject_name: r.subject_name || subjectName || '',
      topic_level: typeof r.topic_level === 'number' ? r.topic_level : 0,
    };
  });

  mapped.sort((a: any, b: any) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (b.topic_level || 0) - (a.topic_level || 0);
  });

  return { results: mapped.slice(0, limit), totalCandidates: list.length };
}

async function runSmartSearch({
  openai,
  supabase,
  query,
  examBoard,
  qualificationLevel,
  subjectName,
  limit,
  userId,
}: any) {
  // Step 1: Generate embedding for the query
  // Avoid logging raw user queries (PII leakage).
  console.log('[search-topics] embedding request', { queryLen: String(query).length, userId });
  const embeddingResponse = await openai.createEmbedding({
    model: 'text-embedding-3-small',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data.data[0].embedding;

  // Step 2: Perform vector search using RPC function
  console.log('[search-topics] vector search', { limit });
  const { data: vectorResults, error: searchError } = await supabase.rpc('match_topics', {
    query_embedding: queryEmbedding,
    p_exam_board: examBoard || null,
    p_qualification_level: qualificationLevel || null,
    p_subject_name: subjectName || null,
    // Disambiguate overloaded match_topics() functions (with/without p_match_threshold)
    // Use 0.0 so we don't filter out anything by default.
    p_match_threshold: 0.0,
    p_limit: limit,
  });

  if (searchError) {
    console.error('Vector search error:', searchError);
    throw new Error(`Vector search failed: ${searchError.message}`);
  }

  if (!vectorResults || vectorResults.length === 0) {
    return { results: [], totalCandidates: 0 };
  }

  // Step 3: Use LLM to re-rank and assign confidence scores
  console.log('[search-topics] rerank');
  const topicList = vectorResults
    .map((t: any, idx: number) => {
      const displayName =
        (typeof t.topic_name === 'string' && t.topic_name.trim()) ||
        getLeafTopicName(t.full_path, String(t.topic_id || 'Unknown Topic'));
      return `${idx + 1}. ${displayName}: ${t.plain_english_summary || 'No description'}`;
    })
    .join('\n');

  const systemPrompt = `You are a helpful educational assistant that matches student queries to curriculum topics.
Given a student's search query and a list of potentially matching topics, assign confidence scores.

Consider:
1. How well the topic matches the student's intent
2. Whether the student is likely looking for this specific topic
3. Common ways students might phrase searches for each topic

Return a JSON array with topic indices and confidence scores (0.0 to 1.0).`;

  const userPrompt = `Student query: "${query}"

Available topics:
${topicList}

Assign confidence scores to each topic based on how well it matches the student's search intent.
Return ONLY a JSON array like: [{"index": 1, "confidence": 0.95}, {"index": 2, "confidence": 0.7}, ...]
Include all topics but order by confidence descending.`;

  const completionResponse = await openai.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  let confidenceScores;
  try {
    const responseText = completionResponse.data.choices[0].message?.content || '[]';
    confidenceScores = JSON.parse(responseText);
  } catch (e) {
    console.warn('Failed to parse LLM response, using vector similarity as confidence');
    // Fallback: preserve existing production behavior:
    // treat t.similarity as a distance-like score where lower = better, then map to confidence.
    confidenceScores = vectorResults.map((t: any, idx: number) => ({
      index: idx + 1,
      confidence: Math.max(0, 1 - (Number(t.similarity ?? 0.0) || 0)),
    }));
  }

  // Step 4: Combine results with confidence scores
  const finalResults = (confidenceScores || [])
    .filter((score: any) => (score?.confidence ?? 0) > 0.3)
    .map((score: any) => {
      const topic = vectorResults[(score.index || 1) - 1];
      const fullPath = Array.isArray(topic?.full_path) ? topic.full_path : [];
      const topicName =
        (typeof topic?.topic_name === 'string' && topic.topic_name.trim()) ||
        getLeafTopicName(fullPath, 'Unknown Topic');

      return {
        id: topic.topic_id,
        topic_name: topicName,
        plain_english_summary: topic.plain_english_summary,
        difficulty_band: topic.difficulty_band,
        exam_importance: topic.exam_importance || 0.5,
        full_path: fullPath,
        confidence: score.confidence,
        subject_name: topic.subject_name,
        topic_level: topic.topic_level,
      };
    })
    .sort((a: any, b: any) => b.confidence - a.confidence)
    .slice(0, limit);

  return { results: finalResults, totalCandidates: vectorResults.length };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Auth: require a valid user session (prevents public cost abuse + service-role data access).
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing Authorization bearer token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = await req.json();
    const { query, examBoard, qualificationLevel, subjectName } = body || {};
    const limit = clampInt(body?.limit, 1, 50, 20);
    const mode = normalizeMode(body?.mode);
    const autoMinExactResults = clampInt(body?.autoMinExactResults, 1, 20, 3);

    // Validate input
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!supabaseUrl || !anonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Validate token with anon client; use service role only after auth is validated.
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let modeUsed: 'smart' | 'exact' = 'smart';
    let exactResultsCount = 0;
    let results: any[] = [];
    let totalCandidates = 0;

    if (mode === 'exact' || mode === 'auto') {
      console.log('[search-topics] exact search', { limit, mode });
      const exact = await runExactSearch({ supabase, query, examBoard, qualificationLevel, subjectName, limit });
      exactResultsCount = exact.results.length;

      if (mode === 'exact' || exactResultsCount >= autoMinExactResults) {
        modeUsed = 'exact';
        results = exact.results;
        totalCandidates = exact.totalCandidates;
      }
    }

    if (modeUsed !== 'exact') {
      // Smart search path (OpenAI).
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY is not configured (required for smart search).');
      }
      const configuration = new Configuration({ apiKey: openaiApiKey });
      const openai = new OpenAIApi(configuration);

      const smart = await runSmartSearch({
        openai,
        supabase,
        query,
        examBoard,
        qualificationLevel,
        subjectName,
        limit,
        userId: userData.user.id,
      });

      modeUsed = 'smart';
      results = smart.results;
      totalCandidates = smart.totalCandidates;
    }

    console.log('[search-topics] complete', {
      mode,
      modeUsed,
      results: results.length,
      totalCandidates,
      exactResultsCount,
    });

    return new Response(
      JSON.stringify({ 
        results,
        query,
        totalCandidates,
        modeUsed,
        exactResultsCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
