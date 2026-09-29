import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineFrame, RenderSurface, VisualEngine } from '../engine.types';
import { DanceAvatarsEngine } from '../dance-avatars/DanceAvatarsEngine';
import { ImagePulseEngine } from '../image-pulse/ImagePulseEngine';
import { LyricCanvasEngine } from '../lyric-canvas/LyricCanvasEngine';
import { ParticleSphereEngine } from '../particle-sphere/ParticleSphereEngine';

type Log = string[];

/** A colour is see-through when it carries an alpha below 1 (rgba/hsla/8-digit hex). */
const translucent = (color: string) => /rgba?\([^)]*,\s*(0?\.\d+|0)\s*\)/.test(color) || /^#[0-9a-f]{8}$/i.test(color) || color === 'transparent';
function styleKind(style: unknown): string {
  if (typeof style === 'string') return translucent(style) ? 'translucent' : 'opaque';
  const stops = (style as { stops?: string[] })?.stops ?? [];
  return stops.length && stops.every((stop) => !translucent(stop)) ? 'opaque' : 'translucent';
}

/** Records fill styles + full-frame fills so opaque backdrops can be detected. */
function recordingContext(log: Log, width: number, height: number) {
  const gradient = () => {
    const stops: string[] = [];
    return { stops, addColorStop: (_offset: number, color: string) => { stops.push(color); } };
  };
  const target: Record<string, unknown> = {
    canvas: { width, height },
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createPattern: () => null,
    measureText: (text: string) => ({ width: String(text).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  };
  return new Proxy(target, {
    get(obj, key: string) {
      if (key in obj) return obj[key];
      return (...args: unknown[]) => {
        if (key === 'fillRect' && args[0] === 0 && args[1] === 0 && args[2] === width && args[3] === height) {
          log.push(`fullFill op=${String(obj.globalCompositeOperation ?? 'source-over')} alpha=${String(obj.globalAlpha ?? 1)} style=${styleKind(obj.fillStyle)}`);
        }
      };
    },
    set(obj, key: string, value) {
      obj[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

class FakeOffscreen {
  width: number; height: number;
  constructor(w: number, h: number) { this.width = w; this.height = h; }
  getContext() { return recordingContext([], this.width, this.height); }
}

const frame: EngineFrame = { time: 6.4, duration: 90, progress: 6.4 / 90, energy: 0.6, onset: 0.3, bpm: 118, title: 'Naomi' };

/** Opaque full-frame paint in normal compositing = a backdrop that would hide layer 1. */
const opaqueBackdrops = (log: Log) => log.filter((line) => line.startsWith('fullFill op=source-over alpha=1 style=opaque'));

function run(engine: VisualEngine, config: Record<string, unknown>, transparent: boolean) {
  const log: Log = [];
  const surface: RenderSurface = { context: recordingContext(log, 1280, 720), width: 1280, height: 720, pixelRatio: 1, transparent };
  engine.render(surface, frame, engine.validateConfig(config) as never);
  return log;
}

describe('Pro tools transparent (layer 2) mode', () => {
  beforeEach(() => { vi.stubGlobal('OffscreenCanvas', FakeOffscreen); });
  afterEach(() => { vi.unstubAllGlobals(); });

  const cases: Array<[string, VisualEngine, Record<string, unknown>]> = [
    ['Particle Sphere', ParticleSphereEngine as VisualEngine, {}],
    ['Dance Avatars (hologram)', DanceAvatarsEngine as VisualEngine, { gender: 'female', style: 'hologram' }],
    ['Lyric Canvas', LyricCanvasEngine as VisualEngine, { lyrics: 'Every note\nbecomes light' }],
    ['Image Pulse (card)', ImagePulseEngine as VisualEngine, { framing: 'card' }],
  ];

  for (const [label, engine, config] of cases) {
    it(`${label}: paints an opaque backdrop normally, none as layer 2`, () => {
      expect(opaqueBackdrops(run(engine, config, false)).length).toBeGreaterThan(0);
      expect(opaqueBackdrops(run(engine, config, true))).toEqual([]);
    });
  }

  it('Image Pulse full frame keeps its image and relies on the mix opacity/blend', () => {
    expect(() => run(ImagePulseEngine as VisualEngine, { framing: 'fill' }, true)).not.toThrow();
  });
});
