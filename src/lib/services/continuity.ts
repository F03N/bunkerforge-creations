/**
 * Continuity Manager
 * Maintains visual identity across all scenes in a project.
 */

export interface ContinuityProfile {
  bunkerIdentity: string;
  environmentSummary: string;
  cameraFramingRules: string;
  architecturalAnchors: string;
  finalDesignTarget: string;
}

export function buildContinuityProfile(
  selectedIdea: string,
  finalStyle: string,
  visualMood: string,
  constructionIntensity: string,
  notes?: string
): ContinuityProfile {
  return {
    bunkerIdentity: `A ${selectedIdea} bunker. This is the same exact bunker throughout all scenes — do not change the bunker identity, architecture, or location.`,
    environmentSummary: `The surrounding environment must remain consistent. Lighting shifts are allowed for time-of-day changes but the geography, terrain, and atmospheric conditions must stay the same.`,
    cameraFramingRules: `Maintain a consistent camera angle and framing across all scenes. Use the same focal length, perspective, and composition. The camera may slowly move but must not reset or jump to a different vantage point.`,
    architecturalAnchors: `Key architectural features (entrance, walls, corridors, rooms) must remain in the same position and proportion. Construction changes are additive — they build on the previous scene, never contradict it.`,
    finalDesignTarget: `The final restored interior uses a "${finalStyle}" design style with a "${visualMood}" mood. Construction intensity is "${constructionIntensity}". ${notes || ''}`,
  };
}

export function continuityToPromptBlock(profile: ContinuityProfile): string {
  return [
    `CONTINUITY RULES (MANDATORY):`,
    `- BUNKER IDENTITY: ${profile.bunkerIdentity}`,
    `- ENVIRONMENT: ${profile.environmentSummary}`,
    `- CAMERA: ${profile.cameraFramingRules}`,
    `- ARCHITECTURE: ${profile.architecturalAnchors}`,
    `- DESIGN TARGET: ${profile.finalDesignTarget}`,
  ].join('\n');
}
