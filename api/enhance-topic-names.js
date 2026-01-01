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

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Supabase credentials not configured'
      });
    }

    // Initialize clients
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { topicId, topicName, subjectName, parentName, grandparentName, siblings, batchMode } = req.body;

    // Validate required fields
    if (!topicId || !topicName || !subjectName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['topicId', 'topicName', 'subjectName']
      });
    }

    // Build context for AI
    let contextInfo = `Subject: ${subjectName}`;
    if (grandparentName) contextInfo += `\nGrandparent Topic: ${grandparentName}`;
    if (parentName) contextInfo += `\nParent Topic: ${parentName}`;
    if (siblings && siblings.length > 0) {
      contextInfo += `\nSibling Topics: ${siblings.join(', ')}`;
    }

    // Create prompt
    const prompt = `You are enhancing a curriculum topic name that was poorly scraped.

${contextInfo}

Current Name: "${topicName}"

This topic name is unclear or poorly formatted. Generate a clear, descriptive topic name that:
1. Clearly describes what this topic covers
2. Fits within the curriculum hierarchy
3. Is student-friendly and specific
4. Is between 15-60 characters
5. Uses proper capitalization (Title Case)

Return ONLY the improved topic name, nothing else.

Examples:
- "1" → "Introduction to Atomic Structure"
- "2.1" → "Chemical Bonding Fundamentals"  
- "3" → "Organic Reaction Mechanisms"

Improved Name:`;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Faster and cheaper for this task
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 50,
    });

    const enhancedName = response.choices[0].message.content.trim();

    // Clean up the enhanced name (remove quotes, extra whitespace)
    const cleanedName = enhancedName
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Update in database
    const { error: updateError } = await supabase
      .from('curriculum_topics')
      .update({ 
        display_name: cleanedName,
        needs_name_enhancement: false,
      })
      .eq('id', topicId);

    if (updateError) {
      console.error('Error updating topic name:', updateError);
      return res.status(500).json({ 
        error: 'Database update failed',
        message: updateError.message 
      });
    }

    return res.status(200).json({ 
      success: true,
      original: topicName,
      enhanced: cleanedName,
      topicId,
    });

  } catch (error) {
    console.error('Error enhancing topic name:', error);
    return res.status(500).json({ 
      error: 'Failed to enhance topic name',
      message: error.message 
    });
  }
}




