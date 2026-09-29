import { getEngine } from '../engine.registry';
import type { EngineFrame, RenderSurface, VisualEngine } from '../engine.types';
import { blendModeToComposite, DEFAULT_LAYER_BLEND } from './layerMix.defaults';
import { validateBlendSettings } from './layerMix.config';
import type { LayerBlendSettings } from './layerMix.types';

type Ctx2D = CanvasRenderingContext2D;

/** Offscreen surface layer 2 is rendered into before being composited. */
export type LayerCanvas = {
  canvas: CanvasImageSource & { width: number; height: number };
  ctx: Ctx2D;
  /** Reused transparent render surface (mutated per frame, never reallocated). */
  surface?: RenderSurface;
};

export type LayerCanvasFactory = (width: number, height: number) => LayerCanvas | null;

/** OffscreenCanvas first (workers-free, cheap), then a detached <canvas>. `null` when neither has a 2D context. */
export const createLayerCanvas: LayerCanvasFactory = (width, height) => {
  try {
    const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => OffscreenCanvas }).OffscreenCanvas;
    if (Offscreen) {
      const canvas = new Offscreen(width, height);
      const ctx = canvas.getContext('2d') as unknown as Ctx2D | null;
      if (ctx) return { canvas: canvas as unknown as LayerCanvas['canvas'], ctx };
    }
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) return { canvas, ctx };
    }
  } catch {
    // No offscreen rendering available: the compositor falls back to drawing in place.
  }
  return null;
};

/**
 * One reusable layer canvas per destination context (Create preview, Preview,
 * Export each own one). Resized only when the destination size changes, so a
 * steady render loop allocates nothing per frame.
 */
const layerPool = new WeakMap<object, LayerCanvas | null>();

export function layerCanvasFor(target: Ctx2D, width: number, height: number, factory: LayerCanvasFactory = createLayerCanvas): LayerCanvas | null {
  let layer = layerPool.get(target);
  if (layer === undefined) {
    layer = factory(width, height);
    layerPool.set(target, layer);
  }
  if (layer && (layer.canvas.width !== width || layer.canvas.height !== height)) {
    layer.canvas.width = width;
    layer.canvas.height = height;
  }
  return layer;
}

function resetState(ctx: Ctx2D) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.filter = 'none';
}

export type LayerPair<TBase extends object = object, TOverlay extends object = object> = {
  base: VisualEngine<TBase>;
  baseConfig: TBase;
  overlay: VisualEngine<TOverlay>;
  overlayConfig: TOverlay;
};

/**
 * Renders one two-layer frame:
 *   1. layer 1 draws the full frame on the destination (unchanged engine render);
 *   2. optional black veil (`backgroundDim`) over layer 1;
 *   3. layer 2 renders into a cleared, reused offscreen canvas in transparent mode;
 *   4. the layer is drawn back with `globalAlpha = opacity` and the blend's composite op.
 * Both layers receive the very same `frame` (time, energy, onset, bpm), so they share
 * one audio/beat clock. Without any offscreen canvas, layer 2 is drawn in place (transparent).
 */
export function renderLayerMixFrame<TBase extends object, TOverlay extends object>(
  surface: RenderSurface,
  frame: EngineFrame,
  pair: LayerPair<TBase, TOverlay>,
  blend: LayerBlendSettings,
  factory: LayerCanvasFactory = createLayerCanvas,
) {
  const { context, width, height } = surface;
  pair.base.render(surface, frame, pair.baseConfig);

  if (blend.backgroundDim > 0) {
    context.save();
    resetState(context);
    context.globalAlpha = blend.backgroundDim;
    context.fillStyle = '#000000';
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  if (blend.opacity <= 0) return;

  const layer = layerCanvasFor(context, width, height, factory);
  if (!layer) {
    context.save();
    pair.overlay.render({ ...surface, transparent: true }, frame, pair.overlayConfig);
    context.restore();
    return;
  }

  const { ctx } = layer;
  const layerSurface = layer.surface ?? (layer.surface = { context: ctx, width, height, pixelRatio: surface.pixelRatio, transparent: true });
  layerSurface.width = width;
  layerSurface.height = height;
  layerSurface.pixelRatio = surface.pixelRatio;
  ctx.save();
  resetState(ctx);
  ctx.clearRect(0, 0, width, height);
  ctx.restore();
  ctx.save();
  pair.overlay.render(layerSurface, frame, pair.overlayConfig);
  ctx.restore();

  context.save();
  resetState(context);
  context.globalAlpha = blend.opacity;
  context.globalCompositeOperation = blendModeToComposite(blend.blendMode);
  context.drawImage(layer.canvas, 0, 0, width, height);
  context.restore();
}

/** Render config of a two-layer engine: both engines' own configs + the blend. */
export type LayerMixRenderConfig = LayerBlendSettings & {
  base: object;
  overlay: object;
};

export const LAYER_MIX_ENGINE_PREFIX = 'mix:';

/**
 * Wraps two engines as one `VisualEngine`, so Create (LiveEngineCanvas),
 * Preview (EngineCanvas) and Export (renderMp4 → drawExportFrame, watermark
 * drawn once on top of the composite) render the identical mix with no
 * pipeline changes.
 */
export function createLayerMixEngine(base: VisualEngine, overlay: VisualEngine, factory?: LayerCanvasFactory): VisualEngine<LayerMixRenderConfig> {
  if (base.id === overlay.id) throw new Error(`Le même moteur ne peut pas occuper les deux couches: ${base.id}`);
  const validateConfig = (value: unknown): LayerMixRenderConfig => {
    const config = value && typeof value === 'object' ? value as Partial<LayerMixRenderConfig> : {};
    return {
      ...validateBlendSettings(config),
      base: base.validateConfig(config.base ?? base.defaultConfig),
      overlay: overlay.validateConfig(config.overlay ?? overlay.defaultConfig),
    };
  };
  return {
    id: `${LAYER_MIX_ENGINE_PREFIX}${base.id}+${overlay.id}`,
    name: `${base.name} + ${overlay.name}`,
    description: `Two-layer mix: ${base.name} (background) with ${overlay.name} (foreground).`,
    availability: 'implemented',
    defaultConfig: { ...DEFAULT_LAYER_BLEND, base: base.defaultConfig, overlay: overlay.defaultConfig },
    parameters: [],
    validateConfig,
    render(surface, frame, config) {
      renderLayerMixFrame(surface, frame, { base, baseConfig: config.base, overlay, overlayConfig: config.overlay }, config, factory);
    },
    async prepare(config) {
      await Promise.all([
        base.prepare?.(config.base as never),
        overlay.prepare?.(config.overlay as never),
      ]);
    },
  };
}

const mixEngines = new Map<string, VisualEngine<LayerMixRenderConfig>>();

/** Stable (memoised) two-layer engine per pair, so React memo/effects see one identity. */
export function getLayerMixEngine(baseEngineId: string, overlayEngineId: string): VisualEngine<LayerMixRenderConfig> {
  const key = `${baseEngineId}+${overlayEngineId}`;
  let engine = mixEngines.get(key);
  if (!engine) {
    engine = createLayerMixEngine(getEngine(baseEngineId), getEngine(overlayEngineId));
    mixEngines.set(key, engine);
  }
  return engine;
}

export function isLayerMixEngine(engine: VisualEngine): boolean {
  return engine.id.startsWith(LAYER_MIX_ENGINE_PREFIX);
}
