import { describe, expect, it } from 'vitest';
import { validateCosmicWavesConfig } from './cosmicWaves.config';

describe('validateCosmicWavesConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateCosmicWavesConfig({ waveSpeed: 8, energyResponse: -1, particleDensity: 0, cyanAccent: 'blue' });
    expect(config.waveSpeed).toBe(1);
    expect(config.energyResponse).toBe(0);
    expect(config.particleDensity).toBe(0.2);
    expect(config.cyanAccent).toBe('#7fe0ff');
  });
});
