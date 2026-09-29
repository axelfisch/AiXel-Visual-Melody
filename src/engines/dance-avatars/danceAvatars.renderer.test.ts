import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { danceAvatarsDefaultConfig, validateDanceAvatarsConfig } from './danceAvatars.config';
import { renderDanceAvatars } from './danceAvatars.renderer';
import { DANCE_AVATAR_STYLES } from './danceAvatars.types';

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

const frame = (time: number) => ({ time, duration: 120, progress: time / 120, energy: 0.55, bpm: 118, title: 'Test' });

describe('Dance Avatars renderer', () => {
  beforeEach(() => {
    class FakeOffscreen {
      width: number; height: number; log: Log = [];
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() { return recordingContext(this.log, this.width, this.height); }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('renders every style for both genders without throwing', () => {
    for (const gender of ['female', 'male'] as const) {
      for (const style of DANCE_AVATAR_STYLES) {
        const log: Log = [];
        const context = recordingContext(log, 1280, 720);
        expect(() => renderDanceAvatars({ context, width: 1280, height: 720, pixelRatio: 1 }, frame(7.3),
          validateDanceAvatarsConfig({ gender, style }))).not.toThrow();
        expect(log.length).toBeGreaterThan(20);
      }
    }
  });

  it('draws the same frame identically regardless of what was rendered before (Preview = Export)', () => {
    const config = validateDanceAvatarsConfig({ ...danceAvatarsDefaultConfig, style: 'hologram', limbExpressiveness: 1.2 });
    const render = (time: number) => {
      const log: Log = [];
      renderDanceAvatars({ context: recordingContext(log, 1280, 720), width: 1280, height: 720, pixelRatio: 1 }, frame(time), config);
      return log;
    };
    const first = render(33.3);
    render(5);
    render(80.2);
    expect(render(33.3)).toEqual(first);
  });

  it('falls back to a plain body fill when offscreen canvases are unavailable', () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const log: Log = [];
    renderDanceAvatars({ context: recordingContext(log, 640, 360), width: 640, height: 360, pixelRatio: 1 }, frame(2),
      validateDanceAvatarsConfig({ style: 'neon' }));
    expect(log.some((l) => l.startsWith('fill'))).toBe(true);
  });

  it('changes the drawing when Director-mapped parameters change', () => {
    const base = validateDanceAvatarsConfig({ style: 'neon' });
    const draw = (patch: Partial<typeof base>) => {
      const log: Log = [];
      renderDanceAvatars({ context: recordingContext(log, 1280, 720), width: 1280, height: 720, pixelRatio: 1 }, frame(21.7),
        validateDanceAvatarsConfig({ ...base, ...patch }));
      return log.join('\n');
    };
    const ref = draw({});
    for (const patch of [
      { danceSpeed: 1.1 }, { energyResponse: 2 }, { limbExpressiveness: 1.2 }, { glowIntensity: 1.8 },
      { spaceScale: 1.25 }, { colorSaturation: 0.4 }, { sparkleDensity: 1.5 }, { warmth: 0.8 },
    ]) {
      expect(draw(patch)).not.toEqual(ref);
    }
  });
});
