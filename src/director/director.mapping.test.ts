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
  'particle-sphere',
  'dance-avatars',
  'image-pulse',
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

  it('maps Color Energy and Light honestly for Particle Sphere', () => {
    const low = mapDirectorToEngine('particle-sphere', {
      emotion: 50, space: 50, fluidity: 50, light: 0, dynamics: 50, particles: 50, colorEnergy: 0, motionComplexity: 50,
    });
    const high = mapDirectorToEngine('particle-sphere', {
      emotion: 50, space: 50, fluidity: 50, light: 100, dynamics: 50, particles: 50, colorEnergy: 100, motionComplexity: 50,
    });
    expect(high.parameters.colorSaturation).toBeGreaterThan(low.parameters.colorSaturation as number);
    expect(high.parameters.glowIntensity).toBeGreaterThan(low.parameters.glowIntensity as number);
    expect(high.parameters.orbitSpeed).toEqual(low.parameters.orbitSpeed);
  });

  it('maps Color Energy and Light honestly for Dance Avatars', () => {
    const low = mapDirectorToEngine('dance-avatars', {
      emotion: 50, space: 50, fluidity: 50, light: 0, dynamics: 50, particles: 50, colorEnergy: 0, motionComplexity: 50,
    });
    const high = mapDirectorToEngine('dance-avatars', {
      emotion: 50, space: 50, fluidity: 50, light: 100, dynamics: 50, particles: 50, colorEnergy: 100, motionComplexity: 50,
    });
    expect(high.parameters.colorSaturation).toBeGreaterThan(low.parameters.colorSaturation as number);
    expect(high.parameters.glowIntensity).toBeGreaterThan(low.parameters.glowIntensity as number);
    expect(high.parameters.danceSpeed).toEqual(low.parameters.danceSpeed);
    expect(high.parameters.limbExpressiveness).toEqual(low.parameters.limbExpressiveness);
  });

  it('maps Fluidity and Motion Complexity to dance params', () => {
    const low = mapDirectorToEngine('dance-avatars', { fluidity: 0, motionComplexity: 0 });
    const high = mapDirectorToEngine('dance-avatars', { fluidity: 100, motionComplexity: 100 });
    expect(high.parameters.danceSpeed).toBeGreaterThan(low.parameters.danceSpeed as number);
    expect(high.parameters.limbExpressiveness).toBeGreaterThan(low.parameters.limbExpressiveness as number);
  });

  it('maps every Director fader to its own Image Pulse renderer parameter', () => {
    const neutral = { emotion: 50, space: 50, fluidity: 50, light: 50, dynamics: 50, particles: 50, colorEnergy: 50, motionComplexity: 50 };
    const expected: Record<string, string> = {
      fluidity: 'pulseSpeed',
      dynamics: 'energyResponse',
      motionComplexity: 'effectComplexity',
      light: 'glowIntensity',
      space: 'spaceScale',
      colorEnergy: 'colorSaturation',
      particles: 'sparkleDensity',
      emotion: 'warmth',
    };
    const base = mapDirectorToEngine('image-pulse', neutral).parameters;
    for (const [dimension, parameter] of Object.entries(expected)) {
      const low = mapDirectorToEngine('image-pulse', { ...neutral, [dimension]: 0 }).parameters;
      const high = mapDirectorToEngine('image-pulse', { ...neutral, [dimension]: 100 }).parameters;
      expect(high[parameter]).toBeGreaterThan(low[parameter] as number);
      for (const other of Object.values(expected).filter((id) => id !== parameter)) {
        expect(high[other]).toEqual(base[other]);
      }
    }
  });

  it('keeps the uploaded image, style and Creator colors when remapping Image Pulse', () => {
    const result = mapDirectorToEngine('image-pulse', { fluidity: 90 }, {
      imageSrc: 'blob:cover', style: 'kaleido', framing: 'card', primaryColor: '#112233',
    });
    expect(result.parameters).toMatchObject({ imageSrc: 'blob:cover', style: 'kaleido', framing: 'card', primaryColor: '#112233' });
  });
});
