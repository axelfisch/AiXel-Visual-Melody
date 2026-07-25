import { describe, expect, it } from 'vitest';
import { particleOrbDefaultConfig, validateParticleOrbConfig } from './particleOrb.config';

describe('Particle Orb config', () => {
  it('returns safe defaults for invalid input', () => {
    expect(validateParticleOrbConfig(null)).toEqual(particleOrbDefaultConfig);
  });

  it('clamps performance-sensitive values', () => {
    expect(validateParticleOrbConfig({ particleCount: 4, orbitSpeed: -2 })).toMatchObject({
      particleCount: 1,
      orbitSpeed: 0.05,
    });
  });
});
