import { DEFAULT_ENGINE_ID } from '../engines/engine.defaults';
import { directorDefaultState } from '../director/director.profiles';
import type { ExportSettings, VisualMelodyProject } from './project.types';

export const PROJECT_SCHEMA_VERSION = 1 as const;

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'mp4',
  width: 1280,
  height: 720,
  frameRate: 30,
  videoBitRate: 6_000_000,
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
    engine: {
      engineId: DEFAULT_ENGINE_ID,
      presetId: 'Naomi',
      parameters: {},
      director: { mood: 'More Emotional', values: { ...directorDefaultState } },
    },
    export: { ...DEFAULT_EXPORT_SETTINGS },
  };
}
