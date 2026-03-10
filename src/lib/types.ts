export interface BunkerIdea {
  id: number;
  title: string;
  description: string;
}

export interface Project {
  id: string;
  projectName: string;
  selectedIdea: string;
  finalStyle: string;
  visualMood: string;
  constructionIntensity: string;
  notes: string;
  projectSummary: string;
  createdAt: string;
}

export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: number;
  sceneTitle: string;
  imagePrompt: string;
  animationPrompt: string;
  soundPrompt: string;
  referenceImageUrl: string | null;
  outputImageUrl: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface Transition {
  id: string;
  projectId: string;
  transitionNumber: number;
  fromScene: number;
  toScene: number;
  animationPrompt: string;
  startImageUrl: string | null;
  endImageUrl: string | null;
  outputVideoUrl: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export type WorkflowStep = 'ideas' | 'create' | 'plan' | 'scenes' | 'transitions' | 'export';
