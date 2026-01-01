import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS (mostly for browser clicks)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const token = url.searchParams.get('t');
    const download = url.searchParams.get('download') === '1';
    if (!id || !token) {
      return new Response('Missing id or token', { status: 400, headers: corsHeaders });
    }

    const { data: fb, error } = await supabase
      .from('user_feedback')
      .select('id, view_token, screenshot_bucket, screenshot_path, screenshot_mime')
      .eq('id', id)
      .maybeSingle();

    if (error || !fb?.id) {
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    if (String((fb as any).view_token) !== token) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const bucket = (fb as any).screenshot_bucket as string | null;
    const path = (fb as any).screenshot_path as string | null;
    const mime = ((fb as any).screenshot_mime as string | null) || 'image/jpeg';
    if (!bucket || !path) {
      return new Response('No screenshot', { status: 404, headers: corsHeaders });
    }

    // Serve the bytes directly instead of redirecting to a signed Storage URL.
    // This avoids email clients / browsers failing on large tokenized URLs.
    const { data: fileData, error: dlErr } = await supabase.storage.from(bucket).download(path);
    if (dlErr || !fileData) {
      console.error('[feedback-screenshot] download failed', dlErr);
      return new Response('Failed to download screenshot', { status: 500, headers: corsHeaders });
    }

    const ab = await fileData.arrayBuffer();
    const filename = path.split('/').slice(-1)[0] || 'screenshot.jpg';

    return new Response(ab, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': mime,
        // Some email clients / embedded webviews render a blank page for raw image responses.
        // Allow forcing a download via ?download=1.
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    console.error('[feedback-screenshot] error', e);
    return new Response(msg, { status: 500, headers: corsHeaders });
  }
});


