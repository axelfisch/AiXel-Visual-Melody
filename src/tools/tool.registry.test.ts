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

  it('marks Particle Sphere, Dance Avatars and Image Pulse as implemented', () => {
    expect(getTool('particle-sphere').availability).toBe('implemented');
    expect(getTool('particle-sphere').engineId).toBe('particle-sphere');
    expect(getTool('dance-avatar').availability).toBe('implemented');
    expect(getTool('dance-avatar').engineId).toBe('dance-avatars');
    expect(getTool('image-pulse').availability).toBe('implemented');
    expect(getTool('image-pulse').engineId).toBe('image-pulse');
  });

  it('marks Lyric Canvas as implemented (all four Pro Tools ready)', () => {
    expect(getTool('lyric-canvas').availability).toBe('implemented');
    expect(getTool('lyric-canvas').engineId).toBe('lyric-canvas');
    expect(listProTools().every((tool) => tool.availability === 'implemented')).toBe(true);
  });
});
