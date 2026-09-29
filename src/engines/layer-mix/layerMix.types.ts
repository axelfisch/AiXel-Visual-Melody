import type { EngineParameterValue } from '../../project/project.types';

/** Blend modes offered for layer 2 (UI ids, mapped to canvas composite operations). */
export const LAYER_BLEND_MODES = ['normal', 'screen', 'lighten', 'add', 'overlay'] as const;
export type LayerBlendMode = (typeof LAYER_BLEND_MODES)[number];

/** How layer 2 is laid over layer 1. */
export type LayerBlendSettings = {
  /** Layer 2 opacity, 0..1. */
  opacity: number;
  blendMode: LayerBlendMode;
  /** Black veil over layer 1 before layer 2 is drawn, 0..MAX_BACKGROUND_DIM. */
  backgroundDim: number;
};

/** Layer 2 (foreground) engine. Its Director faders and Creator colors are shared with layer 1. */
export type LayerOverlay = {
  engineId: string;
  /** Engine-specific choices for layer 2 only (avatar gender/style, pulse style, lyric preset, palette colors…). */
  parameters: Record<string, EngineParameterValue>;
};

/**
 * Two-layer mix persisted on the project. `overlay: null` = single engine
 * (the historical behaviour and the default).
 */
export type LayerMix = LayerBlendSettings & {
  overlay: LayerOverlay | null;
};
