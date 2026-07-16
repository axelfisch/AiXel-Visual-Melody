import type { EngineParameterDefinition } from '../engine.types';
import type { CosmicWavesConfig } from './cosmicWaves.types';

export const cosmicWavesDefaultConfig: CosmicWavesConfig = {
  waveSpeed: 0.32,
  energyResponse: 1.15,
  particleDensity: 0.72,
  cyanAccent: '#7fe0ff',
  violetAccent: '#8a6bff',
  showTitle: true,
};

export const cosmicWavesParameters: EngineParameterDefinition[] = [
  { id: 'waveSpeed', label: 'Wave speed', type: 'number', defaultValue: 0.32, min: 0, max: 1, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1.15, min: 0, max: 2, step: 0.05 },
  { id: 'particleDensity', label: 'Particle density', type: 'number', defaultValue: 0.72, min: 0.2, max: 1, step: 0.05 },
  { id: 'cyanAccent', label: 'Cyan accent', type: 'color', defaultValue: '#7fe0ff' },
  { id: 'violetAccent', label: 'Violet accent', type: 'color', defaultValue: '#8a6bff' },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function validateCosmicWavesConfig(value: unknown): CosmicWavesConfig {
  const config = value && typeof value === 'object' ? value as Partial<CosmicWavesConfig> : {};
  return {
    waveSpeed: numberInRange(config.waveSpeed, cosmicWavesDefaultConfig.waveSpeed, 0, 1),
    energyResponse: numberInRange(config.energyResponse, cosmicWavesDefaultConfig.energyResponse, 0, 2),
    particleDensity: numberInRange(config.particleDensity, cosmicWavesDefaultConfig.particleDensity, 0.2, 1),
    cyanAccent: color(config.cyanAccent, cosmicWavesDefaultConfig.cyanAccent),
    violetAccent: color(config.violetAccent, cosmicWavesDefaultConfig.violetAccent),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : cosmicWavesDefaultConfig.showTitle,
  };
}
