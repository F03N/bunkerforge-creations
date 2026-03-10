import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectName, selectedIdea, finalStyle, visualMood, constructionIntensity, notes } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate project plan using AI
    const prompt = `You are a cinematic bunker transformation planner for short-form video content (TikTok, Reels, YouTube Shorts).

Create a detailed 9-scene transformation plan for:
- Bunker Idea: ${selectedIdea}
- Interior Style: ${finalStyle}
- Visual Mood: ${visualMood}
- Construction Intensity: ${constructionIntensity}
- Project Name: ${projectName}
${notes ? `- Additional Notes: ${notes}` : ''}

The 9 scenes must follow this sequence:
Scene 1 - Before (abandoned/ruined state)
Scene 2 - Arrival (approaching the bunker)
Scene 3 - Discovery (first look inside)
Scene 4 - Assessment (evaluating damage)
Scene 5 - Clearing (removing debris)
Scene 6 - Foundation (structural repairs)
Scene 7 - Construction (rebuilding)
Scene 8 - Detailing (finishing touches)
Scene 9 - Reveal (final transformation)

For each scene provide a detailed text-to-image prompt (photorealistic, cinematic, 16:9), an animation prompt (camera movement, particle effects, 4 seconds), and a sound prompt (environmental audio, ambient).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "create_project_plan",
            description: "Create a structured 9-scene transformation plan",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence project summary" },
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      scene_number: { type: "integer" },
                      scene_title: { type: "string" },
                      image_prompt: { type: "string", description: "Detailed text-to-image prompt, photorealistic cinematic 16:9" },
                      animation_prompt: { type: "string", description: "Camera movement and effects for 4-second animation" },
                      sound_prompt: { type: "string", description: "Environmental and ambient audio description" },
                    },
                    required: ["scene_number", "scene_title", "image_prompt", "animation_prompt", "sound_prompt"],
                  },
                },
              },
              required: ["summary", "scenes"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_project_plan" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const plan = JSON.parse(toolCall.function.arguments);

    // Create project in DB
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        project_name: projectName,
        selected_idea: selectedIdea,
        final_style: finalStyle,
        visual_mood: visualMood,
        construction_intensity: constructionIntensity,
        notes: notes || "",
        project_summary: plan.summary,
      })
      .select()
      .single();

    if (projErr) throw projErr;

    // Insert scenes
    const scenesData = plan.scenes.map((s: any) => ({
      project_id: project.id,
      scene_number: s.scene_number,
      scene_title: s.scene_title,
      image_prompt: s.image_prompt,
      animation_prompt: s.animation_prompt,
      sound_prompt: s.sound_prompt,
      status: "pending",
    }));

    const { data: scenes, error: scenesErr } = await supabase
      .from("scenes")
      .insert(scenesData)
      .select();

    if (scenesErr) throw scenesErr;

    // Insert transitions
    const transitionsData = Array.from({ length: 8 }, (_, i) => ({
      project_id: project.id,
      transition_number: i + 1,
      from_scene: i + 1,
      to_scene: i + 2,
      animation_prompt: plan.scenes[i]?.animation_prompt || "",
      status: "pending",
    }));

    const { data: transitions, error: transErr } = await supabase
      .from("transitions")
      .insert(transitionsData)
      .select();

    if (transErr) throw transErr;

    return new Response(JSON.stringify({ project, scenes, transitions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
