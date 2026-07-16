import type { VisualEngine } from '../engine.types';
import { cosmicWavesDefaultConfig, cosmicWavesParameters, validateCosmicWavesConfig } from './cosmicWaves.config';
import { renderCosmicWaves } from './cosmicWaves.renderer';
import type { CosmicWavesConfig } from './cosmicWaves.types';

export const CosmicWavesEngine: VisualEngine<CosmicWavesConfig> = {
  id: 'cosmic-waves',
  name: 'Cosmic Waves',
  description: 'Breathing nebulas, deterministic starlight and luminous audio-reactive waves.',
  availability: 'implemented',
  defaultConfig: cosmicWavesDefaultConfig,
  parameters: cosmicWavesParameters,
  validateConfig: validateCosmicWavesConfig,
  render: renderCosmicWaves,
};
