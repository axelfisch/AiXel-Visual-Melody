import { useMemo } from 'react';
import { mapDirectorToEngine } from '../director/director.mapping';
import { getEngineOrDefault, isProEngineId } from '../engines/engine.registry';
import type { VisualEngine } from '../engines/engine.types';
import { isLayerMixActive } from '../engines/layer-mix/layerMix.config';
import { getLayerMixEngine, type LayerMixRenderConfig } from '../engines/layer-mix/layerMix.compositor';
import type { EngineParameterValue, VisualMelodyProject } from './project.types';

const IMAGE_ENGINES = new Set(['image-pulse', 'lyric-canvas']);

/** What Create, Preview and Export all render for a project — one source of truth (WYSIWYG). */
export type ProjectRender = {
  engine: VisualEngine;
  config: unknown;
  baseEngine: VisualEngine;
  /** Layer 2 engine when a two-layer mix is active. */
  overlayEngine: VisualEngine | null;
  /** Fully resolved layer 2 parameters (Director + Creator colors + media applied). */
  overlayParameters: Record<string, EngineParameterValue> | null;
};

type ResolveInput = Pick<VisualMelodyProject, 'engine' | 'creator' | 'image' | 'lyrics'> & {
  mix?: VisualMelodyProject['mix'];
};

/**
 * Layer 2 parameters: its own choices (gender/style, pulse style, lyric preset,
 * palette colors) + the Director faders and Creator colors shared with layer 1
 * + the project image / lyrics. Layer 1 owns the title, so layer 2 never draws it.
 */
export function resolveOverlayParameters(project: ResolveInput): Record<string, EngineParameterValue> | null {
  const mix = project.mix;
  if (!isLayerMixActive(mix, project.engine.engineId)) return null;
  const engineId = mix.overlay.engineId;
  const mapped = mapDirectorToEngine(engineId, project.engine.director.values, {
    ...mix.overlay.parameters,
    ...(isProEngineId(engineId)
      ? { primaryColor: project.creator.primaryColor, accentColor: project.creator.accentColor }
      : {}),
    ...(IMAGE_ENGINES.has(engineId) ? { imageSrc: project.image?.objectUrl ?? '' } : {}),
    ...(engineId === 'lyric-canvas' ? { lyrics: project.lyrics?.text ?? '', lyricsOffset: project.lyrics?.offset ?? 0 } : {}),
  });
  return { ...mapped.parameters, showTitle: false };
}

export function resolveProjectRender(project: ResolveInput): ProjectRender {
  const baseEngine = getEngineOrDefault(project.engine.engineId);
  const mix = project.mix;
  const overlayParameters = resolveOverlayParameters(project);
  if (!mix || !mix.overlay || !overlayParameters) {
    // Single engine: exactly the historical engine + parameters.
    return { engine: baseEngine, config: project.engine.parameters, baseEngine, overlayEngine: null, overlayParameters: null };
  }
  const engine = getLayerMixEngine(baseEngine.id, mix.overlay.engineId);
  const config: LayerMixRenderConfig = {
    base: project.engine.parameters,
    overlay: overlayParameters,
    opacity: mix.opacity,
    blendMode: mix.blendMode,
    backgroundDim: mix.backgroundDim,
  };
  return {
    engine: engine as unknown as VisualEngine,
    config,
    baseEngine,
    overlayEngine: getEngineOrDefault(mix.overlay.engineId),
    overlayParameters,
  };
}

/** Memoised `resolveProjectRender` (stable identity between playback ticks). */
export function useProjectRender(project: VisualMelodyProject): ProjectRender {
  const { engine, creator, image, lyrics, mix } = project;
  return useMemo(
    () => resolveProjectRender({ engine, creator, image, lyrics, mix }),
    [engine, creator, image, lyrics, mix],
  );
}
