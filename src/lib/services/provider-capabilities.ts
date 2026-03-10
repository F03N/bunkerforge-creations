/**
 * Provider Capability Layer
 * Detects and reports what the video generation provider supports.
 */

export type TransitionMode = 
  | 'start_frame_only'       // Provider only accepts a start image
  | 'start_end_frame'        // Provider supports both start and end keyframes
  | 'multi_keyframe'         // Provider supports multiple keyframes
  | 'text_only'              // No image conditioning at all
  | 'guided_start_frame';    // Start frame + strong prompt conditioning toward end frame

export interface ProviderCapability {
  provider: string;
  model: string;
  supportsStartFrame: boolean;
  supportsEndFrame: boolean;
  supportsMultiKeyframe: boolean;
  supportsNegativePrompt: boolean;
  maxDurationSeconds: number;
  supportedAspectRatios: string[];
  effectiveMode: TransitionMode;
  notes: string;
}

/**
 * Google Veo 2.0 capabilities
 * As of 2026-03: Veo 2 supports image-to-video with a START image only.
 * There is NO true end-frame / last-frame keyframe support.
 * We use strong prompt conditioning to guide toward the end image.
 */
export const VEO_2_CAPABILITY: ProviderCapability = {
  provider: 'Google Cloud',
  model: 'veo-2.0-generate-001',
  supportsStartFrame: true,
  supportsEndFrame: false,
  supportsMultiKeyframe: false,
  supportsNegativePrompt: false,
  maxDurationSeconds: 8,
  supportedAspectRatios: ['9:16', '16:9', '1:1'],
  effectiveMode: 'guided_start_frame',
  notes: 'Veo 2 supports start-frame image-to-video only. End frame is prompt-guided, not enforced. The transition will strongly reference the end image in the prompt but cannot guarantee an exact match to the end frame.',
};

export function getProviderCapability(): ProviderCapability {
  return VEO_2_CAPABILITY;
}

export function getModeLabel(mode: TransitionMode): string {
  switch (mode) {
    case 'start_end_frame': return 'Exact Dual-Frame';
    case 'start_frame_only': return 'Start Frame Only';
    case 'guided_start_frame': return 'Guided (Start Frame + Prompt)';
    case 'multi_keyframe': return 'Multi-Keyframe';
    case 'text_only': return 'Text Only';
  }
}

export function getModeDescription(mode: TransitionMode): string {
  switch (mode) {
    case 'start_end_frame':
      return 'Both start and end frames are enforced as exact keyframes by the provider.';
    case 'guided_start_frame':
      return 'Start frame is used as the exact source. End frame is strongly referenced in the prompt but not enforced as a keyframe. The provider generates a guided transition toward the target.';
    case 'start_frame_only':
      return 'Only the start frame is used. The animation is driven entirely by the text prompt.';
    case 'multi_keyframe':
      return 'Multiple keyframes are supported at different timestamps.';
    case 'text_only':
      return 'No image conditioning. The entire video is generated from text only.';
  }
}
