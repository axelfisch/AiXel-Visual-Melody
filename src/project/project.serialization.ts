import { PROJECT_SCHEMA_VERSION } from './project.defaults';
import {
  ProjectValidationError,
  assertWithinSerializedLimit,
  migrateProjectDocument,
} from './project.schema';
import { SUPPORTED_PROJECT_SCHEMA_VERSIONS, type VisualMelodyProject } from './project.types';

export function isSupportedProjectVersion(value: unknown): boolean {
  return (
    typeof value === 'number' && (SUPPORTED_PROJECT_SCHEMA_VERSIONS as readonly number[]).includes(value)
  );
}

/**
 * Builds the stored document field by field. Nothing is spread from the live
 * project, so a runtime value that is added to `VisualMelodyProject` later
 * cannot silently start being persisted: it has to be written here on purpose.
 */
export function toProjectDocument(project: VisualMelodyProject) {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: project.id,
    name: project.name,
    artistName: project.artistName,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    sourceHint: project.sourceHint
      ? {
          fileName: project.sourceHint.fileName,
          mimeType: project.sourceHint.mimeType,
          size: project.sourceHint.size,
          duration: project.sourceHint.duration,
          sha256: project.sourceHint.sha256,
        }
      : null,
    analysis: project.analysis
      ? {
          sampleRate: project.analysis.sampleRate,
          bpm: project.analysis.bpm,
          peak: project.analysis.peak,
          averageEnergy: project.analysis.averageEnergy,
          waveform: [...project.analysis.waveform],
          energy: [...project.analysis.energy],
        }
      : null,
    engine: {
      engineId: project.engine.engineId,
      presetId: project.engine.presetId,
      parameters: { ...project.engine.parameters },
      director: {
        mood: project.engine.director.mood,
        values: { ...project.engine.director.values },
      },
    },
    export: {
      format: project.export.format,
      width: project.export.width,
      height: project.export.height,
      frameRate: project.export.frameRate,
      videoBitRate: project.export.videoBitRate,
      aspectRatio: project.export.aspectRatio,
      endCardMode: project.export.endCardMode,
    },
  };
}

export function serializeProject(project: VisualMelodyProject): string {
  // Treat in-memory state as untrusted too. Reducers keep it valid today, but
  // future adapters and tests can construct projects directly; serialization
  // must never turn an unsafe source reference into persisted data.
  const validated = migrateProjectDocument(toProjectDocument(project));
  const serialized = JSON.stringify(validated);
  assertWithinSerializedLimit(serialized);
  return serialized;
}

/**
 * The single entry point for untrusted project data. Anything it returns is a
 * freshly built, fully validated current-schema project.
 */
export function parseProject(serialized: string): VisualMelodyProject {
  assertWithinSerializedLimit(serialized);
  let document: unknown;
  try {
    document = JSON.parse(serialized);
  } catch {
    throw new ProjectValidationError('unreadable');
  }
  return migrateProjectDocument(document);
}

export { ProjectValidationError } from './project.schema';
export type { ProjectValidationCode } from './project.schema';
