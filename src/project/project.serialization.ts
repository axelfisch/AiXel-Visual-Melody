import { DEFAULT_CREATOR, DEFAULT_EXPORT_SETTINGS, PROJECT_SCHEMA_VERSION } from './project.defaults';
import { directorDefaultState, directorMoodProfiles, validateDirectorState } from '../director/director.profiles';
import { exportSettingsFromPreset, getExportPreset } from '../export/formats';
import type { DirectorMood } from '../director/director.types';
import { isProjectToolId } from '../tools/tool.registry';
import type { ProjectCreator, VisualMelodyProject } from './project.types';

export function isSupportedProjectVersion(value: unknown): value is typeof PROJECT_SCHEMA_VERSION {
  return value === PROJECT_SCHEMA_VERSION;
}

export function serializeProject(project: VisualMelodyProject) {
  return JSON.stringify({ ...project, audio: project.audio ? { ...project.audio, objectUrl: null } : null });
}

function migrateExportSettings(value: VisualMelodyProject['export'] | undefined) {
  if (!value) return { ...DEFAULT_EXPORT_SETTINGS };
  const presetId = value.presetId
    ?? (value.width === 1920 && value.height === 1080
      ? '1080p-widescreen'
      : value.width === 1080 && value.height === 1920
        ? '1080p-vertical'
        : '720p-widescreen');
  const preset = getExportPreset(presetId);
  return {
    ...exportSettingsFromPreset(preset.id, value.watermark !== false),
    ...value,
    presetId: preset.id,
    width: preset.width,
    height: preset.height,
    watermark: value.watermark !== false,
  };
}

function migrateCreator(value: ProjectCreator | undefined): ProjectCreator {
  if (!value || typeof value !== 'object') return { ...DEFAULT_CREATOR };
  const hex = (candidate: unknown, fallback: string) =>
    typeof candidate === 'string' && /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
  return {
    primaryColor: hex(value.primaryColor, DEFAULT_CREATOR.primaryColor),
    accentColor: hex(value.accentColor, DEFAULT_CREATOR.accentColor),
  };
}

export function parseProject(serialized: string): VisualMelodyProject {
  const value: unknown = JSON.parse(serialized);
  if (!value || typeof value !== 'object' || !('schemaVersion' in value) || !isSupportedProjectVersion(value.schemaVersion)) {
    throw new Error('Version de projet AiXel non prise en charge.');
  }
  const project = value as VisualMelodyProject & { tool?: unknown; creator?: ProjectCreator };
  const parameters = project.engine?.parameters ?? {};
  const legacyMood = typeof parameters.directorMood === 'string' && parameters.directorMood in directorMoodProfiles
    ? parameters.directorMood as DirectorMood
    : 'More Emotional';
  const existingDirector = project.engine?.director;
  const { directorMood: _legacyDirectorMood, ...engineParameters } = parameters;

  return {
    ...project,
    tool: isProjectToolId(project.tool) ? project.tool : 'engine',
    creator: migrateCreator(project.creator),
    engine: {
      ...project.engine,
      parameters: engineParameters,
      director: {
        mood: existingDirector?.mood ?? legacyMood,
        values: validateDirectorState(existingDirector?.values ?? directorMoodProfiles[legacyMood] ?? directorDefaultState),
      },
    },
    export: migrateExportSettings(project.export),
  };
}
