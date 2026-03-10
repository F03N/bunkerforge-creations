/**
 * Prompt Builder Service
 * Constructs prompts for scene images, transitions, and planning.
 * All defaults target vertical 9:16 for Shorts/Reels/TikTok.
 */

export const ASPECT_RATIO = '9:16';
export const ASPECT_LABEL = 'vertical 9:16 (Shorts/Reels/TikTok)';

export const SCENE_SEQUENCE = [
  { number: 1, title: 'Before', description: 'The bunker in its original abandoned/ruined state' },
  { number: 2, title: 'Arrival', description: 'Approaching the bunker for the first time' },
  { number: 3, title: 'Exterior Work Start', description: 'Beginning exterior restoration and cleanup' },
  { number: 4, title: 'Exterior Near Completion', description: 'Exterior restoration nearly finished' },
  { number: 5, title: 'Entering Underground', description: 'First descent into the interior spaces' },
  { number: 6, title: 'Interior Work In Progress', description: 'Active interior construction and renovation' },
  { number: 7, title: 'Interior Finalization', description: 'Finishing structural interior work' },
  { number: 8, title: 'Interior Design Transformation', description: 'Installing furnishings, lighting, and design elements' },
  { number: 9, title: 'Final Reveal', description: 'The completed, fully restored bunker' },
] as const;

export function buildSceneImagePrompt(
  sceneTitle: string,
  sceneNumber: number,
  imagePrompt: string,
  continuityBlock: string,
  projectContext: { selectedIdea: string; finalStyle: string; visualMood: string },
  hasPreviousScene: boolean
): string {
  const base = [
    imagePrompt,
    '',
    continuityBlock,
    '',
    `Scene ${sceneNumber} of 9 — "${sceneTitle}".`,
    `Project: ${projectContext.selectedIdea}, Style: ${projectContext.finalStyle}, Mood: ${projectContext.visualMood}.`,
    `Aspect ratio: ${ASPECT_RATIO} (vertical portrait). Photorealistic, cinematic, high detail.`,
  ];

  if (hasPreviousScene) {
    base.unshift(
      `IMPORTANT: This scene continues directly from the previous scene. Maintain the exact same bunker, environment, camera angle, and composition. Show only the realistic incremental progress from the previous state.`
    );
  }

  return base.join('\n');
}

export function buildTransitionPrompt(
  fromSceneTitle: string,
  toSceneTitle: string,
  fromSceneNumber: number,
  toSceneNumber: number,
  animationPrompt: string
): string {
  return [
    `Use the first image as the EXACT start frame and the second image as the EXACT end frame target.`,
    `Maintain the same bunker, camera angle, framing, composition, and environment throughout the entire transition.`,
    `Animate ONLY the realistic visual construction/restoration changes needed to transition from Scene ${fromSceneNumber} ("${fromSceneTitle}") to Scene ${toSceneNumber} ("${toSceneTitle}").`,
    `Motion direction: ${animationPrompt}`,
    ``,
    `STRICT RULES:`,
    `- Do NOT redesign the bunker layout.`,
    `- Do NOT change the camera position or angle.`,
    `- Do NOT add random objects or elements not present in either frame.`,
    `- Do NOT use heavy morphing, liquid effects, or surreal distortions.`,
    `- Do NOT reset or jump the camera.`,
    `- Keep the transition physically believable — like a construction time-lapse.`,
    `- Maintain architectural continuity between start and end frames.`,
    ``,
    `Photorealistic, cinematic, vertical 9:16 aspect ratio, smooth time-lapse construction motion.`,
  ].join('\n');
}

export const TRANSITION_NEGATIVE_PROMPT = [
  'morphing', 'liquid dissolve', 'surreal', 'abstract', 'dream-like',
  'teleportation', 'different location', 'different bunker', 'camera reset',
  'layout change', 'random objects', 'fantasy elements', 'cartoon',
].join(', ');
