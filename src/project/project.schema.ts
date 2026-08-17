import { aspectRatioOf } from '../export/exportFormats';
import { MAX_AUDIO_DURATION, MAX_AUDIO_FILE_SIZE } from '../audio/analyzeAudioFile';
import { directorDefaultState, directorMoodProfiles } from '../director/director.profiles';
import type { DirectorDimension, DirectorMood, DirectorState } from '../director/director.types';
import { PROJECT_SCHEMA_VERSION } from './project.defaults';
import {
  PROJECT_ASPECT_RATIOS,
  PROJECT_END_CARD_MODES,
  SUPPORTED_PROJECT_SCHEMA_VERSIONS,
  type EngineParameterValue,
  type EngineSelection,
  type ExportSettings,
  type ProjectAnalysis,
  type ProjectAspectRatio,
  type ProjectEndCardMode,
  type ProjectSourceHint,
  type VisualMelodyProject,
} from './project.types';

/*
 * Bounded runtime validation for stored projects.
 *
 * A TypeScript cast is not validation. Every value that enters the application
 * from a file, a browser store, or later from a cloud row passes through this
 * module, which accepts only known versions, known keys, and bounded values, and
 * then *rebuilds* the project from scratch rather than reusing the parsed object.
 */

export type ProjectValidationCode =
  | 'unreadable'
  | 'too_large'
  | 'unsupported_version'
  | 'invalid_shape'
  | 'unknown_field'
  | 'invalid_value'
  | 'unsafe_reference';

/** Stable, user-safe messages. They never echo the offending content back. */
const MESSAGES: Record<ProjectValidationCode, string> = {
  unreadable: 'Ce fichier de projet AiXel est illisible.',
  too_large: 'Ce projet AiXel dépasse la taille maximale prise en charge.',
  unsupported_version: 'Version de projet AiXel non prise en charge.',
  invalid_shape: 'Ce projet AiXel est incomplet ou endommagé.',
  unknown_field: 'Ce projet AiXel contient des données non reconnues.',
  invalid_value: 'Ce projet AiXel contient une valeur invalide.',
  unsafe_reference: 'Ce projet AiXel référence une source audio non autorisée.',
};

export class ProjectValidationError extends Error {
  readonly code: ProjectValidationCode;
  /** Dotted path of the rejected field, for diagnostics only — never shown to the user. */
  readonly field: string;

  constructor(code: ProjectValidationCode, field = '') {
    super(MESSAGES[code]);
    this.name = 'ProjectValidationError';
    this.code = code;
    this.field = field;
  }
}

function fail(code: ProjectValidationCode, field = ''): never {
  throw new ProjectValidationError(code, field);
}

/**
 * Explicit compatibility limits. Raising any of them is a schema decision, not
 * an implementation detail: the same ceilings will be enforced server-side.
 */
export const PROJECT_LIMITS = {
  maxSerializedBytes: 1_048_576,
  maxIdLength: 128,
  maxNameLength: 200,
  maxArtistNameLength: 200,
  maxFileNameLength: 400,
  maxMimeTypeLength: 200,
  maxSourceBytes: MAX_AUDIO_FILE_SIZE,
  maxSourceDuration: MAX_AUDIO_DURATION,
  maxSampleRate: 768_000,
  maxBpm: 400,
  maxAnalysisPoints: 60_000,
  maxWaveformValue: 100,
  maxNormalizedAnalysisValue: 1,
  maxEngineIdLength: 120,
  maxPresetIdLength: 120,
  maxParameterCount: 200,
  maxParameterKeyLength: 120,
  maxParameterStringLength: 512,
  maxParameterNumber: 1_000_000,
  minFrameDimension: 16,
  maxFrameDimension: 7_680,
  minFrameRate: 1,
  maxFrameRate: 120,
  minVideoBitRate: 100_000,
  maxVideoBitRate: 200_000_000,
  maxNestingDepth: 12,
} as const;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Anything that could point at bytes instead of describing them. */
const LOCATION_PATTERN = /^\s*[a-z][a-z0-9+.-]*:|:\/\//i;

