import { describe, expect, it } from 'vitest';
import { danceAvatarsDefaultConfig, validateDanceAvatarsConfig } from './danceAvatars.config';

describe('Dance Avatars config', () => {
  it('returns safe defaults for invalid input', () => {
    expect(validateDanceAvatarsConfig(null)).toEqual(danceAvatarsDefaultConfig);
  });

  it('clamps numeric ranges and validates gender/style', () => {
    expect(validateDanceAvatarsConfig({
      danceSpeed: 9,
      limbExpressiveness: -1,
      gender: 'alien',
      style: 'robot',
      primaryColor: 'nope',
    })).toMatchObject({
      danceSpeed: 1.2,
      limbExpressiveness: 0.25,
      gender: 'female',
      style: 'neon',
      primaryColor: danceAvatarsDefaultConfig.primaryColor,
    });
  });

  it('accepts male gender and hologram style', () => {
    expect(validateDanceAvatarsConfig({ gender: 'male', style: 'hologram' })).toMatchObject({
      gender: 'male',
      style: 'hologram',
    });
  });
});
