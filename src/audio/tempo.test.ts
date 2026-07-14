import { describe, expect, it } from 'vitest';
import { estimateBpm } from './tempo';

describe('estimateBpm', () => {
  it('detects a synthetic 120 BPM pulse train within MVP tolerance', () => {
    const sampleRate = 1_000;
    const samples = new Float32Array(sampleRate * 8);
    for (let start = 0; start < samples.length; start += sampleRate / 2) {
      samples.fill(1, start, Math.min(samples.length, start + 20));
    }
    expect(estimateBpm(samples, sampleRate)).toBeGreaterThanOrEqual(118);
    expect(estimateBpm(samples, sampleRate)).toBeLessThanOrEqual(122);
  });
});
