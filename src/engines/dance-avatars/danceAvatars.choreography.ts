// Deterministic, stateless choreography: given the audio time, tempo and the
// Director-driven config it returns the exact same pose every time, so the
// live Preview and the MP4 Export always show identical dancing.

import { DANCE_MOVES, getMove, type DanceMoveId } from './danceAvatars.moves';
import {
  NEUTRAL_POSE, TAU, blendPoses, layerPoses, mirrorPose, scalePose,
  type Pose, type Secondary,
} from './danceAvatars.skeleton';

export const BEATS_PER_BAR = 4;

export type DanceSegment = {
  index: number;
  startBar: number;
  bars: number;
  move: DanceMoveId;
  /** Upper-body layer taken from a different move (high complexity). */
  upper?: DanceMoveId;
  /** Alternate move for odd bars (combo, very high complexity). */
  combo?: DanceMoveId;
  mirror: boolean;
};

export type DancePlanOptions = { seed: number; complexity: number };

/** Small integer hash -> [0, 1). */
export function hash01(seed: number, a: number, b = 0): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a + 0x7f4a7c15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13) ^ (b * 0x27d4eb2d), 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Normalized 0..1 complexity from the Motion Complexity–driven parameter. */
export function complexityFromExpressiveness(limbExpressiveness: number): number {
  return Math.min(1, Math.max(0, (limbExpressiveness - 0.25) / 0.95));
}

/** Number of moves available: 3 (simple groove) … all 13 at full complexity. */
export function movePoolSize(complexity: number): number {
  const c = Math.min(1, Math.max(0, complexity));
  return Math.min(DANCE_MOVES.length, 3 + Math.round(c * (DANCE_MOVES.length - 3)));
}

export function movePool(complexity: number): DanceMoveId[] {
  return DANCE_MOVES.slice(0, movePoolSize(complexity)).map((m) => m.id);
}

/** Bars between move changes: 8 at low complexity, down to 2 at high complexity. */
export function segmentBars(complexity: number, r: number): number {
  if (complexity < 0.3) return 8;
  if (complexity < 0.55) return r < 0.5 ? 4 : 8;
  if (complexity < 0.8) return r < 0.65 ? 4 : 2;
  return r < 0.6 ? 2 : 4;
}

function buildSegment(opts: DancePlanOptions, index: number, startBar: number, previous?: DanceSegment): DanceSegment {
  const c = Math.min(1, Math.max(0, opts.complexity));
  const pool = movePool(c);
  const r = (salt: number) => hash01(opts.seed, index, salt);
  let pick = Math.floor(r(1) * pool.length);
  if (index === 0) pick = 0; // always open on the basic groove
  if (previous && pool[pick] === previous.move && pool.length > 1) pick = (pick + 1 + Math.floor(r(2) * (pool.length - 1))) % pool.length;
  const move = pool[pick];
  const pickOther = (salt: number) => {
    const others = pool.filter((id) => id !== move);
    return others[Math.floor(r(salt) * others.length)];
  };
  const layerChance = Math.max(0, (c - 0.45) / 0.55) * 0.65;
  const comboChance = Math.max(0, (c - 0.72) / 0.28) * 0.55;
  const mirrorChance = c * 0.6;
  const segment: DanceSegment = {
    index,
    startBar,
    bars: segmentBars(c, r(3)),
    move,
    mirror: index > 0 && r(4) < mirrorChance,
  };
  if (index > 0 && pool.length > 1 && r(5) < layerChance) segment.upper = pickOther(6);
  if (index > 0 && pool.length > 1 && r(7) < comboChance) segment.combo = pickOther(8);
  return segment;
}

const planCache = new Map<string, DanceSegment[]>();

/** Returns the segments covering bars [0, untilBar]. Pure: the cache never changes the result. */
export function planSegments(opts: DancePlanOptions, untilBar: number): DanceSegment[] {
  const key = `${opts.seed}:${opts.complexity}`;
  let plan = planCache.get(key);
  if (!plan) {
    if (planCache.size > 24) planCache.clear();
    plan = [];
    planCache.set(key, plan);
  }
  while (plan.length === 0 || plan[plan.length - 1].startBar + plan[plan.length - 1].bars <= untilBar) {
    const prev = plan[plan.length - 1];
    const start = prev ? prev.startBar + prev.bars : 0;
    plan.push(buildSegment(opts, plan.length, start, prev));
  }
  return plan;
}

export function segmentAtBar(opts: DancePlanOptions, bar: number): { current: DanceSegment; previous?: DanceSegment } {
  const b = Math.max(0, Math.floor(bar));
  const plan = planSegments(opts, b);
  let lo = 0, hi = plan.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (plan[mid].startBar <= b) lo = mid; else hi = mid - 1;
  }
  return { current: plan[lo], previous: lo > 0 ? plan[lo - 1] : undefined };
}

function clipPose(id: DanceMoveId, localBeat: number, mirror: boolean): Pose {
  const pose = getMove(id).sample(localBeat);
  return mirror ? mirrorPose(pose) : pose;
}

