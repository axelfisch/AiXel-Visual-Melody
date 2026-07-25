import { describe, expect, it } from 'vitest';
import { adjustSaturation } from './engine.directorFx';

describe('adjustSaturation', () => {
  it('leaves a color unchanged at factor 1', () => {
    expect(adjustSaturation('#7fe0ff', 1)).toBe('#7fe0ff');
  });

  it('desaturates toward gray as the factor drops', () => {
    const original = '#ff0000';
    const desaturated = adjustSaturation(original, 0);
    expect(desaturated).toBe('#808080');
  });
});
