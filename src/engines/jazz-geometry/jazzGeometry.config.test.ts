import { describe, expect, it } from 'vitest';
import { validateJazzGeometryConfig } from './jazzGeometry.config';

describe('validateJazzGeometryConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateJazzGeometryConfig({ rotationSpeed: 4, energyResponse: -1, ringCount: 30, goldAccent: 'gold' });
    expect(config.rotationSpeed).toBe(0.8);
    expect(config.energyResponse).toBe(0);
    expect(config.ringCount).toBe(16);
    expect(config.goldAccent).toBe('#e7c977');
  });
});
