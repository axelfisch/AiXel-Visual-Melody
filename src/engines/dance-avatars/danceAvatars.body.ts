// Volumetric body built over the skeleton: tapered limb chains (hulls of
// circles), a smooth bezier torso (shoulders -> waist -> hips), neck, head,
// hands, feet and hair. Output is in pixels so every style draws the same body.

import type { Skeleton, Vec } from './danceAvatars.skeleton';

export type BodyGroup = 'hairBack' | 'legL' | 'legR' | 'torso' | 'neck' | 'head' | 'hairFront' | 'armL' | 'armR';

export type ChainPoint = { x: number; y: number; r: number };
export type BodyPrimitive =
  | { kind: 'chain'; group: BodyGroup; pts: ChainPoint[] }
  | { kind: 'shape'; group: BodyGroup; outline: Vec[]; left: Vec[]; right: Vec[] }
  | { kind: 'ellipse'; group: BodyGroup; x: number; y: number; rx: number; ry: number; rot: number };

export type BodyTransform = { cx: number; floorY: number; scale: number };

export const DRAW_ORDER: BodyGroup[] = ['hairBack', 'legL', 'legR', 'torso', 'neck', 'head', 'hairFront', 'armL', 'armR'];

const lerpV = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const rot = (x: number, y: number, a: number): Vec => ({
  x: x * Math.cos(a) - y * Math.sin(a),
  y: x * Math.sin(a) + y * Math.cos(a),
});

