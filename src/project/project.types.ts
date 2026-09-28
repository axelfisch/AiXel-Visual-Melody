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
