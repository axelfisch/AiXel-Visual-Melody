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

const allDimensions = [
  'emotion',
  'space',
  'fluidity',
  'light',
  'dynamics',
  'particles',
  'colorEnergy',
  'motionComplexity',
];

describe('AiXel Director V1 mapping contract', () => {
  it.each(engines)('produces a validated configuration for %s', (engineId) => {
    const engine = getEngine(engineId);
    const result = mapDirectorToEngine(engineId, directorDefaultState);
    expect(result.parameters).toEqual(engine.validateConfig(result.parameters));
    expect(result.supportedDimensions).toContain('fluidity');
    expect(result.supportedDimensions).toContain('dynamics');
  });

  it.each(engines)('makes every Director fader functional for %s', (engineId) => {
    expect(directorCapabilities(engineId).slice().sort()).toEqual(allDimensions.slice().sort());
    const low = mapDirectorToEngine(engineId, {
      emotion: 0, space: 0, fluidity: 0, light: 0, dynamics: 0, particles: 0, colorEnergy: 0, motionComplexity: 0,
    });
    const high = mapDirectorToEngine(engineId, {
      emotion: 100, space: 100, fluidity: 100, light: 100, dynamics: 100, particles: 100, colorEnergy: 100, motionComplexity: 100,
    });
    expect(high.parameters.glowIntensity).toBeGreaterThan(low.parameters.glowIntensity as number);
    expect(high.parameters.spaceScale).toBeGreaterThan(low.parameters.spaceScale as number);
    expect(high.parameters.colorSaturation).toBeGreaterThan(low.parameters.colorSaturation as number);
    expect(high.parameters.sparkleDensity).toBeGreaterThan(low.parameters.sparkleDensity as number);
    expect(high.parameters.warmth).toBeGreaterThan(low.parameters.warmth as number);
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

  it('exposes all eight Director dimensions for every engine', () => {
    engines.forEach((engineId) => {
      expect(directorCapabilities(engineId).slice().sort()).toEqual(allDimensions.slice().sort());
    });
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
