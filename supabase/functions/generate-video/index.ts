import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

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

    // Helper: convert ArrayBuffer to base64 without stack overflow
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

    // Build prompt enforcing strict keyframe-based transition
    const prompt = `Use the provided image as the exact start frame. Create a smooth realistic construction time-lapse transition. Keep the same exact bunker, same camera angle, same framing, same environment, and same composition throughout the entire shot. ${transition.animation_prompt}. Only animate realistic visual construction progress. Do not redesign the bunker. Do not change the layout. Do not create a different scene. Do not add random objects. Do not heavily morph the structure. Photorealistic, cinematic, believable construction time-lapse.`;

    // Build request body
    const requestBody: any = {
      instances: [{
        prompt: prompt,
      }],
      parameters: {
        aspectRatio: "16:9",
        sampleCount: 1,
        durationSeconds: 5,
        personGeneration: "allow_adult",
      },
    };

    // Include source scene image for image-to-video
    if (fromScene?.output_image_url) {
      try {
        const imgResponse = await fetch(fromScene.output_image_url);
        if (imgResponse.ok) {
          const imgBuffer = await imgResponse.arrayBuffer();
          const base64 = arrayBufferToBase64(imgBuffer);
          requestBody.instances[0].image = {
            bytesBase64Encoded: base64,
          };
          console.log("Source image attached, size:", imgBuffer.byteLength);
        }
      } catch (imgErr) {
        console.warn("Could not fetch source image, using text-to-video:", imgErr);
      }
    }

    console.log("Submitting video generation request to Google Veo...");

    // Use predictLongRunning endpoint with x-goog-api-key header
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
        return new Response(JSON.stringify({ error: "API access denied. Ensure Generative AI API is enabled in your Google Cloud project." }), {
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

      const pollUrl = `${BASE_URL}/${operationName}`;
      const pollResponse = await fetch(pollUrl, {
        method: "GET",
        headers: {
          "x-goog-api-key": GOOGLE_API_KEY,
        },
      });

      if (!pollResponse.ok) {
        const pollErrText = await pollResponse.text();
        console.warn("Poll error:", pollResponse.status, pollErrText);
        continue;
      }

      const pollData = await pollResponse.json();
      const isDone = pollData.done === true;
      console.log(`Poll attempt ${i + 1}: done=${isDone}, keys=${Object.keys(pollData).join(",")}, raw=${JSON.stringify(pollData).substring(0, 300)}`);

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
      throw new Error("Video generation timed out");
    }

    console.log("Generation complete, extracting video...");
    console.log("Result keys:", Object.keys(result));

    // Extract video data - handle nested generateVideoResponse structure
    const videoResponse = result.generateVideoResponse || result;
    const generatedVideos = videoResponse.generatedSamples || result.generatedSamples || result.videos || result.predictions || [];
    let videoBytes: Uint8Array | null = null;

    console.log("Generated videos count:", generatedVideos.length);

    if (generatedVideos.length > 0) {
      const video = generatedVideos[0];

      if (video.video?.bytesBase64Encoded) {
        const b64 = video.video.bytesBase64Encoded;
        videoBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } else if (video.video?.uri) {
        // Download from Google's file service - needs API key
        let downloadUrl = video.video.uri;
        if (!downloadUrl.includes("key=")) {
          downloadUrl += (downloadUrl.includes("?") ? "&" : "?") + `key=${GOOGLE_API_KEY}`;
        }
        console.log("Downloading video from URI...");
        const dlResp = await fetch(downloadUrl, {
          headers: { "x-goog-api-key": GOOGLE_API_KEY },
        });
        if (dlResp.ok) {
          videoBytes = new Uint8Array(await dlResp.arrayBuffer());
          console.log("Video downloaded, size:", videoBytes.length);
        } else {
          console.error("Download failed:", dlResp.status, await dlResp.text());
        }
      } else if (video.bytesBase64Encoded) {
        videoBytes = Uint8Array.from(atob(video.bytesBase64Encoded), (c) => c.charCodeAt(0));
      } else if (video.uri) {
        let downloadUrl = video.uri;
        if (!downloadUrl.includes("key=")) {
          downloadUrl += (downloadUrl.includes("?") ? "&" : "?") + `key=${GOOGLE_API_KEY}`;
        }
        const dlResp = await fetch(downloadUrl, {
          headers: { "x-goog-api-key": GOOGLE_API_KEY },
        });
        if (dlResp.ok) {
          videoBytes = new Uint8Array(await dlResp.arrayBuffer());
        }
      }
    }

    if (!videoBytes) {
      console.error("Could not extract video. Result:", JSON.stringify(result).substring(0, 1000));
      await supabase.from("transitions").update({ status: "failed" }).eq("id", transitionId);
      throw new Error("No video data in generation result");
    }

    // Upload to storage
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
    console.error("generate-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
