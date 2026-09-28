import type { VisualEngine } from '../engine.types';
import { particleSphereDefaultConfig, particleSphereParameters, validateParticleSphereConfig } from './particleSphere.config';
import { renderParticleSphere } from './particleSphere.renderer';
import type { ParticleSphereConfig } from './particleSphere.types';

export const ParticleSphereEngine: VisualEngine<ParticleSphereConfig> = {
  id: 'particle-sphere',
  name: 'Particle Sphere',
  description: 'A luminous particle sphere with audio-reactive orbit ribbons and pulse.',
  availability: 'implemented',
  defaultConfig: particleSphereDefaultConfig,
  parameters: particleSphereParameters,
  validateConfig: validateParticleSphereConfig,
  render: renderParticleSphere,
};
