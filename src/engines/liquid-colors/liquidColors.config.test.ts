import { describe, expect, it } from 'vitest';
import { validateLiquidColorsConfig } from './liquidColors.config';

describe('validateLiquidColorsConfig', () => {
  it('clamps numeric parameters and rejects invalid colors', () => {
    const config = validateLiquidColorsConfig({ flowSpeed: 4, energyResponse: -1, inkDensity: 8, orangeAccent: 'orange' });
    expect(config.flowSpeed).toBe(0.8);
    expect(config.energyResponse).toBe(0);
    expect(config.inkDensity).toBe(1);
    expect(config.orangeAccent).toBe('#e08a4a');
  });
});
