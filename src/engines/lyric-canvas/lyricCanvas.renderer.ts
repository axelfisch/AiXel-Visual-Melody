import { adjustSaturation, applyWarmthOverlay } from '../engine.directorFx';
import type { EngineFrame, RenderSurface } from '../engine.types';
import { getPulseImage, type PulseImage } from '../image-pulse/imagePulse.images';
import {
  baseLyricSize,
  layoutLyricLine,
  lyricFont,
  lyricSafeArea,
  type LayoutRow,
  type LyricLayout,
} from './lyricCanvas.layout';
import { activeLyricAt, lyricBpm, lyricTimelineFor, type LyricLine, type LyricTimeline } from './lyricCanvas.timing';
import type { LyricCanvasConfig, LyricCanvasPreset } from './lyricCanvas.types';

// Lyric Canvas renderer — audio-reactive kinetic typography.
// Every pixel is a pure function of (frame.time, frame.duration, frame.energy,
// frame.onset, frame.bpm, frame.title, config, decoded background image), so
// Preview and Export draw identical frames for the same audio time.

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
const easeOutBack = (t: number) => {
  const x = clamp01(t);
  const c1 = 1.9;
  return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

type Ctx = CanvasRenderingContext2D;

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
  const f = (x: number, y: number) => Math.round(x + (y - x) * clamp01(t)).toString(16).padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
}

// ------------------------------------------------------------ audio signals
export type LyricSignals = {
  beat: number;
  beatIndex: number;
  phase: number;
  /** 1 on each beat (stronger on downbeats), decaying with Fluidity-controlled softness. */
  kick: number;
  /** Energy scaled by Dynamics. */
  energy: number;
  /** Transient strength scaled by Dynamics. */
  onset: number;
  /** Combined beat / transient punch, 0 when Dynamics is 0. */
  hit: number;
  /** Dynamics as an amplitude multiplier (1 at default, 0 = static). */
  response: number;
  /** Continuous drift clock driven by Fluidity. */
  drift: number;
  /** Fluidity normalized 0..1. */
  fluid: number;
  /** Motion Complexity normalized 0..1. */
  complexity: number;
};

export function lyricSignals(frame: EngineFrame, config: LyricCanvasConfig): LyricSignals {
  const time = Math.max(0, frame.time);
  const beat = time * (lyricBpm(frame.bpm) / 60);
  const beatIndex = Math.floor(beat);
  const phase = beat - beatIndex;
  const fluid = clamp01((config.motionSpeed - 0.3) / 1.5);
  const kick = Math.exp(-phase * lerp(9, 4, fluid)) * (beatIndex % 4 === 0 ? 1 : 0.72);
  const response = config.energyResponse;
  const energy = clamp01((Number.isFinite(frame.energy) ? frame.energy : 0) * Math.min(1.6, 0.4 + response * 0.6));
  const onset = clamp01((frame.onset ?? 0) * response * 1.3);
  const hit = response <= 0 ? 0 : clamp01(Math.max(kick * (0.3 + 0.7 * energy) * Math.min(1.3, response), onset));
  return {
    beat,
    beatIndex,
    phase,
    kick,
    energy,
    onset,
    hit,
    response,
    drift: time * config.motionSpeed,
    fluid,
    complexity: clamp01((config.textMotion - 0.2) / 0.8),
  };
}

// ------------------------------------------------------------ background
type Scratch = { canvas: CanvasImageSource & { width: number; height: number }; ctx: Ctx };

