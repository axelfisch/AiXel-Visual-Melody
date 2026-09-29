import type { DirectorMood, DirectorState } from '../director/director.types';
import type { ExportPresetId } from '../export/formats';
import type { ProjectToolId } from '../tools/tool.types';

export type ProjectId = string;
export type ProjectSchemaVersion = 1;

export type ProjectAudio = {
  fileName: string;
  mimeType: string;
  size: number;
  duration: number;
  objectUrl: string | null;
};

/** Uploaded still image used by Image Pulse (kept at project level so it survives tool switches). */
export type ProjectImage = {
  fileName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  objectUrl: string | null;
};

/** Lyrics pasted for Lyric Canvas (kept at project level so they survive tool switches). */
export type ProjectLyrics = {
  /** Plain lines (blank line = section break) or LRC `[mm:ss.xx]` timestamps. */
  text: string;
  /** Global timing nudge in seconds (positive = later). */
  offset: number;
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

/** AiXel Creator palette colors shared across tools (primary + accent). */
export type ProjectCreator = {
  primaryColor: string;
  accentColor: string;
};

export type ExportSettings = {
  format: 'mp4';
  presetId: ExportPresetId;
  width: number;
  height: number;
  frameRate: number;
  videoBitRate: number;
  watermark: boolean;
};

export type VisualMelodyProject = {
  schemaVersion: ProjectSchemaVersion;
  id: ProjectId;
  name: string;
  createdAt: string;
  updatedAt: string;
  audio: ProjectAudio | null;
  analysis: ProjectAnalysis | null;
  /** Image uploaded for Image Pulse; `null` renders the procedural placeholder. */
  image: ProjectImage | null;
  /** Lyrics used by Lyric Canvas; empty text renders the placeholder title card. */
  lyrics: ProjectLyrics;
  /** Active creative tool. Defaults to classic visual engines. */
  tool: ProjectToolId;
  engine: EngineSelection;
  creator: ProjectCreator;
  export: ExportSettings;
};

export type ProjectRuntime = {
  sourceFile: File | null;
  decodedAudio: AudioBuffer | null;
};
