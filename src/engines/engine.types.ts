export type EngineAvailability = 'implemented' | 'prototype' | 'disabled';

export type EngineFrame = {
  time: number;
  duration: number;
  progress: number;
  energy: number;
  bpm: number;
  /** Transient strength 0..1 derived from the energy timeline (see `onsetAt`). Optional for legacy callers. */
  onset?: number;
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
  /**
   * Optional async preparation (e.g. decoding an uploaded image) awaited by Export
   * before the first frame and by Preview before re-rendering, so both draw the same pixels.
   */
  prepare?(config: TConfig): Promise<void>;
}
