import { describe, expect, it } from 'vitest';
import {
  NEUTRAL_POSE, POSE_CHANNELS, SKELETON_JOINTS, blendPoses, layerPoses, makePose, mirrorPose,
  proportionsFor, scalePose, solveLeg, solveSkeleton, standingHeight,
} from './danceAvatars.skeleton';
import { buildBody, bodyBounds } from './danceAvatars.body';

describe('Dance Avatars skeleton', () => {
  it('exposes a rig with at least 16 joints', () => {
    expect(SKELETON_JOINTS.length).toBeGreaterThanOrEqual(16);
    const sk = solveSkeleton(NEUTRAL_POSE, proportionsFor('female'));
    for (const joint of SKELETON_JOINTS) {
      expect(Number.isFinite(sk[joint].x)).toBe(true);
      expect(Number.isFinite(sk[joint].y)).toBe(true);
    }
  });

  it('stands with feet on the floor and head on top', () => {
    for (const gender of ['female', 'male'] as const) {
      const props = proportionsFor(gender);
      const sk = solveSkeleton(NEUTRAL_POSE, props);
      expect(sk.ankleL.y).toBeCloseTo(-props.ankleH, 5);
      expect(sk.ankleR.y).toBeCloseTo(-props.ankleH, 5);
      expect(sk.head.y).toBeLessThan(sk.neckTop.y);
      expect(sk.neckTop.y).toBeLessThan(sk.pelvis.y);
      expect(-sk.head.y).toBeGreaterThan(standingHeight(props) * 0.8);
    }
  });

  it('gives women narrower shoulders and wider hips than men', () => {
    const f = proportionsFor('female');
    const m = proportionsFor('male');
    expect(f.shoulderHalf).toBeLessThan(m.shoulderHalf);
    expect(f.hipWide).toBeGreaterThan(m.hipWide);
    expect(f.waistHalf / f.hipWide).toBeLessThan(m.waistHalf / m.hipWide);
  });

  it('blends poses channel by channel and along the shortest yaw arc', () => {
    const a = makePose({ armL: 0, yaw: 0.1 });
    const b = makePose({ armL: 2, yaw: Math.PI * 2 - 0.1 });
    const mid = blendPoses(a, b, 0.5);
    expect(mid.armL).toBeCloseTo(1);
    expect(Math.abs(Math.sin(mid.yaw))).toBeLessThan(0.01);
    expect(blendPoses(a, b, 0)).toEqual(a);
    expect(blendPoses(a, b, 1).armL).toBeCloseTo(2);
  });

  it('mirrors left/right channels and flips signed channels', () => {
    const p = makePose({ armL: 2.5, armR: 0.3, rootX: 0.2, footYL: 0.8, pelvisRot: -0.1 });
    const m = mirrorPose(p);
    expect(m.armR).toBe(2.5);
    expect(m.armL).toBe(0.3);
    expect(m.footYR).toBe(0.8);
    expect(m.rootX).toBe(-0.2);
    expect(m.pelvisRot).toBe(0.1);
    expect(mirrorPose(m)).toEqual(p);
  });

  it('scales amplitude around neutral but never scales turns', () => {
    const p = makePose({ armL: NEUTRAL_POSE.armL + 1, yaw: 3 });
    const s = scalePose(p, 0.5);
    expect(s.armL).toBeCloseTo(NEUTRAL_POSE.armL + 0.5);
    expect(s.yaw).toBe(3);
  });

  it('layers upper body from one pose over the lower body of another', () => {
    const lower = makePose({ footYL: 1, armL: 0.1 });
    const upper = makePose({ footYL: 0, armL: 2.8 });
    const out = layerPoses(lower, upper);
    expect(out.footYL).toBe(1);
    expect(out.armL).toBe(2.8);
    expect(Object.keys(out).sort()).toEqual([...POSE_CHANNELS].sort());
  });

  it('solves a reachable leg exactly and clamps an unreachable target', () => {
    const hip = { x: 0, y: -3 };
    // turnout 1 = knee fully in the picture plane: exact bone lengths.
    const ok = solveLeg(hip, { x: 0.2, y: -0.5 }, 1.5, 1.5, 1, 1);
    expect(ok.ankle).toEqual({ x: 0.2, y: -0.5 });
    expect(Math.hypot(ok.knee.x - hip.x, ok.knee.y - hip.y)).toBeCloseTo(1.5, 5);
    expect(Math.hypot(ok.knee.x - 0.2, ok.knee.y + 0.5)).toBeCloseTo(1.5, 5);
    expect(ok.knee.x).toBeGreaterThan(0.1);
    // Smaller turnout = knee bends toward the camera (foreshortened in the frontal view).
    const front = solveLeg(hip, { x: 0.2, y: -0.5 }, 1.5, 1.5, 1, 0.3);
    expect(Math.hypot(front.knee.x - hip.x, front.knee.y - hip.y)).toBeLessThanOrEqual(1.5);
    const far = solveLeg(hip, { x: 0, y: 5 }, 1.5, 1.5, 1, 0.3);
    expect(Math.hypot(far.ankle.x - hip.x, far.ankle.y - hip.y)).toBeLessThanOrEqual(3);
  });

  it('lifts the foot for knee lifts', () => {
    const sk = solveSkeleton(makePose({ footYL: 1.2, kneeL: 1 }), proportionsFor('male'));
    expect(sk.ankleL.y).toBeLessThan(sk.ankleR.y - 1);
    expect(sk.kneeL.x).toBeLessThan(sk.hipL.x);
  });

  it('builds a volumetric body (torso, head, limbs, hair) that fits its bounds', () => {
    for (const gender of ['female', 'male'] as const) {
      const sk = solveSkeleton(NEUTRAL_POSE, proportionsFor(gender));
      const prims = buildBody(sk, { cx: 640, floorY: 620, scale: 55 });
      const groups = new Set(prims.map((p) => p.group));
      for (const g of ['torso', 'head', 'neck', 'armL', 'armR', 'legL', 'legR', 'hairBack']) expect(groups.has(g as never)).toBe(true);
      const b = bodyBounds(prims);
      expect(b.maxY).toBeGreaterThan(600);
      expect(b.minY).toBeLessThan(620 - 55 * 7);
      const torso = prims.find((p) => p.kind === 'shape');
      expect(torso && torso.kind === 'shape' && torso.outline.length).toBeGreaterThan(12);
    }
  });
});
