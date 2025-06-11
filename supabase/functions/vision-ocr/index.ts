import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Reading request body...');
    const { image, features } = await req.json()
    console.log('Request body received, image length:', image?.length || 0);
    
    if (!image) {
      console.error('No image provided in request');
      throw new Error('No image provided')
    }

    // Get API key from environment
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_VISION_API_KEY not found in environment');
      throw new Error('Google Vision API key not configured. Please add GOOGLE_VISION_API_KEY to Edge Function secrets.');
    }
    
    // Prepare the request for Google Vision API
    const visionRequest = {
      requests: [{
        image: {
          content: image // base64 encoded image
        },
        features: features || [
          { type: 'TEXT_DETECTION', maxResults: 1 },
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
        ]
      }]
    }

    console.log('Calling Google Vision API...');
    
    // Call Google Vision API with API key
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visionRequest),
      }
    )

    const responseText = await response.text();
    console.log('Vision API response status:', response.status);
    
    if (!response.ok) {
      console.error('Vision API error:', responseText);
      throw new Error(`Vision API error: ${responseText}`)
    }

    const result = JSON.parse(responseText);
    console.log('Vision API response received');
    
    // Extract text from the response
    const extractedText = result.responses[0]?.fullTextAnnotation?.text || 
                         result.responses[0]?.textAnnotations?.[0]?.description || ''
    
    console.log('Extracted text length:', extractedText.length);

    // Return the extracted text
    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        raw: result.responses[0] // Include raw response for debugging
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in vision-ocr function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 