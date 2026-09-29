import { describe, expect, it } from 'vitest';
import { getTool, listProTools, listTools } from './tool.registry';

describe('tool registry', () => {
  it('exposes classic engines plus four Pro Tools', () => {
    expect(listTools().map((tool) => tool.id)).toEqual([
      'engine',
      'particle-sphere',
      'dance-avatar',
      'image-pulse',
      'lyric-canvas',
    ]);
    expect(listProTools()).toHaveLength(4);
  });

  it('marks Particle Sphere and Dance Avatars as implemented', () => {
    expect(getTool('particle-sphere').availability).toBe('implemented');
    expect(getTool('particle-sphere').engineId).toBe('particle-sphere');
    expect(getTool('dance-avatar').availability).toBe('implemented');
    expect(getTool('dance-avatar').engineId).toBe('dance-avatars');
  });

  it('keeps Image Pulse and Lyrics as coming soon', () => {
    expect(getTool('image-pulse').availability).toBe('coming-soon');
    expect(getTool('lyric-canvas').availability).toBe('coming-soon');
  });
});
