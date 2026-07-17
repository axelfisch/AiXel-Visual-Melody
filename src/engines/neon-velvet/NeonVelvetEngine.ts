import type { VisualEngine } from '../engine.types';
import { neonVelvetDefaultConfig, neonVelvetParameters, validateNeonVelvetConfig } from './neonVelvet.config';
import { renderNeonVelvet } from './neonVelvet.renderer';
import type { NeonVelvetConfig } from './neonVelvet.types';

export const NeonVelvetEngine: VisualEngine<NeonVelvetConfig> = {
  id: 'neon-velvet',
  name: 'Neon Velvet',
  description: 'Glamorous synthwave light trails flowing across deep purple velvet.',
  availability: 'implemented',
  defaultConfig: neonVelvetDefaultConfig,
  parameters: neonVelvetParameters,
  validateConfig: validateNeonVelvetConfig,
  render: renderNeonVelvet,
};