const V1_KEYS = ['schemaVersion', 'id', 'name', 'createdAt', 'updatedAt', 'audio', 'analysis', 'engine', 'export'];
const V1_AUDIO_KEYS = ['fileName', 'mimeType', 'size', 'duration', 'objectUrl'];
const V1_EXPORT_KEYS = ['format', 'width', 'height', 'frameRate', 'videoBitRate'];

const V2_KEYS = [
  'schemaVersion',
  'id',
  'name',
  'artistName',
  'createdAt',
  'updatedAt',
  'sourceHint',
  'analysis',
  'engine',
  'export',
];
const V2_SOURCE_HINT_KEYS = ['fileName', 'mimeType', 'size', 'duration', 'sha256'];
const V2_EXPORT_KEYS = [...V1_EXPORT_KEYS, 'aspectRatio', 'endCardMode'];

const ANALYSIS_KEYS = ['sampleRate', 'bpm', 'peak', 'averageEnergy', 'waveform', 'energy'];
const ENGINE_KEYS = ['engineId', 'presetId', 'parameters', 'director'];
const DIRECTOR_KEYS = ['mood', 'values'];

/* ------------------------------------------------------------------ readers */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function readObject(value: unknown, field: string): Record<string, unknown> {
  if (!isPlainObject(value)) fail('invalid_shape', field);
  return value;
}

function assertKnownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail('unknown_field', field ? `${field}.${key}` : key);
  }
}

function assertRequiredKeys(value: Record<string, unknown>, required: readonly string[], field: string) {
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail('invalid_shape', field ? `${field}.${key}` : key);
    }
  }
}

function readString(value: unknown, maxLength: number, field: string): string {
  if (typeof value !== 'string') fail('invalid_shape', field);
  if (value.length > maxLength) fail('too_large', field);
  return value;
}

function readOptionalString(value: unknown, maxLength: number, field: string): string | null {
  if (value === null || value === undefined) return null;
  return readString(value, maxLength, field);
}

function readNumber(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('invalid_value', field);
  if (value < min || value > max) fail('invalid_value', field);
  return value;
}

function readInteger(value: unknown, min: number, max: number, field: string): number {
  const numeric = readNumber(value, min, max, field);
  if (!Number.isInteger(numeric)) fail('invalid_value', field);
  return numeric;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) fail('invalid_value', field);
  return value as T;
}

function readTimestamp(value: unknown, field: string): string {
  const text = readString(value, 64, field);
  if (Number.isNaN(Date.parse(text))) fail('invalid_value', field);
  return text;
}

function readNumberArray(value: unknown, max: number, field: string): number[] {
  if (!Array.isArray(value)) fail('invalid_shape', field);
  if (value.length > PROJECT_LIMITS.maxAnalysisPoints) fail('too_large', field);
  return value.map((entry: unknown, index: number) =>
    readNumber(entry, 0, max, `${field}[${index}]`),
  );
}

/**
 * Rejects prototype-shaped keys and runaway nesting before any field is read, so
 * a hostile document cannot reach the field readers at all.
 */
function assertSafeDocument(value: unknown, field = '', depth = 0) {
  if (depth > PROJECT_LIMITS.maxNestingDepth) fail('invalid_shape', field);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafeDocument(entry, `${field}[${index}]`, depth + 1));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) fail('unknown_field', field ? `${field}.${key}` : key);
    assertSafeDocument(entry, field ? `${field}.${key}` : key, depth + 1);
  }
}

/* --------------------------------------------------------- shared fragments */

