import { BunkerIdea, Project, Scene, Transition } from './types';

export const BUNKER_IDEAS: BunkerIdea[] = [
  { id: 1, title: "Frozen Mountain Bunker", description: "A fortified survival shelter carved into a frozen mountain peak, buried under glacial ice." },
  { id: 2, title: "Desert Nuclear Bunker", description: "A blast-resistant bunker hidden beneath scorching desert sands, built to withstand nuclear fallout." },
  { id: 3, title: "Abandoned War Bunker", description: "A forgotten WWII-era bunker reclaimed from decades of decay and structural damage." },
  { id: 4, title: "Jungle Hidden Bunker", description: "A camouflaged shelter buried deep in dense tropical jungle, overgrown with vegetation." },
  { id: 5, title: "Underwater Coastal Bunker", description: "A pressurized bunker built into coastal cliffs, partially submerged beneath crashing waves." },
  { id: 6, title: "Snowstorm Survival Bunker", description: "An emergency survival shelter designed for extreme arctic blizzard conditions." },
  { id: 7, title: "Cliffside Secret Bunker", description: "A covert bunker embedded into a sheer cliff face, accessible only by hidden passage." },
  { id: 8, title: "Post-Apocalyptic City Bunker", description: "An urban survival bunker beneath a destroyed city, surrounded by rubble and ruin." },
  { id: 9, title: "Military Missile Bunker", description: "A decommissioned missile silo converted into a fortified underground compound." },
  { id: 10, title: "Luxury Billionaire Survival Bunker", description: "An opulent underground fortress designed for elite survival with premium amenities." },
];

export const INTERIOR_STYLES = [
  "luxury bunker", "command center", "research lab",
  "survival bunker", "gaming bunker", "futuristic bunker",
];

export const VISUAL_MOODS = [
  "cinematic dramatic", "cold realistic", "industrial",
  "warm luxury", "futuristic",
];

export const CONSTRUCTION_INTENSITIES = [
  "light restoration", "medium rebuild", "heavy reconstruction",
];

export const SCENE_TITLES = [
  "Before", "Arrival", "Exterior Work Start", "Exterior Near Completion",
  "Entering Underground", "Interior Work In Progress", "Interior Finalization",
  "Interior Design Transformation", "Final Reveal",
];

export const DEMO_PROJECT: Project = {
  id: "demo-001",
  projectName: "Frozen Mountain Survival Bunker Restoration",
  selectedIdea: "Frozen Mountain Bunker",
  finalStyle: "survival bunker",
  visualMood: "cinematic dramatic",
  constructionIntensity: "heavy reconstruction",
  notes: "Focus on dramatic lighting and ice textures throughout the transformation.",
  projectSummary: "A cinematic 9-scene vertical (9:16) transformation of a frozen mountain bunker from its abandoned, ice-encrusted state to a fully restored survival shelter. Optimized for Shorts, Reels, and TikTok.",
  createdAt: new Date().toISOString(),
};

export const DEMO_SCENES: Scene[] = SCENE_TITLES.map((title, i) => ({
  id: `scene-${i + 1}`,
  projectId: "demo-001",
  sceneNumber: i + 1,
  sceneTitle: title,
  imagePrompt: `Cinematic vertical portrait shot of a frozen mountain bunker, scene ${i + 1} — ${title.toLowerCase()}. ${
    i === 0 ? "Abandoned bunker entrance buried in snow and ice, rusted blast door barely visible, howling wind, blue-grey color grading, dramatic storm clouds." :
    i === 1 ? "A lone figure approaches through deep snow, headlamp cutting through blizzard, the bunker entrance partially visible ahead." :
    i === 2 ? "Exterior cleanup begins — scaffolding erected around entrance, snow cleared from blast door, workers removing debris, portable lights set up." :
    i === 3 ? "Exterior nearly restored — reinforced entrance structure, new blast door installed, cleared perimeter, fresh concrete visible, work lights illuminating." :
    i === 4 ? "First descent into the bunker interior — flashlight beams cutting through darkness, ice formations on walls, frozen debris on stairs." :
    i === 5 ? "Active interior construction — new wall panels being fitted, electrical conduits being run, portable heaters melting ice, warm work lights contrasting cold walls." :
    i === 6 ? "Interior structural work complete — clean walls, sealed floors, HVAC ducts installed, overhead lighting working, utilities connected." :
    i === 7 ? "Design transformation — custom furniture being placed, LED ambient lighting tested, tactical equipment mounted, finished surfaces with military-grade materials." :
    "Final reveal — fully restored survival bunker, warm amber lighting, organized supply stations, monitoring equipment active, dramatic contrast with frozen exterior."
  } Photorealistic, vertical 9:16 portrait aspect ratio, high detail.`,
  animationPrompt: `Slow cinematic camera ${i === 0 ? 'tilt down toward the frozen bunker entrance' : i === 8 ? 'pull-back revealing the complete transformation' : `pan revealing the ${title.toLowerCase()} phase`}, subtle particle effects, atmospheric lighting, 5 second duration.`,
  soundPrompt: `${i < 3 ? 'Howling arctic wind, creaking ice, distant rumbling' : i < 5 ? 'Power tools, concrete work, metallic clanging, wind' : 'Interior construction, electronic hums, mechanical clicks'}, cinematic bass undertone.`,
  referenceImageUrl: null,
  outputImageUrl: null,
  status: 'pending',
}));

export const DEMO_TRANSITIONS: Transition[] = Array.from({ length: 8 }, (_, i) => ({
  id: `transition-${i + 1}`,
  projectId: "demo-001",
  transitionNumber: i + 1,
  fromScene: i + 1,
  toScene: i + 2,
  animationPrompt: `Realistic construction time-lapse from Scene ${i + 1} (${SCENE_TITLES[i]}) to Scene ${i + 2} (${SCENE_TITLES[i + 1]}). Smooth, physically believable progression maintaining same camera angle and bunker identity.`,
  startImageUrl: null,
  endImageUrl: null,
  outputVideoUrl: null,
  status: 'pending',
}));
