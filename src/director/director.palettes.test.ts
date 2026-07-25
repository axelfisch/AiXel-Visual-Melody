import { describe, expect, it } from 'vitest';
import { directorPalettes } from './director.palettes';

describe('AiXel Director color palettes', () => {
  it('provides five distinct five-color palettes', () => {
    expect(directorPalettes).toHaveLength(5);
    directorPalettes.forEach((palette) => {
      expect(palette.colors).toHaveLength(5);
      palette.colors.forEach((color) => expect(color).toMatch(/^#[0-9a-f]{6}$/i));
    });
    const ids = directorPalettes.map((palette) => palette.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
