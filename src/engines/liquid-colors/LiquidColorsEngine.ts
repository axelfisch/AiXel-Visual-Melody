import type { VisualEngine } from '../engine.types';
import { liquidColorsDefaultConfig, liquidColorsParameters, validateLiquidColorsConfig } from './liquidColors.config';
import { renderLiquidColors } from './liquidColors.renderer';
import type { LiquidColorsConfig } from './liquidColors.types';

export const LiquidColorsEngine: VisualEngine<LiquidColorsConfig> = {
  id: 'liquid-colors',
  name: 'Liquid Colors',
  description: 'Warm organic ink fields, fluid gradients and slow chromatic folding.',
  availability: 'implemented',
  defaultConfig: liquidColorsDefaultConfig,
  parameters: liquidColorsParameters,
  validateConfig: validateLiquidColorsConfig,
  render: renderLiquidColors,
};
