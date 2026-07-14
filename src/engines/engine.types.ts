export type EngineAvailability = 'implemented' | 'prototype' | 'disabled';

export type EngineFrame = {
  time: number;
  duration: number;
  progress: number;
  energy: number;
  bpm: number;
  title?: string;
};

export type RenderSurface = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  pixelRatio: number;
};

export type EngineParameterDefinition = {
  id: string;
  label: string;
  type: 'number' | 'color' | 'boolean' | 'select';
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
};

export interface VisualEngine<TConfig extends object = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  availability: EngineAvailability;
  defaultConfig: TConfig;
  parameters: EngineParameterDefinition[];
  validateConfig(config: unknown): TConfig;
  render(surface: RenderSurface, frame: EngineFrame, config: TConfig): void;
}
