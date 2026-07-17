import type { EngineParameterDefinition } from '../engine.types';
import type { FrequencyCityConfig } from './frequencyCity.types';

export const frequencyCityDefaultConfig: FrequencyCityConfig = {
  pulseSpeed: 0.42,
  energyResponse: 1.22,
  buildingCount: 24,
  magentaAccent: '#e750b4',
  cyanAccent: '#5fd0ff',
  violetAccent: '#8a6bff',
  showTitle: true,
};

export const frequencyCityParameters: EngineParameterDefinition[] = [
  { id: 'pulseSpeed', label: 'City pulse', type: 'number', defaultValue: 0.42, min: 0, max: 1, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1.22, min: 0, max: 2, step: 0.05 },
  { id: 'buildingCount', label: 'Building count', type: 'number', defaultValue: 24, min: 12, max: 36, step: 1 },
  { id: 'magentaAccent', label: 'Magenta accent', type: 'color', defaultValue: '#e750b4' },
  { id: 'cyanAccent', label: 'Cyan accent', type: 'color', defaultValue: '#5fd0ff' },
  { id: 'violetAccent', label: 'Violet accent', type: 'color', defaultValue: '#8a6bff' },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function validateFrequencyCityConfig(value: unknown): FrequencyCityConfig {
  const config = value && typeof value === 'object' ? value as Partial<FrequencyCityConfig> : {};
  return {
    pulseSpeed: numberInRange(config.pulseSpeed, frequencyCityDefaultConfig.pulseSpeed, 0, 1),
    energyResponse: numberInRange(config.energyResponse, frequencyCityDefaultConfig.energyResponse, 0, 2),
    buildingCount: Math.round(numberInRange(config.buildingCount, frequencyCityDefaultConfig.buildingCount, 12, 36)),
    magentaAccent: color(config.magentaAccent, frequencyCityDefaultConfig.magentaAccent),
    cyanAccent: color(config.cyanAccent, frequencyCityDefaultConfig.cyanAccent),
    violetAccent: color(config.violetAccent, frequencyCityDefaultConfig.violetAccent),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : frequencyCityDefaultConfig.showTitle,
  };
}
