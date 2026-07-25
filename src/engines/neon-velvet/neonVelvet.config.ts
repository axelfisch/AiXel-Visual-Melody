import type { EngineParameterDefinition } from '../engine.types';
import type { NeonVelvetConfig } from './neonVelvet.types';

export const neonVelvetDefaultConfig: NeonVelvetConfig = {
  trailSpeed: 0.34,
  energyResponse: 1.18,
  trailCount: 8,
  glowIntensity: 1,
  spaceScale: 1,
  colorSaturation: 1,
  sparkleDensity: 0.6,
  warmth: 0,
  cyanAccent: '#5fd0ff',
  violetAccent: '#8a6bff',
  magentaAccent: '#e750b4',
  showTitle: true,
};

export const neonVelvetParameters: EngineParameterDefinition[] = [
  { id: 'trailSpeed', label: 'Trail speed', type: 'number', defaultValue: 0.34, min: 0, max: 1, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1.18, min: 0, max: 2, step: 0.05 },
  { id: 'trailCount', label: 'Light trails', type: 'number', defaultValue: 8, min: 5, max: 12, step: 1 },
  { id: 'glowIntensity', label: 'Glow', type: 'number', defaultValue: 1, min: 0.5, max: 1.8, step: 0.05 },
  { id: 'spaceScale', label: 'Spatial scale', type: 'number', defaultValue: 1, min: 0.8, max: 1.3, step: 0.02 },
  { id: 'colorSaturation', label: 'Color saturation', type: 'number', defaultValue: 1, min: 0.4, max: 1.6, step: 0.05 },
  { id: 'sparkleDensity', label: 'Ambient sparkle', type: 'number', defaultValue: 0.6, min: 0, max: 1.6, step: 0.05 },
  { id: 'warmth', label: 'Warmth', type: 'number', defaultValue: 0, min: -1, max: 1, step: 0.05 },
  { id: 'cyanAccent', label: 'Cyan accent', type: 'color', defaultValue: '#5fd0ff' },
  { id: 'violetAccent', label: 'Violet accent', type: 'color', defaultValue: '#8a6bff' },
  { id: 'magentaAccent', label: 'Magenta accent', type: 'color', defaultValue: '#e750b4' },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function validateNeonVelvetConfig(value: unknown): NeonVelvetConfig {
  const config = value && typeof value === 'object' ? value as Partial<NeonVelvetConfig> : {};
  return {
    trailSpeed: numberInRange(config.trailSpeed, neonVelvetDefaultConfig.trailSpeed, 0, 1),
    energyResponse: numberInRange(config.energyResponse, neonVelvetDefaultConfig.energyResponse, 0, 2),
    trailCount: Math.round(numberInRange(config.trailCount, neonVelvetDefaultConfig.trailCount, 5, 12)),
    glowIntensity: numberInRange(config.glowIntensity, neonVelvetDefaultConfig.glowIntensity, 0.5, 1.8),
    spaceScale: numberInRange(config.spaceScale, neonVelvetDefaultConfig.spaceScale, 0.8, 1.3),
    colorSaturation: numberInRange(config.colorSaturation, neonVelvetDefaultConfig.colorSaturation, 0.4, 1.6),
    sparkleDensity: numberInRange(config.sparkleDensity, neonVelvetDefaultConfig.sparkleDensity, 0, 1.6),
    warmth: numberInRange(config.warmth, neonVelvetDefaultConfig.warmth, -1, 1),
    cyanAccent: color(config.cyanAccent, neonVelvetDefaultConfig.cyanAccent),
    violetAccent: color(config.violetAccent, neonVelvetDefaultConfig.violetAccent),
    magentaAccent: color(config.magentaAccent, neonVelvetDefaultConfig.magentaAccent),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : neonVelvetDefaultConfig.showTitle,
  };
}