function readAnalysis(value: unknown, field: string): ProjectAnalysis | null {
  if (value === null || value === undefined) return null;
  const analysis = readObject(value, field);
  assertKnownKeys(analysis, ANALYSIS_KEYS, field);
  assertRequiredKeys(analysis, ANALYSIS_KEYS, field);
  return {
    sampleRate: readNumber(analysis.sampleRate, 1, PROJECT_LIMITS.maxSampleRate, `${field}.sampleRate`),
    bpm: readNumber(analysis.bpm, 0, PROJECT_LIMITS.maxBpm, `${field}.bpm`),
    peak: readNumber(analysis.peak, 0, PROJECT_LIMITS.maxNormalizedAnalysisValue, `${field}.peak`),
    averageEnergy: readNumber(
      analysis.averageEnergy,
      0,
      PROJECT_LIMITS.maxNormalizedAnalysisValue,
      `${field}.averageEnergy`,
    ),
    waveform: readNumberArray(analysis.waveform, PROJECT_LIMITS.maxWaveformValue, `${field}.waveform`),
    energy: readNumberArray(analysis.energy, PROJECT_LIMITS.maxNormalizedAnalysisValue, `${field}.energy`),
  };
}

function readParameters(value: unknown, field: string): Record<string, EngineParameterValue> {
  if (value === null || value === undefined) return {};
  const parameters = readObject(value, field);
  const keys = Object.keys(parameters);
  if (keys.length > PROJECT_LIMITS.maxParameterCount) fail('too_large', field);
  const result: Record<string, EngineParameterValue> = {};
  for (const key of keys) {
    if (key.length > PROJECT_LIMITS.maxParameterKeyLength) fail('too_large', `${field}.${key}`);
    const entry = parameters[key];
    if (typeof entry === 'boolean') result[key] = entry;
    else if (typeof entry === 'number') {
      result[key] = readNumber(
        entry,
        -PROJECT_LIMITS.maxParameterNumber,
        PROJECT_LIMITS.maxParameterNumber,
        `${field}.${key}`,
      );
    } else if (typeof entry === 'string') {
      result[key] = readString(entry, PROJECT_LIMITS.maxParameterStringLength, `${field}.${key}`);
    } else fail('invalid_value', `${field}.${key}`);
  }
  return result;
}

const DIRECTOR_MOODS = Object.keys(directorMoodProfiles) as DirectorMood[];
const DIRECTOR_DIMENSIONS = Object.keys(directorDefaultState) as DirectorDimension[];

function readDirectorValues(value: unknown, field: string, fallback: DirectorState): DirectorState {
  if (value === null || value === undefined) return { ...fallback };
  const values = readObject(value, field);
  assertKnownKeys(values, DIRECTOR_DIMENSIONS, field);
  const result = {} as DirectorState;
  for (const dimension of DIRECTOR_DIMENSIONS) {
    const entry = values[dimension];
    result[dimension] =
      entry === undefined ? fallback[dimension] : readNumber(entry, 0, 100, `${field}.${dimension}`);
  }
  return result;
}

function readEngine(value: unknown, field: string, legacyParameters = false): EngineSelection {
  const engine = readObject(value, field);
  assertKnownKeys(engine, ENGINE_KEYS, field);
  assertRequiredKeys(engine, legacyParameters ? ['engineId', 'presetId', 'parameters'] : ENGINE_KEYS, field);
  const engineId = readString(engine.engineId, PROJECT_LIMITS.maxEngineIdLength, `${field}.engineId`);
  const presetId = readOptionalString(engine.presetId, PROJECT_LIMITS.maxPresetIdLength, `${field}.presetId`);
  const parameters = readParameters(engine.parameters, `${field}.parameters`);

  // A version-1 project may carry the Director mood as an engine parameter and no
  // structured Director state at all.
  let legacyMood: DirectorMood | null = null;
  if (legacyParameters) {
    const candidate = parameters.directorMood;
    if (typeof candidate === 'string') {
      legacyMood = (DIRECTOR_MOODS as string[]).includes(candidate) ? (candidate as DirectorMood) : null;
      delete parameters.directorMood;
    }
  }

  const directorValue = engine.director;
  if (directorValue === null || directorValue === undefined) {
    if (!legacyParameters) fail('invalid_shape', `${field}.director`);
    const mood = legacyMood ?? 'More Emotional';
    return { engineId, presetId, parameters, director: { mood, values: { ...directorMoodProfiles[mood] } } };
  }

  const director = readObject(directorValue, `${field}.director`);
  assertKnownKeys(director, DIRECTOR_KEYS, `${field}.director`);
  assertRequiredKeys(director, DIRECTOR_KEYS, `${field}.director`);
  const mood =
    director.mood === null || director.mood === undefined
      ? legacyMood
      : readEnum(director.mood, DIRECTOR_MOODS, `${field}.director.mood`);
  const fallback = mood ? directorMoodProfiles[mood] : directorDefaultState;
  return {
    engineId,
    presetId,
    parameters,
    director: { mood, values: readDirectorValues(director.values, `${field}.director.values`, fallback) },
  };
}

