import { describe, expect, it } from 'vitest';
import { validateJazzGeometryConfig } from './jazzGeometry.config';

describe('validateJazzGeometryConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateJazzGeometryConfig({
      rotationSpeed: 4, energyResponse: -1, ringCount: 30, goldAccent: 'gold',
      glowIntensity: 9, spaceScale: 9, colorSaturation: 9, sparkleDensity: -9, warmth: 9,
    });
    expect(config.rotationSpeed).toBe(0.8);
    expect(config.energyResponse).toBe(0);
    expect(config.ringCount).toBe(16);
    expect(config.goldAccent).toBe('#e7c977');
    expect(config.glowIntensity).toBe(1.8);
    expect(config.spaceScale).toBe(1.3);
    expect(config.colorSaturation).toBe(1.6);
    expect(config.sparkleDensity).toBe(0);
    expect(config.warmth).toBe(1);
  });
});
