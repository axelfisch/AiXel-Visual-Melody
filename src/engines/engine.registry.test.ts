import { describe, expect, it } from 'vitest';
import { getEngine, getEngineOrDefault, listEngines } from './engine.registry';

describe('engine registry', () => {
  it('exposes Minimal Album Art and Cosmic Waves as implemented engines', () => {
    expect(getEngine('minimal-album-art').availability).toBe('implemented');
    expect(getEngine('cosmic-waves').availability).toBe('implemented');
    expect(listEngines()).toHaveLength(2);
  });

  it('rejects unknown engine identifiers', () => {
    expect(() => getEngine('jazz-geometry')).toThrow(/inconnu/i);
    expect(getEngineOrDefault('jazz-geometry').id).toBe('minimal-album-art');
  });
});
