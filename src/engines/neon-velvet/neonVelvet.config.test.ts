import { describe, expect, it } from 'vitest';
import { validateNeonVelvetConfig } from './neonVelvet.config';

describe('validateNeonVelvetConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateNeonVelvetConfig({ trailSpeed: 4, energyResponse: -1, trailCount: 30, violetAccent: 'violet' });
    expect(config.trailSpeed).toBe(1);
    expect(config.energyResponse).toBe(0);
    expect(config.trailCount).toBe(12);
    expect(config.violetAccent).toBe('#8a6bff');
  });
});