type ExportCore = Omit<ExportSettings, 'aspectRatio' | 'endCardMode'>;

function readExportCore(value: Record<string, unknown>, field: string): ExportCore {
  return {
    format: readEnum(value.format, ['mp4'] as const, `${field}.format`),
    width: readInteger(
      value.width,
      PROJECT_LIMITS.minFrameDimension,
      PROJECT_LIMITS.maxFrameDimension,
      `${field}.width`,
    ),
    height: readInteger(
      value.height,
      PROJECT_LIMITS.minFrameDimension,
      PROJECT_LIMITS.maxFrameDimension,
      `${field}.height`,
    ),
    frameRate: readInteger(
      value.frameRate,
      PROJECT_LIMITS.minFrameRate,
      PROJECT_LIMITS.maxFrameRate,
      `${field}.frameRate`,
    ),
    videoBitRate: readInteger(
      value.videoBitRate,
      PROJECT_LIMITS.minVideoBitRate,
      PROJECT_LIMITS.maxVideoBitRate,
      `${field}.videoBitRate`,
    ),
  };
}

/** Rejects anything that resolves to a location rather than describing a file. */
function readLocationFreeString(value: unknown, maxLength: number, field: string): string {
  const text = readString(value, maxLength, field);
  if (LOCATION_PATTERN.test(text)) fail('unsafe_reference', field);
  return text;
}

function readSourceHintFields(
  value: Record<string, unknown>,
  field: string,
  sha256: unknown,
): ProjectSourceHint {
  const duration = readNumber(value.duration, 0, PROJECT_LIMITS.maxSourceDuration, `${field}.duration`);
  if (duration <= 0) fail('invalid_value', `${field}.duration`);
  return {
    fileName: readLocationFreeString(value.fileName, PROJECT_LIMITS.maxFileNameLength, `${field}.fileName`),
    mimeType: readLocationFreeString(value.mimeType, PROJECT_LIMITS.maxMimeTypeLength, `${field}.mimeType`),
    size: readInteger(value.size, 1, PROJECT_LIMITS.maxSourceBytes, `${field}.size`),
    duration,
    sha256: readSha256(sha256, `${field}.sha256`),
  };
}

function readSha256(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  const text = readString(value, 64, field);
  if (!/^[0-9a-f]{64}$/.test(text)) fail('invalid_value', field);
  return text;
}

/* ------------------------------------------------------------ per-version */

