import { isProEngineId, listEngines } from '../engine.registry';
import type { EngineParameterValue } from '../../project/project.types';
import { DEFAULT_LAYER_BLEND, DEFAULT_LAYER_MIX, MAX_BACKGROUND_DIM } from './layerMix.defaults';
import {
  LAYER_BLEND_MODES,
  type LayerBlendMode,
  type LayerBlendSettings,
  type LayerMix,
  type LayerOverlay,
} from './layerMix.types';

export function isLayerBlendMode(value: unknown): value is LayerBlendMode {
  return typeof value === 'string' && (LAYER_BLEND_MODES as readonly string[]).includes(value);
}

export function isKnownEngineId(value: unknown): value is string {
  return typeof value === 'string' && listEngines().some((engine) => engine.id === value);
}

/**
 * Sensible starting blend for a layer pair:
 * - Pro tool on top (transparent background): normal at 85 %, with a light dim of
 *   layer 1 so the avatar / words / sphere stand out. Image Pulse fills the frame,
 *   so it is screened at 70 % instead.
 * - Classic engine on top (opaque world): screen at 50 %, so both worlds read.
 */
export function autoLayerDefaults(_baseEngineId: string, overlayEngineId: string): LayerBlendSettings {
  if (isProEngineId(overlayEngineId)) {
    if (overlayEngineId === 'image-pulse') return { opacity: 0.7, blendMode: 'screen', backgroundDim: 0 };
    const backgroundDim = overlayEngineId === 'lyric-canvas' ? 0.3 : overlayEngineId === 'dance-avatars' ? 0.25 : 0.15;
    return { opacity: 0.85, blendMode: 'normal', backgroundDim };
  }
  return { opacity: 0.5, blendMode: 'screen', backgroundDim: 0 };
}

export { blendModeToComposite, DEFAULT_LAYER_BLEND, DEFAULT_LAYER_MIX, MAX_BACKGROUND_DIM } from './layerMix.defaults';

const round2 = (value: number) => Math.round(value * 100) / 100;
const clampNumber = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? round2(Math.min(max, Math.max(min, value))) : fallback;

export function validateBlendSettings(value: unknown, fallback: LayerBlendSettings = DEFAULT_LAYER_BLEND): LayerBlendSettings {
  const settings = value && typeof value === 'object' ? value as Partial<LayerBlendSettings> : {};
  return {
    opacity: clampNumber(settings.opacity, fallback.opacity, 0, 1),
    blendMode: isLayerBlendMode(settings.blendMode) ? settings.blendMode : fallback.blendMode,
    backgroundDim: clampNumber(settings.backgroundDim, fallback.backgroundDim, 0, MAX_BACKGROUND_DIM),
  };
}

function validateParameters(value: unknown): Record<string, EngineParameterValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const parameters: Record<string, EngineParameterValue> = {};
  for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
    if (typeof candidate === 'string' || typeof candidate === 'boolean'
      || (typeof candidate === 'number' && Number.isFinite(candidate))) {
      parameters[key] = candidate;
    }
  }
  return parameters;
}

/**
 * Why a layer-2 engine is refused: unknown id, or the very engine already used
 * as layer 1 (the same engine on both layers is not allowed).
 */
export function overlayRejection(baseEngineId: string, overlayEngineId: string): 'unknown-engine' | 'same-engine' | null {
  if (!isKnownEngineId(overlayEngineId)) return 'unknown-engine';
  if (overlayEngineId === baseEngineId) return 'same-engine';
  return null;
}

function validateOverlay(value: unknown, baseEngineId?: string): LayerOverlay | null {
  if (!value || typeof value !== 'object') return null;
  const overlay = value as Partial<LayerOverlay>;
  if (typeof overlay.engineId !== 'string') return null;
  if (overlayRejection(baseEngineId ?? '', overlay.engineId)) return null;
  return { engineId: overlay.engineId, parameters: validateParameters(overlay.parameters) };
}

/**
 * Sanitises a (possibly legacy / hand-edited) layer mix. Missing or invalid
 * input falls back to the single-engine default; an overlay equal to layer 1
 * or naming an unknown engine is dropped.
 */
export function validateLayerMix(value: unknown, baseEngineId?: string): LayerMix {
  if (!value || typeof value !== 'object') return { ...DEFAULT_LAYER_MIX };
  const mix = value as Partial<LayerMix>;
  return {
    overlay: validateOverlay(mix.overlay, baseEngineId),
    ...validateBlendSettings(mix),
  };
}

/** True when a valid layer 2 is set for this layer 1. */
export function isLayerMixActive(mix: LayerMix | null | undefined, baseEngineId: string): mix is LayerMix & { overlay: LayerOverlay } {
  return Boolean(mix?.overlay && !overlayRejection(baseEngineId, mix.overlay.engineId));
}
