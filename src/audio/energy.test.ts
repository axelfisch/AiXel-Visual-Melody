import { describe, expect, it } from 'vitest';
import { buildEnergyTimeline, energyAt, onsetAt } from './energy';

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

  it('detects transients as jumps above the recent average and holds them briefly', () => {
    const energy = [...Array(20).fill(0.2), 0.9, 0.5, 0.3, 0.25, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2];
    const at = (frame: number) => onsetAt({ energy }, frame / 30 + 0.001);
    expect(at(10)).toBeCloseTo(0, 6);
    expect(at(20)).toBe(1);
    expect(at(22)).toBeGreaterThan(0.3);
    expect(at(22)).toBeLessThan(at(20));
    expect(at(29)).toBeLessThan(0.05);
    expect(onsetAt({ energy: [] }, 1)).toBe(0);
  });

  it('is a pure function of the timeline and time (Preview ≡ Export)', () => {
    const energy = Array.from({ length: 300 }, (_, index) => Math.abs(Math.sin(index * 0.7)));
    expect(onsetAt({ energy }, 4.2)).toBe(onsetAt({ energy: [...energy] }, 4.2));
  });
});
