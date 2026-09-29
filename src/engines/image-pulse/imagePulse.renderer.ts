import { adjustSaturation, applyWarmthOverlay } from '../engine.directorFx';
import type { EngineFrame, RenderSurface } from '../engine.types';
import { getPulseImage, type PulseImage } from './imagePulse.images';
import type { ImagePulseConfig, ImagePulseStyle } from './imagePulse.types';

// Image Pulse renderer.
// Every pixel is a pure function of (frame.time, frame.energy, frame.onset,
// frame.bpm, config, decoded image). Offscreen caches (blur, bright-pass,
// RGB channels, placeholder art) only depend on the image/colors, so Preview
// and Export always draw identical frames for the same audio time.

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Ctx2D = CanvasRenderingContext2D;
type Rect = { x: number; y: number; w: number; h: number };
type SizedSource = CanvasImageSource & { width: number; height: number };
type Scratch = { canvas: SizedSource; ctx: Ctx2D };

/** Deterministic 0..1 hash. */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ------------------------------------------------------------ color helpers
function rgb(hex: string): [number, number, number] {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff';
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(a).toFixed(3)})`;
}
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
}

// ------------------------------------------------------------ audio signals
export type PulseSignals = {
  beat: number;
  beatIndex: number;
  phase: number;
  /** 1 on each beat (stronger on downbeats), decaying with Fluidity-controlled softness. */
  kick: number;
  /** Energy scaled by Dynamics. */
  energy: number;
  /** Transient strength (energy onset) scaled by Dynamics. */
  onset: number;
  /** Combined beat/transient punch, 0 when Dynamics is 0. */
  hit: number;
  /** Dynamics as an amplitude multiplier (1 at default). */
  response: number;
  /** Continuous drift clock driven by Fluidity. */
  drift: number;
  /** Fluidity normalized 0..1. */
  fluid: number;
  /** Motion Complexity normalized 0..1. */
  complexity: number;
};

export function pulseBpm(bpm: number): number {
  let value = Number.isFinite(bpm) && bpm > 20 ? bpm : 112;
  while (value > 180) value /= 2;
  while (value < 70) value *= 2;
  return value;
}

export function imagePulseSignals(frame: EngineFrame, config: ImagePulseConfig): PulseSignals {
  const time = Math.max(0, frame.time);
  const beat = time * (pulseBpm(frame.bpm) / 60);
  const beatIndex = Math.floor(beat);
  const phase = beat - beatIndex;
  const fluid = clamp01((config.pulseSpeed - 0.2) / 1.4);
  const decay = lerp(10, 4.2, fluid);
  const kick = Math.exp(-phase * decay) * (beatIndex % 4 === 0 ? 1 : 0.74);
  const response = config.energyResponse / 1.1;
  const energy = clamp01((Number.isFinite(frame.energy) ? frame.energy : 0) * config.energyResponse);
  const onset = clamp01((frame.onset ?? 0) * config.energyResponse * 1.4);
  const hit = clamp01(Math.max(kick * (0.3 + 0.7 * energy) * Math.min(1.25, response), onset));
  return {
    beat,
    beatIndex,
    phase,
    kick,
    energy,
    onset,
    hit,
    response,
    drift: time * config.pulseSpeed,
    fluid,
    complexity: clamp01((config.effectComplexity - 0.2) / 0.8),
  };
}

// ------------------------------------------------------------ offscreen caches
function createScratch(width: number, height: number): Scratch | null {
  try {
    const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => OffscreenCanvas }).OffscreenCanvas;
    if (Offscreen) {
      const canvas = new Offscreen(width, height);
      const ctx = canvas.getContext('2d') as unknown as Ctx2D | null;
      if (ctx) return { canvas: canvas as unknown as SizedSource, ctx };
    }
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) return { canvas, ctx };
    }
  } catch {
    // no offscreen rendering available
  }
  return null;
}

type Derived = {
  blur?: PulseImage | null;
  bright?: PulseImage | null;
  channels?: [PulseImage, PulseImage] | null;
};
const derivedCache = new WeakMap<object, Derived>();

function derivedFor(image: PulseImage): Derived {
  const key = image.source as unknown as object;
  let derived = derivedCache.get(key);
  if (!derived) {
    derived = {};
    derivedCache.set(key, derived);
  }
  return derived;
}

function fitWithin(width: number, height: number, maxSide: number) {
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  return { w: Math.max(1, Math.round(width * ratio)), h: Math.max(1, Math.round(height * ratio)) };
}

/** Two-step downscale: drawn back upscaled, it is a cheap cross-browser blur (no ctx.filter). */
function blurOf(image: PulseImage): PulseImage | null {
  const derived = derivedFor(image);
  if (derived.blur !== undefined) return derived.blur;
  const mid = fitWithin(image.width, image.height, 256);
  const small = fitWithin(image.width, image.height, 56);
  const a = createScratch(mid.w, mid.h);
  const b = createScratch(small.w, small.h);
  if (!a || !b) {
    derived.blur = null;
    return null;
  }
  a.ctx.imageSmoothingQuality = 'high';
  a.ctx.drawImage(image.source, 0, 0, mid.w, mid.h);
  b.ctx.imageSmoothingQuality = 'high';
  b.ctx.drawImage(a.canvas, 0, 0, small.w, small.h);
  derived.blur = { source: b.canvas, width: small.w, height: small.h };
  return derived.blur;
}

/** Blurred highlights (x^3) used for bloom. */
function brightOf(image: PulseImage): PulseImage | null {
  const derived = derivedFor(image);
  if (derived.bright !== undefined) return derived.bright;
  const blur = blurOf(image);
  const layer = blur ? createScratch(blur.width, blur.height) : null;
  if (!blur || !layer) {
    derived.bright = null;
    return null;
  }
  layer.ctx.drawImage(blur.source, 0, 0);
  layer.ctx.globalCompositeOperation = 'multiply';
  layer.ctx.drawImage(blur.source, 0, 0);
  layer.ctx.drawImage(blur.source, 0, 0);
  layer.ctx.globalCompositeOperation = 'source-over';
  derived.bright = { source: layer.canvas, width: blur.width, height: blur.height };
  return derived.bright;
}

/** Pure red and blue copies of the image for chromatic splitting. */
function channelsOf(image: PulseImage): [PulseImage, PulseImage] | null {
  const derived = derivedFor(image);
  if (derived.channels !== undefined) return derived.channels;
  const size = fitWithin(image.width, image.height, 1600);
  const out: PulseImage[] = [];
  for (const tint of ['#ff0000', '#0000ff']) {
    const layer = createScratch(size.w, size.h);
    if (!layer) {
      derived.channels = null;
      return null;
    }
    layer.ctx.drawImage(image.source, 0, 0, size.w, size.h);
    layer.ctx.globalCompositeOperation = 'multiply';
    layer.ctx.fillStyle = tint;
    layer.ctx.fillRect(0, 0, size.w, size.h);
    layer.ctx.globalCompositeOperation = 'destination-in';
    layer.ctx.drawImage(image.source, 0, 0, size.w, size.h);
    layer.ctx.globalCompositeOperation = 'source-over';
    out.push({ source: layer.canvas, width: size.w, height: size.h });
  }
  derived.channels = out as [PulseImage, PulseImage];
  return derived.channels;
}

const placeholderCache = new Map<string, PulseImage | null>();

/** Procedural cover art used until the user uploads an image (never crashes, still music-reactive). */
function placeholderImage(primary: string, accent: string): PulseImage | null {
  const key = `${primary}|${accent}`;
  if (placeholderCache.has(key)) return placeholderCache.get(key) ?? null;
  if (placeholderCache.size > 12) placeholderCache.clear();
  const size = 1024;
  const layer = createScratch(size, size);
  if (!layer) {
    placeholderCache.set(key, null);
    return null;
  }
  const c = layer.ctx;
  const base = c.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, mix('#070a18', primary, 0.18));
  base.addColorStop(1, mix('#05060b', accent, 0.28));
  c.fillStyle = base;
  c.fillRect(0, 0, size, size);
  const orb = c.createRadialGradient(size * 0.5, size * 0.46, 10, size * 0.5, size * 0.46, size * 0.46);
  orb.addColorStop(0, '#ffffff');
  orb.addColorStop(0.12, primary);
  orb.addColorStop(0.5, rgba(accent, 0.75));
  orb.addColorStop(1, rgba(accent, 0));
  c.fillStyle = orb;
  c.fillRect(0, 0, size, size);
  c.lineWidth = 3;
  for (let ring = 1; ring <= 7; ring += 1) {
    c.strokeStyle = rgba(ring % 2 ? primary : accent, 0.5 - ring * 0.05);
    c.beginPath();
    c.arc(size * 0.5, size * 0.46, size * (0.1 + ring * 0.055), 0, TAU);
    c.stroke();
  }
  for (let index = 0; index < 26; index += 1) {
    c.fillStyle = rgba(index % 3 ? primary : '#ffffff', 0.12 + hash01(index + 3) * 0.3);
    c.beginPath();
    c.arc(hash01(index) * size, hash01(index + 50) * size, 6 + hash01(index + 90) * 38, 0, TAU);
    c.fill();
  }
  c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  c.lineWidth = 6;
  c.beginPath();
  for (let x = 0; x <= size; x += 8) {
    const t = x / size;
    const y = size * 0.78 + Math.sin(t * TAU * 3) * 40 * Math.sin(t * Math.PI);
    if (x === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  const image = { source: layer.canvas, width: size, height: size };
  placeholderCache.set(key, image);
  return image;
}

// ------------------------------------------------------------ geometry
type Camera = { zoom: number; rot: number; panX: number; panY: number };

function coverSize(image: { width: number; height: number }, rect: Rect) {
  const scale = Math.max(rect.w / image.width, rect.h / image.height);
  return { w: image.width * scale, h: image.height * scale };
}

function roundedRect(ctx: Ctx2D, rect: Rect, radius: number) {
  const r = Math.min(radius, rect.w / 2, rect.h / 2);
  ctx.beginPath();
  ctx.moveTo(rect.x + r, rect.y);
  ctx.lineTo(rect.x + rect.w - r, rect.y);
  ctx.arcTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + r, r);
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h - r);
  ctx.arcTo(rect.x + rect.w, rect.y + rect.h, rect.x + rect.w - r, rect.y + rect.h, r);
  ctx.lineTo(rect.x + r, rect.y + rect.h);
  ctx.arcTo(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - r, r);
  ctx.lineTo(rect.x, rect.y + r);
  ctx.arcTo(rect.x, rect.y, rect.x + r, rect.y, r);
  ctx.closePath();
}

type Box = { x0: number; y0: number; x1: number; y1: number };

/**
 * Draws `src` placed at (x, y, w, h) in the current (local) coordinates, but only the
 * part that intersects `box`. Clipped effects (ripple rings, glitch bands, kaleido
 * wedges) then only rasterize the pixels they can actually show.
 */
function blit(ctx: Ctx2D, src: PulseImage, x: number, y: number, w: number, h: number, box: Box | null) {
  if (!box) {
    ctx.drawImage(src.source, x, y, w, h);
    return;
  }
  const x0 = Math.max(x, box.x0);
  const y0 = Math.max(y, box.y0);
  const x1 = Math.min(x + w, box.x1);
  const y1 = Math.min(y + h, box.y1);
  if (x1 - x0 < 0.5 || y1 - y0 < 0.5) return;
  const kx = src.width / w;
  const ky = src.height / h;
  ctx.drawImage(src.source, (x0 - x) * kx, (y0 - y) * ky, (x1 - x0) * kx, (y1 - y0) * ky, x0, y0, x1 - x0, y1 - y0);
}

/** Maps canvas-space points into a local frame (translate → rotate → uniform scale) and returns their padded bbox. */
function localBox(points: Array<[number, number]>, tx: number, ty: number, rot: number, zoom: number): Box {
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [px, py] of points) {
    const dx = px - tx;
    const dy = py - ty;
    const lx = (dx * cos - dy * sin) / zoom;
    const ly = (dx * sin + dy * cos) / zoom;
    x0 = Math.min(x0, lx);
    y0 = Math.min(y0, ly);
    x1 = Math.max(x1, lx);
    y1 = Math.max(y1, ly);
  }
  const pad = 2 / zoom;
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

/**
 * Draws `image` cover-fitted to `rect` through the camera. With `split` > 0 the
 * red and blue channels are shifted horizontally in opposite directions (chromatic shift).
 * `focus` (canvas space) limits rasterization to the region a clip will keep.
 */
function drawImageLayer(
  ctx: Ctx2D,
  image: PulseImage,
  rect: Rect,
  camera: Camera,
  split = 0,
  channels: [PulseImage, PulseImage] | null = null,
  focus: Rect | null = null,
) {
  const size = coverSize(image, rect);
  const tx = rect.x + rect.w / 2 + camera.panX;
  const ty = rect.y + rect.h / 2 + camera.panY;
  const box = focus
    ? localBox([
      [focus.x, focus.y], [focus.x + focus.w, focus.y], [focus.x, focus.y + focus.h], [focus.x + focus.w, focus.y + focus.h],
    ], tx, ty, camera.rot, camera.zoom)
    : null;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(camera.rot);
  ctx.scale(camera.zoom, camera.zoom);
  const x = -size.w / 2;
  const y = -size.h / 2;
  if (split > 0.5 && channels) {
    // Draw the image, multiply out its red and blue channels, then add them back shifted.
    const offset = split / camera.zoom;
    const area = box ?? { x0: x, y0: y, x1: x + size.w, y1: y + size.h };
    blit(ctx, image, x, y, size.w, size.h, box);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(area.x0, area.y0, area.x1 - area.x0, area.y1 - area.y0);
    ctx.globalCompositeOperation = 'lighter';
    blit(ctx, channels[0], x - offset, y, size.w, size.h, box);
    blit(ctx, channels[1], x + offset, y + offset * 0.2, size.w, size.h, box);
  } else {
    blit(ctx, image, x, y, size.w, size.h, box);
  }
  ctx.restore();
}

function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) };
}

/** Fallback when no canvas can be created at all: abstract gradient art drawn straight into the frame. */
function drawFallbackArt(ctx: Ctx2D, rect: Rect, camera: Camera, primary: string, accent: string) {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2 + camera.panX, rect.y + rect.h / 2 + camera.panY);
  ctx.scale(camera.zoom, camera.zoom);
  const radius = Math.max(rect.w, rect.h) * 0.6;
  const orb = ctx.createRadialGradient(0, 0, 4, 0, 0, radius);
  orb.addColorStop(0, primary);
  orb.addColorStop(0.45, accent);
  orb.addColorStop(1, '#05060b');
  ctx.fillStyle = orb;
  ctx.fillRect(-rect.w, -rect.h, rect.w * 2, rect.h * 2);
  ctx.restore();
}

// ------------------------------------------------------------ styles
type StyleContext = {
  ctx: Ctx2D;
  image: PulseImage;
  rect: Rect;
  camera: Camera;
  s: PulseSignals;
  config: ImagePulseConfig;
  primary: string;
  accent: string;
  /** Bloom pass: same geometry, simplified effects. */
  bloom: boolean;
};

function drawPulse({ ctx, image, rect, camera, s, bloom }: StyleContext) {
  const split = bloom ? 0 : Math.max(0, s.hit - 0.55) * rect.w * 0.008 * Math.min(1.4, s.response);
  drawImageLayer(ctx, image, rect, camera, split, split > 0.5 ? channelsOf(image) : null);
  if (bloom || s.hit < 0.08) return;
  // Zoom echo: a brighter, slightly larger ghost on every beat.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.2 * s.hit;
  drawImageLayer(ctx, image, rect, { ...camera, zoom: camera.zoom * (1 + 0.07 * s.hit * (0.6 + s.complexity * 0.6)) });
  ctx.restore();
}

function drawGlow({ ctx, image, rect, camera, s, bloom }: StyleContext) {
  drawImageLayer(ctx, image, rect, camera);
  if (bloom) return;
  ctx.save();
  // Orton-style soft focus: the blurred image lifts and softens the highlights.
  const blur = blurOf(image);
  if (blur) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.85;
    drawImageLayer(ctx, blur, rect, camera);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.2 + 0.18 * s.hit;
    drawImageLayer(ctx, blur, rect, { ...camera, zoom: camera.zoom * (1.04 + 0.05 * s.hit) });
  }
  // Dreamy double exposure drifting against the main image.
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.16 + 0.14 * s.energy;
  drawImageLayer(ctx, image, rect, {
    zoom: camera.zoom * (1.35 + 0.06 * Math.sin(s.drift * 0.4)),
    rot: -camera.rot * 3 + Math.sin(s.drift * 0.21) * 0.05 * (0.4 + s.complexity),
    panX: -camera.panX * 2 + Math.sin(s.drift * 0.17) * rect.w * 0.05,
    panY: -camera.panY * 2,
  });
  ctx.restore();
}

function drawRipple({ ctx, image, rect, camera, s, config, primary, bloom }: StyleContext) {
  if (bloom) {
    drawImageLayer(ctx, image, rect, camera);
    return;
  }
  const cx = rect.x + rect.w / 2 + Math.sin(s.drift * 0.31) * rect.w * 0.03;
  const cy = rect.y + rect.h / 2 + Math.cos(s.drift * 0.27) * rect.h * 0.03;
  const maxR = Math.hypot(rect.w, rect.h) * 0.56;
  const rings = Math.round(5 + s.complexity * 7);
  // Rings that already cover the whole rect are overdrawn by the next one: only the innermost of them is drawn, unclipped.
  const farthest = Math.max(
    Math.hypot(cx - rect.x, cy - rect.y), Math.hypot(cx - rect.x - rect.w, cy - rect.y),
    Math.hypot(cx - rect.x, cy - rect.y - rect.h), Math.hypot(cx - rect.x - rect.w, cy - rect.y - rect.h),
  );
  const front = Math.pow(s.phase, 0.6) * maxR * 1.1;
  const beatStrength = Math.exp(-s.phase * 2.2) * (s.beatIndex % 4 === 0 ? 1 : 0.8)
    * (0.35 + 0.65 * s.energy) * Math.min(1.5, s.response);
  const gentle = 0.012 + 0.014 * s.complexity + 0.012 * s.energy;
  const edges: Array<{ r: number; amount: number }> = [];
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  for (let index = 0; index < rings; index += 1) {
    const r = maxR * (1 - index / rings);
    const dist = r / maxR;
    const wave = Math.sin(index * Math.PI * 0.5 + dist * TAU * (1 + s.complexity) - s.drift * 3.2) * gentle;
    const wavefront = Math.exp(-(((r - front) / (maxR * 0.14)) ** 2)) * beatStrength * 0.12;
    const zoom = camera.zoom * (1 + wave + wavefront);
    const nextR = maxR * (1 - (index + 1) / rings);
    if (nextR >= farthest) continue;
    ctx.save();
    if (r < farthest) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.clip();
    }
    const focus = intersect({ x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, rect);
    drawImageLayer(ctx, image, rect, { ...camera, zoom }, 0, null, focus);
    if (r < farthest) {
      // Water-like shading at the rim of each ring: lit on crests, shadowed in troughs.
      const crest = wave / gentle;
      const rim = ctx.createRadialGradient(cx, cy, r * 0.78, cx, cy, r);
      const tone = crest > 0 ? '255, 255, 255' : '0, 0, 0';
      rim.addColorStop(0, `rgba(${tone}, 0)`);
      rim.addColorStop(1, `rgba(${tone}, ${clamp01(Math.abs(crest) * 0.14 + wavefront * 2.2).toFixed(3)})`);
      ctx.fillStyle = rim;
      ctx.fillRect(focus.x, focus.y, focus.w, focus.h);
    }
    ctx.restore();
    if (r < farthest) edges.push({ r, amount: Math.abs(wave) * 14 + wavefront * 10 });
  }
  // Specular ring highlights where the surface bends.
  ctx.globalCompositeOperation = 'screen';
  ctx.lineWidth = Math.max(1, rect.w * 0.0016);
  for (const edge of edges) {
    ctx.globalAlpha = clamp01(0.04 + edge.amount * 0.5) * Math.min(1.2, config.glowIntensity) * 0.6;
    ctx.strokeStyle = primary;
    ctx.beginPath();
    ctx.arc(cx, cy, edge.r, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlitch({ ctx, image, rect, camera, s, primary, accent, bloom }: StyleContext) {
  const g = clamp01(s.hit * 1.1 + s.energy * 0.15 * s.response);
  if (bloom) {
    drawImageLayer(ctx, image, rect, camera);
    return;
  }
  const channels = channelsOf(image);
  const split = rect.w * (0.002 + 0.016 * g);
  drawImageLayer(ctx, image, rect, camera, split, channels);

  // Horizontal slice displacement, re-rolled 12x per second and on every beat.
  const tick = Math.floor(s.beat * 4) * 131 + s.beatIndex;
  const slices = Math.round(2 + s.complexity * 12);
  ctx.save();
  for (let index = 0; index < slices; index += 1) {
    const seed = tick * 17 + index * 7.31;
    if (hash01(seed + 3) > g * 1.15) continue;
    const y = rect.y + hash01(seed) * rect.h;
    const h = rect.h * (0.008 + hash01(seed + 1) * (0.02 + 0.07 * s.complexity));
    const dx = (hash01(seed + 2) - 0.5) * rect.w * 0.16 * g;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, y, rect.w, h);
    ctx.clip();
    drawImageLayer(ctx, image, rect, { ...camera, panX: camera.panX + dx }, split * 2.2, channels, { x: rect.x, y, w: rect.w, h });
    ctx.restore();
  }
  // Color blocks on strong hits.
  ctx.globalCompositeOperation = 'screen';
  const blocks = Math.round(s.complexity * 6 * g);
  for (let index = 0; index < blocks; index += 1) {
    const seed = tick * 29 + index * 3.7;
    ctx.globalAlpha = 0.18 + 0.3 * hash01(seed + 4);
    ctx.fillStyle = index % 2 ? primary : accent;
    ctx.fillRect(
      rect.x + hash01(seed) * rect.w,
      rect.y + hash01(seed + 1) * rect.h,
      rect.w * (0.03 + hash01(seed + 2) * 0.12),
      rect.h * (0.004 + hash01(seed + 3) * 0.018),
    );
  }
  // Scanlines.
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.1 + 0.06 * g;
  ctx.fillStyle = '#000000';
  const step = Math.max(3, Math.round(rect.h / 240));
  const offset = (s.beatIndex * 2) % step;
  for (let y = rect.y + offset; y < rect.y + rect.h; y += step) ctx.fillRect(rect.x, y, rect.w, Math.max(1, step / 3));
  ctx.restore();
}

function drawKaleido({ ctx, image, rect, camera, s }: StyleContext) {
  const segments = 2 * Math.round(3 + s.complexity * 4);
  const angle = TAU / segments;
  const ease = 1 - (1 - s.phase) ** 3;
  const spin = s.drift * 0.1 + (s.beatIndex + ease) * 0.035 * Math.min(1.4, s.response);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const radius = Math.hypot(rect.w, rect.h) / 2 + 4;
  const reach = Math.min(rect.w, rect.h) * (0.16 + 0.05 * Math.sin(s.drift * 0.23));
  const zoom = camera.zoom * 0.95;
  const localRot = -spin * 0.6 + camera.rot;
  // The image must cover the whole wedge (radius) around the mirror origin.
  const side = 2 * (radius / zoom + reach + Math.abs(camera.panX) + Math.abs(camera.panY));
  const size = coverSize(image, { x: 0, y: 0, w: side, h: side });
  const wedge: Array<[number, number]> = [[0, 0]];
  for (let step = 0; step <= 4; step += 1) {
    const theta = -angle / 2 + (angle * step) / 4;
    wedge.push([Math.cos(theta) * radius / Math.cos(angle / 8), Math.sin(theta) * radius / Math.cos(angle / 8)]);
  }
  const box = localBox(wedge, 0, 0, localRot, zoom);
  // Opaque base so wedge seams never show the background.
  drawImageLayer(ctx, image, rect, camera);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  for (let index = 0; index < segments; index += 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(index * angle + spin);
    if (index % 2) ctx.scale(1, -1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -angle / 2 - 0.004, angle / 2 + 0.004);
    ctx.closePath();
    ctx.clip();
    ctx.rotate(localRot);
    ctx.scale(zoom, zoom);
    blit(ctx, image, reach - size.w / 2 + camera.panX * 0.5, -size.h / 2 + camera.panY * 0.5, size.w, size.h, box);
    ctx.restore();
  }
  ctx.restore();
}

const styleDrawers: Record<ImagePulseStyle, (context: StyleContext) => void> = {
  pulse: drawPulse,
  glow: drawGlow,
  ripple: drawRipple,
  glitch: drawGlitch,
  kaleido: drawKaleido,
};

/** Per-style emphasis of the shared light layers. */
const styleLight: Record<ImagePulseStyle, { bloom: number; leaks: number; tint: number }> = {
  pulse: { bloom: 1, leaks: 0.8, tint: 1 },
  glow: { bloom: 1.7, leaks: 2.2, tint: 1.5 },
  ripple: { bloom: 0.9, leaks: 0.7, tint: 1.1 },
  glitch: { bloom: 0.7, leaks: 0.35, tint: 0.8 },
  kaleido: { bloom: 1.2, leaks: 0.9, tint: 1.3 },
};

// ------------------------------------------------------------ shared layers
function drawColorGrade(ctx: Ctx2D, W: number, H: number, config: ImagePulseConfig, primary: string, accent: string, s: PulseSignals, tint: number) {
  ctx.save();
  // Color Energy: desaturate below default, push saturation above.
  if (config.colorSaturation < 0.98) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = clamp01((1 - config.colorSaturation) / 0.6) * 0.92;
    ctx.fillStyle = 'hsl(0, 0%, 50%)';
    ctx.fillRect(0, 0, W, H);
  } else if (config.colorSaturation > 1.02) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = clamp01((config.colorSaturation - 1) / 0.6) * 0.32;
    ctx.fillStyle = 'hsl(0, 100%, 50%)';
    ctx.fillRect(0, 0, W, H);
  }
  // Creator primary → accent tint, breathing with energy.
  const angle = s.drift * 0.05;
  const gradient = ctx.createLinearGradient(
    W * (0.5 - 0.5 * Math.cos(angle)), H * (0.5 - 0.5 * Math.sin(angle)),
    W * (0.5 + 0.5 * Math.cos(angle)), H * (0.5 + 0.5 * Math.sin(angle)),
  );
  gradient.addColorStop(0, primary);
  gradient.addColorStop(1, accent);
  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = clamp01((0.25 + 0.22 * config.colorSaturation + 0.12 * s.energy) * tint);
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = clamp01((0.05 + 0.1 * config.colorSaturation) * tint);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawLightLeaks(ctx: Ctx2D, W: number, H: number, config: ImagePulseConfig, primary: string, accent: string, s: PulseSignals, amount: number) {
  const count = 1 + Math.round(s.complexity * 3);
  const radius = Math.max(W, H) * 0.55;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let index = 0; index < count; index += 1) {
    const t = s.drift * (0.07 + index * 0.023) + index * 2.4;
    const x = W * (0.5 + 0.48 * Math.cos(t));
    const y = H * (0.5 + 0.45 * Math.sin(t * 1.3 + index));
    const color = index % 2 ? accent : primary;
    const strength = amount * config.glowIntensity * (0.08 + 0.16 * s.energy + 0.18 * s.hit);
    const leak = ctx.createRadialGradient(x, y, 0, x, y, radius);
    leak.addColorStop(0, rgba(color, strength));
    leak.addColorStop(0.45, rgba(color, strength * 0.35));
    leak.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = leak;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function drawParticles(ctx: Ctx2D, W: number, H: number, config: ImagePulseConfig, primary: string, accent: string, s: PulseSignals) {
  const count = Math.round(120 * config.sparkleDensity);
  if (count <= 0) return;
  const cx = W / 2;
  const cy = H / 2;
  const spread = 0.75 + (config.spaceScale - 0.72) * 0.9;
  const unit = Math.min(W, H);
  const burst = s.kick * (0.3 + 0.7 * s.energy) * Math.min(1.5, s.response);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < count; index += 1) {
    const speed = 0.012 + hash01(index + 11) * 0.03;
    const rise = (hash01(index + 5) + s.drift * speed) % 1;
    const baseX = (hash01(index) - 0.5) * W * spread;
    const baseY = (0.5 - rise) * H * spread;
    const sway = Math.sin(s.drift * (0.4 + hash01(index + 7)) + index) * unit * 0.02;
    const dirX = baseX / (Math.hypot(baseX, baseY) || 1);
    const dirY = baseY / (Math.hypot(baseX, baseY) || 1);
    const push = burst * unit * (0.015 + 0.03 * hash01(index + 13));
    const x = cx + baseX + sway + dirX * push;
    const y = cy + baseY + dirY * push;
    const fade = Math.sin(rise * Math.PI);
    const size = unit * (0.0012 + hash01(index + 17) * 0.0028) * (1 + burst * 0.8);
    const color = index % 5 === 0 ? '#ffffff' : index % 2 ? accent : primary;
    ctx.globalAlpha = clamp01(fade * (0.06 + 0.06 * s.energy + 0.1 * burst));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = clamp01(fade * (0.6 + 0.35 * burst));
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawVignette(ctx: Ctx2D, W: number, H: number, config: ImagePulseConfig, s: PulseSignals) {
  const inner = Math.min(W, H) * (0.18 + (config.spaceScale - 0.72) * 0.45);
  const outer = Math.hypot(W, H) * 0.56;
  const edge = clamp01(0.72 - 0.12 * config.glowIntensity - 0.16 * s.hit);
  const vignette = ctx.createRadialGradient(W / 2, H / 2, inner, W / 2, H / 2, outer);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.6, `rgba(0, 0, 0, ${(edge * 0.45).toFixed(3)})`);
  vignette.addColorStop(1, `rgba(0, 0, 0, ${edge.toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------ main entry
export function renderImagePulse(surface: RenderSurface, frame: EngineFrame, config: ImagePulseConfig) {
  const { context: ctx, width: W, height: H } = surface;
  const s = imagePulseSignals(frame, config);
  const primary = adjustSaturation(config.primaryColor, config.colorSaturation);
  const accent = adjustSaturation(config.accentColor, config.colorSaturation);
  const light = styleLight[config.style];
  const image = getPulseImage(config.imageSrc) ?? placeholderImage(config.primaryColor, config.accentColor);
  const card = config.framing === 'card';

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#05060b';
  ctx.fillRect(0, 0, W, H);

  // Camera: Space sets framing distance, Fluidity the drift, Complexity the path harmonics,
  // Dynamics the beat/transient zoom punch.
  const harmonic = 0.2 + s.complexity * 0.5;
  const baseZoom = card ? 1.05 : 1.06 + (1.28 - config.spaceScale) * 0.28;
  const kickZoom = 1 + Math.min(1.5, s.response) * (0.05 * s.hit + 0.018 * s.energy);
  const margin = (baseZoom - 1) / 2 * 0.45;
  let rect: Rect = { x: 0, y: 0, w: W, h: H };
  let cardScale = 1;
  if (card && image) {
    const box = 0.8 - (config.spaceScale - 0.72) * 0.3;
    const fit = Math.min((W * box) / image.width, (H * box) / image.height);
    cardScale = 1 + Math.min(1.5, s.response) * (0.045 * s.hit + 0.012 * s.energy);
    const w = image.width * fit * cardScale;
    const h = image.height * fit * cardScale;
    rect = { x: (W - w) / 2, y: H * 0.465 - h / 2, w, h };
  }
  const camera: Camera = {
    zoom: baseZoom * (card ? 1 + (kickZoom - 1) * 0.35 : kickZoom),
    rot: (Math.sin(s.drift * 0.23) * 0.006 + Math.sin(s.drift * 0.61 + 1.1) * 0.004 * harmonic) * (0.4 + s.complexity),
    panX: rect.w * margin * (Math.sin(s.drift * 0.37) + harmonic * Math.sin(s.drift * 0.91 + 1.3)) / (1 + harmonic),
    panY: rect.h * margin * (Math.cos(s.drift * 0.29) + harmonic * Math.sin(s.drift * 1.13 + 0.4)) / (1 + harmonic),
  };

  if (!image) {
    drawFallbackArt(ctx, rect, camera, primary, accent);
  } else {
    if (card) {
      // Blurred cover of the image fills the frame behind the card.
      const blur = blurOf(image);
      const backdrop = blur ?? image;
      drawImageLayer(ctx, backdrop, { x: 0, y: 0, w: W, h: H }, {
        zoom: 1.15 * (1 + 0.02 * s.hit),
        rot: 0,
        panX: Math.sin(s.drift * 0.2) * W * 0.02,
        panY: Math.cos(s.drift * 0.17) * H * 0.02,
      });
      ctx.fillStyle = 'rgba(5, 6, 11, 0.5)';
      ctx.fillRect(0, 0, W, H);
      drawLightLeaks(ctx, W, H, config, primary, accent, s, light.leaks * 0.8);
      // Halo behind the card.
      const halo = ctx.createRadialGradient(W / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.3, W / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.9);
      halo.addColorStop(0, rgba(primary, config.glowIntensity * (0.18 + 0.3 * s.hit)));
      halo.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      roundedRect(ctx, rect, Math.min(rect.w, rect.h) * 0.03);
      ctx.clip();
    }

    const styleContext: StyleContext = { ctx, image, rect, camera, s, config, primary, accent, bloom: false };
    styleDrawers[config.style](styleContext);

    // Bloom: blurred highlights of the same composition.
    const bright = brightOf(image);
    const bloomAlpha = clamp01(config.glowIntensity * light.bloom * (0.1 + 0.2 * s.hit + 0.08 * s.energy));
    if (bright && bloomAlpha > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = bloomAlpha;
      styleDrawers[config.style]({ ...styleContext, image: bright, bloom: true });
      ctx.restore();
    }

    if (card) {
      ctx.restore();
      ctx.save();
      roundedRect(ctx, rect, Math.min(rect.w, rect.h) * 0.03);
      ctx.strokeStyle = rgba('#ffffff', 0.16 + 0.2 * s.hit);
      ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.002);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawColorGrade(ctx, W, H, config, primary, accent, s, light.tint);
  if (!card) drawLightLeaks(ctx, W, H, config, primary, accent, s, light.leaks);

  // Transient flash.
  const flash = config.glowIntensity * (s.onset * 0.16 + s.hit * 0.05);
  if (flash > 0.01) {
    const flashGradient = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    flashGradient.addColorStop(0, rgba(mix(primary, '#ffffff', 0.5), flash));
    flashGradient.addColorStop(1, rgba(accent, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = flashGradient;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawParticles(ctx, W, H, config, primary, accent, s);
  drawVignette(ctx, W, H, config, s);
  applyWarmthOverlay(ctx, W, H, config.warmth);

  if (config.showTitle && frame.title) {
    const fontSize = Math.round(Math.min(W, H) * 0.042);
    ctx.save();
    ctx.fillStyle = '#eef1fb';
    ctx.textAlign = 'center';
    ctx.font = `500 ${fontSize}px Manrope, sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = fontSize * 0.5;
    ctx.fillText(frame.title, W / 2, H - fontSize * 1.8, W - fontSize * 4);
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
