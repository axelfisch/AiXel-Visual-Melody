import type { EngineParameterDefinition } from '../engine.types';
import type { LiquidColorsConfig } from './liquidColors.types';

export const liquidColorsDefaultConfig: LiquidColorsConfig = {
  flowSpeed: 0.18,
  energyResponse: 1.2,
  inkDensity: 0.78,
  orangeAccent: '#e08a4a',
  magentaAccent: '#a24fc9',
  indigoAccent: '#344f9d',
  showTitle: true,
};

export const liquidColorsParameters: EngineParameterDefinition[] = [
  { id: 'flowSpeed', label: 'Liquid flow', type: 'number', defaultValue: 0.18, min: 0, max: 0.8, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1.2, min: 0, max: 2, step: 0.05 },
  { id: 'inkDensity', label: 'Ink density', type: 'number', defaultValue: 0.78, min: 0.2, max: 1, step: 0.05 },
  { id: 'orangeAccent', label: 'Warm accent', type: 'color', defaultValue: '#e08a4a' },
  { id: 'magentaAccent', label: 'Magenta accent', type: 'color', defaultValue: '#a24fc9' },
  { id: 'indigoAccent', label: 'Indigo accent', type: 'color', defaultValue: '#344f9d' },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function validateLiquidColorsConfig(value: unknown): LiquidColorsConfig {
  const config = value && typeof value === 'object' ? value as Partial<LiquidColorsConfig> : {};
  return {
    flowSpeed: numberInRange(config.flowSpeed, liquidColorsDefaultConfig.flowSpeed, 0, 0.8),
    energyResponse: numberInRange(config.energyResponse, liquidColorsDefaultConfig.energyResponse, 0, 2),
    inkDensity: numberInRange(config.inkDensity, liquidColorsDefaultConfig.inkDensity, 0.2, 1),
    orangeAccent: color(config.orangeAccent, liquidColorsDefaultConfig.orangeAccent),
    magentaAccent: color(config.magentaAccent, liquidColorsDefaultConfig.magentaAccent),
    indigoAccent: color(config.indigoAccent, liquidColorsDefaultConfig.indigoAccent),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : liquidColorsDefaultConfig.showTitle,
  };
}
