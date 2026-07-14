import { describe, expect, it } from 'vitest';
import { buildWaveform } from './waveform';

describe('buildWaveform', () => {
  it('returns a stable baseline for silence', () => {
    expect(buildWaveform(new Float32Array(12), 4)).toEqual([12, 12, 12, 12]);
  });

  it('keeps short signals finite across every bin', () => {
    const waveform = buildWaveform(new Float32Array([0, 0.5, -1]), 8);
    expect(waveform).toHaveLength(8);
    expect(waveform.every(Number.isFinite)).toBe(true);
    expect(Math.max(...waveform)).toBe(100);
  });
});
