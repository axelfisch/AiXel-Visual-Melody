import { describe, expect, it } from 'vitest';
import { getEngine, getEngineOrDefault, isProEngineId, listClassicEngines, listEngines } from './engine.registry';

describe('engine registry', () => {
  it('exposes all six classic engines plus Particle Sphere, Dance Avatars and Image Pulse', () => {
    expect(getEngine('minimal-album-art').availability).toBe('implemented');
    expect(getEngine('cosmic-waves').availability).toBe('implemented');
    expect(getEngine('jazz-geometry').availability).toBe('implemented');
    expect(getEngine('liquid-colors').availability).toBe('implemented');
    expect(getEngine('frequency-city').availability).toBe('implemented');
    expect(getEngine('neon-velvet').availability).toBe('implemented');
    expect(getEngine('particle-sphere').availability).toBe('implemented');
    expect(getEngine('dance-avatars').availability).toBe('implemented');
    expect(getEngine('image-pulse').availability).toBe('implemented');
    expect(listClassicEngines()).toHaveLength(6);
    expect(listEngines()).toHaveLength(9);
    expect(isProEngineId('dance-avatars')).toBe(true);
    expect(isProEngineId('image-pulse')).toBe(true);
    expect(isProEngineId('minimal-album-art')).toBe(false);
  });

  it('rejects unknown engine identifiers', () => {
    expect(() => getEngine('unknown-engine')).toThrow(/inconnu/i);
    expect(getEngineOrDefault('unknown-engine').id).toBe('minimal-album-art');
  });
});
