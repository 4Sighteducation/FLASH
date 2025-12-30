import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// NOTE (stub):
// This function intentionally does NOT verify Stripe signatures yet.
// We deploy it first so you can create the Stripe webhook endpoint and obtain the `whsec_...` signing secret.
// Next step will be to add signature verification + event handling.

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Stripe expects a 2xx response quickly; we ack immediately.
  // We still read the body so the runtime consumes it (helps avoid oddities in some environments).
  try {
    await req.arrayBuffer();
  } catch {
    // ignore
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});
