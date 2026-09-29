// Dance move library. Each move is a looping clip sampled by beat position
// (beat 0 = downbeat of the move). Most moves are keyframed poses interpolated
// with a cyclic Catmull-Rom spline; a few add procedural layers (waves, turns).

import { NEUTRAL_POSE, POSE_CHANNELS, TAU, makePose, type Pose } from './danceAvatars.skeleton';

export type DanceMoveId =
  | 'groove'
  | 'hipSway'
  | 'stepTouch'
  | 'clapStep'
  | 'shoulderBounce'
  | 'kneeLift'
  | 'armWave'
  | 'bodyRoll'
  | 'armsUpGroove'
  | 'sideKick'
  | 'spinTurn'
  | 'shuffle'
  | 'vogueHits';

export type DanceMove = {
  id: DanceMoveId;
  label: string;
  labelFr: string;
  /** 0 = basic groove … 3 = advanced; the move pool grows with Motion Complexity. */
  difficulty: 0 | 1 | 2 | 3;
  cycleBeats: number;
  sample(beat: number): Pose;
};

type Key = [beat: number, pose: Partial<Pose>];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const mod = (v: number, m: number) => ((v % m) + m) % m;

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * Builds a looping sampler from keyframes. `snap` (0..1) sharpens the timing
 * so poses "hit" and hold (useful for claps and vogue arms).
 */
export function keyframeClip(cycle: number, keys: Key[], base: Partial<Pose> = {}, snap = 0) {
  const baseline = makePose(base);
  const poses = keys.map(([b, p]) => ({ b, pose: makePose(p, baseline) }));
  const n = poses.length;
  return (beat: number): Pose => {
    const b = mod(beat, cycle);
    let i = n - 1;
    for (let k = 0; k < n; k += 1) {
      if (poses[k].b <= b) i = k;
    }
    const j = (i + 1) % n;
    const b0 = poses[i].b;
    const b1 = j === 0 ? poses[0].b + cycle : poses[j].b;
    const bb = b < b0 ? b + cycle : b;
    let t = clamp01((bb - b0) / Math.max(1e-6, b1 - b0));
    if (snap > 0) {
      const sharp = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      t = t + (sharp - t) * snap;
    }
    const p0 = poses[(i - 1 + n) % n].pose, p1 = poses[i].pose, p2 = poses[j].pose, p3 = poses[(j + 1) % n].pose;
    const out = {} as Pose;
    for (const c of POSE_CHANNELS) out[c] = catmull(p0[c], p1[c], p2[c], p3[c], t);
    return out;
  };
}

const withLayer = (clip: (b: number) => Pose, layer: (b: number) => Partial<Pose>) => (b: number): Pose => {
  const pose = clip(b);
  const extra = layer(b);
  for (const k of Object.keys(extra) as Array<keyof Pose>) pose[k] += extra[k] ?? 0;
  return pose;
};

/** Knee bounce that drops on every beat — the heartbeat under most moves. */
const bounce = (b: number, depth = 0.16) => 0.06 + depth * (0.5 + 0.5 * Math.cos(b * TAU));

// ---------------------------------------------------------------- moves

const groove: DanceMove = {
  id: 'groove', label: 'Groove bounce', labelFr: 'Rebond groove', difficulty: 0, cycleBeats: 4,
  sample: keyframeClip(4, [
    [0, { rootX: 0.2, rootY: 0.32, pelvisRot: -0.1, spineRot: 0.06, chestRot: 0.05, headRot: 0.09, footYL: 0.12, kneeL: 0.65, shoulderR: 0.06, armL: 0.5, elbowL: -1.05, armR: 0.3, elbowR: -0.55 }],
    [0.5, { rootX: 0.08, rootY: 0.05, headRot: -0.02, armL: 0.4, elbowL: -0.8, armR: 0.36, elbowR: -0.8 }],
    [1, { rootX: -0.2, rootY: 0.32, pelvisRot: 0.1, spineRot: -0.06, chestRot: -0.05, headRot: -0.09, footYR: 0.12, kneeR: 0.65, shoulderL: 0.06, armL: 0.3, elbowL: -0.55, armR: 0.5, elbowR: -1.05 }],
    [1.5, { rootX: -0.08, rootY: 0.05, headRot: 0.02, armL: 0.36, elbowL: -0.8, armR: 0.4, elbowR: -0.8 }],
    [2, { rootX: 0.2, rootY: 0.34, pelvisRot: -0.12, spineRot: 0.08, chestRot: 0.06, headRot: 0.1, footYL: 0.12, kneeL: 0.65, shoulderL: 0.1, armL: 0.8, elbowL: -1.5, wristL: -0.3, armR: 0.25, elbowR: -0.4 }],
    [2.5, { rootX: 0.08, rootY: 0.05, armL: 0.55, elbowL: -1.0, armR: 0.3, elbowR: -0.6 }],
    [3, { rootX: -0.2, rootY: 0.34, pelvisRot: 0.12, spineRot: -0.08, chestRot: -0.06, headRot: -0.1, footYR: 0.12, kneeR: 0.65, shoulderR: 0.1, armR: 0.8, elbowR: -1.5, wristR: -0.3, armL: 0.25, elbowL: -0.4 }],
    [3.5, { rootX: -0.08, rootY: 0.05, armR: 0.55, elbowR: -1.0, armL: 0.3, elbowL: -0.6 }],
  ]),
};

