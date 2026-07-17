import { describe, expect, it } from 'vitest';
import { getEngine, getEngineOrDefault, listEngines } from './engine.registry';

describe('engine registry', () => {
  it('exposes the five implemented engines', () => {
    expect(getEngine('minimal-album-art').availability).toBe('implemented');
    expect(getEngine('cosmic-waves').availability).toBe('implemented');
    expect(getEngine('jazz-geometry').availability).toBe('implemented');
    expect(getEngine('liquid-colors').availability).toBe('implemented');
    expect(getEngine('frequency-city').availability).toBe('implemented');
    expect(listEngines()).toHaveLength(5);
  });

  it('rejects unknown engine identifiers', () => {
    expect(() => getEngine('neon-velvet')).toThrow(/inconnu/i);
    expect(getEngineOrDefault('neon-velvet').id).toBe('minimal-album-art');
  });
});
