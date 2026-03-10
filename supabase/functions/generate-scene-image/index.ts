import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sceneId, projectId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get scene data
    const { data: scene, error: sceneErr } = await supabase
      .from("scenes")
      .select("*")
      .eq("id", sceneId)
      .single();

    if (sceneErr || !scene) throw new Error("Scene not found");

    // Get project data for continuity context
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (!project) throw new Error("Project not found");

    // Update status to generating
    await supabase.from("scenes").update({ status: "generating" }).eq("id", sceneId);

    // Build continuity block
    const continuityBlock = [
      `CONTINUITY RULES (MANDATORY):`,
      `- BUNKER IDENTITY: A ${project.selected_idea} bunker. Same exact bunker in every scene.`,
      `- ENVIRONMENT: Same surrounding environment, geography, terrain.`,
      `- CAMERA: Same camera angle, focal length, perspective, composition.`,
      `- ARCHITECTURE: Architectural features stay in same position. Changes are additive only.`,
      `- DESIGN TARGET: Final style "${project.final_style}", mood "${project.visual_mood}", intensity "${project.construction_intensity}".`,
    ].join('\n');

    // Build the image prompt with continuity
    const promptParts = [
      scene.image_prompt,
      '',
      continuityBlock,
      '',
      `Scene ${scene.scene_number} of 9 — "${scene.scene_title}".`,
      `Aspect ratio: 9:16 (VERTICAL portrait for Shorts/Reels/TikTok). Photorealistic, cinematic, high detail.`,
    ];

    // Get previous scene for visual continuity
    let prevSceneImageUrl: string | null = null;
    if (scene.scene_number > 1) {
      const { data: prevScene } = await supabase
        .from("scenes")
        .select("output_image_url, scene_title")
        .eq("project_id", projectId)
        .eq("scene_number", scene.scene_number - 1)
        .single();

      if (!prevScene?.output_image_url) {
        console.warn(`Previous scene ${scene.scene_number - 1} has no output image`);
      } else {
        prevSceneImageUrl = prevScene.output_image_url;
        promptParts.unshift(
          `CRITICAL: This scene continues directly from Scene ${scene.scene_number - 1} ("${prevScene.scene_title}"). Use the provided reference image as the visual starting point. Show ONLY the realistic incremental progress from the previous state. Do NOT change the bunker, environment, or camera angle.`
        );
      }
    }

    const fullPrompt = promptParts.join('\n');

    console.log(`Generating scene ${scene.scene_number} "${scene.scene_title}"`);
    console.log(`Has previous scene reference: ${!!prevSceneImageUrl}`);

    // Build messages
    const messages: any[] = [];
    if (prevSceneImageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: fullPrompt },
          { type: "image_url", image_url: { url: prevSceneImageUrl } },
        ],
      });
    } else {
      messages.push({ role: "user", content: fullPrompt });
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
      const errText = await response.text();
      console.error("AI image error:", response.status, errText);
      await supabase.from("scenes").update({ status: "failed" }).eq("id", sceneId);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI image generation failed: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      await supabase.from("scenes").update({ status: "failed" }).eq("id", sceneId);
      throw new Error("No image generated by AI");
    }

    // Upload base64 image to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
    const filePath = `${projectId}/scenes/scene_${scene.scene_number}.png`;
    const { error: uploadErr } = await supabase.storage
      .from("project-assets")
      .upload(filePath, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      await supabase.from("scenes").update({ status: "failed" }).eq("id", sceneId);
      throw uploadErr;
    }

    const { data: publicUrl } = supabase.storage
      .from("project-assets")
      .getPublicUrl(filePath);

    // Update scene with image URL
    const { data: updatedScene, error: updateErr } = await supabase
      .from("scenes")
      .update({
        output_image_url: publicUrl.publicUrl,
        status: "completed",
      })
      .eq("id", sceneId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Update next scene's reference image
    await supabase
      .from("scenes")
      .update({ reference_image_url: publicUrl.publicUrl })
      .eq("project_id", projectId)
      .eq("scene_number", scene.scene_number + 1);

    // Update transition start/end images
    // This scene is the START image for transition FROM this scene
    await supabase
      .from("transitions")
      .update({ start_image_url: publicUrl.publicUrl })
      .eq("project_id", projectId)
      .eq("from_scene", scene.scene_number);

    // This scene is the END image for transition TO this scene
    await supabase
      .from("transitions")
      .update({ end_image_url: publicUrl.publicUrl })
      .eq("project_id", projectId)
      .eq("to_scene", scene.scene_number);

    console.log(`Scene ${scene.scene_number} completed: ${publicUrl.publicUrl}`);

    return new Response(JSON.stringify({ scene: updatedScene }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-scene-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
