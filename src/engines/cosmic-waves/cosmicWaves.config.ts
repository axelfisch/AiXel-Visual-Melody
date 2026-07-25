import type { EngineParameterDefinition } from '../engine.types';
import type { CosmicWavesConfig } from './cosmicWaves.types';

export const cosmicWavesDefaultConfig: CosmicWavesConfig = {
  waveSpeed: 0.32,
  energyResponse: 1.15,
  particleDensity: 0.72,
  glowIntensity: 1,
  spaceScale: 1,
  colorSaturation: 1,
  sparkleDensity: 0.6,
  warmth: 0,
  cyanAccent: '#7fe0ff',
  violetAccent: '#8a6bff',
  showTitle: true,
};

export const cosmicWavesParameters: EngineParameterDefinition[] = [
  { id: 'waveSpeed', label: 'Wave speed', type: 'number', defaultValue: 0.32, min: 0, max: 1, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1.15, min: 0, max: 2, step: 0.05 },
  { id: 'particleDensity', label: 'Particle density', type: 'number', defaultValue: 0.72, min: 0.2, max: 1, step: 0.05 },
  { id: 'glowIntensity', label: 'Glow', type: 'number', defaultValue: 1, min: 0.5, max: 1.8, step: 0.05 },
  { id: 'spaceScale', label: 'Spatial scale', type: 'number', defaultValue: 1, min: 0.8, max: 1.3, step: 0.02 },
  { id: 'colorSaturation', label: 'Color saturation', type: 'number', defaultValue: 1, min: 0.4, max: 1.6, step: 0.05 },
  { id: 'sparkleDensity', label: 'Ambient sparkle', type: 'number', defaultValue: 0.6, min: 0, max: 1.6, step: 0.05 },
  { id: 'warmth', label: 'Warmth', type: 'number', defaultValue: 0, min: -1, max: 1, step: 0.05 },
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
    glowIntensity: numberInRange(config.glowIntensity, cosmicWavesDefaultConfig.glowIntensity, 0.5, 1.8),
    spaceScale: numberInRange(config.spaceScale, cosmicWavesDefaultConfig.spaceScale, 0.8, 1.3),
    colorSaturation: numberInRange(config.colorSaturation, cosmicWavesDefaultConfig.colorSaturation, 0.4, 1.6),
    sparkleDensity: numberInRange(config.sparkleDensity, cosmicWavesDefaultConfig.sparkleDensity, 0, 1.6),
    warmth: numberInRange(config.warmth, cosmicWavesDefaultConfig.warmth, -1, 1),
    cyanAccent: color(config.cyanAccent, cosmicWavesDefaultConfig.cyanAccent),
    violetAccent: color(config.violetAccent, cosmicWavesDefaultConfig.violetAccent),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : cosmicWavesDefaultConfig.showTitle,
  };
}
