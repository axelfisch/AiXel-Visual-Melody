// Procedural 2.5D dancer rig: pose channels, blending/mirroring and forward
// kinematics (with a small two-bone leg IK so planted feet stay on the floor).
// All coordinates are in "head units" (1 = head height), y grows downward and
// the floor is y = 0, so the rig is resolution independent.

import type { DanceAvatarGender } from './danceAvatars.types';

export const POSE_CHANNELS = [
  'rootX', 'rootY', 'pelvisRot', 'spineRot', 'chestRot', 'chestShift', 'neckRot', 'headRot',
  'shoulderL', 'shoulderR',
  'armL', 'elbowL', 'wristL', 'armR', 'elbowR', 'wristR',
  'footXL', 'footYL', 'kneeL', 'footXR', 'footYR', 'kneeR',
  'yaw',
] as const;

export type PoseChannel = (typeof POSE_CHANNELS)[number];
export type Pose = Record<PoseChannel, number>;

/** Channels driven by the lower body (legs, weight shift, hips). */
export const LOWER_CHANNELS: PoseChannel[] = [
  'rootX', 'rootY', 'pelvisRot', 'footXL', 'footYL', 'kneeL', 'footXR', 'footYR', 'kneeR', 'yaw',
];
/** Channels driven by the upper body (spine, head, shoulders, arms). */
export const UPPER_CHANNELS: PoseChannel[] = POSE_CHANNELS.filter((c) => !LOWER_CHANNELS.includes(c));

/** Channels whose sign flips when a move is mirrored left/right. */
const SIGNED_CHANNELS: PoseChannel[] = [
  'rootX', 'pelvisRot', 'spineRot', 'chestRot', 'chestShift', 'neckRot', 'headRot', 'yaw',
];
const MIRROR_PAIRS: Array<[PoseChannel, PoseChannel]> = [
  ['shoulderL', 'shoulderR'], ['armL', 'armR'], ['elbowL', 'elbowR'], ['wristL', 'wristR'],
  ['footXL', 'footXR'], ['footYL', 'footYR'], ['kneeL', 'kneeR'],
];

/**
 * Arm angles are measured from "hanging straight down" (0) towards the
 * outside of the body (PI/2 = horizontal, PI = straight up). Elbow/wrist add
 * to that angle (negative curls the forearm toward the body midline).
 * Foot X is the outward offset from the natural stance, foot Y the lift.
 */
export const NEUTRAL_POSE: Pose = {
  rootX: 0, rootY: 0.1, pelvisRot: 0, spineRot: 0, chestRot: 0, chestShift: 0, neckRot: 0, headRot: 0,
  shoulderL: 0, shoulderR: 0,
  armL: 0.2, elbowL: -0.16, wristL: 0, armR: 0.2, elbowR: -0.16, wristR: 0,
  footXL: 0, footYL: 0, kneeL: 0.3, footXR: 0, footYR: 0, kneeR: 0.3,
  yaw: 0,
};

export const TAU = Math.PI * 2;
const wrapAngle = (a: number) => {
  let v = a % TAU;
  if (v > Math.PI) v -= TAU;
  if (v < -Math.PI) v += TAU;
  return v;
};

export function makePose(overrides: Partial<Pose> = {}, base: Pose = NEUTRAL_POSE): Pose {
  return { ...base, ...overrides };
}

/** Linear blend of every channel; yaw blends along the shortest arc. */
export function blendPoses(a: Pose, b: Pose, t: number): Pose {
  const w = Math.min(1, Math.max(0, t));
  const out = {} as Pose;
  for (const c of POSE_CHANNELS) {
    out[c] = c === 'yaw' ? a.yaw + wrapAngle(b.yaw - a.yaw) * w : a[c] + (b[c] - a[c]) * w;
  }
  return out;
}

export function mirrorPose(p: Pose): Pose {
  const out = { ...p };
  for (const c of SIGNED_CHANNELS) out[c] = -p[c];
  for (const [l, r] of MIRROR_PAIRS) {
    out[l] = p[r];
    out[r] = p[l];
  }
  return out;
}

/** Scales the deviation from neutral (amplitude). Yaw is never scaled so turns always complete. */
export function scalePose(p: Pose, amount: number): Pose {
  const out = { ...p };
  for (const c of POSE_CHANNELS) {
    if (c === 'yaw') continue;
    out[c] = NEUTRAL_POSE[c] + (p[c] - NEUTRAL_POSE[c]) * amount;
  }
  return out;
}

/** Takes the lower-body channels from `lower` and the upper-body channels from `upper`. */
export function layerPoses(lower: Pose, upper: Pose): Pose {
  const out = { ...lower };
  for (const c of UPPER_CHANNELS) out[c] = upper[c];
  return out;
}

