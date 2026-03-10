import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Provider capability metadata
const PROVIDER_CAPABILITY = {
  provider: "Google Cloud",
  model: "veo-2.0-generate-001",
  supportsStartFrame: true,
  supportsEndFrame: false,
  supportsMultiKeyframe: false,
  supportsNegativePrompt: false,
  effectiveMode: "guided_start_frame",
  notes: "Veo 2 accepts start-frame only. End frame is prompt-guided, not enforced as a keyframe.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transitionId, projectId } = await req.json();

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_CLOUD_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get transition
    const { data: transition, error: tErr } = await supabase
      .from("transitions")
      .select("*")
      .eq("id", transitionId)
      .single();

    if (tErr || !transition) throw new Error("Transition not found");

    await supabase.from("transitions").update({ status: "generating" }).eq("id", transitionId);

    // Get scene images
    const { data: fromScene } = await supabase
      .from("scenes")
      .select("output_image_url, scene_title, image_prompt")
      .eq("project_id", projectId)
      .eq("scene_number", transition.from_scene)
      .single();

    const { data: toScene } = await supabase
      .from("scenes")
      .select("output_image_url, scene_title, image_prompt")
      .eq("project_id", projectId)
      .eq("scene_number", transition.to_scene)
      .single();

    // Validate: both scenes must have generated images
    if (!fromScene?.output_image_url) {
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
      throw new Error(`Scene ${transition.from_scene} ("${fromScene?.scene_title || 'unknown'}") has no generated image. Generate all scene images before creating transitions.`);
    }

    // Log generation metadata
    const generationLog = {
      transitionId,
      transitionNumber: transition.transition_number,
      fromScene: transition.from_scene,
      toScene: transition.to_scene,
      startImageAttached: !!fromScene.output_image_url,
      endImageAvailable: !!toScene?.output_image_url,
      endImageEnforced: false, // Veo 2 does NOT support end-frame keyframes
      providerMode: PROVIDER_CAPABILITY.effectiveMode,
      provider: PROVIDER_CAPABILITY.provider,
      model: PROVIDER_CAPABILITY.model,
    };
    console.log("Transition generation metadata:", JSON.stringify(generationLog));

    // Helper: convert ArrayBuffer to base64
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }

    // Build strict transition prompt
    // Since Veo 2 only supports start-frame, we heavily condition the prompt toward the end frame
    const promptParts = [
      `Use the provided image as the EXACT start frame.`,
    ];

    if (toScene?.output_image_url) {
      promptParts.push(
        `The end goal of this transition is Scene ${transition.to_scene} ("${toScene.scene_title}"): ${toScene.image_prompt?.substring(0, 200) || ''}`,
        `Smoothly animate the realistic construction/restoration progress from the current state toward that end goal.`
      );
    }

    promptParts.push(
      `Maintain the SAME bunker, SAME camera angle, SAME framing, SAME composition, and SAME environment throughout.`,
      `Motion: ${transition.animation_prompt}`,
      ``,
      `STRICT RULES:`,
      `- Do NOT redesign the bunker layout.`,
      `- Do NOT change the camera position or angle.`,
      `- Do NOT add random objects not present in the scene.`,
      `- Do NOT use heavy morphing, liquid effects, or surreal distortions.`,
      `- Do NOT reset or jump the camera.`,
      `- Keep the transition physically believable — like a construction time-lapse.`,
      `- Maintain architectural continuity.`,
      ``,
      `Photorealistic, cinematic, vertical 9:16 portrait format, smooth construction time-lapse motion.`,
    );

    const prompt = promptParts.join('\n');

    // Build request body for Veo 2
    const requestBody: any = {
      instances: [{ prompt }],
      parameters: {
        aspectRatio: "9:16",
        sampleCount: 1,
        durationSeconds: 5,
        personGeneration: "allow_adult",
      },
    };

    // Attach start frame image
    try {
      const imgResponse = await fetch(fromScene.output_image_url);
      if (imgResponse.ok) {
        const imgBuffer = await imgResponse.arrayBuffer();
        const base64 = arrayBufferToBase64(imgBuffer);
        requestBody.instances[0].image = { bytesBase64Encoded: base64 };
        console.log(`Start image attached, size: ${imgBuffer.byteLength} bytes`);
      } else {
        console.warn("Could not fetch start image, falling back to text-only");
      }
    } catch (imgErr) {
      console.warn("Start image fetch error, using text-to-video fallback:", imgErr);
    }

    // NOTE: Veo 2 does NOT support end-frame keyframe.
    // The end image is referenced only in the text prompt.
    if (toScene?.output_image_url) {
      console.log(`End image available but NOT attached as keyframe (provider limitation). Referenced in prompt only.`);
    } else {
      console.warn(`No end image available for transition ${transition.transition_number}`);
    }

    console.log("Submitting video generation to Veo 2...");
    console.log(`Request payload shape: instances[0] keys: ${Object.keys(requestBody.instances[0]).join(', ')}`);

    const generateResponse = await fetch(
      `${BASE_URL}/models/veo-2.0-generate-001:predictLongRunning`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GOOGLE_API_KEY,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!generateResponse.ok) {
      const errText = await generateResponse.text();
      console.error("Veo API error:", generateResponse.status, errText);
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);

      if (generateResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (generateResponse.status === 403) {
        return new Response(JSON.stringify({ error: "API access denied. Ensure Generative AI API is enabled." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Veo API failed: ${generateResponse.status} - ${errText}`);
    }

    const operationData = await generateResponse.json();
    const operationName = operationData.name;

    if (!operationName) {
      console.log("No operation name, response:", JSON.stringify(operationData).substring(0, 500));
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
      throw new Error("Unexpected response format from Veo API");
    }

    console.log("Operation started:", operationName);

    // Poll for completion (max ~4 minutes)
    let result = null;
    const maxAttempts = 48;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const pollResponse = await fetch(`${BASE_URL}/${operationName}`, {
        method: "GET",
        headers: { "x-goog-api-key": GOOGLE_API_KEY },
      });

      if (!pollResponse.ok) {
        console.warn(`Poll attempt ${i + 1} failed: ${pollResponse.status}`);
        continue;
      }

      const pollData = await pollResponse.json();
      console.log(`Poll ${i + 1}: done=${pollData.done === true}`);

      if (pollData.done) {
        if (pollData.error) {
          console.error("Operation failed:", JSON.stringify(pollData.error));
          await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
          throw new Error(`Video generation failed: ${pollData.error.message || JSON.stringify(pollData.error)}`);
        }
        result = pollData.response || pollData.result || pollData;
        break;
      }
    }

    if (!result) {
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
      throw new Error("Video generation timed out after 4 minutes");
    }

    console.log("Generation complete, extracting video...");

    // Extract video data
    const videoResponse = result.generateVideoResponse || result;
    const generatedVideos = videoResponse.generatedSamples || result.generatedSamples || result.videos || result.predictions || [];
    let videoBytes: Uint8Array | null = null;

    if (generatedVideos.length > 0) {
      const video = generatedVideos[0];

      if (video.video?.bytesBase64Encoded) {
        videoBytes = Uint8Array.from(atob(video.video.bytesBase64Encoded), (c) => c.charCodeAt(0));
      } else if (video.video?.uri) {
        let downloadUrl = video.video.uri;
        if (!downloadUrl.includes("key=")) downloadUrl += `${downloadUrl.includes("?") ? "&" : "?"}key=${GOOGLE_API_KEY}`;
        const dlResp = await fetch(downloadUrl, { headers: { "x-goog-api-key": GOOGLE_API_KEY } });
        if (dlResp.ok) {
          videoBytes = new Uint8Array(await dlResp.arrayBuffer());
          console.log("Video downloaded, size:", videoBytes.length);
        } else {
          console.error("Download failed:", dlResp.status);
        }
      } else if (video.bytesBase64Encoded) {
        videoBytes = Uint8Array.from(atob(video.bytesBase64Encoded), (c) => c.charCodeAt(0));
      } else if (video.uri) {
        let downloadUrl = video.uri;
        if (!downloadUrl.includes("key=")) downloadUrl += `${downloadUrl.includes("?") ? "&" : "?"}key=${GOOGLE_API_KEY}`;
        const dlResp = await fetch(downloadUrl, { headers: { "x-goog-api-key": GOOGLE_API_KEY } });
        if (dlResp.ok) videoBytes = new Uint8Array(await dlResp.arrayBuffer());
      }
    }

    if (!videoBytes) {
      console.error("Could not extract video. Result:", JSON.stringify(result).substring(0, 1000));
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
      throw new Error("No video data in generation result");
    }

    // Upload as MP4
    const filePath = `${projectId}/transitions/transition_${transition.transition_number}.mp4`;
    const { error: uploadErr } = await supabase.storage
      .from("project-assets")
      .upload(filePath, videoBytes, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadErr) {
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
      throw uploadErr;
    }

    const { data: publicUrl } = supabase.storage.from("project-assets").getPublicUrl(filePath);

    const { data: updated, error: updateErr } = await supabase
      .from("transitions")
      .update({
        output_video_url: publicUrl.publicUrl,
        start_image_url: fromScene.output_image_url,
        end_image_url: toScene?.output_image_url || null,
        status: "completed",
      })
      .eq("id", transitionId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    console.log(`Transition ${transition.transition_number} completed. Output: ${publicUrl.publicUrl}`);
    console.log(`Asset type: video/mp4, Provider mode: ${PROVIDER_CAPABILITY.effectiveMode}`);

    return new Response(JSON.stringify({
      transition: updated,
      providerCapability: PROVIDER_CAPABILITY,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
