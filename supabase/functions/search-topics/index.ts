import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@4.20.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, examBoard, qualificationLevel, subjectName, limit = 20 } = await req.json();

    // Validate input
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const configuration = new Configuration({ apiKey: openaiApiKey });
    const openai = new OpenAIApi(configuration);

    // Step 1: Generate embedding for the query
    console.log('Generating embedding for query:', query);
    const embeddingResponse = await openai.createEmbedding({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data.data[0].embedding;

    // Step 2: Perform vector search using RPC function
    console.log('Performing vector search...');
    const { data: vectorResults, error: searchError } = await supabase
      .rpc('match_topics', {
        query_embedding: queryEmbedding,
        p_exam_board: examBoard || null,
        p_qualification_level: qualificationLevel || null,
        p_subject_name: subjectName || null,
        p_limit: limit,
      });

    if (searchError) {
      console.error('Vector search error:', searchError);
      throw new Error(`Vector search failed: ${searchError.message}`);
    }

    if (!vectorResults || vectorResults.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Use LLM to re-rank and assign confidence scores
    console.log('Re-ranking with LLM...');
    const topicList = vectorResults.map((t: any, idx: number) => 
      `${idx + 1}. ${t.topic_name}: ${t.plain_english_summary || 'No description'}`
    ).join('\n');

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
        { role: 'user', content: userPrompt }
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
      // Fallback to vector similarity as confidence
      confidenceScores = vectorResults.map((t: any, idx: number) => ({
        index: idx + 1,
        confidence: Math.max(0, 1 - (t.similarity || 0)),
      }));
    }

    // Step 4: Combine results with confidence scores
    const finalResults = confidenceScores
      .filter((score: any) => score.confidence > 0.3) // Filter low confidence
      .map((score: any) => {
        const topic = vectorResults[score.index - 1];
        return {
          id: topic.topic_id,
          topic_name: topic.topic_name,
          plain_english_summary: topic.plain_english_summary,
          difficulty_band: topic.difficulty_band,
          exam_importance: topic.exam_importance || 0.5,
          full_path: topic.full_path || [],
          confidence: score.confidence,
          subject_name: topic.subject_name,
          topic_level: topic.topic_level,
        };
      })
      .sort((a: any, b: any) => b.confidence - a.confidence)
      .slice(0, limit);

    // Log for monitoring
    console.log(`Search complete: ${finalResults.length} results for query "${query}"`);

    return new Response(
      JSON.stringify({ 
        results: finalResults,
        query,
        totalCandidates: vectorResults.length,
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
