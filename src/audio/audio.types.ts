import type { ProjectAnalysis } from '../project/project.types';

export type AudioAnalysis = ProjectAnalysis & {
  name: string;
  duration: number;
  buffer: AudioBuffer;
};

export type AnalyzeAudioResult = {
  name: string;
  duration: number;
  analysis: ProjectAnalysis;
  decodedAudio: AudioBuffer;
};
