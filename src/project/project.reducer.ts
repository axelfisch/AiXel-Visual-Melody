import { createProject } from './project.defaults';
import type {
  EngineParameterValue,
  ExportSettings,
  ProjectAnalysis,
  ProjectAudio,
  VisualMelodyProject,
} from './project.types';

export type ProjectAction =
  | { type: 'CREATE_PROJECT'; name?: string }
  | { type: 'RENAME_PROJECT'; name: string }
  | { type: 'SET_AUDIO_SOURCE'; audio: ProjectAudio }
  | { type: 'ANALYSIS_STARTED' }
  | { type: 'ANALYSIS_COMPLETED'; analysis: ProjectAnalysis }
  | { type: 'ANALYSIS_FAILED' }
  | { type: 'SELECT_ENGINE'; engineId: string; parameters?: Record<string, EngineParameterValue> }
  | { type: 'SELECT_PRESET'; presetId: string | null }
  | { type: 'UPDATE_ENGINE_PARAMETER'; parameterId: string; value: EngineParameterValue }
  | { type: 'UPDATE_EXPORT_SETTINGS'; settings: Partial<ExportSettings> }
  | { type: 'RESET_PROJECT' };

const touched = (project: VisualMelodyProject) => ({ ...project, updatedAt: new Date().toISOString() });

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
    case 'SELECT_ENGINE':
      return touched({
        ...project,
        engine: {
          engineId: action.engineId,
          presetId: null,
          parameters: action.parameters ? { ...action.parameters } : {},
        },
      });
    case 'SELECT_PRESET':
      return touched({ ...project, engine: { ...project.engine, presetId: action.presetId } });
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
