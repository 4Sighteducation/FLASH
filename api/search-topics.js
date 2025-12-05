const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Main handler function
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if API keys are configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'OpenAI API key not configured'
      });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Supabase credentials not configured'
      });
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { query, examBoard, qualificationLevel, subjectName, limit = 10 } = req.body;

    // Validate required fields
    if (!query || !examBoard || !qualificationLevel || !subjectName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['query', 'examBoard', 'qualificationLevel', 'subjectName']
      });
    }

    console.log(`🔍 Searching for: "${query}"`, {
      examBoard,
      qualificationLevel,
      subjectName,
      limit
    });

    // Step 1: Generate embedding for search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Call Supabase RPC function for vector search
    const { data: searchResults, error: searchError } = await supabase.rpc('match_topics', {
      query_embedding: queryEmbedding,
      p_exam_board: examBoard,
      p_qualification_level: qualificationLevel,
      p_subject_name: subjectName,
      p_limit: limit,
    });

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    console.log(`✅ Found ${searchResults?.length || 0} results`);

    // Return results
    return res.status(200).json({
      success: true,
      query,
      results: searchResults || [],
      count: searchResults?.length || 0,
    });

  } catch (error) {
    console.error('Topic search error:', error);
    return res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
};

