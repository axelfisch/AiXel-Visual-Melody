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
};

export type ExportSettings = {
  format: 'mp4';
  width: number;
  height: number;
  frameRate: number;
  videoBitRate: number;
};

export type VisualMelodyProject = {
  schemaVersion: ProjectSchemaVersion;
  id: ProjectId;
  name: string;
  createdAt: string;
  updatedAt: string;
  audio: ProjectAudio | null;
  analysis: ProjectAnalysis | null;
  engine: EngineSelection;
  export: ExportSettings;
};

export type ProjectRuntime = {
  sourceFile: File | null;
  decodedAudio: AudioBuffer | null;
};
