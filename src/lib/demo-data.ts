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

const SCENE_TITLES = [
  "Before", "Arrival", "Discovery", "Assessment",
  "Clearing", "Foundation", "Construction", "Detailing", "Reveal",
];

export const DEMO_PROJECT: Project = {
  id: "demo-001",
  projectName: "Frozen Mountain Survival Bunker Restoration",
  selectedIdea: "Frozen Mountain Bunker",
  finalStyle: "survival bunker",
  visualMood: "cinematic dramatic",
  constructionIntensity: "heavy reconstruction",
  notes: "Focus on dramatic lighting and ice textures throughout the transformation.",
  projectSummary: "A cinematic 9-scene transformation of a frozen mountain bunker from its abandoned, ice-encrusted state to a fully restored survival shelter. The sequence emphasizes the brutal contrast between the harsh alpine environment and the warm, functional interior that emerges through heavy reconstruction.",
  createdAt: new Date().toISOString(),
};

export const DEMO_SCENES: Scene[] = SCENE_TITLES.map((title, i) => ({
  id: `scene-${i + 1}`,
  projectId: "demo-001",
  sceneNumber: i + 1,
  sceneTitle: title,
  imagePrompt: `Cinematic wide shot of a frozen mountain bunker, scene ${i + 1} — ${title.toLowerCase()}. ${
    i === 0 ? "Abandoned bunker entrance buried in snow and ice, rusted blast door barely visible, howling wind, blue-grey color grading, dramatic storm clouds." :
    i === 1 ? "A lone figure approaches through deep snow, headlamp cutting through blizzard, the bunker entrance partially excavated, footprints trailing behind." :
    i === 2 ? "Interior first look — collapsed ceiling beams, ice formations on walls, frozen debris scattered across the floor, single shaft of cold light from above." :
    i === 3 ? "Wide assessment shot showing structural damage — cracked concrete walls, frozen pipes, ice-covered electrical panels, breath visible in the cold air." :
    i === 4 ? "Active clearing — debris being removed, ice being chipped away, portable lights set up, steam rising from heated tools against frozen surfaces." :
    i === 5 ? "Foundation work — new concrete being poured over repaired floors, steel reinforcement beams installed, waterproofing membranes visible, industrial work lights." :
    i === 6 ? "Mid-construction — new wall panels being installed, electrical conduits running along ceiling, insulation visible between studs, warm work lighting mixing with cold exterior light." :
    i === 7 ? "Detail work — custom shelving being installed, tactical equipment being mounted, LED strip lighting being tested, smooth concrete surfaces with military-grade finishes." :
    "Final reveal — fully restored survival bunker interior, warm amber lighting, organized supply stations, monitoring equipment active, dramatic contrast with frozen exterior visible through reinforced window."
  } Photorealistic, 16:9 cinematic aspect ratio, high detail.`,
  animationPrompt: `Slow cinematic camera ${i === 0 ? 'push-in toward the frozen bunker entrance' : i === 8 ? 'pull-back revealing the complete transformation' : `pan across the ${title.toLowerCase()} phase`}, subtle particle effects of ${i < 4 ? 'snow and ice crystals' : 'dust and construction debris'}, atmospheric lighting shift, 4 second duration.`,
  soundPrompt: `${i < 3 ? 'Howling arctic wind, creaking ice, distant rumbling' : i < 6 ? 'Heavy machinery, concrete pouring, metallic clanging' : 'Power tools, electronic hums, mechanical clicks'}, cinematic bass undertone, ambient tension.`,
  referenceImageUrl: null,
  outputImageUrl: null,
  status: i === 0 ? 'completed' : i === 1 ? 'completed' : i === 2 ? 'completed' : 'pending',
}));

export const DEMO_TRANSITIONS: Transition[] = Array.from({ length: 8 }, (_, i) => ({
  id: `transition-${i + 1}`,
  projectId: "demo-001",
  transitionNumber: i + 1,
  fromScene: i + 1,
  toScene: i + 2,
  animationPrompt: `Cinematic morph transition from Scene ${i + 1} (${SCENE_TITLES[i]}) to Scene ${i + 2} (${SCENE_TITLES[i + 1]}). ${
    i < 3 ? 'Ice crystals dissolve and reform as the environment shifts' :
    i < 6 ? 'Construction dust swirls and settles revealing the next phase' :
    'Lights flicker and stabilize as the space transforms'
  }. Smooth 2-second crossfade with parallax depth effect.`,
  startImageUrl: null,
  endImageUrl: null,
  outputVideoUrl: null,
  status: 'pending',
}));
