import { PROJECT_SCHEMA_VERSION } from './project.defaults';
import { directorDefaultState, directorMoodProfiles, validateDirectorState } from '../director/director.profiles';
import type { DirectorMood } from '../director/director.types';
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
  const project = value as VisualMelodyProject;
  const parameters = project.engine?.parameters ?? {};
  const legacyMood = typeof parameters.directorMood === 'string' && parameters.directorMood in directorMoodProfiles
    ? parameters.directorMood as DirectorMood
    : 'More Emotional';
  const existingDirector = project.engine?.director;
  const { directorMood: _legacyDirectorMood, ...engineParameters } = parameters;

  return {
    ...project,
    engine: {
      ...project.engine,
      parameters: engineParameters,
      director: {
        mood: existingDirector?.mood ?? legacyMood,
        values: validateDirectorState(existingDirector?.values ?? directorMoodProfiles[legacyMood] ?? directorDefaultState),
      },
    },
  };
}
