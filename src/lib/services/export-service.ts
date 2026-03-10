/**
 * Export Packaging Service
 * Handles manifest generation and clean asset packaging.
 */

import { SceneData, TransitionData, ProjectData } from '../store';
import { getProviderCapability, getModeLabel } from './provider-capabilities';

export interface ExportManifest {
  version: string;
  exportedAt: string;
  project: {
    id: string;
    name: string;
    idea: string;
    style: string;
    mood: string;
    intensity: string;
    summary: string | null;
  };
  renderSettings: {
    aspectRatio: string;
    orientation: string;
    targetPlatform: string;
  };
  provider: {
    name: string;
    model: string;
    transitionMode: string;
    transitionModeLabel: string;
    notes: string;
  };
  scenes: {
    number: number;
    title: string;
    status: string;
    assetPath: string | null;
    assetUrl: string | null;
  }[];
  transitions: {
    number: number;
    fromScene: number;
    toScene: number;
    status: string;
    assetPath: string | null;
    assetUrl: string | null;
    transitionMode: string;
  }[];
  folders: string[];
}

export function buildManifest(
  project: ProjectData,
  scenes: SceneData[],
  transitions: TransitionData[]
): ExportManifest {
  const capability = getProviderCapability();

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.project_name,
      idea: project.selected_idea,
      style: project.final_style,
      mood: project.visual_mood,
      intensity: project.construction_intensity,
      summary: project.project_summary,
    },
    renderSettings: {
      aspectRatio: '9:16',
      orientation: 'vertical',
      targetPlatform: 'Shorts / Reels / TikTok',
    },
    provider: {
      name: capability.provider,
      model: capability.model,
      transitionMode: capability.effectiveMode,
      transitionModeLabel: getModeLabel(capability.effectiveMode),
      notes: capability.notes,
    },
    scenes: scenes.map((s) => ({
      number: s.scene_number,
      title: s.scene_title,
      status: s.status,
      assetPath: s.output_image_url ? `/scenes/scene${s.scene_number}.png` : null,
      assetUrl: s.output_image_url,
    })),
    transitions: transitions.map((t) => ({
      number: t.transition_number,
      fromScene: t.from_scene,
      toScene: t.to_scene,
      status: t.status,
      assetPath: t.output_video_url ? `/transitions/transition${t.transition_number}.mp4` : null,
      assetUrl: t.output_video_url,
      transitionMode: capability.effectiveMode,
    })),
    folders: ['/scenes', '/transitions', '/prompts', '/metadata'],
  };
}
