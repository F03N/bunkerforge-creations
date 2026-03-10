import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * DEPRECATED: This function is kept for backward compatibility.
 * All transition video generation should use the `generate-video` function instead.
 * This function previously generated a static transition IMAGE (PNG) using the Lovable AI gateway.
 * The correct workflow now uses Google Veo 2 for actual VIDEO generation via `generate-video`.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({
      error: "This endpoint is deprecated. Use the 'generate-video' function for transition video generation.",
      migration: "Transition generation now produces MP4 videos via Google Veo 2, not static PNG images.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
