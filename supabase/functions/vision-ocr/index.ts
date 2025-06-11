import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.4/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to get access token using service account
async function getAccessToken() {
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT not configured');
  }
  
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT
  const iat = getNumericDate(0);
  const exp = getNumericDate(3600); // 1 hour
  
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/cloud-vision",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp,
    },
    serviceAccount.private_key
  );
  
  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
  }
  
  const { access_token } = await tokenResponse.json();
  return access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image, features } = await req.json()
    
    if (!image) {
      throw new Error('No image provided')
    }

    // Get access token using service account
    const accessToken = await getAccessToken();
    
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

    // Call Google Vision API with Bearer token
    const response = await fetch(
      'https://vision.googleapis.com/v1/images:annotate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(visionRequest),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vision API error: ${error}`)
    }

    const result = await response.json()
    
    // Extract text from the response
    const extractedText = result.responses[0]?.fullTextAnnotation?.text || 
                         result.responses[0]?.textAnnotations?.[0]?.description || ''

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