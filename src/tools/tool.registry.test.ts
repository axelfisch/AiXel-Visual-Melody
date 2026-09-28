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

  it('marks Particle Sphere as implemented and ready to select', () => {
    expect(getTool('particle-sphere').availability).toBe('implemented');
    expect(getTool('particle-sphere').engineId).toBe('particle-sphere');
  });

  it('keeps Avatars, Image Pulse and Lyrics as coming soon', () => {
    expect(getTool('dance-avatar').availability).toBe('coming-soon');
    expect(getTool('image-pulse').availability).toBe('coming-soon');
    expect(getTool('lyric-canvas').availability).toBe('coming-soon');
  });
});