export function buildBody(sk: Skeleton, tf: BodyTransform): BodyPrimitive[] {
  const p = sk.props;
  const female = p.gender === 'female';
  const s = tf.scale;
  const px = (v: Vec): Vec => ({ x: tf.cx + v.x * s, y: tf.floorY + v.y * s });
  const cp = (v: Vec, r: number): ChainPoint => ({ ...px(v), r: r * s });
  const wf = sk.widthFactor;
  const frame = (o: Vec, a: number) => (x: number, y: number): Vec => {
    const d = rot(x * wf, y, a);
    return { x: o.x + d.x, y: o.y + d.y };
  };
  const chestF = frame(sk.neckBase, sk.chestRot);
  const waistF = frame(sk.waist, sk.waistRot);
  const pelvisF = frame(sk.pelvis, sk.pelvisRot);
  const prims: BodyPrimitive[] = [];

  // ---- torso outline (one side, top -> bottom); x is mirrored per side.
  const side = (sgn: number): Vec[] => {
    const raise = sgn < 0 ? sk.shoulderRaiseL : sk.shoulderRaiseR;
    const pts: Vec[] = [
      chestF(sgn * p.neckW * 1.02, -0.02),
      chestF(sgn * p.trapHalf, 0.12 - raise * 0.5),
      chestF(sgn * (p.shoulderHalf - 0.04), 0.2 - raise),
      chestF(sgn * p.shoulderHalf * (female ? 0.8 : 0.9), 0.72),
    ];
    if (female) {
      pts.push(chestF(sgn * (p.ribHalf + 0.05), 0.98), chestF(sgn * p.ribHalf * 0.96, 1.25));
    } else {
      pts.push(chestF(sgn * p.ribHalf, 1.02), chestF(sgn * (p.ribHalf - 0.06), 1.36));
    }
    pts.push(waistF(sgn * p.waistHalf, 0));
    pts.push(
      pelvisF(sgn * p.hipWide * (female ? 0.82 : 0.96), -0.42),
      pelvisF(sgn * p.hipWide, 0.02),
      pelvisF(sgn * p.hipWide * 0.5, 0.3),
    );
    return pts.map(px);
  };
  const left = side(-1);
  const right = side(1);
  const crotch = px(pelvisF(0, 0.34));
  prims.push({ kind: 'shape', group: 'torso', left, right, outline: [...left, crotch, ...right.slice().reverse()] });

  // ---- neck
  prims.push({ kind: 'chain', group: 'neck', pts: [cp(lerpV(sk.neckBase, sk.neckTop, -0.1), p.neckW * 1.08), cp(sk.neckTop, p.neckW * 0.92)] });

  // ---- head (cranium + jaw) and hair
  const headWf = Math.sqrt(sk.facing * sk.facing + 0.85 * 0.85 * (1 - sk.facing * sk.facing));
  const hRx = (p.headW / 2) * headWf;
  const hRy = p.headH / 2;
  const hc = sk.head;
  const along = (dy: number, dx = 0) => {
    const d = rot(dx, dy, sk.headRot);
    return { x: hc.x + d.x, y: hc.y + d.y };
  };
  const headC = px(along(-0.04));
  prims.push({ kind: 'ellipse', group: 'head', x: headC.x, y: headC.y, rx: hRx * s, ry: hRy * 0.92 * s, rot: sk.headRot });
  const jaw = px(along(0.2));
  prims.push({ kind: 'ellipse', group: 'head', x: jaw.x, y: jaw.y, rx: hRx * (female ? 0.72 : 0.84) * s, ry: hRy * 0.5 * s, rot: sk.headRot });

  const swing = sk.secondary.hairSwing;
  const flare = sk.secondary.hairFlare;
  if (female) {
    const cap = px(along(-0.1));
    prims.push({ kind: 'ellipse', group: 'hairBack', x: cap.x, y: cap.y, rx: hRx * 1.14 * s, ry: hRy * 0.98 * s, rot: sk.headRot });
    const nb = sk.neckBase;
    // Back mass: fills the space around the neck like long hair seen from the front.
    prims.push({
      kind: 'chain', group: 'hairBack', pts: [
        cp(along(0.0), hRx * 1.1),
        cp({ x: nb.x + swing * 0.25, y: nb.y - 0.2 }, hRx * 1.12),
        cp({ x: nb.x + swing * 0.6, y: nb.y + 0.45 }, hRx * 0.95),
        cp({ x: nb.x + swing * 1.0, y: nb.y + 0.95 }, hRx * 0.55),
      ],
    });
    for (const sgn of [-1, 1]) {
      const out = sgn * (1 + flare * 0.9);
      prims.push({
        kind: 'chain', group: 'hairFront', pts: [
          cp(along(-0.05, sgn * hRx * 0.82), 0.17),
          cp(along(0.38, sgn * hRx * 1.02), 0.18),
          cp({ x: nb.x + out * (p.neckW + 0.28) + swing * 0.55, y: nb.y + 0.12 - flare * 0.3 }, 0.16),
          cp({ x: nb.x + out * (p.neckW + 0.32) + swing * 1.05, y: nb.y + 0.62 - flare * 0.5 }, 0.12),
          cp({ x: nb.x + out * (p.neckW + 0.3) + swing * 1.5, y: nb.y + 1.02 - flare * 0.7 }, 0.05),
        ],
      });
    }
  } else {
    const cap = px(along(-0.14));
    prims.push({ kind: 'ellipse', group: 'hairBack', x: cap.x, y: cap.y, rx: hRx * 1.05 * s, ry: hRy * 0.8 * s, rot: sk.headRot - swing * 0.05 });
    const quiff = px(along(-0.42, 0.08 + swing * 0.04));
    prims.push({ kind: 'ellipse', group: 'hairBack', x: quiff.x, y: quiff.y, rx: hRx * 0.8 * s, ry: hRy * 0.34 * s, rot: sk.headRot - 0.15 });
  }

  // ---- arms (deltoid, biceps, elbow, forearm, wrist, palm, fingers)
  const arm = (S: Vec, E: Vec, W: Vec, H: Vec, group: BodyGroup) => {
    prims.push({
      kind: 'chain', group, pts: [
        cp(S, p.deltoidR),
        cp(lerpV(S, E, 0.3), p.bicepR * 1.08),
        cp(lerpV(S, E, 0.65), p.bicepR * 0.92),
        cp(E, p.elbowR),
        cp(lerpV(E, W, 0.25), p.forearmR),
        cp(W, p.wristR),
        cp(lerpV(W, H, 0.38), p.palmR),
        cp(lerpV(W, H, 0.72), p.palmR * 0.8),
        cp(H, p.palmR * 0.42),
      ],
    });
  };
  arm(sk.shoulderL, sk.elbowL, sk.wristL, sk.handL, 'armL');
  arm(sk.shoulderR, sk.elbowR, sk.wristR, sk.handR, 'armR');

  // ---- legs (thigh, knee, calf, ankle) + feet
  const leg = (Hp: Vec, K: Vec, A: Vec, T: Vec, group: BodyGroup) => {
    prims.push({
      kind: 'chain', group, pts: [
        cp(Hp, p.thighR),
        cp(lerpV(Hp, K, 0.3), p.midThighR + 0.02),
        cp(lerpV(Hp, K, 0.72), (p.midThighR + p.kneeR) * 0.52),
        cp(K, p.kneeR),
        cp(lerpV(K, A, 0.28), p.calfR),
        cp(lerpV(K, A, 0.68), p.ankleR * 1.45),
        cp(A, p.ankleR),
        cp(lerpV(A, T, 0.5), p.ankleR * (female ? 1.05 : 1.25)),
        cp(T, female ? 0.05 : 0.07),
      ],
    });
  };
  leg(sk.hipL, sk.kneeL, sk.ankleL, sk.toeL, 'legL');
  leg(sk.hipR, sk.kneeR, sk.ankleR, sk.toeR, 'legR');

  prims.sort((a, b) => DRAW_ORDER.indexOf(a.group) - DRAW_ORDER.indexOf(b.group));
  return prims;
}

