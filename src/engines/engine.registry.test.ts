import { describe, expect, it } from 'vitest';
import { getEngine, listEngines } from './engine.registry';

describe('engine registry', () => {
  it('exposes Minimal Album Art as the implemented engine', () => {
    expect(getEngine('minimal-album-art').availability).toBe('implemented');
    expect(listEngines()).toHaveLength(1);
  });

  it('rejects unknown engine identifiers', () => {
    expect(() => getEngine('cosmic-waves')).toThrow(/inconnu/i);
  });
});