function createScratch(width: number, height: number): Scratch | null {
  try {
    const Offscreen = (globalThis as { OffscreenCanvas?: new (w: number, h: number) => OffscreenCanvas }).OffscreenCanvas;
    if (Offscreen) {
      const canvas = new Offscreen(width, height);
      const ctx = canvas.getContext('2d') as unknown as Ctx | null;
      if (ctx) return { canvas: canvas as unknown as Scratch['canvas'], ctx };
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

const softCache = new WeakMap<object, PulseImage | null>();

/** Heavily downscaled copy of the image: drawn back upscaled it is a cheap, cross-browser blur. */
function softImage(image: PulseImage): PulseImage | null {
  const key = image.source as unknown as object;
  if (softCache.has(key)) return softCache.get(key) ?? null;
  const ratio = Math.min(1, 96 / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * ratio));
  const h = Math.max(1, Math.round(image.height * ratio));
  const mid = createScratch(Math.max(1, w * 3), Math.max(1, h * 3));
  const small = createScratch(w, h);
  if (!mid || !small) {
    softCache.set(key, null);
    return null;
  }
  mid.ctx.drawImage(image.source, 0, 0, w * 3, h * 3);
  small.ctx.drawImage(mid.canvas, 0, 0, w, h);
  const out = { source: small.canvas, width: w, height: h };
  softCache.set(key, out);
  return out;
}

type Palette = { primary: string; accent: string; ink: string; soft: string };

/** Per-preset scene balance: neon and cinematic want a darker wall, kinetic a brighter stage. */
const presetScene: Record<LyricCanvasPreset, { orbs: number; horizon: number }> = {
  karaoke: { orbs: 1, horizon: 1 },
  kinetic: { orbs: 1.15, horizon: 1.1 },
  neon: { orbs: 0.45, horizon: 0.7 },
  typewriter: { orbs: 0.6, horizon: 0.55 },
  cinematic: { orbs: 0.7, horizon: 0.9 },
};

function drawBackground(ctx: Ctx, W: number, H: number, config: LyricCanvasConfig, pal: Palette, s: LyricSignals) {
  const scene = presetScene[config.preset];
  const base = ctx.createLinearGradient(0, 0, W * 0.35, H);
  base.addColorStop(0, mix('#03040a', pal.primary, 0.1));
  base.addColorStop(0.55, '#05060c');
  base.addColorStop(1, mix('#03040a', pal.accent, 0.24));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // Horizon glow in the accent color, breathing with the energy.
  const horizon = ctx.createRadialGradient(W / 2, H * 1.08, 0, W / 2, H * 1.08, Math.max(W, H) * 0.75);
  horizon.addColorStop(0, rgba(adjustSaturation(pal.accent, 1.25), scene.horizon * config.glowIntensity * (0.24 + 0.14 * s.energy)));
  horizon.addColorStop(1, rgba(pal.accent, 0));
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 0, W, H);

  const image = config.background === 'image' ? getPulseImage(config.imageSrc) : undefined;
  if (image) {
    const soft = softImage(image) ?? image;
    const zoom = 1.12 + 0.04 * Math.sin(s.drift * 0.11) + 0.025 * s.hit;
    const scale = Math.max(W / soft.width, H / soft.height) * zoom;
    const w = soft.width * scale;
    const h = soft.height * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(soft.source, (W - w) / 2 + Math.sin(s.drift * 0.13) * W * 0.02, (H - h) / 2 + Math.cos(s.drift * 0.1) * H * 0.02, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(5, 6, 11, 0.52)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Light orbs in the Creator colors (Light = intensity, Complexity = count, Fluidity = drift).
  const orbs = 2 + Math.round(s.complexity * 4);
  const radius = Math.max(W, H) * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let index = 0; index < orbs; index += 1) {
    const t = s.drift * (0.05 + index * 0.017) + index * 2.3;
    const x = W * (0.5 + 0.42 * Math.cos(t + hash01(index) * 3));
    const y = H * (0.5 + 0.38 * Math.sin(t * 1.21 + index * 1.7));
    const color = adjustSaturation(index % 2 ? pal.accent : pal.primary, 1.3);
    const strength = scene.orbs * config.glowIntensity * (image ? 0.6 : 1) * (0.075 + 0.08 * s.energy + 0.09 * s.hit);
    const r = radius * (0.55 + 0.35 * hash01(index + 7)) * (1 + 0.06 * s.hit);
    const orb = ctx.createRadialGradient(x, y, 0, x, y, r);
    orb.addColorStop(0, rgba(color, strength));
    orb.addColorStop(0.5, rgba(color, strength * 0.35));
    orb.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = orb;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  if (config.background === 'particles') drawStarfield(ctx, W, H, config, pal, s);
}

function drawStarfield(ctx: Ctx, W: number, H: number, config: LyricCanvasConfig, pal: Palette, s: LyricSignals) {
  const unit = Math.min(W, H);
  const stars = Math.round(70 + 110 * Math.min(1.2, 0.4 + config.sparkleDensity));
  ctx.save();
  for (let index = 0; index < stars; index += 1) {
    const depth = 0.3 + hash01(index + 21) * 0.7;
    const x = ((hash01(index) * W + s.drift * depth * unit * 0.012) % W + W) % W;
    const y = hash01(index + 40) * H;
    const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(s.drift * (0.5 + depth) + index));
    ctx.globalAlpha = clamp01(twinkle * depth * (0.35 + 0.35 * s.energy));
    ctx.fillStyle = index % 7 === 0 ? pal.primary : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, unit * 0.0013 * (0.6 + depth), 0, TAU);
    ctx.fill();
  }
  // Large soft bokeh discs.
  ctx.globalCompositeOperation = 'screen';
  const bokeh = 5 + Math.round(s.complexity * 5);
  for (let index = 0; index < bokeh; index += 1) {
    const x = W * hash01(index + 80) + Math.sin(s.drift * 0.2 + index) * W * 0.03;
    const y = H * hash01(index + 90) + Math.cos(s.drift * 0.17 + index) * H * 0.03;
    const r = unit * (0.03 + hash01(index + 100) * 0.07) * (1 + 0.15 * s.hit);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const color = index % 2 ? pal.accent : pal.primary;
    g.addColorStop(0, rgba(color, 0.18 * config.glowIntensity));
    g.addColorStop(0.7, rgba(color, 0.08 * config.glowIntensity));
    g.addColorStop(1, rgba(color, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawDust(ctx: Ctx, W: number, H: number, config: LyricCanvasConfig, pal: Palette, s: LyricSignals) {
  const count = Math.round(90 * config.sparkleDensity);
  if (count <= 0) return;
  const unit = Math.min(W, H);
  const burst = s.kick * (0.3 + 0.7 * s.energy) * Math.min(1.5, s.response);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < count; index += 1) {
    const speed = 0.01 + hash01(index + 11) * 0.028;
    const rise = (hash01(index + 5) + s.drift * speed) % 1;
    const x = hash01(index) * W + Math.sin(s.drift * (0.3 + hash01(index + 7)) + index) * unit * 0.025;
    const y = H * (1.05 - rise * 1.1);
    const fade = Math.sin(rise * Math.PI);
    const size = unit * (0.0011 + hash01(index + 17) * 0.0024) * (1 + burst * 0.9);
    ctx.fillStyle = index % 5 === 0 ? '#ffffff' : index % 2 ? pal.accent : pal.primary;
    ctx.globalAlpha = clamp01(fade * (0.05 + 0.05 * s.energy + 0.08 * burst));
    ctx.beginPath();
    ctx.arc(x, y, size * 3, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = clamp01(fade * (0.5 + 0.4 * burst));
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawVignette(ctx: Ctx, W: number, H: number, config: LyricCanvasConfig, s: LyricSignals) {
  const inner = Math.min(W, H) * (0.2 + (config.spaceScale - 0.78) * 0.5);
  const outer = Math.hypot(W, H) * 0.58;
  const edge = clamp01(0.74 - 0.1 * config.glowIntensity - 0.1 * s.hit);
  const vignette = ctx.createRadialGradient(W / 2, H / 2, inner, W / 2, H / 2, outer);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.6, `rgba(0, 0, 0, ${(edge * 0.4).toFixed(3)})`);
  vignette.addColorStop(1, `rgba(0, 0, 0, ${edge.toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------ typography
type LineState = {
  line: LyricLine;
  /** 0 → 1 while the line enters. */
  enter: number;
  /** 1 → 0 while the line leaves. */
  exit: number;
  /** 0..1 progress of the sung part. */
  sung: number;
};

type TextContext = {
  ctx: Ctx;
  W: number;
  H: number;
  time: number;
  config: LyricCanvasConfig;
  pal: Palette;
  s: LyricSignals;
  timeline: LyricTimeline;
  /** Latest started line index (for history / previews). */
  latest: number;
  states: LineState[];
};

function transitionTimes(s: LyricSignals) {
  return { enter: lerp(0.16, 0.7, s.fluid), exit: lerp(0.14, 0.6, s.fluid) };
}

function lineStates(timeline: LyricTimeline, time: number, s: LyricSignals): LineState[] {
  const { enter, exit } = transitionTimes(s);
  const states: LineState[] = [];
  for (const line of timeline.lines) {
    if (time < line.start - enter || time >= line.end + exit) continue;
    states.push({
      line,
      enter: clamp01((time - (line.start - enter)) / enter),
      exit: clamp01((line.end + exit - time) / exit),
      sung: clamp01((time - line.start) / Math.max(0.05, line.singEnd - line.start)),
    });
  }
  return states;
}

function wordProgress(line: LyricLine, index: number, time: number) {
  const word = line.words[index];
  if (!word) return 0;
  return clamp01((time - word.start) / Math.max(0.04, word.end - word.start));
}

function activeWordIndex(line: LyricLine, time: number) {
  for (let index = line.words.length - 1; index >= 0; index -= 1) {
    if (time >= line.words[index].start) return time < line.singEnd + 0.15 ? index : -1;
  }
  return -1;
}

function rowStart(row: LayoutRow, layout: LyricLayout, cx: number, left: number) {
  return layout.align === 'center' ? cx - row.width / 2 : left;
}

function textShadow(ctx: Ctx, blur: number, color: string) {
  ctx.shadowBlur = blur;
  ctx.shadowColor = color;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// --- Karaoke: word-by-word highlight sweep with next-line preview.
function drawKaraoke(tc: TextContext) {
  const { ctx, W, H, time, config, pal, s, timeline } = tc;
  const area = lyricSafeArea(W, H);
  const cx = W / 2;
  const glow = config.glowIntensity;
  for (const state of tc.states) {
    const { line } = state;
    const layout = layoutLyricLine(ctx, line.text, W, H, 'karaoke', config.spaceScale);
    const alpha = easeOut(state.enter) * easeInOut(state.exit);
    if (alpha <= 0.002) continue;
    const next = timeline.lines[line.index + 1];
    const showNext = next && next.section === line.section && next.start - time < 8;
    const nextLayout = showNext ? layoutLyricLine(ctx, next.text, W, H, 'karaoke', config.spaceScale, 0.56) : null;
    const gap = layout.fontSize * 0.55;
    const stack = layout.height + (nextLayout ? gap + nextLayout.height : 0);
    const top = H * 0.5 - stack / 2;
    const cy = top + layout.height / 2 - (1 - easeOut(state.enter)) * layout.fontSize * 0.35 - (1 - state.exit) * layout.fontSize * 0.45;
    const pump = 1 + 0.035 * s.hit * Math.min(1.5, s.response);
    const lightA = mix(pal.primary, '#ffffff', 0.2);
    const lightB = mix(pal.accent, '#ffffff', 0.25);
    const blockLeft = cx - layout.width / 2;
    const colorAt = (px: number) => mix(lightA, lightB, clamp01((px - blockLeft) / Math.max(1, layout.width)));
    const gradient = ctx.createLinearGradient(blockLeft, 0, blockLeft + layout.width, 0);
    gradient.addColorStop(0, lightA);
    gradient.addColorStop(1, lightB);
    const active = activeWordIndex(line, time);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pump, pump);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = alpha;
    ctx.font = layout.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const row of layout.rows) {
      const x0 = rowStart(row, layout, cx, area.x);
      for (const word of row.words) {
        const p = wordProgress(line, word.index, time);
        const isActive = word.index === active;
        const bounce = isActive
          ? -layout.fontSize * (0.05 + 0.07 * s.complexity) * Math.sin(Math.PI * p) * Math.min(1.5, 0.5 + s.response * 0.5)
          : 0;
        const wobble = s.complexity * layout.fontSize * 0.025 * Math.sin(s.drift * 2.1 + word.index * 1.7);
        const x = x0 + word.x;
        const y = cy + row.y + bounce + wobble;
        // Unsung layer.
        textShadow(ctx, layout.fontSize * 0.25, 'rgba(0, 0, 0, 0.55)');
        ctx.fillStyle = 'rgba(236, 240, 255, 0.42)';
        ctx.fillText(word.text, x, y);
        if (p <= 0) continue;
        // Sung layer: a soft left → right wipe inside the word (gradient alpha, so the glow follows the glyphs).
        let fill: CanvasGradient = gradient;
        if (p < 1) {
          fill = ctx.createLinearGradient(x, 0, x + word.width, 0);
          const edge = Math.min(1, p + 0.08);
          fill.addColorStop(0, colorAt(x));
          fill.addColorStop(p, colorAt(x + word.width * p));
          fill.addColorStop(edge, rgba(colorAt(x + word.width * edge), 0));
          fill.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        textShadow(ctx, layout.fontSize * (0.2 + 0.45 * glow) * (isActive ? 1 + 0.5 * s.hit : 1), rgba(pal.primary, 0.85));
        ctx.fillStyle = fill;
        ctx.fillText(word.text, x, y);
      }
    }
    // Progress underline.
    const lastRow = layout.rows[layout.rows.length - 1];
    if (lastRow) {
      const uy = cy + lastRow.y + layout.fontSize * 0.72;
      const uw = layout.width * state.sung;
      ctx.shadowBlur = layout.fontSize * 0.4 * glow;
      ctx.shadowColor = pal.accent;
      ctx.fillStyle = rgba(pal.accent, 0.85);
      ctx.fillRect(cx - layout.width / 2, uy, uw, Math.max(2, layout.fontSize * 0.045));
    }
    ctx.restore();

    if (nextLayout && next) {
      const ny = top + layout.height + gap + nextLayout.height / 2;
      ctx.save();
      ctx.globalAlpha = alpha * 0.42 * clamp01((8 - (next.start - time)) / 2);
      ctx.font = nextLayout.font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      textShadow(ctx, nextLayout.fontSize * 0.3, 'rgba(0, 0, 0, 0.6)');
      ctx.fillStyle = mix('#dfe6ff', pal.primary, 0.25);
      for (const row of nextLayout.rows) {
        const x0 = rowStart(row, nextLayout, cx, area.x);
        for (const word of row.words) ctx.fillText(word.text, x0 + word.x, ny + row.y);
      }
      ctx.restore();
    }
  }
}

// --- Kinetic: uppercase words pop in on their beat, active word boxed in the primary color.
function drawKinetic(tc: TextContext) {
  const { ctx, W, H, time, config, pal, s } = tc;
  const area = lyricSafeArea(W, H);
  const cx = W / 2;
  const popDuration = lerp(0.12, 0.34, s.fluid);
  for (const state of tc.states) {
    const { line } = state;
    const layout = layoutLyricLine(ctx, line.text, W, H, 'kinetic', config.spaceScale);
    const exitAlpha = easeInOut(state.exit);
    if (exitAlpha <= 0.002) continue;
    const active = activeWordIndex(line, time);
    const cy = H * 0.5;
    const pump = 1 + 0.06 * s.hit * Math.min(1.6, s.response);
    const shake = s.onset * s.complexity * layout.fontSize * 0.12;
    const shakeX = (hash01(Math.floor(time * 24)) - 0.5) * shake;
    const shakeY = (hash01(Math.floor(time * 24) + 9) - 0.5) * shake;
    const exitLift = (1 - state.exit) * layout.fontSize * 0.8;
    ctx.save();
    ctx.translate(cx + shakeX, cy + shakeY - exitLift);
    ctx.scale(pump * (1 + (1 - state.exit) * 0.15), pump * (1 + (1 - state.exit) * 0.15));
    ctx.translate(-cx, -cy);
    ctx.font = layout.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const row of layout.rows) {
      const x0 = rowStart(row, layout, cx, area.x);
      for (const word of row.words) {
        const lw = line.words[word.index];
        const appear = lw ? clamp01((time - (lw.start - 0.06)) / popDuration) : 1;
        if (appear <= 0) continue;
        const scale = easeOutBack(appear);
        const tilt = (hash01(line.index * 31 + word.index) - 0.5) * 0.14 * s.complexity;
        const spin = (1 - appear) * (word.index % 2 ? 1 : -1) * 0.5 * s.complexity;
        const isActive = word.index === active;
        const wx = x0 + word.x + word.width / 2;
        const wy = cy + row.y;
        const beatScale = isActive ? 1 + 0.1 * s.kick * Math.min(1.5, s.response) : 1;
        ctx.save();
        ctx.globalAlpha = exitAlpha * clamp01(appear * 1.6);
        ctx.translate(wx, wy);
        ctx.rotate(tilt + spin);
        ctx.scale(scale * beatScale, scale * beatScale);
        if (isActive) {
          const padX = layout.fontSize * 0.16;
          const padY = layout.fontSize * 0.1;
          const h = layout.fontSize * 1.02 + padY * 2;
          textShadow(ctx, layout.fontSize * 0.5 * config.glowIntensity, rgba(pal.primary, 0.8));
          ctx.fillStyle = pal.primary;
          roundRectPath(ctx, -word.width / 2 - padX, -h / 2, word.width + padX * 2, h, layout.fontSize * 0.14);
          ctx.fill();
          textShadow(ctx, 0, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = '#07080f';
        } else {
          textShadow(ctx, layout.fontSize * (0.15 + 0.3 * config.glowIntensity), rgba(pal.accent, 0.75));
          ctx.fillStyle = word.index < active || active < 0 ? '#f4f6ff' : mix('#ffffff', pal.accent, 0.35);
        }
        ctx.fillText(word.text, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}

// --- Neon: glowing tube lettering with flicker on entry and on transients.
function drawNeon(tc: TextContext) {
  const { ctx, W, H, time, config, pal, s } = tc;
  const area = lyricSafeArea(W, H);
  const cx = W / 2;
  const glow = config.glowIntensity;
  for (const state of tc.states) {
    const { line } = state;
    const layout = layoutLyricLine(ctx, line.text, W, H, 'neon', config.spaceScale);
    const tick = Math.floor(time * 18);
    const flickerIn = state.enter < 1 ? (hash01(tick + line.index * 13) > 0.35 ? 1 : 0.2) : 1;
    const flickerHit = s.onset > 0.45 && hash01(tick * 3 + line.index) > 0.72 ? 0.55 : 1;
    const alpha = easeOut(state.enter) * easeInOut(state.exit) * flickerIn * flickerHit;
    if (alpha <= 0.002) continue;
    const active = activeWordIndex(line, time);
    const cy = H * 0.5 - (1 - state.exit) * layout.fontSize * 0.25;
    const breath = 1 + 0.25 * s.hit;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = layout.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const row of layout.rows) {
      const x0 = rowStart(row, layout, cx, area.x);
      for (const word of row.words) {
        const sung = wordProgress(line, word.index, time) > 0;
        const isActive = word.index === active;
        const wiggle = s.complexity * layout.fontSize * 0.02 * Math.sin(s.drift * 3 + word.index * 2.3);
        const x = x0 + word.x;
        const y = cy + row.y + wiggle;
        const lit = isActive ? 1 + 0.35 * s.hit : 1;
        if (sung) {
          // Lit tube: wide coloured glow, then a thin white-hot core along the glyph outline.
          ctx.lineWidth = Math.max(2, layout.fontSize * 0.085);
          ctx.strokeStyle = rgba(pal.primary, 0.9);
          textShadow(ctx, layout.fontSize * (0.3 + 0.6 * glow) * breath * lit, rgba(pal.primary, 0.95));
          ctx.strokeText(word.text, x, y);
          textShadow(ctx, layout.fontSize * 0.25 * glow * lit, rgba(mix(pal.primary, pal.accent, 0.4), 0.9));
          ctx.strokeText(word.text, x, y);
          ctx.lineWidth = Math.max(1, layout.fontSize * 0.03);
          ctx.strokeStyle = mix(pal.primary, '#ffffff', 0.85);
          textShadow(ctx, layout.fontSize * 0.12 * glow, rgba(pal.accent, 0.9));
          ctx.strokeText(word.text, x, y);
          ctx.fillStyle = rgba(pal.primary, 0.12 + 0.1 * s.hit);
          ctx.fillText(word.text, x, y);
        } else {
          // Unlit tube: dim glass outline, no glow.
          textShadow(ctx, 0, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = 'rgba(8, 10, 20, 0.35)';
          ctx.fillText(word.text, x, y);
          ctx.lineWidth = Math.max(1.5, layout.fontSize * 0.05);
          ctx.strokeStyle = rgba(mix(pal.primary, '#9aa3c4', 0.5), 0.5);
          ctx.strokeText(word.text, x, y);
        }
      }
    }
    // Neon underline tube in the accent color.
    const lastRow = layout.rows[layout.rows.length - 1];
    if (lastRow) {
      const uy = cy + lastRow.y + layout.fontSize * 0.78;
      const half = (layout.width / 2) * easeOut(state.enter);
      textShadow(ctx, layout.fontSize * 0.6 * glow * breath, pal.accent);
      ctx.strokeStyle = mix(pal.accent, '#ffffff', 0.35);
      ctx.lineWidth = Math.max(1.5, layout.fontSize * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - half, uy);
      ctx.lineTo(cx + half, uy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// --- Typewriter: left-aligned monospace, characters typed across the sung part, history above.
function drawTypewriter(tc: TextContext) {
  const { ctx, W, H, time, config, pal, s, timeline } = tc;
  const area = lyricSafeArea(W, H);
  const portrait = H > W;
  const state = tc.states[tc.states.length - 1];
  const currentIndex = state ? state.line.index : tc.latest;
  if (currentIndex < 0) return;
  const current = timeline.lines[currentIndex];
  const exitAlpha = state ? easeInOut(state.exit) : 0;
  // Between lines the last typed line stays dimmed, then fades out during long pauses.
  const idle = 0.55 * clamp01(1 - (time - (current.end + transitionTimes(s).exit)) / 1.5);
  if (!state && idle <= 0.002) return;
  const layout = layoutLyricLine(ctx, current.text, W, H, 'typewriter', config.spaceScale);
  const historyCount = portrait ? 3 : 2;
  const history: Array<{ line: LyricLine; layout: LyricLayout }> = [];
  for (let index = currentIndex - 1; index >= 0 && history.length < historyCount; index -= 1) {
    const line = timeline.lines[index];
    if (line.section !== current.section) break;
    history.unshift({ line, layout: layoutLyricLine(ctx, line.text, W, H, 'typewriter', config.spaceScale, 0.82) });
  }
  const gap = layout.fontSize * 0.7;
  const historyHeight = history.reduce((sum, item) => sum + item.layout.height + gap, 0);
  // Keep the typed line near the optical centre; history scrolls up above it.
  const cy = H * 0.5 + Math.min(historyHeight * 0.35, area.h * 0.18);
  const reveal = state ? state.sung : 1;
  const totalChars = layout.rows.reduce((sum, row) => sum + row.words.reduce((acc, word) => acc + Array.from(word.text).length + 1, 0), 0);
  let budget = Math.floor(totalChars * reveal + 0.0001);
  const left = area.x + (portrait ? 0 : area.w * 0.06);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // History lines.
  let y = cy - layout.height / 2 - gap;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    const age = history.length - index;
    y -= item.layout.height;
    ctx.font = item.layout.font;
    ctx.globalAlpha = (age === 1 ? 0.42 : 0.2) * (state ? 1 : idle / 0.55);
    ctx.fillStyle = mix('#e8ecff', pal.primary, 0.2);
    textShadow(ctx, 0, 'rgba(0, 0, 0, 0)');
    for (const row of item.layout.rows) {
      for (const word of row.words) ctx.fillText(word.text, left + word.x, y + item.layout.height / 2 + row.y);
    }
    y -= gap;
  }
  // Current line.
  ctx.font = layout.font;
  ctx.globalAlpha = state ? exitAlpha : idle;
  let cursorX = left;
  let cursorY = cy;
  let typedAny = false;
  for (const row of layout.rows) {
    for (const word of row.words) {
      if (budget <= 0) break;
      const chars = Array.from(word.text);
      const shown = chars.slice(0, Math.min(chars.length, budget)).join('');
      budget -= chars.length + 1;
      const jitter = s.complexity * layout.fontSize * 0.05 * (hash01(currentIndex * 97 + word.index) - 0.5);
      const x = left + word.x;
      const wy = cy + row.y + jitter;
      const fresh = shown.length < word.text.length || budget <= 0;
      textShadow(ctx, layout.fontSize * 0.3 * config.glowIntensity, rgba(pal.primary, 0.55));
      ctx.fillStyle = fresh ? mix('#ffffff', pal.accent, 0.3 + 0.4 * s.hit) : '#f1f3ff';
      ctx.fillText(shown, x, wy);
      cursorX = x + ctx.measureText(shown).width;
      cursorY = cy + row.y;
      typedAny = true;
    }
  }
  // Blinking block cursor (solid while typing, blinks on the beat grid otherwise).
  const typing = state && state.sung < 1;
  const on = typing || s.phase < 0.55;
  if (on && (typedAny || state)) {
    ctx.globalAlpha = (state ? exitAlpha : idle) * (0.75 + 0.25 * s.kick);
    textShadow(ctx, layout.fontSize * 0.5 * config.glowIntensity, pal.accent);
    ctx.fillStyle = pal.accent;
    const cw = layout.fontSize * 0.52;
    ctx.fillRect(cursorX + layout.fontSize * 0.08, cursorY - layout.fontSize * 0.5, cw, layout.fontSize * (0.95 + 0.1 * s.hit));
  }
  ctx.restore();
}

// --- Cinematic: serif lines that fade / focus-pull in, drift slowly, letterbox bars.
function drawCinematic(tc: TextContext) {
  const { ctx, W, H, time, config, pal, s } = tc;
  const area = lyricSafeArea(W, H);
  const cx = W / 2;
  for (const state of tc.states) {
    const { line } = state;
    const layout = layoutLyricLine(ctx, line.text, W, H, 'cinematic', config.spaceScale);
    const alpha = easeInOut(state.enter) * easeInOut(state.exit);
    if (alpha <= 0.002) continue;
    const since = Math.max(0, time - line.start);
    const drift = -since * layout.fontSize * 0.05 * (0.5 + s.fluid) - (1 - state.exit) * layout.fontSize * 0.2;
    const cy = H * 0.5 + (1 - easeOut(state.enter)) * layout.fontSize * 0.35 + drift;
    const focus = (1 - easeOut(state.enter)) + (1 - state.exit);
    const scale = 1 + 0.05 * (1 - easeOut(state.enter)) + 0.012 * s.hit * Math.min(1.5, s.response);
    const sheen = ctx.createLinearGradient(cx - layout.width / 2, 0, cx + layout.width / 2, 0);
    const band = clamp01(state.sung * 1.2 - 0.1);
    const base = mix('#fbf7ee', pal.primary, 0.14);
    sheen.addColorStop(0, base);
    sheen.addColorStop(Math.max(0, band - 0.18), base);
    sheen.addColorStop(band, mix('#ffffff', pal.accent, 0.35 * config.glowIntensity));
    sheen.addColorStop(Math.min(1, band + 0.18), base);
    sheen.addColorStop(1, base);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.font = layout.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Focus pull ghosts.
    if (focus > 0.02) {
      ctx.globalAlpha = alpha * 0.28 * clamp01(focus);
      ctx.fillStyle = rgba(pal.primary, 1);
      const spread = layout.fontSize * 0.08 * focus;
      for (const dx of [-spread, spread]) {
        for (const row of layout.rows) {
          const x0 = rowStart(row, layout, cx, area.x);
          for (const word of row.words) ctx.fillText(word.text, x0 + word.x + dx, cy + row.y);
        }
      }
    }
    ctx.globalAlpha = alpha;
    textShadow(ctx, layout.fontSize * (0.25 + 0.4 * config.glowIntensity), rgba(pal.primary, 0.55));
    ctx.fillStyle = sheen;
    for (const row of layout.rows) {
      const x0 = rowStart(row, layout, cx, area.x);
      for (const word of row.words) {
        const sway = s.complexity * layout.fontSize * 0.03 * Math.sin(s.drift * 0.9 + word.index * 0.8);
        ctx.fillText(word.text, x0 + word.x, cy + row.y + sway);
      }
    }
    // Hairlines framing the line.
    const firstRow = layout.rows[0];
    if (firstRow) {
      const reach = Math.min(area.w * 0.14, layout.fontSize * 2.4) * easeOut(state.enter);
      const ly = cy + layout.rows[layout.rows.length - 1].y + layout.fontSize * 0.85;
      textShadow(ctx, layout.fontSize * 0.3 * config.glowIntensity, pal.accent);
      ctx.strokeStyle = rgba(pal.accent, 0.75);
      ctx.lineWidth = Math.max(1, layout.fontSize * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx - reach, ly);
      ctx.lineTo(cx + reach, ly);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawLetterbox(ctx: Ctx, W: number, H: number) {
  const bar = H > W ? H * 0.06 : H * 0.085;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  ctx.fillRect(0, 0, W, bar);
  ctx.fillRect(0, H - bar, W, bar);
  ctx.restore();
}

const presetDrawers: Record<LyricCanvasPreset, (tc: TextContext) => void> = {
  karaoke: drawKaraoke,
  kinetic: drawKinetic,
  neon: drawNeon,
  typewriter: drawTypewriter,
  cinematic: drawCinematic,
};

/** Title card shown before the first line, after the last one, and as the empty-state placeholder. */
function drawTitleCard(ctx: Ctx, W: number, H: number, title: string, alpha: number, config: LyricCanvasConfig, pal: Palette, s: LyricSignals) {
  if (alpha <= 0.002) return;
  const preset = config.preset;
  const size = baseLyricSize(W, H, preset, config.spaceScale) * 0.72;
  const area = lyricSafeArea(W, H);
  const text = title.trim() || 'Lyric Canvas';
  const layout = layoutLyricLine(ctx, text, W, H, preset, config.spaceScale, 0.72);
  const cy = H * 0.5 - size * 0.2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = layout.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  textShadow(ctx, layout.fontSize * 0.5 * config.glowIntensity * (1 + 0.3 * s.hit), rgba(pal.primary, 0.7));
  ctx.fillStyle = mix('#f5f3ff', pal.primary, 0.18);
  for (const row of layout.rows) {
    const x0 = layout.align === 'center' ? W / 2 - row.width / 2 : area.x;
    for (const word of row.words) ctx.fillText(word.text, x0 + word.x, cy + row.y);
  }
  ctx.font = lyricFont('karaoke', size * 0.5);
  ctx.textAlign = 'center';
  ctx.globalAlpha = alpha * (0.7 + 0.3 * s.kick);
  ctx.fillStyle = pal.accent;
  ctx.fillText('♪   ♪   ♪', W / 2, cy + layout.height / 2 + size * 0.75);
  ctx.restore();
}

// ------------------------------------------------------------ main entry
export function renderLyricCanvas(surface: RenderSurface, frame: EngineFrame, config: LyricCanvasConfig) {
  const { context: ctx, width: W, height: H } = surface;
  const s = lyricSignals(frame, config);
  const primary = adjustSaturation(config.primaryColor, config.colorSaturation);
  const accent = adjustSaturation(config.accentColor, config.colorSaturation);
  const pal: Palette = { primary, accent, ink: '#f4f6ff', soft: mix(primary, '#ffffff', 0.6) };
  const time = Math.max(0, frame.time);
  const timeline = lyricTimelineFor(config.lyrics, frame.duration, frame.bpm, config.lyricsOffset);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#05060b';
  ctx.fillRect(0, 0, W, H);
  drawBackground(ctx, W, H, config, pal, s);
  drawDust(ctx, W, H, config, pal, s);
  if (config.preset === 'cinematic') drawLetterbox(ctx, W, H);

  // Transient flash behind the words.
  const flash = config.glowIntensity * (s.onset * 0.12 + s.hit * 0.04);
  if (flash > 0.01) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
    g.addColorStop(0, rgba(mix(primary, '#ffffff', 0.4), flash));
    g.addColorStop(1, rgba(accent, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  const { latest } = activeLyricAt(timeline, time);
  const states = lineStates(timeline, time, s);
  if (!timeline.lines.length) {
    drawTitleCard(ctx, W, H, frame.title ?? '', 1, config, pal, s);
  } else {
    const first = timeline.lines[0];
    const last = timeline.lines[timeline.lines.length - 1];
    const { enter, exit } = transitionTimes(s);
    if (config.showTitle && frame.title) {
      const before = clamp01((first.start - enter - 0.25 - time) / 0.6);
      const after = clamp01((time - (last.end + exit + 0.8)) / 0.8);
      drawTitleCard(ctx, W, H, frame.title, Math.max(before, after), config, pal, s);
    }
    presetDrawers[config.preset]({ ctx, W, H, time, config, pal, s, timeline, latest, states });
  }

  drawVignette(ctx, W, H, config, s);
  applyWarmthOverlay(ctx, W, H, config.warmth);
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
