import type { EngineParameterDefinition } from '../engine.types';
import type { JazzGeometryConfig } from './jazzGeometry.types';

export const jazzGeometryDefaultConfig: JazzGeometryConfig = {
  rotationSpeed: 0.16,
  energyResponse: 1.12,
  ringCount: 10,
  goldAccent: '#e7c977',
  iceAccent: '#d9e8ff',
  showTitle: true,
};

export const jazzGeometryParameters: EngineParameterDefinition[] = [
  { id: 'rotationSpeed', label: 'Rotation', type: 'number', defaultValue: 0.16, min: 0, max: 0.8, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1.12, min: 0, max: 2, step: 0.05 },
  { id: 'ringCount', label: 'Harmonic rings', type: 'number', defaultValue: 10, min: 6, max: 16, step: 1 },
  { id: 'goldAccent', label: 'Gold accent', type: 'color', defaultValue: '#e7c977' },
  { id: 'iceAccent', label: 'Ice accent', type: 'color', defaultValue: '#d9e8ff' },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function validateJazzGeometryConfig(value: unknown): JazzGeometryConfig {
  const config = value && typeof value === 'object' ? value as Partial<JazzGeometryConfig> : {};
  return {
    rotationSpeed: numberInRange(config.rotationSpeed, jazzGeometryDefaultConfig.rotationSpeed, 0, 0.8),
    energyResponse: numberInRange(config.energyResponse, jazzGeometryDefaultConfig.energyResponse, 0, 2),
    ringCount: Math.round(numberInRange(config.ringCount, jazzGeometryDefaultConfig.ringCount, 6, 16)),
    goldAccent: color(config.goldAccent, jazzGeometryDefaultConfig.goldAccent),
    iceAccent: color(config.iceAccent, jazzGeometryDefaultConfig.iceAccent),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : jazzGeometryDefaultConfig.showTitle,
  };
}
