import { DEFAULT_CREATOR, DEFAULT_EXPORT_SETTINGS, PROJECT_SCHEMA_VERSION } from './project.defaults';
import { directorDefaultState, directorMoodProfiles, validateDirectorState } from '../director/director.profiles';
import { exportSettingsFromPreset, getExportPreset } from '../export/formats';
import type { DirectorMood } from '../director/director.types';
import { isProjectToolId } from '../tools/tool.registry';
import { validateLayerMix } from '../engines/layer-mix/layerMix.config';
import type { ProjectCreator, ProjectImage, ProjectLyrics, VisualMelodyProject } from './project.types';

export function isSupportedProjectVersion(value: unknown): value is typeof PROJECT_SCHEMA_VERSION {
  return value === PROJECT_SCHEMA_VERSION;
}

export function serializeProject(project: VisualMelodyProject) {
  // Object URLs only live for the current session: strip them like the audio source.
  const parameters = typeof project.engine.parameters.imageSrc === 'string'
    ? { ...project.engine.parameters, imageSrc: '' }
    : project.engine.parameters;
  return JSON.stringify({
    ...project,
    audio: project.audio ? { ...project.audio, objectUrl: null } : null,
    image: project.image ? { ...project.image, objectUrl: null } : null,
    engine: { ...project.engine, parameters },
    mix: project.mix?.overlay && typeof project.mix.overlay.parameters.imageSrc === 'string'
      ? { ...project.mix, overlay: { ...project.mix.overlay, parameters: { ...project.mix.overlay.parameters, imageSrc: '' } } }
      : project.mix,
  });
}

function migrateImage(value: unknown): ProjectImage | null {
  if (!value || typeof value !== 'object') return null;
  const image = value as Partial<ProjectImage>;
  const positive = (candidate: unknown) => typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0 ? candidate : 0;
  if (typeof image.fileName !== 'string') return null;
  return {
    fileName: image.fileName,
    mimeType: typeof image.mimeType === 'string' ? image.mimeType : '',
    size: positive(image.size),
    width: positive(image.width),
    height: positive(image.height),
    objectUrl: typeof image.objectUrl === 'string' ? image.objectUrl : null,
  };
}

function migrateLyrics(value: unknown): ProjectLyrics {
  if (!value || typeof value !== 'object') return { text: '', offset: 0 };
  const lyrics = value as Partial<ProjectLyrics>;
  return {
    text: typeof lyrics.text === 'string' ? lyrics.text.slice(0, 20_000) : '',
    offset: typeof lyrics.offset === 'number' && Number.isFinite(lyrics.offset) ? Math.min(30, Math.max(-30, lyrics.offset)) : 0,
  };
}

function migrateExportSettings(value: VisualMelodyProject['export'] | undefined) {
  if (!value) return { ...DEFAULT_EXPORT_SETTINGS };
  const presetId = value.presetId
    ?? (value.width === 1920 && value.height === 1080
      ? '1080p-widescreen'
      : value.width === 1080 && value.height === 1920
        ? '1080p-vertical'
        : value.width === 720 && value.height === 1280
          ? '720p-vertical'
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
    image: migrateImage((project as { image?: unknown }).image),
    lyrics: migrateLyrics((project as { lyrics?: unknown }).lyrics),
    engine: {
      ...project.engine,
      parameters: engineParameters,
      director: {
        mood: existingDirector?.mood ?? legacyMood,
        values: validateDirectorState(existingDirector?.values ?? directorMoodProfiles[legacyMood] ?? directorDefaultState),
      },
    },
    // Projects saved before two-layer mixes have no `mix`: single engine, as before.
    mix: validateLayerMix((project as { mix?: unknown }).mix, project.engine?.engineId),
    export: migrateExportSettings(project.export),
  };
}