const hipSway: DanceMove = {
  id: 'hipSway', label: 'Hip sway', labelFr: 'Balancé des hanches', difficulty: 0, cycleBeats: 4,
  sample: keyframeClip(4, [
    [0, { rootX: 0.26, rootY: 0.14, pelvisRot: -0.16, spineRot: 0.12, chestRot: 0.06, headRot: -0.05, armR: 0.35, elbowR: -0.3, kneeL: 0.6 }],
    [1, { rootX: -0.26, rootY: 0.14, pelvisRot: 0.16, spineRot: -0.12, chestRot: -0.06, headRot: 0.05, armR: 0.5, elbowR: -0.6, kneeR: 0.6 }],
    [2, { rootX: 0.26, rootY: 0.14, pelvisRot: -0.16, spineRot: 0.12, chestRot: 0.06, headRot: -0.05, armR: 1.3, elbowR: 0.5, wristR: 0.3, kneeL: 0.6 }],
    [3, { rootX: -0.26, rootY: 0.14, pelvisRot: 0.16, spineRot: -0.12, chestRot: -0.06, headRot: 0.08, armR: 2.2, elbowR: 0.4, wristR: 0.2, kneeR: 0.6 }],
  ], { armL: 0.62, elbowL: -2.25, wristL: -0.3 }),
};

const stepTouchKeys = (arms: (i: number) => Partial<Pose>): Key[] => [
  [0, { footXR: 0.36, footXL: 0.36, rootX: 0.2, rootY: 0.26, chestRot: 0.04, ...arms(0) }],
  [0.5, { footXR: 0.36, footXL: -0.25, footYL: 0.24, rootX: 0.36, rootY: 0.1, ...arms(0.5) }],
  [1, { footXR: 0.36, footXL: -0.78, footYL: 0.04, kneeL: 0.7, rootX: 0.44, rootY: 0.24, headRot: 0.08, ...arms(1) }],
  [1.5, { footXR: 0.36, footXL: -0.25, footYL: 0.24, rootX: 0.2, rootY: 0.1, ...arms(1.5) }],
  [2, { footXL: 0.36, footXR: 0.36, rootX: -0.2, rootY: 0.26, chestRot: -0.04, ...arms(2) }],
  [2.5, { footXL: 0.36, footXR: -0.25, footYR: 0.24, rootX: -0.36, rootY: 0.1, ...arms(2.5) }],
  [3, { footXL: 0.36, footXR: -0.78, footYR: 0.04, kneeR: 0.7, rootX: -0.44, rootY: 0.24, headRot: -0.08, ...arms(3) }],
  [3.5, { footXL: 0.36, footXR: -0.25, footYR: 0.24, rootX: -0.2, rootY: 0.1, ...arms(3.5) }],
];

const stepTouch: DanceMove = {
  id: 'stepTouch', label: 'Two-step side step', labelFr: 'Pas chassé', difficulty: 0, cycleBeats: 4,
  sample: keyframeClip(4, stepTouchKeys((b) => {
    const s = Math.cos((b / 2) * TAU);
    return { armL: 0.35 + 0.25 * s, elbowL: -0.7 - 0.3 * s, armR: 0.35 - 0.25 * s, elbowR: -0.7 + 0.3 * s };
  })),
};

