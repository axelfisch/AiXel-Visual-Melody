import { describe, expect, it } from 'vitest';
import { getEngine, getEngineOrDefault, listEngines } from './engine.registry';

describe('engine registry', () => {
  it('exposes six implemented engines and the Particle Orb prototype', () => {
    expect(getEngine('minimal-album-art').availability).toBe('implemented');
    expect(getEngine('cosmic-waves').availability).toBe('implemented');
    expect(getEngine('jazz-geometry').availability).toBe('implemented');
    expect(getEngine('liquid-colors').availability).toBe('implemented');
    expect(getEngine('frequency-city').availability).toBe('implemented');
    expect(getEngine('neon-velvet').availability).toBe('implemented');
    expect(getEngine('particle-orb').availability).toBe('prototype');
    expect(listEngines()).toHaveLength(7);
  });

  it('rejects unknown engine identifiers', () => {
    expect(() => getEngine('unknown-engine')).toThrow(/inconnu/i);
    expect(getEngineOrDefault('unknown-engine').id).toBe('minimal-album-art');
  });
});