export type BodyProportions = {
  gender: DanceAvatarGender;
  headH: number; headW: number;
  neckLen: number; neckW: number;
  chestLen: number; pelvisLen: number;
  shoulderHalf: number; waistHalf: number; hipHalf: number; hipWide: number; ribHalf: number; trapHalf: number;
  upperArm: number; forearm: number; hand: number;
  thigh: number; shin: number; ankleH: number; foot: number;
  stance: number;
  deltoidR: number; bicepR: number; elbowR: number; forearmR: number; wristR: number; palmR: number;
  thighR: number; midThighR: number; kneeR: number; calfR: number; ankleR: number;
  depthRatio: number;
};

const FEMALE: BodyProportions = {
  gender: 'female',
  headH: 1, headW: 0.74,
  neckLen: 0.32, neckW: 0.15,
  chestLen: 1.55, pelvisLen: 1.0,
  shoulderHalf: 0.8, waistHalf: 0.42, hipHalf: 0.44, hipWide: 0.9, ribHalf: 0.56, trapHalf: 0.46,
  upperArm: 1.32, forearm: 1.12, hand: 0.7,
  thigh: 1.86, shin: 1.8, ankleH: 0.26, foot: 0.62,
  stance: 0.44,
  deltoidR: 0.23, bicepR: 0.17, elbowR: 0.12, forearmR: 0.14, wristR: 0.085, palmR: 0.12,
  thighR: 0.43, midThighR: 0.33, kneeR: 0.17, calfR: 0.2, ankleR: 0.085,
  depthRatio: 0.58,
};

const MALE: BodyProportions = {
  gender: 'male',
  headH: 1, headW: 0.78,
  neckLen: 0.3, neckW: 0.23,
  chestLen: 1.72, pelvisLen: 0.86,
  shoulderHalf: 0.98, waistHalf: 0.6, hipHalf: 0.4, hipWide: 0.7, ribHalf: 0.78, trapHalf: 0.6,
  upperArm: 1.42, forearm: 1.2, hand: 0.78,
  thigh: 1.92, shin: 1.86, ankleH: 0.28, foot: 0.7,
  stance: 0.46,
  deltoidR: 0.28, bicepR: 0.23, elbowR: 0.15, forearmR: 0.19, wristR: 0.11, palmR: 0.15,
  thighR: 0.37, midThighR: 0.33, kneeR: 0.2, calfR: 0.25, ankleR: 0.11,
  depthRatio: 0.62,
};

export function proportionsFor(gender: DanceAvatarGender): BodyProportions {
  return gender === 'male' ? MALE : FEMALE;
}

export function standingHeight(p: BodyProportions): number {
  return p.headH * 0.96 + p.neckLen + p.chestLen + p.pelvisLen + p.thigh + p.shin + p.ankleH;
}

export type Vec = { x: number; y: number };

export type Secondary = {
  /** Lagged sideways displacement used for hair swing (head units, + = right). */
  hairSwing: number;
  /** 0..1 outward hair flare from spins. */
  hairFlare: number;
  /** Follow-through tilt for the head (radians). */
  headLag: number;
};

export const NO_SECONDARY: Secondary = { hairSwing: 0, hairFlare: 0, headLag: 0 };

export type Skeleton = {
  props: BodyProportions;
  rootX: number;
  pelvis: Vec; waist: Vec; neckBase: Vec; neckTop: Vec; head: Vec;
  pelvisRot: number; waistRot: number; chestRot: number; headRot: number;
  shoulderL: Vec; shoulderR: Vec; elbowL: Vec; elbowR: Vec; wristL: Vec; wristR: Vec; handL: Vec; handR: Vec;
  hipL: Vec; hipR: Vec; kneeL: Vec; kneeR: Vec; ankleL: Vec; ankleR: Vec; toeL: Vec; toeR: Vec;
  /** cos(yaw): 1 facing camera, -1 facing away. */
  facing: number;
  /** Horizontal width factor for volumes (never collapses to 0 in profile). */
  widthFactor: number;
  shoulderRaiseL: number; shoulderRaiseR: number;
  secondary: Secondary;
};

const rot = (x: number, y: number, a: number): Vec => ({
  x: x * Math.cos(a) - y * Math.sin(a),
  y: x * Math.sin(a) + y * Math.cos(a),
});
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
/** Direction for a limb angle measured from straight down, positive = outward on `side`. */
const limbDir = (angle: number, side: number): Vec => ({ x: side * Math.sin(angle), y: Math.cos(angle) });

/** Frontal-view two-bone IK: knee sits between hip and ankle, pushed outward by `turnout`. */
export function solveLeg(hip: Vec, target: Vec, thigh: number, shin: number, side: number, turnout: number) {
  const reach = (thigh + shin) * 0.999;
  let dx = target.x - hip.x;
  let dy = target.y - hip.y;
  let d = Math.hypot(dx, dy) || 1e-6;
  let ankle = target;
  if (d > reach) {
    ankle = { x: hip.x + (dx / d) * reach, y: hip.y + (dy / d) * reach };
    dx = ankle.x - hip.x; dy = ankle.y - hip.y; d = reach;
  }
  const along = d * (thigh / (thigh + shin));
  const bend = Math.sqrt(Math.max(0, thigh * thigh - along * along));
  const ux = dx / d, uy = dy / d;
  // Perpendicular pointing to the outside of the body on this side.
  let px = -uy, py = ux;
  if (px * side < 0) { px = -px; py = -py; }
  const out = Math.min(1, Math.max(0, turnout));
  const knee = { x: hip.x + ux * along + px * bend * out, y: hip.y + uy * along + py * bend * out };
  return { knee, ankle };
}