const clapStep: DanceMove = {
  id: 'clapStep', label: 'Step-touch & clap', labelFr: 'Pas-touche et clap', difficulty: 1, cycleBeats: 4,
  sample: keyframeClip(4, stepTouchKeys((b) => {
    const clap = Math.abs(b - Math.round(b)) < 0.01 && Math.round(b) % 2 === 1;
    return clap
      ? { armL: 0.78, elbowL: -2.25, wristL: 0.05, armR: 0.78, elbowR: -2.25, wristR: 0.05, shoulderL: 0.06, shoulderR: 0.06, headRot: 0 }
      : { armL: 1.05, elbowL: -0.35, wristL: 0.25, armR: 1.05, elbowR: -0.35, wristR: 0.25 };
  }), {}, 0.35),
};

const shoulderBounce: DanceMove = {
  id: 'shoulderBounce', label: 'Shoulder bounce', labelFr: 'Rebond des épaules', difficulty: 1, cycleBeats: 2,
  sample: withLayer(keyframeClip(2, [
    [0, { shoulderL: 0.34, shoulderR: -0.04, chestRot: 0.09, chestShift: -0.08, headRot: -0.08, footYR: 0.1, kneeR: 0.7, rootX: -0.08 }],
    [0.5, { shoulderL: 0.02, shoulderR: 0.02, chestRot: 0, headRot: 0 }],
    [1, { shoulderR: 0.34, shoulderL: -0.04, chestRot: -0.09, chestShift: 0.08, headRot: 0.08, footYL: 0.1, kneeL: 0.7, rootX: 0.08 }],
    [1.5, { shoulderL: 0.02, shoulderR: 0.02, chestRot: 0, headRot: 0 }],
  ], { armL: 0.55, elbowL: -1.5, wristL: -0.2, armR: 0.55, elbowR: -1.5, wristR: -0.2 }), (b) => ({
    rootY: bounce(b * 2, 0.1) - 0.1,
  })),
};

const kneeLift: DanceMove = {
  id: 'kneeLift', label: 'Knee lift & punch', labelFr: 'Montée de genou', difficulty: 1, cycleBeats: 4,
  sample: keyframeClip(4, [
    [0, { footYL: 1.55, footXL: 0.25, kneeL: 1, rootY: 0.02, rootX: 0.18, pelvisRot: 0.08, armR: 2.55, elbowR: 0.15, armL: 0.5, elbowL: -1.4, chestRot: 0.05 }],
    [1, { rootY: 0.3, armR: 0.55, elbowR: -1.1, armL: 0.55, elbowL: -1.1 }],
    [2, { footYR: 1.55, footXR: 0.25, kneeR: 1, rootY: 0.02, rootX: -0.18, pelvisRot: -0.08, armL: 2.55, elbowL: 0.15, armR: 0.5, elbowR: -1.4, chestRot: -0.05 }],
    [3, { rootY: 0.3, armR: 0.55, elbowR: -1.1, armL: 0.55, elbowL: -1.1 }],
  ], {}, 0.3),
};

const armWave: DanceMove = {
  id: 'armWave', label: 'Arm wave', labelFr: 'Vague des bras', difficulty: 2, cycleBeats: 4,
  sample: (beat) => {
    const b = mod(beat, 4);
    // Wave travels left hand -> right hand over two beats, then back.
    const w = b < 2 ? smooth(b / 2) * 6 : (1 - smooth((b - 2) / 2)) * 6;
    const bump = (p: number) => Math.exp(-((w - p) ** 2) / 0.7);
    const pose = makePose({
      rootY: bounce(b, 0.12),
      armL: 1.5 + 0.35 * bump(2) - 0.1, elbowL: 0.1 + 0.7 * bump(1) - 0.35 * bump(2), wristL: 0.9 * bump(0) - 0.5 * bump(1),
      armR: 1.5 + 0.35 * bump(4) - 0.1, elbowR: 0.1 + 0.7 * bump(5) - 0.35 * bump(4), wristR: 0.9 * bump(6) - 0.5 * bump(5),
      shoulderL: 0.2 * bump(2), shoulderR: 0.2 * bump(4),
      chestShift: 0.18 * (bump(3.4) - bump(2.6)), chestRot: 0.06 * (bump(4) - bump(2)),
      headRot: 0.12 * (bump(4.5) - bump(1.5)),
      rootX: 0.1 * Math.sin((b / 4) * TAU),
    });
    return pose;
  },
};

