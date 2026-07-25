import { describe, expect, it } from 'vitest';
import { validateCosmicWavesConfig } from './cosmicWaves.config';

describe('validateCosmicWavesConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateCosmicWavesConfig({
      waveSpeed: 8, energyResponse: -1, particleDensity: 0, cyanAccent: 'blue',
      glowIntensity: 9, spaceScale: 9, colorSaturation: 9, sparkleDensity: -9, warmth: 9,
    });
    expect(config.waveSpeed).toBe(1);
    expect(config.energyResponse).toBe(0);
    expect(config.particleDensity).toBe(0.2);
    expect(config.cyanAccent).toBe('#7fe0ff');
    expect(config.glowIntensity).toBe(1.8);
    expect(config.spaceScale).toBe(1.3);
    expect(config.colorSaturation).toBe(1.6);
    expect(config.sparkleDensity).toBe(0);
    expect(config.warmth).toBe(1);
  });
});
