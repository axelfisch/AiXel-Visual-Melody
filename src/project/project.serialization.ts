import { PROJECT_SCHEMA_VERSION } from './project.defaults';
import type { VisualMelodyProject } from './project.types';

export function isSupportedProjectVersion(value: unknown): value is typeof PROJECT_SCHEMA_VERSION {
  return value === PROJECT_SCHEMA_VERSION;
}

export function serializeProject(project: VisualMelodyProject) {
  return JSON.stringify({ ...project, audio: project.audio ? { ...project.audio, objectUrl: null } : null });
}

export function parseProject(serialized: string): VisualMelodyProject {
  const value: unknown = JSON.parse(serialized);
  if (!value || typeof value !== 'object' || !('schemaVersion' in value) || !isSupportedProjectVersion(value.schemaVersion)) {
    throw new Error('Version de projet AiXel non prise en charge.');
  }
  return value as VisualMelodyProject;
}
