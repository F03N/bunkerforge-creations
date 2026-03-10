import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCENE_SEQUENCE = [
  { number: 1, title: "Before", description: "The bunker in its original abandoned/ruined state" },
  { number: 2, title: "Arrival", description: "Approaching the bunker for the first time" },
  { number: 3, title: "Exterior Work Start", description: "Beginning exterior restoration and cleanup" },
  { number: 4, title: "Exterior Near Completion", description: "Exterior restoration nearly finished" },
  { number: 5, title: "Entering Underground", description: "First descent into the interior spaces" },
  { number: 6, title: "Interior Work In Progress", description: "Active interior construction and renovation" },
  { number: 7, title: "Interior Finalization", description: "Finishing structural interior work" },
  { number: 8, title: "Interior Design Transformation", description: "Installing furnishings, lighting, and design elements" },
  { number: 9, title: "Final Reveal", description: "The completed, fully restored bunker" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectName, selectedIdea, finalStyle, visualMood, constructionIntensity, notes } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const continuityBlock = [
      `CONTINUITY RULES (MANDATORY):`,
      `- BUNKER IDENTITY: A ${selectedIdea} bunker. Same exact bunker throughout all scenes.`,
      `- ENVIRONMENT: Surrounding environment must remain consistent across all scenes.`,
      `- CAMERA: Maintain consistent camera angle and framing. Same focal length and perspective.`,
      `- ARCHITECTURE: Key architectural features must remain in same position and proportion.`,
      `- DESIGN TARGET: Final interior uses "${finalStyle}" style, "${visualMood}" mood, "${constructionIntensity}" intensity.`,
    ].join('\n');

    const sceneListDescription = SCENE_SEQUENCE.map(s => 
      `Scene ${s.number} - ${s.title}: ${s.description}`
    ).join('\n');

    const prompt = `You are a cinematic bunker transformation planner for vertical short-form video content (TikTok, Reels, YouTube Shorts).

Create a detailed 9-scene transformation plan for:
- Bunker Idea: ${selectedIdea}
- Interior Style: ${finalStyle}
- Visual Mood: ${visualMood}
- Construction Intensity: ${constructionIntensity}
- Project Name: ${projectName}
${notes ? `- Additional Notes: ${notes}` : ''}

${continuityBlock}

The 9 scenes MUST follow this EXACT sequence:
${sceneListDescription}

CRITICAL REQUIREMENTS:
- ALL prompts must target VERTICAL 9:16 aspect ratio (portrait orientation for Shorts/Reels/TikTok)
- Each scene must show realistic, gradual, incremental progress from the previous scene
- The same bunker, same environment, same camera angle must be maintained
- Construction changes are additive — they build on the previous scene
- No scene should contradict what was shown in a previous scene

For each scene provide:
1. A detailed text-to-image prompt (photorealistic, cinematic, VERTICAL 9:16 portrait format)
2. An animation prompt (camera movement for 5-second video transition, realistic construction time-lapse motion)
3. A sound prompt (environmental audio, ambient sounds matching the construction phase)`;

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
            description: "Create a structured 9-scene vertical transformation plan",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence project summary mentioning vertical 9:16 format" },
                continuity_profile: {
                  type: "object",
                  properties: {
                    bunker_identity: { type: "string" },
                    environment_summary: { type: "string" },
                    camera_framing_rules: { type: "string" },
                    architectural_anchors: { type: "string" },
                    final_design_target: { type: "string" },
                  },
                  required: ["bunker_identity", "environment_summary", "camera_framing_rules", "architectural_anchors", "final_design_target"],
                },
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      scene_number: { type: "integer" },
                      scene_title: { type: "string" },
                      image_prompt: { type: "string", description: "Detailed text-to-image prompt, photorealistic cinematic VERTICAL 9:16 portrait format" },
                      animation_prompt: { type: "string", description: "Camera movement and realistic construction motion for 5-second transition video" },
                      sound_prompt: { type: "string", description: "Environmental and ambient audio description" },
                    },
                    required: ["scene_number", "scene_title", "image_prompt", "animation_prompt", "sound_prompt"],
                  },
                },
              },
              required: ["summary", "scenes", "continuity_profile"],
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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const plan = JSON.parse(toolCall.function.arguments);

    // Ensure scene titles match our sequence
    const scenes = plan.scenes.map((s: any, i: number) => ({
      ...s,
      scene_number: i + 1,
      scene_title: SCENE_SEQUENCE[i]?.title || s.scene_title,
    }));

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
    const scenesData = scenes.map((s: any) => ({
      project_id: project.id,
      scene_number: s.scene_number,
      scene_title: s.scene_title,
      image_prompt: s.image_prompt,
      animation_prompt: s.animation_prompt,
      sound_prompt: s.sound_prompt,
      status: "pending",
    }));

    const { data: dbScenes, error: scenesErr } = await supabase
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
      animation_prompt: scenes[i]?.animation_prompt || "",
      status: "pending",
    }));

    const { data: dbTransitions, error: transErr } = await supabase
      .from("transitions")
      .insert(transitionsData)
      .select();

    if (transErr) throw transErr;

    console.log(`Plan generated: ${project.id}, ${dbScenes.length} scenes, ${dbTransitions.length} transitions`);

    return new Response(JSON.stringify({ project, scenes: dbScenes, transitions: dbTransitions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
