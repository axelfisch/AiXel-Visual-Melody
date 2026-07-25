import { describe, expect, it } from 'vitest';
import { validateMinimalAlbumArtConfig } from './minimalAlbumArt.config';

describe('Minimal Album Art config', () => {
  it('clamps numeric values and restores invalid colors', () => {
    const config = validateMinimalAlbumArtConfig({
      rotationSpeed: 8, energyResponse: -1, accentColor: 'gold', grooveDetail: 999,
      glowIntensity: 9, spaceScale: 9, colorSaturation: 9, sparkleDensity: -9, warmth: 9,
    });
    expect(config.rotationSpeed).toBe(1);
    expect(config.energyResponse).toBe(0);
    expect(config.accentColor).toBe('#e7c977');
    expect(config.grooveDetail).toBe(40);
    expect(config.glowIntensity).toBe(1.8);
    expect(config.spaceScale).toBe(1.3);
    expect(config.colorSaturation).toBe(1.6);
    expect(config.sparkleDensity).toBe(0);
    expect(config.warmth).toBe(1);
  });
});
