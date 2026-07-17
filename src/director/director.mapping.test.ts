import { describe, expect, it } from 'vitest';
import { getEngine } from '../engines/engine.registry';
import { directorDefaultState, directorMoodProfiles, validateDirectorState } from './director.profiles';
import { directorCapabilities, mapDirectorToEngine } from './director.mapping';

const engines = [
  'minimal-album-art',
  'cosmic-waves',
  'jazz-geometry',
  'liquid-colors',
  'frequency-city',
  'neon-velvet',
];

describe('AiXel Director V1 mapping contract', () => {
  it.each(engines)('produces a validated configuration for %s', (engineId) => {
    const engine = getEngine(engineId);
    const result = mapDirectorToEngine(engineId, directorDefaultState);
    expect(result.parameters).toEqual(engine.validateConfig(result.parameters));
    expect(result.supportedDimensions).toContain('fluidity');
    expect(result.supportedDimensions).toContain('dynamics');
  });

  it('preserves non-Director engine parameters such as colors and titles', () => {
    const result = mapDirectorToEngine('neon-velvet', directorDefaultState, {
      cyanAccent: '#123456',
      showTitle: false,
    });
    expect(result.parameters.cyanAccent).toBe('#123456');
    expect(result.parameters.showTitle).toBe(false);
  });

  it('maps higher values monotonically within validated engine ranges', () => {
    const low = mapDirectorToEngine('frequency-city', { fluidity: 0, dynamics: 0, motionComplexity: 0 });
    const high = mapDirectorToEngine('frequency-city', { fluidity: 100, dynamics: 100, motionComplexity: 100 });
    expect(high.parameters.pulseSpeed).toBeGreaterThan(low.parameters.pulseSpeed as number);
    expect(high.parameters.energyResponse).toBeGreaterThan(low.parameters.energyResponse as number);
    expect(high.parameters.buildingCount).toBeGreaterThan(low.parameters.buildingCount as number);
  });

  it('keeps unsupported dimensions out of the capability list', () => {
    expect(directorCapabilities('minimal-album-art')).toEqual(['fluidity', 'dynamics']);
    expect(directorCapabilities('cosmic-waves')).toEqual(['fluidity', 'dynamics', 'particles', 'motionComplexity']);
  });

  it('clamps custom state and provides six complete mood profiles', () => {
    expect(validateDirectorState({ dynamics: 180, fluidity: -20 }).dynamics).toBe(100);
    expect(validateDirectorState({ dynamics: 180, fluidity: -20 }).fluidity).toBe(0);
    expect(Object.keys(directorMoodProfiles)).toHaveLength(6);
    Object.values(directorMoodProfiles).forEach((profile) => {
      expect(Object.keys(profile)).toHaveLength(8);
    });
  });
});
