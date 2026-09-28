import { describe, expect, it } from 'vitest';
import { particleSphereDefaultConfig, validateParticleSphereConfig } from './particleSphere.config';

describe('Particle Sphere config', () => {
  it('returns safe defaults for invalid input', () => {
    expect(validateParticleSphereConfig(null)).toEqual(particleSphereDefaultConfig);
  });

  it('clamps performance-sensitive values', () => {
    expect(validateParticleSphereConfig({ particleDensity: 4, orbitSpeed: -2 })).toMatchObject({
      particleDensity: 1,
      orbitSpeed: 0.05,
    });
  });
});