/** Adds the convex hull of two circles to the current path. */
export function hullPath(ctx: CanvasRenderingContext2D, a: ChainPoint, b: ChainPoint) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d <= Math.abs(a.r - b.r) + 1e-6) {
    const big = a.r >= b.r ? a : b;
    ctx.moveTo(big.x + big.r, big.y);
    ctx.arc(big.x, big.y, big.r, 0, Math.PI * 2);
    return;
  }
  const base = Math.atan2(dy, dx);
  const phi = Math.acos(Math.max(-1, Math.min(1, (a.r - b.r) / d)));
  ctx.moveTo(a.x + a.r * Math.cos(base + phi), a.y + a.r * Math.sin(base + phi));
  ctx.arc(a.x, a.y, a.r, base + phi, base - phi + Math.PI * 2);
  ctx.arc(b.x, b.y, b.r, base - phi, base + phi);
  ctx.closePath();
}

export function smoothClosedPath(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  const n = pts.length;
  if (n < 3) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
      p2.x, p2.y,
    );
  }
  ctx.closePath();
}

export function tracePrimitive(ctx: CanvasRenderingContext2D, prim: BodyPrimitive) {
  if (prim.kind === 'chain') {
    for (let i = 0; i < prim.pts.length - 1; i += 1) hullPath(ctx, prim.pts[i], prim.pts[i + 1]);
  } else if (prim.kind === 'shape') {
    smoothClosedPath(ctx, prim.outline);
  } else {
    ctx.moveTo(prim.x + Math.cos(prim.rot) * prim.rx, prim.y + Math.sin(prim.rot) * prim.rx);
    ctx.ellipse(prim.x, prim.y, Math.max(0.1, prim.rx), Math.max(0.1, prim.ry), prim.rot, 0, Math.PI * 2);
    ctx.closePath();
  }
}

/** Fills every primitive (optionally only some groups) with the current fillStyle. */
export function fillBody(ctx: CanvasRenderingContext2D, prims: BodyPrimitive[], groups?: BodyGroup[]) {
  for (const prim of prims) {
    if (groups && !groups.includes(prim.group)) continue;
    ctx.beginPath();
    tracePrimitive(ctx, prim);
    ctx.fill();
  }
}

export function bodyBounds(prims: BodyPrimitive[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x: number, y: number, r: number) => {
    minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r); maxY = Math.max(maxY, y + r);
  };
  for (const prim of prims) {
    if (prim.kind === 'chain') prim.pts.forEach((pt) => grow(pt.x, pt.y, pt.r));
    else if (prim.kind === 'shape') prim.outline.forEach((pt) => grow(pt.x, pt.y, 4));
    else grow(prim.x, prim.y, Math.max(prim.rx, prim.ry));
  }
  return { minX, minY, maxX, maxY };
}

/** Deterministic point on the body surface for particle styles (u,v,w in [0,1)). */
export function samplePrimitive(prim: BodyPrimitive, u: number, v: number, w: number): Vec {
  if (prim.kind === 'chain') {
    const n = prim.pts.length - 1;
    const f = u * n;
    const i = Math.min(n - 1, Math.floor(f));
    const t = f - i;
    const a = prim.pts[i], b = prim.pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const r = a.r + (b.r - a.r) * t;
    const across = (v * 2 - 1);
    const edge = Math.sign(across) * Math.pow(Math.abs(across), 0.55) * r;
    return { x: a.x + dx * t + (-dy / len) * edge, y: a.y + dy * t + (dx / len) * edge };
  }
  if (prim.kind === 'ellipse') {
    const ang = u * Math.PI * 2;
    const rr = Math.pow(v, 0.35);
    const x = Math.cos(ang) * prim.rx * rr, y = Math.sin(ang) * prim.ry * rr;
    return { x: prim.x + x * Math.cos(prim.rot) - y * Math.sin(prim.rot), y: prim.y + x * Math.sin(prim.rot) + y * Math.cos(prim.rot) };
  }
  const n = prim.left.length - 1;
  const f = v * n;
  const i = Math.min(n - 1, Math.floor(f));
  const t = f - i;
  const l = lerpV(prim.left[i], prim.left[i + 1], t);
  const r = lerpV(prim.right[i], prim.right[i + 1], t);
  const across = u * 2 - 1;
  const k = 0.5 + 0.5 * Math.sign(across) * Math.pow(Math.abs(across), 0.6) * (0.96 + w * 0.04);
  return lerpV(l, r, k);
}
