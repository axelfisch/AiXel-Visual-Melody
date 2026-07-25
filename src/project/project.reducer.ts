import { createProject } from './project.defaults';
import type { DirectorMood, DirectorState } from '../director/director.types';
import type {
  EngineParameterValue,
  ExportSettings,
  ProjectIdentity,
  ProjectAnalysis,
  ProjectAudio,
  VisualMelodyProject,
} from './project.types';

export type ProjectAction =
  | { type: 'CREATE_PROJECT'; name?: string }
  | { type: 'RENAME_PROJECT'; name: string }
  | { type: 'UPDATE_PROJECT_IDENTITY'; identity: Partial<ProjectIdentity> }
  | { type: 'SET_AUDIO_SOURCE'; audio: ProjectAudio }
  | { type: 'ANALYSIS_STARTED' }
  | { type: 'ANALYSIS_COMPLETED'; analysis: ProjectAnalysis }
  | { type: 'ANALYSIS_FAILED' }
  | { type: 'SELECT_ENGINE'; engineId: string; parameters?: Record<string, EngineParameterValue> }
  | { type: 'SELECT_PRESET'; presetId: string | null }
  | {
      type: 'APPLY_DIRECTOR';
      mood: DirectorMood | null;
      values: DirectorState;
      parameters: Record<string, EngineParameterValue>;
    }
  | { type: 'UPDATE_ENGINE_PARAMETER'; parameterId: string; value: EngineParameterValue }
  | { type: 'UPDATE_EXPORT_SETTINGS'; settings: Partial<ExportSettings> }
  | { type: 'RESET_PROJECT' };

const touched = (project: VisualMelodyProject) => ({ ...project, updatedAt: new Date().toISOString() });

export function projectReducer(project: VisualMelodyProject, action: ProjectAction): VisualMelodyProject {
  switch (action.type) {
    case 'CREATE_PROJECT':
      return createProject(action.name);
    case 'RENAME_PROJECT':
      return touched({
        ...project,
        name: action.name.trim() || project.name,
        identity: { ...project.identity, title: action.name.trim() || project.identity.title },
      });
    case 'UPDATE_PROJECT_IDENTITY':
      return touched({
        ...project,
        identity: {
          title: action.identity.title ?? project.identity.title,
          artist: action.identity.artist ?? project.identity.artist,
        },
      });
    case 'SET_AUDIO_SOURCE': {
      const title = action.audio.fileName.replace(/\.[^.]+$/, '');
      return touched({
        ...project,
        name: title,
        identity: { ...project.identity, title },
        audio: action.audio,
        analysis: null,
      });
    }
    case 'ANALYSIS_STARTED':
    case 'ANALYSIS_FAILED':
      return project;
    case 'ANALYSIS_COMPLETED':
      return touched({ ...project, analysis: action.analysis });
    case 'SELECT_ENGINE':
      return touched({
        ...project,
        engine: {
          ...project.engine,
          engineId: action.engineId,
          presetId: null,
          parameters: action.parameters ? { ...action.parameters } : {},
        },
      });
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
    case 'UPDATE_ENGINE_PARAMETER':
      return touched({
        ...project,
        engine: {
          ...project.engine,
          parameters: { ...project.engine.parameters, [action.parameterId]: action.value },
        },
      });
    case 'UPDATE_EXPORT_SETTINGS':
      return touched({ ...project, export: { ...project.export, ...action.settings } });
    case 'RESET_PROJECT':
      return createProject();
  }
}
