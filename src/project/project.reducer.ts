import { createProject } from './project.defaults';
import type { DirectorMood, DirectorState } from '../director/director.types';
import type { ProjectToolId } from '../tools/tool.types';
import { listTools } from '../tools/tool.registry';
import { DEFAULT_LAYER_MIX } from '../engines/layer-mix/layerMix.defaults';
import { autoLayerDefaults, overlayRejection, validateBlendSettings } from '../engines/layer-mix/layerMix.config';
import type { LayerBlendSettings, LayerMix } from '../engines/layer-mix/layerMix.types';
import type {
  EngineParameterValue,
  ExportSettings,
  ProjectAnalysis,
  ProjectAudio,
  ProjectCreator,
  ProjectImage,
  ProjectLyrics,
  VisualMelodyProject,
} from './project.types';

export type ProjectAction =
  | { type: 'CREATE_PROJECT'; name?: string }
  | { type: 'RENAME_PROJECT'; name: string }
  | { type: 'SET_AUDIO_SOURCE'; audio: ProjectAudio }
  | { type: 'ANALYSIS_STARTED' }
  | { type: 'ANALYSIS_COMPLETED'; analysis: ProjectAnalysis }
  | { type: 'ANALYSIS_FAILED' }
  | { type: 'SELECT_TOOL'; tool: ProjectToolId; engineId?: string; parameters?: Record<string, EngineParameterValue> }
  | { type: 'SELECT_ENGINE'; engineId: string; parameters?: Record<string, EngineParameterValue> }
  | { type: 'SELECT_PRESET'; presetId: string | null }
  | {
      type: 'APPLY_DIRECTOR';
      mood: DirectorMood | null;
      values: DirectorState;
      parameters: Record<string, EngineParameterValue>;
    }
  | { type: 'UPDATE_CREATOR'; creator: Partial<ProjectCreator> }
  | { type: 'SET_IMAGE_SOURCE'; image: ProjectImage }
  | { type: 'CLEAR_IMAGE_SOURCE' }
  | { type: 'SET_LYRICS'; lyrics: Partial<ProjectLyrics> }
  | { type: 'UPDATE_ENGINE_PARAMETER'; parameterId: string; value: EngineParameterValue }
  | { type: 'UPDATE_ENGINE_PARAMETERS'; parameters: Record<string, EngineParameterValue> }
  | { type: 'UPDATE_EXPORT_SETTINGS'; settings: Partial<ExportSettings> }
  /** Layer 2 engine (`null` = single engine). Applies the auto blend defaults for the pair. */
  | { type: 'SET_LAYER_OVERLAY'; engineId: string | null; parameters?: Record<string, EngineParameterValue> }
  | { type: 'UPDATE_LAYER_BLEND'; settings: Partial<LayerBlendSettings> }
  | { type: 'UPDATE_OVERLAY_PARAMETER'; parameterId: string; value: EngineParameterValue }
  | { type: 'UPDATE_OVERLAY_PARAMETERS'; parameters: Record<string, EngineParameterValue> }
  /** Layer 2 becomes layer 1 and vice versa (parameters pre-mapped by the caller). */
  | { type: 'SWAP_LAYERS'; baseParameters: Record<string, EngineParameterValue>; overlayParameters: Record<string, EngineParameterValue> }
  | { type: 'RESET_PROJECT' };

const touched = (project: VisualMelodyProject) => ({ ...project, updatedAt: new Date().toISOString() });

const IMAGE_ENGINES = new Set(['image-pulse', 'lyric-canvas']);

/** Keeps the image renderer parameter in sync with the project image (Preview and Export read the same value). */
function withImageParameter(project: VisualMelodyProject, image: ProjectImage | null): VisualMelodyProject['engine'] {
  if (!IMAGE_ENGINES.has(project.engine.engineId)) return project.engine;
  return { ...project.engine, parameters: { ...project.engine.parameters, imageSrc: image?.objectUrl ?? '' } };
}

/** Keeps the Lyric Canvas renderer parameters in sync with the project lyrics. */
function withLyricsParameters(project: VisualMelodyProject, lyrics: ProjectLyrics): VisualMelodyProject['engine'] {
  if (project.engine.engineId !== 'lyric-canvas') return project.engine;
  return { ...project.engine, parameters: { ...project.engine.parameters, lyrics: lyrics.text, lyricsOffset: lyrics.offset } };
}

const currentMix = (project: VisualMelodyProject): LayerMix => project.mix ?? DEFAULT_LAYER_MIX;

/** The same engine can never sit on both layers: a layer 1 change that collides drops layer 2. */
function withLayerGuard(project: VisualMelodyProject): VisualMelodyProject {
  const mix = currentMix(project);
  if (!mix.overlay || !overlayRejection(project.engine.engineId, mix.overlay.engineId)) return project;
  return { ...project, mix: { ...mix, overlay: null } };
}

/** Creative tool that owns an engine (Pro tools) — classic engines live under 'engine'. */
export function toolIdForEngine(engineId: string): ProjectToolId {
  return listTools().find((tool) => tool.engineId === engineId)?.id ?? 'engine';
}

const LYRICS_OFFSET_LIMIT = 30;

