import type { DirectorMood, DirectorState } from '../director/director.types';

export type ProjectId = string;

/**
 * Every schema version AiXel can still read. `parseProject` migrates any of them
 * forward to `CURRENT_PROJECT_SCHEMA_VERSION`; anything else is rejected.
 */
export const SUPPORTED_PROJECT_SCHEMA_VERSIONS = [1, 2] as const;
export type SupportedProjectSchemaVersion = (typeof SUPPORTED_PROJECT_SCHEMA_VERSIONS)[number];
export type ProjectSchemaVersion = 2;

export const PROJECT_ASPECT_RATIOS = ['16:9', '9:16', '1:1'] as const;
export type ProjectAspectRatio = (typeof PROJECT_ASPECT_RATIOS)[number];

/**
 * `aixel` is the mandatory Free branding. `artist` and `clean` are Creator Pro
 * output modes: a project may carry them at any time, but rendering them is
 * authorized by the capability model, never by the stored value.
 */
export const PROJECT_END_CARD_MODES = ['aixel', 'artist', 'clean'] as const;
export type ProjectEndCardMode = (typeof PROJECT_END_CARD_MODES)[number];

/**
 * Safe re-selection metadata for the local source file. It intentionally cannot
 * describe *where* the audio is: no object URL, no remote location, no bytes.
 */
export type ProjectSourceHint = {
  fileName: string;
  mimeType: string;
  size: number;
  duration: number;
  sha256: string | null;
};

export type ProjectAnalysis = {
  sampleRate: number;
  bpm: number;
  peak: number;
  averageEnergy: number;
  waveform: number[];
  energy: number[];
};

export type EngineParameterValue = number | string | boolean;

export type EngineSelection = {
  engineId: string;
  presetId: string | null;
  parameters: Record<string, EngineParameterValue>;
  director: {
    mood: DirectorMood | null;
    values: DirectorState;
  };
};

export type ExportSettings = {
  format: 'mp4';
  width: number;
  height: number;
  frameRate: number;
  videoBitRate: number;
  aspectRatio: ProjectAspectRatio;
  endCardMode: ProjectEndCardMode;
};

export type VisualMelodyProject = {
  schemaVersion: ProjectSchemaVersion;
  id: ProjectId;
  name: string;
  artistName: string | null;
  createdAt: string;
  updatedAt: string;
  sourceHint: ProjectSourceHint | null;
  analysis: ProjectAnalysis | null;
  engine: EngineSelection;
  export: ExportSettings;
};

/**
 * Runtime-only companions of the active project. None of these values is ever
 * serialized, persisted, or sent anywhere.
 */
export type ProjectRuntime = {
  sourceFile: File | null;
  decodedAudio: AudioBuffer | null;
  objectUrl: string | null;
};
