import { DEFAULT_ENGINE_ID } from '../engines/engine.defaults';
import { DEFAULT_LAYER_MIX } from '../engines/layer-mix/layerMix.defaults';
import { directorDefaultState } from '../director/director.profiles';
import { exportSettingsFromPreset } from '../export/formats';
import type { ExportSettings, ProjectCreator, VisualMelodyProject } from './project.types';

export const PROJECT_SCHEMA_VERSION = 1 as const;

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = exportSettingsFromPreset('720p-widescreen', true);

export const DEFAULT_CREATOR: ProjectCreator = {
  primaryColor: '#9eeaff',
  accentColor: '#8a6bff',
};

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `project-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createProject(name = 'Untitled Visual Melody'): VisualMelodyProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    audio: null,
    analysis: null,
    image: null,
    lyrics: { text: '', offset: 0 },
    tool: 'engine',
    engine: {
      engineId: DEFAULT_ENGINE_ID,
      presetId: 'Naomi',
      parameters: {},
      director: { mood: 'More Emotional', values: { ...directorDefaultState } },
    },
    mix: { ...DEFAULT_LAYER_MIX },
    creator: { ...DEFAULT_CREATOR },
    export: { ...DEFAULT_EXPORT_SETTINGS },
  };
}
