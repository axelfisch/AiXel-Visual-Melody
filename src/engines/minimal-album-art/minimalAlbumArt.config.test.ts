import { describe, expect, it } from 'vitest';
import { validateMinimalAlbumArtConfig } from './minimalAlbumArt.config';

describe('Minimal Album Art config', () => {
  it('clamps numeric values and restores invalid colors', () => {
    const config = validateMinimalAlbumArtConfig({ rotationSpeed: 8, energyResponse: -1, accentColor: 'gold' });
    expect(config.rotationSpeed).toBe(1);
    expect(config.energyResponse).toBe(0);
    expect(config.accentColor).toBe('#e7c977');
  });
});
