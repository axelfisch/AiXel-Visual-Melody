import type { LayerBlendMode, LayerBlendSettings, LayerMix } from './layerMix.types';

/** Strongest layer-1 dim offered in the UI (60 %). */
export const MAX_BACKGROUND_DIM = 0.6;

export const DEFAULT_LAYER_BLEND: LayerBlendSettings = {
  opacity: 0.85,
  blendMode: 'normal',
  backgroundDim: 0,
};

/** Single engine: no layer 2. Existing projects and new projects start here. */
export const DEFAULT_LAYER_MIX: LayerMix = { overlay: null, ...DEFAULT_LAYER_BLEND };

const COMPOSITE_OPERATIONS: Record<LayerBlendMode, GlobalCompositeOperation> = {
  normal: 'source-over',
  screen: 'screen',
  lighten: 'lighten',
  add: 'lighter',
  overlay: 'overlay',
};

/** Canvas `globalCompositeOperation` used to draw layer 2 for a given blend mode. */
export function blendModeToComposite(mode: LayerBlendMode): GlobalCompositeOperation {
  return COMPOSITE_OPERATIONS[mode] ?? 'source-over';
}
