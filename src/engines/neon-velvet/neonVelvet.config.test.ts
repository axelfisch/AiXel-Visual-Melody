import { describe, expect, it } from 'vitest';
import { validateNeonVelvetConfig } from './neonVelvet.config';

describe('validateNeonVelvetConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateNeonVelvetConfig({
      trailSpeed: 4, energyResponse: -1, trailCount: 30, violetAccent: 'violet',
      glowIntensity: -9, spaceScale: 0.1, colorSaturation: 0.01, sparkleDensity: 9, warmth: -9,
    });
    expect(config.trailSpeed).toBe(1);
    expect(config.energyResponse).toBe(0);
    expect(config.trailCount).toBe(12);
    expect(config.violetAccent).toBe('#8a6bff');
    expect(config.glowIntensity).toBe(0.5);
    expect(config.spaceScale).toBe(0.8);
    expect(config.colorSaturation).toBe(0.4);
    expect(config.sparkleDensity).toBe(1.6);
    expect(config.warmth).toBe(-1);
  });
});
