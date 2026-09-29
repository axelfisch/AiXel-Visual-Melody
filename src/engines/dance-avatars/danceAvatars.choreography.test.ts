import { describe, expect, it } from 'vitest';
import {
  beatAt, complexityFromExpressiveness, danceAmplitude, danceBpm, evaluateDance, movePool, movePoolSize,
  planSegments, segmentAtBar, tempoRate,
} from './danceAvatars.choreography';
import { DANCE_MOVES } from './danceAvatars.moves';
import { POSE_CHANNELS } from './danceAvatars.skeleton';

const input = (time: number, complexity = 0.8, extra: Partial<Parameters<typeof evaluateDance>[0]> = {}) => ({
  time, bpm: 120, danceSpeed: 0.55, complexity, energy: 0.6, seed: 1234, ...extra,
});

describe('Dance Avatars move library', () => {
  it('has at least 10 distinct moves with finite looping poses', () => {
    expect(DANCE_MOVES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(DANCE_MOVES.map((m) => m.id)).size).toBe(DANCE_MOVES.length);
    for (const move of DANCE_MOVES) {
      for (let i = 0; i <= 16; i += 1) {
        const pose = move.sample((i / 16) * move.cycleBeats);
        for (const c of POSE_CHANNELS) expect(Number.isFinite(pose[c])).toBe(true);
      }
      const a = move.sample(0.3), b = move.sample(0.3 + move.cycleBeats);
      for (const c of POSE_CHANNELS) expect(b[c]).toBeCloseTo(a[c], 6);
    }
  });

  it('moves are genuinely different from each other', () => {
    const signature = (id: string) => {
      const move = DANCE_MOVES.find((m) => m.id === id)!;
      return [0, 0.5, 1, 1.5, 2, 3].map((b) => move.sample(b)).flatMap((p) => POSE_CHANNELS.map((c) => p[c]));
    };
    const ids = DANCE_MOVES.map((m) => m.id);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = signature(ids[i]), b = signature(ids[j]);
        const diff = a.reduce((sum, v, k) => sum + Math.abs(v - b[k]), 0);
        expect(diff).toBeGreaterThan(1);
      }
    }
  });
});

describe('Dance Avatars choreography vs Motion Complexity', () => {
  it('maps the Director-driven parameter to 0..1 complexity', () => {
    expect(complexityFromExpressiveness(0.25)).toBe(0);
    expect(complexityFromExpressiveness(1.2)).toBe(1);
    expect(complexityFromExpressiveness(0.72)).toBeGreaterThan(0.4);
  });

  it('grows the move pool with complexity', () => {
    expect(movePoolSize(0)).toBe(3);
    expect(movePoolSize(1)).toBe(DANCE_MOVES.length);
    expect(movePool(0)).toEqual(['groove', 'hipSway', 'stepTouch']);
    expect(movePool(1)).toContain('spinTurn');
  });

  it('changes moves every 8 bars at low complexity and every 2-4 bars at high complexity', () => {
    const low = planSegments({ seed: 7, complexity: 0 }, 64);
    const high = planSegments({ seed: 7, complexity: 1 }, 64);
    expect(low.every((s) => s.bars === 8)).toBe(true);
    expect(high.every((s) => s.bars === 2 || s.bars === 4)).toBe(true);
    expect(high.length).toBeGreaterThan(low.length * 2);
    expect(low.every((s) => !s.upper && !s.combo && !s.mirror)).toBe(true);
    expect(high.some((s) => s.upper)).toBe(true);
    expect(high.some((s) => s.mirror)).toBe(true);
    expect(high.some((s) => s.combo)).toBe(true);
    expect(new Set(high.map((s) => s.move)).size).toBeGreaterThan(new Set(low.map((s) => s.move)).size);
  });

  it('never repeats the same move twice in a row', () => {
    for (const complexity of [0, 0.5, 1]) {
      const plan = planSegments({ seed: 99, complexity }, 200);
      for (let i = 1; i < plan.length; i += 1) expect(plan[i].move).not.toBe(plan[i - 1].move);
    }
  });

  it('finds the segment covering any bar', () => {
    const opts = { seed: 3, complexity: 0.9 };
    for (const bar of [0, 5, 17, 63, 150]) {
      const { current } = segmentAtBar(opts, bar);
      expect(current.startBar).toBeLessThanOrEqual(bar);
      expect(current.startBar + current.bars).toBeGreaterThan(bar);
    }
  });

  it('raises amplitude with complexity and energy', () => {
    expect(danceAmplitude(1, 0.5)).toBeGreaterThan(danceAmplitude(0, 0.5));
    expect(danceAmplitude(0.5, 1)).toBeGreaterThan(danceAmplitude(0.5, 0));
  });
});

describe('Dance Avatars timing and determinism', () => {
  it('dances exactly on the beat at the default fluidity and scales with danceSpeed', () => {
    expect(tempoRate(0.55)).toBe(1);
    expect(tempoRate(1.2)).toBeGreaterThan(1);
    expect(tempoRate(0.15)).toBeLessThan(1);
    expect(beatAt(1, 120, 0.55)).toBeCloseTo(2);
    expect(danceBpm(240)).toBe(120);
    expect(danceBpm(60)).toBe(120);
    expect(danceBpm(0)).toBe(112);
  });

  it('is deterministic: same inputs give identical poses regardless of evaluation order', () => {
    const times = [0, 1.37, 12.5, 47.9, 3.3, 120.25];
    const first = times.map((t) => evaluateDance(input(t)).pose);
    const again = [...times].reverse().map((t) => evaluateDance(input(t)).pose).reverse();
    expect(again).toEqual(first);
  });

  it('produces varied poses over time at high complexity', () => {
    const poses = Array.from({ length: 64 }, (_, i) => evaluateDance(input(i * 0.75, 1)).segment.move);
    expect(new Set(poses).size).toBeGreaterThanOrEqual(5);
  });

  it('keeps motion continuous across move changes (no pops)', () => {
    let prev = evaluateDance(input(0, 1)).pose;
    for (let t = 1 / 30; t < 40; t += 1 / 30) {
      const pose = evaluateDance(input(t, 1)).pose;
      for (const c of ['rootX', 'rootY', 'armL', 'armR', 'elbowL', 'footXL', 'footYR'] as const) {
        expect(Math.abs(pose[c] - prev[c])).toBeLessThan(0.75);
      }
      prev = pose;
    }
  });

  it('reacts to energy (Dynamics) and emits secondary motion', () => {
    const calm = evaluateDance(input(9.1, 0.8, { energy: 0 }));
    const loud = evaluateDance(input(9.1, 0.8, { energy: 1 }));
    expect(loud.pose).not.toEqual(calm.pose);
    const anySwing = Array.from({ length: 40 }, (_, i) => evaluateDance(input(i * 0.4, 1)).secondary.hairSwing)
      .some((v) => Math.abs(v) > 0.02);
    expect(anySwing).toBe(true);
  });
});
