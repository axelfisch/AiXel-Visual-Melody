import type { VisualEngine } from '../engine.types';
import { particleOrbDefaultConfig, particleOrbParameters, validateParticleOrbConfig } from './particleOrb.config';
import { renderParticleOrb } from './particleOrb.renderer';
import type { ParticleOrbConfig } from './particleOrb.types';

export const ParticleOrbEngine: VisualEngine<ParticleOrbConfig> = {
  id: 'particle-orb',
  name: 'Particle Orb Special',
  description: 'A luminous 3D particle sphere with an audio-reactive translucent shell.',
  availability: 'prototype',
  defaultConfig: particleOrbDefaultConfig,
  parameters: particleOrbParameters,
  validateConfig: validateParticleOrbConfig,
  render: renderParticleOrb,
};