const bodyRoll: DanceMove = {
  id: 'bodyRoll', label: 'Body roll', labelFr: 'Ondulation du corps', difficulty: 2, cycleBeats: 4,
  sample: (beat) => {
    const b = mod(beat, 4);
    const ph = (b / 2) * TAU; // two rolls per cycle
    const sweep = 0.5 - 0.5 * Math.cos((b / 4) * TAU);
    return makePose({
      chestShift: 0.26 * Math.sin(ph),
      chestRot: 0.1 * Math.sin(ph - 0.6),
      neckRot: -0.12 * Math.sin(ph + 0.5),
      headRot: 0.08 * Math.sin(ph + 1.2),
      rootX: 0.24 * Math.sin(ph - 1.3),
      pelvisRot: -0.14 * Math.sin(ph - 1.3),
      spineRot: 0.1 * Math.sin(ph - 0.9),
      rootY: 0.22 + 0.1 * Math.sin(ph * 2 - 2),
      kneeL: 0.5 + 0.3 * Math.sin(ph - 2), kneeR: 0.5 - 0.3 * Math.sin(ph - 2),
      armL: 0.35 + 2.3 * sweep, elbowL: -0.3 + 0.5 * sweep, wristL: 0.2 * Math.sin(ph),
      armR: 0.6, elbowR: -1.9, wristR: -0.3,
      footXL: 0.18, footXR: 0.18,
    });
  },
};

const armsUpGroove: DanceMove = {
  id: 'armsUpGroove', label: 'Arms-up groove', labelFr: 'Bras levés', difficulty: 2, cycleBeats: 2,
  sample: keyframeClip(2, [
    [0, { armL: 2.75, elbowL: -0.15, wristL: -0.2, armR: 2.75, elbowR: -0.15, wristR: -0.2, rootY: 0.3, headRot: 0.1, shoulderL: 0.12, shoulderR: 0.12, rootX: 0.08 }],
    [0.5, { armL: 2.25, elbowL: -1.1, armR: 2.25, elbowR: -1.1, rootY: -0.06, footYL: 0.12, footYR: 0.12, headRot: 0 }],
    [1, { armL: 2.75, elbowL: -0.15, wristL: -0.2, armR: 2.75, elbowR: -0.15, wristR: -0.2, rootY: 0.3, headRot: -0.1, shoulderL: 0.12, shoulderR: 0.12, rootX: -0.08 }],
    [1.5, { armL: 2.25, elbowL: -1.1, armR: 2.25, elbowR: -1.1, rootY: -0.06, footYL: 0.12, footYR: 0.12, headRot: 0 }],
  ], { footXL: 0.14, footXR: 0.14 }),
};

const sideKick: DanceMove = {
  id: 'sideKick', label: 'Side kick', labelFr: 'Coup de pied latéral', difficulty: 2, cycleBeats: 4,
  sample: keyframeClip(4, [
    [0, { rootY: 0.34, armL: 0.9, elbowL: -1.3, armR: 0.9, elbowR: -1.3, kneeL: 0.5, kneeR: 0.5 }],
    [1, { footXL: 2.5, footYL: 1.5, kneeL: 0.1, rootX: 0.3, rootY: 0.12, pelvisRot: 0.14, spineRot: -0.24, chestRot: -0.1, armL: 1.6, elbowL: 0, armR: 2.1, elbowR: 0.2, headRot: -0.1 }],
    [2, { rootY: 0.34, armL: 0.9, elbowL: -1.3, armR: 0.9, elbowR: -1.3 }],
    [3, { footXR: 2.5, footYR: 1.5, kneeR: 0.1, rootX: -0.3, rootY: 0.12, pelvisRot: -0.14, spineRot: 0.24, chestRot: 0.1, armR: 1.6, elbowR: 0, armL: 2.1, elbowL: 0.2, headRot: 0.1 }],
  ], {}, 0.4),
};

const spinClip = keyframeClip(4, [
  [0, { rootY: 0.34, armL: 0.9, elbowL: -1.2, armR: 0.9, elbowR: -1.2, chestRot: 0.05 }],
  [0.5, { rootY: 0.3, armL: 0.35, elbowL: -1.9, armR: 0.35, elbowR: -1.9 }],
  [1.25, { rootY: 0.02, armL: 0.45, elbowL: -1.7, armR: 0.45, elbowR: -1.7, footXL: -0.15, footXR: -0.15 }],
  [2, { rootY: 0.1, armL: 0.4, elbowL: -1.6, armR: 0.4, elbowR: -1.6 }],
  [3, { rootY: 0.2, armL: 2.6, elbowL: 0.1, wristL: 0.3, armR: 2.6, elbowR: 0.1, wristR: 0.3, headRot: 0.12, footXL: 0.25, footXR: 0.25 }],
  [3.6, { rootY: 0.26, armL: 1.4, elbowL: -0.4, armR: 1.4, elbowR: -0.4 }],
], {}, 0.2);

