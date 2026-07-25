import { describe, expect, it } from 'vitest';
import { validateFrequencyCityConfig } from './frequencyCity.config';

describe('validateFrequencyCityConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateFrequencyCityConfig({
      pulseSpeed: 5, energyResponse: -1, buildingCount: 100, cyanAccent: 'cyan',
      glowIntensity: -9, spaceScale: 0.1, colorSaturation: 0.01, sparkleDensity: 9, warmth: -9,
    });
    expect(config.pulseSpeed).toBe(1);
    expect(config.energyResponse).toBe(0);
    expect(config.buildingCount).toBe(36);
    expect(config.cyanAccent).toBe('#5fd0ff');
    expect(config.glowIntensity).toBe(0.5);
    expect(config.spaceScale).toBe(0.8);
    expect(config.colorSaturation).toBe(0.4);
    expect(config.sparkleDensity).toBe(1.6);
    expect(config.warmth).toBe(-1);
  });
});