function nextLyrics(current: ProjectLyrics, patch: Partial<ProjectLyrics>): ProjectLyrics {
  const text = typeof patch.text === 'string' ? patch.text.replace(/\r\n?/g, '\n').slice(0, 20_000) : current.text;
  const offset = typeof patch.offset === 'number' && Number.isFinite(patch.offset)
    ? Math.round(Math.min(LYRICS_OFFSET_LIMIT, Math.max(-LYRICS_OFFSET_LIMIT, patch.offset)) * 100) / 100
    : current.offset;
  return { text, offset };
}

export function projectReducer(project: VisualMelodyProject, action: ProjectAction): VisualMelodyProject {
  switch (action.type) {
    case 'CREATE_PROJECT':
      return createProject(action.name);
    case 'RENAME_PROJECT':
      return touched({ ...project, name: action.name.trim() || project.name });
    case 'SET_AUDIO_SOURCE':
      return touched({ ...project, name: action.audio.fileName.replace(/\.[^.]+$/, ''), audio: action.audio, analysis: null });
    case 'ANALYSIS_STARTED':
    case 'ANALYSIS_FAILED':
      return project;
    case 'ANALYSIS_COMPLETED':
      return touched({ ...project, analysis: action.analysis });
    case 'SELECT_TOOL':
      return withLayerGuard(touched({
        ...project,
        tool: action.tool,
        engine: action.engineId
          ? {
              ...project.engine,
              engineId: action.engineId,
              presetId: null,
              parameters: action.parameters ? { ...action.parameters } : project.engine.parameters,
            }
          : project.engine,
      }));
    case 'SELECT_ENGINE':
      return withLayerGuard(touched({
        ...project,
        tool: 'engine',
        engine: {
          ...project.engine,
          engineId: action.engineId,
          presetId: null,
          parameters: action.parameters ? { ...action.parameters } : {},
        },
      }));
    case 'SELECT_PRESET':
      return touched({ ...project, engine: { ...project.engine, presetId: action.presetId } });
    case 'APPLY_DIRECTOR':
      return touched({
        ...project,
        engine: {
          ...project.engine,
          parameters: { ...action.parameters },
          director: {
            mood: action.mood,
            values: { ...action.values },
          },
        },
      });
    case 'UPDATE_CREATOR':
      return touched({
        ...project,
        creator: { ...project.creator, ...action.creator },
      });
    case 'SET_IMAGE_SOURCE':
      return touched({ ...project, image: { ...action.image }, engine: withImageParameter(project, action.image) });
    case 'CLEAR_IMAGE_SOURCE':
      return touched({ ...project, image: null, engine: withImageParameter(project, null) });
    case 'SET_LYRICS': {
      const lyrics = nextLyrics(project.lyrics ?? { text: '', offset: 0 }, action.lyrics);
      return touched({ ...project, lyrics, engine: withLyricsParameters(project, lyrics) });
    }
    case 'UPDATE_ENGINE_PARAMETER':
      return touched({
        ...project,
        engine: {
          ...project.engine,
          parameters: { ...project.engine.parameters, [action.parameterId]: action.value },
        },
      });
    case 'UPDATE_ENGINE_PARAMETERS':
      return touched({
        ...project,
        engine: {
          ...project.engine,
          parameters: { ...project.engine.parameters, ...action.parameters },
        },
      });
    case 'UPDATE_EXPORT_SETTINGS':
      return touched({ ...project, export: { ...project.export, ...action.settings } });
    case 'SET_LAYER_OVERLAY': {
      const mix = currentMix(project);
      if (action.engineId === null) return touched({ ...project, mix: { ...mix, overlay: null } });
      if (overlayRejection(project.engine.engineId, action.engineId)) return project;
      const keepParameters = mix.overlay?.engineId === action.engineId ? mix.overlay.parameters : {};
      return touched({
        ...project,
        mix: {
          ...autoLayerDefaults(project.engine.engineId, action.engineId),
          overlay: { engineId: action.engineId, parameters: { ...(action.parameters ?? keepParameters) } },
        },
      });
    }
    case 'UPDATE_LAYER_BLEND': {
      const mix = currentMix(project);
      return touched({ ...project, mix: { ...mix, ...validateBlendSettings({ ...mix, ...action.settings }, mix) } });
    }
    case 'UPDATE_OVERLAY_PARAMETER':
    case 'UPDATE_OVERLAY_PARAMETERS': {
      const mix = currentMix(project);
      if (!mix.overlay) return project;
      const patch = action.type === 'UPDATE_OVERLAY_PARAMETER' ? { [action.parameterId]: action.value } : action.parameters;
      return touched({ ...project, mix: { ...mix, overlay: { ...mix.overlay, parameters: { ...mix.overlay.parameters, ...patch } } } });
    }
    case 'SWAP_LAYERS': {
      const mix = currentMix(project);
      if (!mix.overlay) return project;
      const nextBase = mix.overlay.engineId;
      return touched({
        ...project,
        tool: toolIdForEngine(nextBase),
        engine: { ...project.engine, engineId: nextBase, presetId: null, parameters: { ...action.baseParameters } },
        mix: { ...mix, overlay: { engineId: project.engine.engineId, parameters: { ...action.overlayParameters } } },
      });
    }
    case 'RESET_PROJECT':
      return createProject();
  }
}