export function solveSkeleton(pose: Pose, props: BodyProportions, secondary: Secondary = NO_SECONDARY): Skeleton {
  const legLen = props.thigh + props.shin + props.ankleH;
  const pelvis: Vec = { x: pose.rootX, y: -legLen + pose.rootY };
  const pelvisRot = pose.pelvisRot;
  const waist = add(pelvis, rot(0, -props.pelvisLen, pelvisRot));
  const waistRot = pelvisRot + pose.spineRot;
  const chestRot = waistRot + pose.chestRot;
  const neckBase = add(waist, rot(pose.chestShift, -props.chestLen, chestRot));
  const neckRot = chestRot + pose.neckRot + secondary.headLag;
  const neckTop = add(neckBase, rot(0, -props.neckLen, neckRot));
  const headRot = neckRot + pose.headRot;
  const head = add(neckTop, rot(0, -props.headH * 0.44, headRot));

  const shoulder = (side: number, raise: number) =>
    add(neckBase, rot(side * props.shoulderHalf, 0.34 - raise, chestRot));
  const shoulderL = shoulder(-1, pose.shoulderL);
  const shoulderR = shoulder(1, pose.shoulderR);

  const arm = (s: Vec, side: number, a: number, e: number, w: number) => {
    const elbow = add(s, scale(limbDir(a, side), props.upperArm));
    const wrist = add(elbow, scale(limbDir(a + e, side), props.forearm));
    const hand = add(wrist, scale(limbDir(a + e + w, side), props.hand));
    return { elbow, wrist, hand };
  };
  const aL = arm(shoulderL, -1, pose.armL, pose.elbowL, pose.wristL);
  const aR = arm(shoulderR, 1, pose.armR, pose.elbowR, pose.wristR);

  const hipL = add(pelvis, rot(-props.hipHalf, 0, pelvisRot));
  const hipR = add(pelvis, rot(props.hipHalf, 0, pelvisRot));
  const leg = (hip: Vec, side: number, fx: number, fy: number, turnout: number) => {
    const target = { x: side * (props.stance + fx), y: -props.ankleH - Math.max(0, fy) };
    const { knee, ankle } = solveLeg(hip, target, props.thigh, props.shin, side, turnout);
    const lifted = Math.min(1, Math.max(0, (-props.ankleH - ankle.y) / 0.35));
    const toe = {
      x: ankle.x + side * (0.2 * (1 - lifted) + 0.07 * lifted),
      y: ankle.y + props.ankleH * 0.92 * (1 - lifted) + props.foot * 0.7 * lifted,
    };
    return { knee, ankle, toe };
  };
  const lL = leg(hipL, -1, pose.footXL, pose.footYL, pose.kneeL);
  const lR = leg(hipR, 1, pose.footXR, pose.footYR, pose.kneeR);

  const cosY = Math.cos(pose.yaw);
  const sinY = Math.sin(pose.yaw);
  const widthFactor = Math.sqrt(cosY * cosY + (props.depthRatio * sinY) ** 2);
  const cx = pose.rootX;
  const yawed = (v: Vec): Vec => ({ x: cx + (v.x - cx) * cosY, y: v.y });

  return {
    props,
    rootX: cx,
    pelvis: yawed(pelvis), waist: yawed(waist), neckBase: yawed(neckBase), neckTop: yawed(neckTop), head: yawed(head),
    pelvisRot: pelvisRot * cosY, waistRot: waistRot * cosY, chestRot: chestRot * cosY, headRot: headRot * cosY,
    shoulderL: yawed(shoulderL), shoulderR: yawed(shoulderR),
    elbowL: yawed(aL.elbow), elbowR: yawed(aR.elbow), wristL: yawed(aL.wrist), wristR: yawed(aR.wrist),
    handL: yawed(aL.hand), handR: yawed(aR.hand),
    hipL: yawed(hipL), hipR: yawed(hipR), kneeL: yawed(lL.knee), kneeR: yawed(lR.knee),
    ankleL: yawed(lL.ankle), ankleR: yawed(lR.ankle), toeL: yawed(lL.toe), toeR: yawed(lR.toe),
    facing: cosY,
    widthFactor,
    shoulderRaiseL: pose.shoulderL, shoulderRaiseR: pose.shoulderR,
    secondary,
  };
}

function scale(v: Vec, k: number): Vec {
  return { x: v.x * k, y: v.y * k };
}

export const SKELETON_JOINTS = [
  'pelvis', 'waist', 'neckBase', 'neckTop', 'head',
  'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'handL', 'handR',
  'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR',
] as const;
