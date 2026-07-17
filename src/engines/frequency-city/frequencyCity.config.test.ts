import { describe, expect, it } from 'vitest';
import { validateFrequencyCityConfig } from './frequencyCity.config';

describe('validateFrequencyCityConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateFrequencyCityConfig({ pulseSpeed: 5, energyResponse: -1, buildingCount: 100, cyanAccent: 'cyan' });
    expect(config.pulseSpeed).toBe(1);
    expect(config.energyResponse).toBe(0);
    expect(config.buildingCount).toBe(36);
    expect(config.cyanAccent).toBe('#5fd0ff');
  });
});
