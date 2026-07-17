import { describe, expect, it } from 'vitest';
import { getEngine, getEngineOrDefault, listEngines } from './engine.registry';

describe('engine registry', () => {
  it('exposes the three implemented engines', () => {
    expect(getEngine('minimal-album-art').availability).toBe('implemented');
    expect(getEngine('cosmic-waves').availability).toBe('implemented');
    expect(getEngine('jazz-geometry').availability).toBe('implemented');
    expect(listEngines()).toHaveLength(3);
  });

  it('rejects unknown engine identifiers', () => {
    expect(() => getEngine('liquid-colors')).toThrow(/inconnu/i);
    expect(getEngineOrDefault('liquid-colors').id).toBe('minimal-album-art');
  });
});
