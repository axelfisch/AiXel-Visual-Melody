import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imagePulseDefaultConfig, validateImagePulseConfig } from './imagePulse.config';
import { registerPulseImage, releasePulseImage } from './imagePulse.images';
import { imagePulseSignals, pulseBpm, renderImagePulse } from './imagePulse.renderer';
import { IMAGE_PULSE_STYLES, type ImagePulseConfig } from './imagePulse.types';

type Log = string[];

/** Minimal recording 2D context: every call/assignment is logged so frames can be compared. */
function recordingContext(log: Log, width: number, height: number) {
  const fmt = (v: unknown) => (typeof v === 'number' ? v.toFixed(3) : typeof v === 'object' ? '[obj]' : String(v));
  const gradient = () => ({ addColorStop: (o: number, c: string) => log.push(`stop ${fmt(o)} ${c}`) });
  const canvas = { width, height };
  const target: Record<string, unknown> = { canvas };
  return new Proxy(target, {
    get(obj, key: string) {
      if (key in obj) return obj[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') {
        return (...args: unknown[]) => { log.push(`${key} ${args.map(fmt).join(',')}`); return gradient(); };
      }
      return (...args: unknown[]) => { log.push(`${key} ${args.map(fmt).join(',')}`); };
    },
    set(obj, key: string, value) {
      obj[key] = value;
      log.push(`set ${key} ${fmt(value)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const SRC = 'blob:test-cover';
const frame = (time: number, energy = 0.62, onset = 0.3) => ({
  time, duration: 120, progress: time / 120, energy, onset, bpm: 120, title: 'Test',
});

function draw(config: Partial<ImagePulseConfig>, time = 21.1, size: [number, number] = [1280, 720], energy?: number, onset?: number) {
  const log: Log = [];
  renderImagePulse(
    { context: recordingContext(log, size[0], size[1]), width: size[0], height: size[1], pixelRatio: 1 },
    frame(time, energy, onset),
    validateImagePulseConfig({ imageSrc: SRC, ...config }),
  );
  return log;
}

describe('Image Pulse renderer', () => {
  beforeEach(() => {
    class FakeOffscreen {
      width: number; height: number; log: Log = [];
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() { return recordingContext(this.log, this.width, this.height); }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
    registerPulseImage(SRC, { source: { width: 1600, height: 1000 } as unknown as CanvasImageSource, width: 1600, height: 1000 });
  });
  afterEach(() => {
    releasePulseImage(SRC);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders every style in both framings, 16:9 and 9:16, without throwing', () => {
    for (const style of IMAGE_PULSE_STYLES) {
      for (const framing of ['fill', 'card'] as const) {
        for (const size of [[1280, 720], [1080, 1920]] as Array<[number, number]>) {
          const log = draw({ style, framing }, 24, size);
          expect(log.length).toBeGreaterThan(30);
          expect(log.some((line) => line.startsWith('drawImage [obj]'))).toBe(true);
        }
      }
    }
  });

  it('cover-fits the image: the drawn layer always covers the whole frame', () => {
    for (const size of [[1280, 720], [1080, 1920]] as Array<[number, number]>) {
      const log = draw({ style: 'pulse', energyResponse: 0 }, 3, size);
      const first = log.find((line) => line.startsWith('drawImage [obj]'))!;
      const [, , , w, h] = first.split(' ')[1].split(',').map(Number);
      expect(w).toBeGreaterThanOrEqual(size[0] - 0.5);
      expect(h).toBeGreaterThanOrEqual(size[1] - 0.5);
      expect(Math.abs(w / h - 1.6)).toBeLessThan(0.01);
    }
  });

  it('draws the same frame identically regardless of render history (Preview ≡ Export)', () => {
    for (const style of IMAGE_PULSE_STYLES) {
      const first = draw({ style }, 33.3);
      draw({ style }, 5);
      draw({ style, framing: 'card' }, 80.2);
      expect(draw({ style }, 33.3)).toEqual(first);
    }
  });

  it('is music-reactive: frames differ with audio energy, transients and beat position', () => {
    for (const style of IMAGE_PULSE_STYLES) {
      const quiet = draw({ style }, 24, undefined, 0.1, 0).join('\n');
      const loud = draw({ style }, 24, undefined, 0.95, 0.8).join('\n');
      expect(loud).not.toEqual(quiet);
      expect(draw({ style }, 24.25).join('\n')).not.toEqual(draw({ style }, 24).join('\n'));
    }
  });

  it('changes the drawing for every Director-mapped parameter in every style', () => {
    const patches: Array<Partial<ImagePulseConfig>> = [
      { pulseSpeed: 1.5 }, { energyResponse: 2 }, { effectComplexity: 1 }, { glowIntensity: 1.8 },
      { spaceScale: 1.26 }, { colorSaturation: 0.4 }, { sparkleDensity: 1.5 }, { warmth: 0.8 },
    ];
    for (const style of IMAGE_PULSE_STYLES) {
      const ref = draw({ style }).join('\n');
      for (const patch of patches) {
        expect(draw({ style, ...patch }).join('\n'), `${style} ${JSON.stringify(patch)}`).not.toEqual(ref);
      }
    }
  });

  it('applies the Creator primary and accent colors', () => {
    const log = draw({ primaryColor: '#ff0000', accentColor: '#00ff00', colorSaturation: 1 }).join('\n');
    expect(log).toContain('#ff0000');
    expect(log).toContain('#00ff00');
  });

  it('uses the RGB split only where it is part of the look', () => {
    const glitch = draw({ style: 'glitch' }, 24, undefined, 0.9, 0.9).join('\n');
    expect(glitch).toContain('set globalCompositeOperation lighter');
    expect(glitch).toContain('set fillStyle #00ff00');
  });

  it('falls back to the procedural placeholder when no image is uploaded', () => {
    const log = draw({ imageSrc: '' });
    expect(log.some((line) => line.startsWith('drawImage [obj]'))).toBe(true);
  });

  it('still renders (gradient art) when no offscreen canvas exists and no image is uploaded', () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const log: Log = [];
    expect(() => renderImagePulse(
      { context: recordingContext(log, 640, 360), width: 640, height: 360, pixelRatio: 1 },
      frame(2),
      validateImagePulseConfig({ primaryColor: '#123456', accentColor: '#654321' }),
    )).not.toThrow();
    expect(log.some((line) => line.startsWith('createRadialGradient'))).toBe(true);
    expect(log.some((line) => line.startsWith('fillRect'))).toBe(true);
  });
});

describe('Image Pulse audio signals', () => {
  const config = validateImagePulseConfig(imagePulseDefaultConfig);

  it('locks the kick to the beat grid and accents downbeats', () => {
    const onBeat = imagePulseSignals(frame(2.0), config);
    const offBeat = imagePulseSignals(frame(2.25), config);
    const upBeat = imagePulseSignals(frame(2.5), config);
    expect(onBeat.kick).toBeCloseTo(1, 5);
    expect(offBeat.kick).toBeLessThan(0.2);
    expect(upBeat.kick).toBeCloseTo(0.74, 5);
  });

  it('silences punches when Dynamics is 0 and scales them with Dynamics', () => {
    expect(imagePulseSignals(frame(2), validateImagePulseConfig({ energyResponse: 0 })).hit).toBe(0);
    const low = imagePulseSignals(frame(2), validateImagePulseConfig({ energyResponse: 0.5 })).hit;
    const high = imagePulseSignals(frame(2), validateImagePulseConfig({ energyResponse: 1.8 })).hit;
    expect(high).toBeGreaterThan(low);
  });

  it('softens the beat decay with Fluidity and folds extreme BPMs into a musical range', () => {
    const tight = imagePulseSignals(frame(2.1), validateImagePulseConfig({ pulseSpeed: 0.2 })).kick;
    const smooth = imagePulseSignals(frame(2.1), validateImagePulseConfig({ pulseSpeed: 1.6 })).kick;
    expect(smooth).toBeGreaterThan(tight);
    expect(pulseBpm(240)).toBe(120);
    expect(pulseBpm(45)).toBe(90);
    expect(pulseBpm(Number.NaN)).toBe(112);
  });
});
