import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transitionId, projectId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get transition data
    const { data: transition, error: tErr } = await supabase
      .from("transitions")
      .select("*")
      .eq("id", transitionId)
      .single();

    if (tErr || !transition) throw new Error("Transition not found");

    // Update status
    await supabase.from("transitions").update({ status: "generating" }).eq("id", transitionId);

    // Get from and to scene images
    const { data: fromScene } = await supabase
      .from("scenes")
      .select("output_image_url, scene_title")
      .eq("project_id", projectId)
      .eq("scene_number", transition.from_scene)
      .single();

    const { data: toScene } = await supabase
      .from("scenes")
      .select("output_image_url, scene_title")
      .eq("project_id", projectId)
      .eq("scene_number", transition.to_scene)
      .single();

    // Generate a transition frame using AI image editing (blend two scenes)
    const messages: any[] = [];
    
    if (fromScene?.output_image_url && toScene?.output_image_url) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: `Create a cinematic transition frame that blends these two scenes together. ${transition.animation_prompt}. The result should be a mid-transition frame showing the morph between Scene ${transition.from_scene} (${fromScene.scene_title}) and Scene ${transition.to_scene} (${toScene.scene_title}). Make it look like a cinematic cross-dissolve with depth and motion blur effects.` },
          { type: "image_url", image_url: { url: fromScene.output_image_url } },
          { type: "image_url", image_url: { url: toScene.output_image_url } },
        ]
      });
    } else {
      // Fallback: generate based on prompt alone
      messages.push({
        role: "user",
        content: `Create a cinematic transition frame for a bunker transformation video. ${transition.animation_prompt}. Photorealistic, cinematic, motion blur effect, dramatic lighting.`
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
      const errText = await response.text();
      console.error("AI transition error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI transition generation failed: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
      throw new Error("No image generated for transition");
    }

    // Upload to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
    const filePath = `${projectId}/transitions/transition_${transition.transition_number}.png`;
    const { error: uploadErr } = await supabase.storage
      .from("project-assets")
      .upload(filePath, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadErr) {
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
      throw uploadErr;
    }

    const { data: publicUrl } = supabase.storage
      .from("project-assets")
      .getPublicUrl(filePath);

    // Update transition
    const { data: updated, error: updateErr } = await supabase
      .from("transitions")
      .update({
        output_video_url: publicUrl.publicUrl,
        start_image_url: fromScene?.output_image_url || null,
        end_image_url: toScene?.output_image_url || null,
        status: "completed",
      })
      .eq("id", transitionId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ transition: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-transition error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
