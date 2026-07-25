import { describe, expect, it } from 'vitest';
import { validateLiquidColorsConfig } from './liquidColors.config';

describe('validateLiquidColorsConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateLiquidColorsConfig({
      flowSpeed: 4, energyResponse: -1, inkDensity: 8, orangeAccent: 'orange',
      glowIntensity: -9, spaceScale: 0.1, colorSaturation: 0.01, sparkleDensity: 9, warmth: -9,
    });
    expect(config.flowSpeed).toBe(0.8);
    expect(config.energyResponse).toBe(0);
    expect(config.inkDensity).toBe(1);
    expect(config.orangeAccent).toBe('#e08a4a');
    expect(config.glowIntensity).toBe(0.5);
    expect(config.spaceScale).toBe(0.8);
    expect(config.colorSaturation).toBe(0.4);
    expect(config.sparkleDensity).toBe(1.6);
    expect(config.warmth).toBe(-1);
  });
});