const spinTurn: DanceMove = {
  id: 'spinTurn', label: 'Spin turn', labelFr: 'Pirouette', difficulty: 3, cycleBeats: 4,
  sample: (beat) => {
    const b = mod(beat, 4);
    const pose = spinClip(b);
    const t = clamp01((b - 0.5) / 1.5);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    pose.yaw = t >= 1 ? 0 : eased * TAU;
    return pose;
  },
};

const shuffle: DanceMove = {
  id: 'shuffle', label: 'Footwork shuffle', labelFr: 'Jeu de jambes shuffle', difficulty: 3, cycleBeats: 2,
  sample: withLayer(keyframeClip(2, [
    [0, { footXL: 0.8, footYL: 0.3, footXR: -0.2, kneeL: 0.3, rootX: -0.1, armL: 0.7, elbowL: -1.4, armR: 0.3, elbowR: -1.0 }],
    [0.25, { footXL: 0.0, footYL: 0.3, footXR: 0.05, rootX: 0 }],
    [0.5, { footXL: -0.45, footYL: 0, footXR: 0.3, footYR: 0.02, rootX: 0.05, armL: 0.3, elbowL: -1.0, armR: 0.7, elbowR: -1.4 }],
    [0.75, { footXR: 0.0, footYR: 0.3, footXL: 0.0, rootX: 0.05 }],
    [1, { footXR: 0.8, footYR: 0.3, footXL: -0.2, kneeR: 0.3, rootX: 0.1, armR: 0.7, elbowR: -1.4, armL: 0.3, elbowL: -1.0 }],
    [1.25, { footXR: 0.0, footYR: 0.3, footXL: 0.05, rootX: 0 }],
    [1.5, { footXR: -0.45, footYR: 0, footXL: 0.3, footYL: 0.02, rootX: -0.05, armR: 0.3, elbowR: -1.0, armL: 0.7, elbowL: -1.4 }],
    [1.75, { footXL: 0.0, footYL: 0.3, footXR: 0.0, rootX: -0.05 }],
  ]), (b) => ({ rootY: bounce(b * 2, 0.1) - 0.02, chestRot: 0.04 * Math.sin(b * Math.PI) })),
};

const vogueHits: DanceMove = {
  id: 'vogueHits', label: 'Vogue arm hits', labelFr: 'Poses vogue', difficulty: 3, cycleBeats: 4,
  sample: keyframeClip(4, [
    [0, { armL: 2.9, elbowL: 1.2, wristL: 0.4, armR: 0.62, elbowR: -2.25, wristR: -0.3, rootX: 0.22, pelvisRot: -0.16, spineRot: 0.12, headRot: -0.12, footXL: 0.3, kneeL: 0.7 }],
    [1, { armR: 1.57, elbowR: 1.57, wristR: 0.4, armL: 1.57, elbowL: -0.05, rootX: -0.22, pelvisRot: 0.16, spineRot: -0.12, headRot: 0.14, footXR: 0.3, kneeR: 0.7 }],
    [2, { armL: 1.0, elbowL: 2.0, wristL: 0.9, armR: 1.0, elbowR: 2.0, wristR: 0.9, rootY: 0.28, chestRot: 0.05, headRot: 0.05 }],
    [3, { armL: 2.4, elbowL: 0.1, armR: 0.25, elbowR: -0.6, rootX: 0.28, pelvisRot: -0.2, spineRot: 0.16, chestShift: -0.08, headRot: -0.16, footXL: 0.5, footXR: -0.1, kneeL: 0.6 }],
  ], {}, 0.75),
};

/** Ordered from simplest to most advanced; Motion Complexity unlocks the list progressively. */
export const DANCE_MOVES: DanceMove[] = [
  groove, hipSway, stepTouch,
  clapStep, shoulderBounce, kneeLift,
  armWave, bodyRoll, armsUpGroove, sideKick,
  spinTurn, shuffle, vogueHits,
];

export const DANCE_MOVE_IDS = DANCE_MOVES.map((m) => m.id);

const byId = new Map(DANCE_MOVES.map((m) => [m.id, m]));
export function getMove(id: DanceMoveId): DanceMove {
  return byId.get(id) ?? groove;
}

export { NEUTRAL_POSE };
