import { Scene, Transition } from './types';
import { DEMO_SCENES, DEMO_TRANSITIONS } from './demo-data';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generateProjectPlan(projectData: Record<string, string>) {
  await delay(1500);
  return {
    scenes: DEMO_SCENES.map((s) => ({
      sceneNumber: s.sceneNumber,
      sceneTitle: s.sceneTitle,
      imagePrompt: s.imagePrompt,
      animationPrompt: s.animationPrompt,
      soundPrompt: s.soundPrompt,
    })),
    summary: `A cinematic 9-scene transformation of a ${projectData.selectedIdea}. Style: ${projectData.finalStyle}. Mood: ${projectData.visualMood}. Intensity: ${projectData.constructionIntensity}.`,
  };
}

export async function generateSceneImage(scene: Scene): Promise<string> {
  await delay(2000);
  // Returns a placeholder — real API would return generated image URL
  return `/placeholder.svg`;
}

export async function generateTransitionVideo(transition: Transition): Promise<string> {
  await delay(3000);
  return `/placeholder.svg`;
}

export async function exportProject(_projectId: string) {
  await delay(1000);
  return {
    downloadUrl: '#',
    exportedImages: 9,
    exportedVideos: 8,
    exportedPrompts: 3,
  };
}
