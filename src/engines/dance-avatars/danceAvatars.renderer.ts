import { adjustSaturation, applyWarmthOverlay, drawAmbientSparkles } from '../engine.directorFx';
import type { EngineFrame, RenderSurface } from '../engine.types';
import {
  bodyBounds, buildBody, fillBody, samplePrimitive, tracePrimitive,
  type BodyGroup, type BodyPrimitive,
} from './danceAvatars.body';
import { complexityFromExpressiveness, evaluateDance, hash01, seedFrom } from './danceAvatars.choreography';
import { proportionsFor, solveSkeleton, standingHeight, type Skeleton } from './danceAvatars.skeleton';
import type { DanceAvatarStyle, DanceAvatarsConfig } from './danceAvatars.types';

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ------------------------------------------------------------ color helpers
function rgb(hex: string): [number, number, number] {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff';
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(a).toFixed(3)})`;
}

// ------------------------------------------------------------ offscreen layers
type Ctx2D = CanvasRenderingContext2D;
type Layer = { canvas: CanvasImageSource; ctx: Ctx2D };
const layerCache = new Map<string, Layer | null>();

function createLayer(width: number, height: number): Layer | null {
  try {
    const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => OffscreenCanvas }).OffscreenCanvas;
    if (Offscreen) {
      const canvas = new Offscreen(width, height);
      const ctx = canvas.getContext('2d') as unknown as Ctx2D | null;
      if (ctx) return { canvas: canvas as unknown as CanvasImageSource, ctx };
    }
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) return { canvas, ctx };
    }
  } catch {
    // fall through: no offscreen rendering available
  }
  return null;
}

function layer(name: string, width: number, height: number): Layer | null {
  const key = `${name}:${width}x${height}`;
  if (!layerCache.has(key)) {
    if (layerCache.size > 16) layerCache.clear();
    layerCache.set(key, createLayer(width, height));
  }
  return layerCache.get(key) ?? null;
}

type Box = { x: number; y: number; w: number; h: number };

function reset(ctx: Ctx2D) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** Full clear so nothing from a previous frame can leak in (keeps frames deterministic). */
function clearLayer(target: Layer) {
  reset(target.ctx);
  const c = target.canvas as { width: number; height: number };
  target.ctx.clearRect(0, 0, c.width, c.height);
}

function copy(dst: Layer, src: Layer, box: Box, dx = 0, dy = 0) {
  dst.ctx.drawImage(src.canvas, box.x, box.y, box.w, box.h, box.x + dx, box.y + dy, box.w, box.h);
}

/** Solid white union mask of the body (or of some body groups). */
function paintMask(target: Layer, prims: BodyPrimitive[], box: Box, groups?: BodyGroup[]) {
  clearLayer(target);
  target.ctx.fillStyle = '#ffffff';
  fillBody(target.ctx, prims, groups);
}

/** Colors the mask into `out`. */
function tint(out: Layer, mask: Layer, box: Box, fill: string | CanvasGradient) {
  clearLayer(out);
  copy(out, mask, box);
  out.ctx.globalCompositeOperation = 'source-in';
  out.ctx.fillStyle = fill;
  out.ctx.fillRect(box.x, box.y, box.w, box.h);
  out.ctx.globalCompositeOperation = 'source-over';
}

/** Outline ring of the silhouette: dilated mask minus the mask itself. */
function ring(out: Layer, mask: Layer, box: Box, thickness: number, fill: string) {
  clearLayer(out);
  const steps = 8;
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * TAU;
    copy(out, mask, box, Math.cos(a) * thickness, Math.sin(a) * thickness);
  }
  out.ctx.globalCompositeOperation = 'source-in';
  out.ctx.fillStyle = fill;
  out.ctx.fillRect(box.x - thickness, box.y - thickness, box.w + thickness * 2, box.h + thickness * 2);
  out.ctx.globalCompositeOperation = 'destination-out';
  copy(out, mask, box);
  out.ctx.globalCompositeOperation = 'source-over';
}

function blit(ctx: Ctx2D, src: Layer, box: Box, pad = 0) {
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  const w = box.w + pad * 2, h = box.h + pad * 2;
  ctx.drawImage(src.canvas, x, y, w, h, x, y, w, h);
}

// ------------------------------------------------------------ scene
type Scene = {
  ctx: Ctx2D;
  width: number;
  height: number;
  prims: BodyPrimitive[];
  sk: Skeleton;
  box: Box;
  primary: string;
  accent: string;
  glow: number;
  energy: number;
  pulse: number;
  sparkle: number;
  time: number;
  unit: number;
  floorY: number;
  cx: number;
  bodyH: number;
};

type Layers = { mask: Layer; arms: Layer; ringA: Layer; ringB: Layer; tint: Layer };

function drawFloor(scene: Scene, color: string, strength: number) {
  const { ctx, cx, floorY, bodyH } = scene;
  ctx.save();
  ctx.translate(cx + (scene.sk.rootX * bodyH) / 8, floorY);
  ctx.scale(1, 0.16);
  const r = bodyH * 0.36;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, strength));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawShadow(scene: Scene, L: Layers) {
  const { ctx, box, primary, accent, glow, energy, pulse, floorY } = scene;
  // Long floor shadow stretching behind the dancer.
  tint(L.tint, L.mask, box, 'rgba(0, 0, 0, 0.5)');
  ctx.save();
  ctx.setTransform(1, 0, -0.9, 0.2, 0.9 * floorY, floorY * 0.8);
  ctx.globalAlpha = 0.9;
  ctx.drawImage(L.tint.canvas, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
  ctx.restore();
  // Solid, soft-edged silhouette with a backlit halo.
  tint(L.tint, L.mask, box, mix('#05060b', accent, 0.08));
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = scene.unit * (22 + 18 * energy * pulse) * glow;
  blit(ctx, L.tint, box);
  ctx.shadowBlur = scene.unit * 6 * glow;
  ctx.shadowColor = primary;
  blit(ctx, L.tint, box);
  ctx.restore();
  ring(L.ringA, L.mask, box, Math.max(1, scene.unit * 1.6), primary);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.25 + 0.3 * energy;
  blit(ctx, L.ringA, box, 4);
  ctx.restore();
}

const PARTICLE_GROUP_WEIGHTS: Array<[BodyGroup, number]> = [
  ['torso', 0.28], ['legL', 0.14], ['legR', 0.14], ['armL', 0.1], ['armR', 0.1],
  ['head', 0.1], ['neck', 0.03], ['hairFront', 0.07], ['hairBack', 0.04],
];

function drawParticles(scene: Scene, L: Layers | null) {
  const { ctx, prims, primary, accent, glow, energy, sparkle, time, unit } = scene;
  if (L) {
    tint(L.tint, L.mask, scene.box, primary);
    ctx.save();
    ctx.globalAlpha = 0.07 + 0.05 * energy;
    ctx.shadowColor = primary;
    ctx.shadowBlur = unit * 18 * glow;
    blit(ctx, L.tint, scene.box);
    ctx.restore();
  }
  const groups = new Map<BodyGroup, BodyPrimitive[]>();
  for (const prim of prims) {
    const list = groups.get(prim.group) ?? [];
    list.push(prim);
    groups.set(prim.group, list);
  }
  const weights = PARTICLE_GROUP_WEIGHTS.filter(([g]) => groups.has(g));
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  const count = Math.round((900 + 1100 * sparkle) * Math.max(0.6, scene.height / 720));
  const buckets: Array<[string, number]> = [[primary, 0.62], [accent, 0.25], ['#ffffff', 0.13]];
  const paths = buckets.map(() => [] as number[]);
  const glowPts: number[] = [];
  for (let i = 0; i < count; i += 1) {
    let pick = hash01(11, i, 1) * total;
    let group: BodyGroup = weights[0][0];
    for (const [g, w] of weights) {
      if (pick < w) { group = g; break; }
      pick -= w;
    }
    const list = groups.get(group) as BodyPrimitive[];
    const prim = list[Math.floor(hash01(11, i, 2) * list.length)];
    const u = hash01(11, i, 3), v = hash01(11, i, 4), w = hash01(11, i, 5);
    const drift = 0.015 * Math.sin(time * (1.1 + w) + i);
    const p = samplePrimitive(prim, clamp01(u + drift), v, w);
    let x = p.x + Math.sin(time * 2.1 + i * 1.7) * 0.7 * unit;
    let y = p.y + Math.cos(time * 1.7 + i * 2.3) * 0.7 * unit;
    if (w > 0.86) {
      const t = (time * 0.5 + w * 13) % 1;
      y -= t * 46 * unit * (0.25 + energy);
      x += Math.sin(i + time) * t * 10 * unit;
    }
    const c = hash01(11, i, 6);
    const b = c < 0.62 ? 0 : c < 0.87 ? 1 : 2;
    const size = (1 + hash01(11, i, 7) * 1.6 + energy * 0.8) * unit;
    paths[b].push(x - size / 2, y - size / 2, size);
    if (i % 7 === 0) glowPts.push(x, y, size * 3.2);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.14 + 0.1 * energy;
  ctx.fillStyle = primary;
  ctx.beginPath();
  for (let k = 0; k < glowPts.length; k += 3) {
    ctx.moveTo(glowPts[k] + glowPts[k + 2], glowPts[k + 1]);
    ctx.arc(glowPts[k], glowPts[k + 1], glowPts[k + 2], 0, TAU);
  }
  ctx.fill();
  buckets.forEach(([color], bi) => {
    ctx.globalAlpha = 0.62 + 0.3 * energy;
    ctx.fillStyle = color;
    ctx.beginPath();
    const arr = paths[bi];
    for (let k = 0; k < arr.length; k += 3) ctx.rect(arr[k], arr[k + 1], arr[k + 2], arr[k + 2]);
    ctx.fill();
  });
  ctx.restore();
}

function drawNeon(scene: Scene, L: Layers) {
  const { ctx, box, primary, accent, glow, energy, pulse, unit } = scene;
  tint(L.tint, L.mask, box, primary);
  ctx.save();
  ctx.globalAlpha = 0.07 + 0.05 * energy;
  blit(ctx, L.tint, box);
  ctx.restore();
  const tube = Math.max(1.5, unit * (2.6 + energy * 1.2));
  // Inner contours: arms and hair crossing the torso.
  paintMask(L.arms, scene.prims, box, ['armL', 'armR', 'hairFront']);
  ring(L.ringB, L.arms, box, Math.max(1, unit * 1.6), accent);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = accent;
  ctx.shadowBlur = unit * 10 * glow;
  ctx.globalAlpha = 0.55 + 0.25 * energy;
  blit(ctx, L.ringB, box, 6);
  ctx.restore();
  // Main glowing tube along the silhouette contour.
  ring(L.ringA, L.mask, box, tube, primary);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = primary;
  ctx.shadowBlur = unit * (16 + 10 * pulse * energy) * glow;
  ctx.globalAlpha = 0.9;
  blit(ctx, L.ringA, box, 8);
  // Bright core: same tube again without blur.
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.55;
  blit(ctx, L.ringA, box, 8);
  ctx.restore();
}

function chainGradient(ctx: Ctx2D, prim: Extract<BodyPrimitive, { kind: 'chain' }>, light: string, base: string, dark: string) {
  const a = prim.pts[0], b = prim.pts[prim.pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len, ny = dx / len;
  if (nx + ny < 0) { nx = -nx; ny = -ny; }
  const r = Math.max(...prim.pts.map((p) => p.r));
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const g = ctx.createLinearGradient(mx - nx * r, my - ny * r, mx + nx * r, my + ny * r);
  g.addColorStop(0, light);
  g.addColorStop(0.42, base);
  g.addColorStop(1, dark);
  return g;
}

// Mannequin look: legs overlap the pelvis like articulated hip joints.
const HUMANOID_ORDER: BodyGroup[] = ['hairBack', 'torso', 'legL', 'legR', 'neck', 'head', 'hairFront', 'armL', 'armR'];

function drawHumanoid(scene: Scene, L: Layers | null) {
  const { ctx, prims, primary, accent, glow, energy, unit } = scene;
  const base = mix(primary, '#b8bdca', 0.35);
  const light = mix(base, '#ffffff', 0.6);
  const dark = mix(base, '#070810', 0.62);
  const hairBase = mix(mix(accent, '#101218', 0.55), primary, 0.1);
  ctx.save();
  for (const group of HUMANOID_ORDER) {
    for (const prim of prims) {
      if (prim.group !== group) continue;
      const isHair = group === 'hairBack' || group === 'hairFront';
      const b0 = isHair ? hairBase : base;
      const l0 = isHair ? mix(hairBase, '#ffffff', 0.35) : light;
      const d0 = isHair ? mix(hairBase, '#000000', 0.5) : dark;
      if (prim.kind === 'chain') ctx.fillStyle = chainGradient(ctx, prim, l0, b0, d0);
      else if (prim.kind === 'ellipse') {
        const g = ctx.createRadialGradient(prim.x - prim.rx * 0.4, prim.y - prim.ry * 0.45, prim.rx * 0.1, prim.x, prim.y, Math.max(prim.rx, prim.ry) * 1.15);
        g.addColorStop(0, l0); g.addColorStop(0.5, b0); g.addColorStop(1, d0);
        ctx.fillStyle = g;
      } else {
        const xs = prim.outline.map((p) => p.x), ys = prim.outline.map((p) => p.y);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const g = ctx.createLinearGradient(x0, y0, x1, y0 + (y1 - y0) * 0.3);
        g.addColorStop(0, l0); g.addColorStop(0.5, b0); g.addColorStop(1, mix(b0, d0, 0.7));
        ctx.fillStyle = g;
      }
      ctx.beginPath();
      tracePrimitive(ctx, prim);
      ctx.fill();
      if (prim.kind === 'shape') {
        // Soft chest highlight and waist shading for volume.
        const top = prim.outline[0], w = Math.abs(prim.right[3].x - prim.left[3].x);
        const hg = ctx.createRadialGradient(top.x - w * 0.15, top.y + w * 0.55, 0, top.x - w * 0.15, top.y + w * 0.55, w * 0.7);
        hg.addColorStop(0, rgba('#ffffff', 0.22)); hg.addColorStop(1, rgba('#ffffff', 0));
        ctx.fillStyle = hg;
        ctx.beginPath(); tracePrimitive(ctx, prim); ctx.fill();
      }
    }
  }
  // Joint seams (elbows, knees, wrists) like an artist's mannequin.
  ctx.fillStyle = rgba(dark, 0.35);
  for (const prim of prims) {
    if (prim.kind !== 'chain' || !/^(arm|leg)/.test(prim.group)) continue;
    for (const idx of prim.group.startsWith('arm') ? [3, 5] : [3, 6]) {
      const p = prim.pts[idx];
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.9, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
  if (!L) return;
  // Arm separation lines where arms cross the torso, then accent rim light.
  paintMask(L.arms, prims, scene.box, ['armL', 'armR']);
  ring(L.ringB, L.arms, scene.box, Math.max(1, unit * 1.2), dark);
  ctx.save();
  ctx.globalAlpha = 0.55;
  blit(ctx, L.ringB, scene.box, 4);
  ring(L.ringA, L.mask, scene.box, Math.max(1, unit * 1.8), accent);
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = accent;
  ctx.shadowBlur = unit * 12 * glow;
  ctx.globalAlpha = 0.4 + 0.3 * energy;
  blit(ctx, L.ringA, scene.box, 6);
  ctx.restore();
}

function drawHologram(scene: Scene, L: Layers) {
  const { ctx, box, primary, accent, glow, energy, time, unit, floorY, cx, bodyH } = scene;
  // Projector disc and light cone.
  ctx.save();
  const coneTop = floorY - bodyH * 1.05;
  const cone = ctx.createLinearGradient(0, floorY, 0, coneTop);
  cone.addColorStop(0, rgba(primary, 0.16 + 0.1 * energy));
  cone.addColorStop(1, rgba(primary, 0));
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(cx - bodyH * 0.16, floorY);
  ctx.lineTo(cx - bodyH * 0.34, coneTop);
  ctx.lineTo(cx + bodyH * 0.34, coneTop);
  ctx.lineTo(cx + bodyH * 0.16, floorY);
  ctx.closePath();
  ctx.fill();
  ctx.translate(cx, floorY + 4 * unit);
  ctx.scale(1, 0.2);
  ctx.strokeStyle = rgba(primary, 0.7);
  ctx.lineWidth = 3 * unit;
  ctx.shadowColor = primary;
  ctx.shadowBlur = 14 * unit * glow;
  for (const r of [0.2, 0.26]) { ctx.beginPath(); ctx.arc(0, 0, bodyH * r, 0, TAU); ctx.stroke(); }
  ctx.restore();

  const flickerSeed = Math.floor(time * 14);
  const flicker = 0.78 + 0.22 * hash01(5, flickerSeed) - (hash01(6, flickerSeed) > 0.95 ? 0.35 : 0);
  const grad = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  grad.addColorStop(0, rgba(mix(primary, '#ffffff', 0.25), 0.62));
  grad.addColorStop(0.55, rgba(primary, 0.42));
  grad.addColorStop(1, rgba(accent, 0.34));
  tint(L.tint, L.mask, box, grad);
  // Scanlines cut into the translucent body.
  const gap = Math.max(3, Math.round(4 * unit));
  const offset = (time * 24 * unit) % gap;
  L.tint.ctx.globalCompositeOperation = 'destination-out';
  L.tint.ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (let y = box.y - gap + offset; y < box.y + box.h; y += gap) L.tint.ctx.fillRect(box.x, y, box.w, Math.max(1, gap * 0.4));
  L.tint.ctx.globalCompositeOperation = 'source-over';
  // Inner wireframe contours (arms, hair) for readability.
  paintMask(L.arms, scene.prims, box, ['armL', 'armR', 'hairFront', 'head']);
  ring(L.ringB, L.arms, box, Math.max(1, unit * 1.1), mix(primary, '#ffffff', 0.4));
  ring(L.ringA, L.mask, box, Math.max(1, unit * 2), mix(primary, '#ffffff', 0.35));

  const glitch = hash01(9, Math.floor(time * 8)) > 0.86;
  const bands = glitch ? 5 : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < bands; i += 1) {
    const by = box.y + (box.h * i) / bands;
    const bh = box.h / bands + 1;
    const dx = glitch ? (hash01(10, Math.floor(time * 8), i) - 0.5) * 22 * unit : 0;
    ctx.globalAlpha = flicker;
    ctx.drawImage(L.tint.canvas, box.x, by, box.w, bh, box.x + dx, by, box.w, bh);
    ctx.globalAlpha = flicker * 0.5;
    ctx.drawImage(L.ringB.canvas, box.x, by, box.w, bh, box.x + dx, by, box.w, bh);
  }
  ctx.shadowColor = primary;
  ctx.shadowBlur = unit * (18 + 8 * energy) * glow;
  ctx.globalAlpha = flicker * (0.75 + 0.2 * energy);
  blit(ctx, L.ringA, box, 6);
  ctx.restore();
}

function drawFallback(scene: Scene) {
  const { ctx, prims, primary } = scene;
  ctx.save();
  ctx.fillStyle = primary;
  ctx.globalAlpha = 0.85;
  fillBody(ctx, prims);
  ctx.restore();
}

function drawBackground(ctx: Ctx2D, width: number, height: number, style: DanceAvatarStyle, primary: string, accent: string, energy: number, cx: number, cy: number, transparent = false) {
  ctx.globalAlpha = 1;
  // As layer 2 of a mix the dark stage is skipped so the dancer floats over layer 1.
  if (!transparent) {
    const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.75);
    bg.addColorStop(0, `hsl(250 38% ${9 + energy * 6}%)`);
    bg.addColorStop(0.55, '#070914');
    bg.addColorStop(1, '#03050b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }
  if (style === 'shadow') {
    // Lit backdrop so the dark silhouette reads like a shadow-theatre figure.
    const r = Math.min(width, height) * 0.62;
    const spot = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    spot.addColorStop(0, rgba(mix(primary, '#ffffff', 0.2), 0.5 + 0.2 * energy));
    spot.addColorStop(0.5, rgba(mix(primary, accent, 0.4), 0.22));
    spot.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, width, height);
  }
}

export function renderDanceAvatars(surface: RenderSurface, frame: EngineFrame, config: DanceAvatarsConfig) {
  const { context, width, height, transparent = false } = surface;
  const energy = clamp01(frame.energy * config.energyResponse);
  const primary = adjustSaturation(config.primaryColor, config.colorSaturation);
  const accent = adjustSaturation(config.accentColor, config.colorSaturation);

  const props = proportionsFor(config.gender);
  const dance = evaluateDance({
    time: frame.time,
    bpm: frame.bpm,
    danceSpeed: config.danceSpeed,
    complexity: complexityFromExpressiveness(config.limbExpressiveness),
    energy,
    seed: seedFrom(`dance-avatars:${config.gender}:${Math.round(frame.bpm || 0)}`),
  });
  const sk = solveSkeleton(dance.pose, props, dance.secondary);

  const unit = height / 720;
  // Fit by height in landscape, by width (arm span) in portrait 9:16.
  const bodyH = Math.min(height * 0.6, width * 0.78) * config.spaceScale * (config.gender === 'female' ? 0.96 : 1);
  const scale = bodyH / standingHeight(props);
  const cx = width * 0.5;
  const floorY = Math.min(height * 0.86, height * 0.5 + bodyH * 0.6);
  const prims = buildBody(sk, { cx, floorY, scale });

  drawBackground(context, width, height, config.style, primary, accent, energy, cx, floorY - bodyH * 0.55, transparent);
  drawFloor({ ctx: context, cx, floorY, bodyH, sk } as Scene, config.style === 'shadow' ? '#000000' : accent, config.style === 'shadow' ? 0.5 : 0.25 + energy * 0.2);

  const b = bodyBounds(prims);
  const pad = Math.ceil(30 * unit);
  const x0 = Math.max(0, Math.floor(b.minX - pad)), y0 = Math.max(0, Math.floor(b.minY - pad));
  const x1 = Math.min(width, Math.ceil(b.maxX + pad)), y1 = Math.min(height, Math.ceil(b.maxY + pad));
  const box: Box = { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };

  const scene: Scene = {
    ctx: context, width, height, prims, sk, box, primary, accent,
    glow: config.glowIntensity, energy, pulse: dance.beatPulse, sparkle: config.sparkleDensity,
    time: frame.time, unit, floorY, cx, bodyH,
  };

  const mask = layer('mask', width, height);
  const layers: Layers | null = mask
    ? (() => {
      const arms = layer('arms', width, height), ringA = layer('ringA', width, height);
      const ringB = layer('ringB', width, height), tintL = layer('tint', width, height);
      return arms && ringA && ringB && tintL ? { mask, arms, ringA, ringB, tint: tintL } : null;
    })()
    : null;
  if (layers) paintMask(layers.mask, prims, box);

  context.save();
  if (!layers && config.style !== 'particle' && config.style !== 'humanoid') drawFallback(scene);
  else if (config.style === 'shadow') drawShadow(scene, layers as Layers);
  else if (config.style === 'particle') drawParticles(scene, layers);
  else if (config.style === 'neon') drawNeon(scene, layers as Layers);
  else if (config.style === 'humanoid') drawHumanoid(scene, layers);
  else drawHologram(scene, layers as Layers);
  context.restore();
  reset(context);

  drawAmbientSparkles(context, width, height, frame.time, config.sparkleDensity * 0.85, accent);
  if (!transparent) applyWarmthOverlay(context, width, height, config.warmth);
  if (config.showTitle && frame.title) {
    context.globalAlpha = 1;
    context.fillStyle = '#eef1fb';
    context.textAlign = 'center';
    context.font = `500 ${Math.round(30 * unit)}px Manrope, sans-serif`;
    context.fillText(frame.title, width / 2, height - 40 * unit, width - 120);
  }
}
