import { DEFAULT_ENGINE_ID } from '../engines/engine.defaults';
import { directorDefaultState } from '../director/director.profiles';
import type { ExportSettings, ProjectSchemaVersion, VisualMelodyProject } from './project.types';

export const PROJECT_SCHEMA_VERSION: ProjectSchemaVersion = 2;

/**
 * The Free-compatible output every new project starts from: 1280 × 720, 16:9,
 * AiXel end card. Creator Pro values are representable but never the default.
 */
export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'mp4',
  width: 1280,
  height: 720,
  frameRate: 30,
  videoBitRate: 6_000_000,
  aspectRatio: '16:9',
  endCardMode: 'aixel',
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
    artistName: null,
    createdAt: now,
    updatedAt: now,
    sourceHint: null,
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