/** Pose of one segment at an absolute beat (the segment keeps its own phase even outside its bars). */
export function segmentPose(segment: DanceSegment, beat: number): Pose {
  const local = beat - segment.startBar * BEATS_PER_BAR;
  const barInSegment = Math.floor(local / BEATS_PER_BAR);
  const base = (id: DanceMoveId) => {
    const pose = clipPose(id, local, segment.mirror);
    return segment.upper ? layerPoses(pose, clipPose(segment.upper, local, !segment.mirror)) : pose;
  };
  if (!segment.combo) return base(segment.move);
  const odd = ((barInSegment % 2) + 2) % 2 === 1;
  const inBar = local - barInSegment * BEATS_PER_BAR;
  const now = odd ? segment.combo : segment.move;
  const before = odd ? segment.move : segment.combo;
  const cur = base(now);
  if (barInSegment <= 0 || inBar >= 0.6) return cur;
  return blendPoses(base(before), cur, smoothstep(inBar / 0.6));
}

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** Maps Fluidity (danceSpeed) to a tempo multiplier; the default 0.55 dances exactly on the beat. */
export function tempoRate(danceSpeed: number): number {
  if (danceSpeed <= 0.55) return 0.5 + 0.5 * Math.max(0, (danceSpeed - 0.15) / 0.4);
  return 1 + 0.6 * Math.min(1, (danceSpeed - 0.55) / 0.65);
}

/** Keeps detected tempo in a danceable 75–150 BPM window. */
export function danceBpm(bpm: number): number {
  let v = Number.isFinite(bpm) && bpm > 20 ? bpm : 112;
  while (v > 150) v /= 2;
  while (v < 75) v *= 2;
  return v;
}

export function beatAt(time: number, bpm: number, danceSpeed: number): number {
  return Math.max(0, time) * (danceBpm(bpm) / 60) * tempoRate(danceSpeed);
}

export type DanceInput = {
  time: number;
  bpm: number;
  danceSpeed: number;
  complexity: number;
  energy: number;
  seed: number;
};

/** Raw choreography pose (before amplitude) at a beat. */
export function choreographyPose(opts: DancePlanOptions, beat: number): Pose {
  const bar = Math.floor(beat / BEATS_PER_BAR);
  const { current, previous } = segmentAtBar(opts, bar);
  const cur = segmentPose(current, beat);
  const blendBeats = 1.1 - 0.4 * opts.complexity;
  const local = beat - current.startBar * BEATS_PER_BAR;
  if (!previous || local >= blendBeats) return cur;
  return blendPoses(segmentPose(previous, beat), cur, smoothstep(local / blendBeats));
}

export function danceAmplitude(complexity: number, energy: number): number {
  return 0.68 + 0.2 * complexity + 0.36 * Math.min(1, Math.max(0, energy));
}

export type DanceState = {
  pose: Pose;
  beat: number;
  segment: DanceSegment;
  secondary: Secondary;
  /** 1 right on the beat, decaying to 0 — used for light pulses. */
  beatPulse: number;
};

export function evaluateDance(input: DanceInput): DanceState {
  const opts: DancePlanOptions = { seed: input.seed, complexity: Math.min(1, Math.max(0, input.complexity)) };
  const beat = beatAt(input.time, input.bpm, input.danceSpeed);
  const amp = danceAmplitude(opts.complexity, input.energy);
  const at = (b: number) => scalePose(choreographyPose(opts, Math.max(0, b)), amp);
  const pose = at(beat);
  // Secondary motion from lagged samples (stateless follow-through).
  const lagA = at(beat - 0.18);
  const lagB = at(beat - 0.4);
  const yawVel = Math.abs(wrap(pose.yaw - at(beat - 0.08).yaw)) / 0.08;
  const secondary: Secondary = {
    hairSwing: clampAbs((lagB.rootX - pose.rootX) * 1.6 + (lagA.chestShift - pose.chestShift) * 1.2 + (lagA.chestRot - pose.chestRot) * 1.5, 0.9),
    hairFlare: Math.min(1, yawVel / 5),
    headLag: clampAbs((lagA.rootX - pose.rootX) * 0.35 + (lagA.chestRot - pose.chestRot) * 0.6, 0.25),
  };
  // Energetic hits push the pelvis down a touch on every beat.
  const frac = beat - Math.floor(beat);
  const beatPulse = Math.exp(-frac * 5);
  pose.rootY += 0.05 * Math.min(1, Math.max(0, input.energy)) * beatPulse;
  const { current } = segmentAtBar(opts, Math.floor(beat / BEATS_PER_BAR));
  return { pose, beat, segment: current, secondary, beatPulse };
}

const wrap = (a: number) => {
  let v = a % TAU;
  if (v > Math.PI) v -= TAU;
  if (v < -Math.PI) v += TAU;
  return v;
};
const clampAbs = (v: number, m: number) => Math.max(-m, Math.min(m, v));

export { NEUTRAL_POSE };