/** Version 1 had no artist identity, aspect ratio, end-card mode, or source hint. */
function readVersion1(document: Record<string, unknown>): VisualMelodyProject {
  assertKnownKeys(document, V1_KEYS, '');
  assertRequiredKeys(document, V1_KEYS, '');

  let sourceHint: ProjectSourceHint | null = null;
  if (document.audio !== null && document.audio !== undefined) {
    const audio = readObject(document.audio, 'audio');
    assertKnownKeys(audio, V1_AUDIO_KEYS, 'audio');
    assertRequiredKeys(audio, V1_AUDIO_KEYS, 'audio');
    // `objectUrl` was a runtime value that leaked into the schema. It is read
    // only to be discarded; it never becomes part of a version-2 project.
    sourceHint = readSourceHintFields(audio, 'audio', null);
  }

  const exportValue = readObject(document.export, 'export');
  assertKnownKeys(exportValue, V1_EXPORT_KEYS, 'export');
  assertRequiredKeys(exportValue, V1_EXPORT_KEYS, 'export');
  const exportCore = readExportCore(exportValue, 'export');
  const aspectRatio = aspectRatioOf(exportCore);
  if (aspectRatio === null) fail('invalid_value', 'export');

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: readString(document.id, PROJECT_LIMITS.maxIdLength, 'id'),
    name: readString(document.name, PROJECT_LIMITS.maxNameLength, 'name'),
    artistName: null,
    createdAt: readTimestamp(document.createdAt, 'createdAt'),
    updatedAt: readTimestamp(document.updatedAt, 'updatedAt'),
    sourceHint,
    analysis: readAnalysis(document.analysis, 'analysis'),
    engine: readEngine(document.engine, 'engine', true),
    export: {
      ...exportCore,
      aspectRatio,
      endCardMode: 'aixel',
    },
  };
}

function readVersion2(document: Record<string, unknown>): VisualMelodyProject {
  assertKnownKeys(document, V2_KEYS, '');
  assertRequiredKeys(document, V2_KEYS, '');

  let sourceHint: ProjectSourceHint | null = null;
  if (document.sourceHint !== null && document.sourceHint !== undefined) {
    const hint = readObject(document.sourceHint, 'sourceHint');
    assertKnownKeys(hint, V2_SOURCE_HINT_KEYS, 'sourceHint');
    assertRequiredKeys(hint, V2_SOURCE_HINT_KEYS, 'sourceHint');
    sourceHint = readSourceHintFields(hint, 'sourceHint', hint.sha256);
  }

  const exportValue = readObject(document.export, 'export');
  assertKnownKeys(exportValue, V2_EXPORT_KEYS, 'export');
  assertRequiredKeys(exportValue, V2_EXPORT_KEYS, 'export');

  const exportCore = readExportCore(exportValue, 'export');
  const aspectRatio = readEnum<ProjectAspectRatio>(
    exportValue.aspectRatio,
    PROJECT_ASPECT_RATIOS,
    'export.aspectRatio',
  );
  if (aspectRatioOf(exportCore) !== aspectRatio) fail('invalid_value', 'export.aspectRatio');

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: readString(document.id, PROJECT_LIMITS.maxIdLength, 'id'),
    name: readString(document.name, PROJECT_LIMITS.maxNameLength, 'name'),
    artistName: readOptionalString(document.artistName, PROJECT_LIMITS.maxArtistNameLength, 'artistName'),
    createdAt: readTimestamp(document.createdAt, 'createdAt'),
    updatedAt: readTimestamp(document.updatedAt, 'updatedAt'),
    sourceHint,
    analysis: readAnalysis(document.analysis, 'analysis'),
    engine: readEngine(document.engine, 'engine'),
    export: {
      ...exportCore,
      aspectRatio,
      endCardMode: readEnum<ProjectEndCardMode>(
        exportValue.endCardMode,
        PROJECT_END_CARD_MODES,
        'export.endCardMode',
      ),
    },
  };
}

const READERS: Record<number, (document: Record<string, unknown>) => VisualMelodyProject> = {
  1: readVersion1,
  2: readVersion2,
};

/**
 * Validates and migrates an already-decoded document to the current schema.
 * Deterministic: the same input always produces the same project.
 */
export function migrateProjectDocument(value: unknown): VisualMelodyProject {
  assertSafeDocument(value);
  const document = readObject(value, '');
  const version = document.schemaVersion;
  if (
    typeof version !== 'number' ||
    !(SUPPORTED_PROJECT_SCHEMA_VERSIONS as readonly number[]).includes(version)
  ) {
    fail('unsupported_version', 'schemaVersion');
  }
  return READERS[version as number](document);
}

export function assertWithinSerializedLimit(serialized: string) {
  const bytes = new TextEncoder().encode(serialized).length;
  if (bytes > PROJECT_LIMITS.maxSerializedBytes) fail('too_large', '');
}
