import { describe, expect, it } from 'vitest';
import { buildEnergyTimeline, energyAt } from './energy';

describe('audio energy', () => {
  it('normalizes silence without dividing by zero', () => {
    expect(buildEnergyTimeline(new Float32Array(30), 30, 3)).toEqual([0, 0, 0]);
  });

  it('normalizes the strongest frame to one', () => {
    const samples = new Float32Array([0.1, 0.1, 0.5, 0.5]);
    expect(buildEnergyTimeline(samples, 4, 2)).toEqual([0.20000000298023224, 1]);
  });

  it('returns energy at a synchronized playback time', () => {
    expect(energyAt({ energy: [0.2, 0.8] }, 1 / 30)).toBe(0.8);
  });
});
