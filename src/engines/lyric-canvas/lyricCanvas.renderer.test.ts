import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerPulseImage, releasePulseImage } from '../image-pulse/imagePulse.images';
import { lyricCanvasDefaultConfig, validateLyricCanvasConfig } from './lyricCanvas.config';
import { layoutLyricLine, lyricSafeArea } from './lyricCanvas.layout';
import { lyricSignals, renderLyricCanvas } from './lyricCanvas.renderer';
import { buildLyricTimeline } from './lyricCanvas.timing';
import { LYRIC_CANVAS_PRESETS, type LyricCanvasConfig } from './lyricCanvas.types';

type Log = string[];

/** Recording 2D context with a deterministic measureText (0.55 em per character). */
function recordingContext(log: Log, width: number, height: number) {
  const fmt = (v: unknown) => (typeof v === 'number' ? v.toFixed(3) : typeof v === 'object' ? '[obj]' : String(v));
  const gradient = () => ({ addColorStop: (o: number, c: string) => log.push(`stop ${fmt(o)} ${c}`) });
  const target: Record<string, unknown> = { canvas: { width, height }, font: '10px sans-serif' };
  return new Proxy(target, {
    get(obj, key: string) {
      if (key === 'measureText') {
        return (text: string) => {
          const size = Number(/(\d+(?:\.\d+)?)px/.exec(String(obj.font))?.[1] ?? 10);
          return { width: Array.from(text).length * size * 0.55 };
        };
      }
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

const LYRICS = `Sous la pluie d'été, je marche sans bruit
Les néons s'allument au cœur de la nuit

Lumière, lumière, emporte-moi là-bas
Où les étoiles chantent à chaque pas ✨`;
const DURATION = 120;
const BPM = 120;

/** A time in the middle of the sung part of line `index`. */
function midLine(config: Partial<LyricCanvasConfig>, index = 2) {
  const cfg = validateLyricCanvasConfig({ lyrics: LYRICS, ...config });
  const line = buildLyricTimeline(cfg.lyrics, DURATION, BPM, cfg.lyricsOffset).lines[index];
  return line.start + (line.singEnd - line.start) * 0.5;
}

function draw(config: Partial<LyricCanvasConfig>, time?: number, size: [number, number] = [1280, 720], energy = 0.62, onset = 0.3) {
  const log: Log = [];
  const t = time ?? midLine(config);
  renderLyricCanvas(
    { context: recordingContext(log, size[0], size[1]), width: size[0], height: size[1], pixelRatio: 1 },
    { time: t, duration: DURATION, progress: t / DURATION, energy, onset, bpm: BPM, title: 'Lumière d’été' },
    validateLyricCanvasConfig({ lyrics: LYRICS, ...config }),
  );
  return log;
}

const texts = (log: Log) => log.filter((line) => line.startsWith('fillText ') || line.startsWith('strokeText '));

describe('Lyric Canvas renderer', () => {
  beforeEach(() => {
    vi.stubGlobal('OffscreenCanvas', class {
      width: number; height: number; log: Log = [];
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() { return recordingContext(this.log, this.width, this.height); }
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    releasePulseImage('blob:bg');
  });

  it('renders every preset in 16:9 and 9:16 and actually draws the lyric words', () => {
    for (const preset of LYRIC_CANVAS_PRESETS) {
      for (const size of [[1280, 720], [1080, 1920], [1920, 1080]] as Array<[number, number]>) {
        const log = draw({ preset }, undefined, size);
        const drawn = texts(log).join('\n');
        const expected = preset === 'kinetic' ? 'LUMIÈRE,' : 'Lumière,';
        expect(drawn, `${preset} ${size}`).toContain(expected);
      }
    }
  });

  it('draws the same frame identically regardless of render history (Preview ≡ Export)', () => {
    for (const preset of LYRIC_CANVAS_PRESETS) {
      const first = draw({ preset }, 41.3);
      draw({ preset }, 5);
      draw({ preset, background: 'particles' }, 90.2, [1080, 1920]);
      expect(draw({ preset }, 41.3)).toEqual(first);
    }
  });

  it('is music-reactive: frames differ with energy / transients and with beat position', () => {
    for (const preset of LYRIC_CANVAS_PRESETS) {
      const t = midLine({ preset });
      expect(draw({ preset }, t, undefined, 0.95, 0.9).join('\n')).not.toEqual(draw({ preset }, t, undefined, 0.05, 0).join('\n'));
      expect(draw({ preset }, t + 0.25).join('\n')).not.toEqual(draw({ preset }, t).join('\n'));
    }
  });

  it('changes the output for every Director-mapped parameter in every preset', () => {
    const patches: Array<Partial<LyricCanvasConfig>> = [
      { motionSpeed: 1.7 }, { energyResponse: 2 }, { textMotion: 1 }, { glowIntensity: 1.8 },
      { spaceScale: 1.2 }, { colorSaturation: 0.4 }, { sparkleDensity: 1.5 }, { warmth: 0.8 },
    ];
    for (const preset of LYRIC_CANVAS_PRESETS) {
      const t = midLine({ preset });
      const ref = draw({ preset }, t).join('\n');
      for (const patch of patches) {
        expect(draw({ preset, ...patch }, t).join('\n'), `${preset} ${JSON.stringify(patch)}`).not.toEqual(ref);
      }
    }
  });

  it('sizes the type with the Space fader', () => {
    const fonts = (log: Log) => log.filter((line) => line.startsWith('set font ')).map((line) => Number(/(\d+(?:\.\d+)?)px/.exec(line)?.[1]));
    const small = Math.max(...fonts(draw({ spaceScale: 0.8 })));
    const large = Math.max(...fonts(draw({ spaceScale: 1.2 })));
    expect(large).toBeGreaterThan(small);
  });

  it('applies the Creator primary and accent colors', () => {
    const log = draw({ primaryColor: '#ff0000', accentColor: '#00ff00' }).join('\n');
    expect(log).toMatch(/255, 0, 0|#ff0000/);
    expect(log).toMatch(/0, 255, 0|#00ff00/);
  });

  it('shows a placeholder title card when there are no lyrics (and never throws)', () => {
    for (const preset of LYRIC_CANVAS_PRESETS) {
      const log = draw({ preset, lyrics: '' }, 12);
      const drawn = texts(log).join('\n');
      expect(drawn).toContain('♪');
      expect(drawn).toMatch(/Lumière|LUMIÈRE/);
    }
    expect(() => draw({ lyrics: '   \n\n ' }, 0, [640, 360])).not.toThrow();
  });

  it('shows the title during the intro and the lyric during its line', () => {
    const intro = texts(draw({ preset: 'karaoke' }, 0.2)).join('\n');
    expect(intro).toContain('Lumière');
    expect(intro).not.toContain('pluie');
    const sung = texts(draw({ preset: 'karaoke' }, midLine({ preset: 'karaoke' }, 0))).join('\n');
    expect(sung).toContain('pluie');
  });

  it('respects the timing offset', () => {
    const t = midLine({}, 0);
    expect(texts(draw({}, t)).join('\n')).toContain('pluie');
    expect(texts(draw({ lyricsOffset: 20 }, t)).join('\n')).not.toContain('pluie');
  });

  it('uses the uploaded image as background only for the image background', () => {
    registerPulseImage('blob:bg', { source: { width: 800, height: 600 } as unknown as CanvasImageSource, width: 800, height: 600 });
    expect(draw({ background: 'image', imageSrc: 'blob:bg' }).some((line) => line.startsWith('drawImage'))).toBe(true);
    expect(draw({ background: 'aurora', imageSrc: 'blob:bg' }).some((line) => line.startsWith('drawImage'))).toBe(false);
    // Missing image falls back gracefully.
    expect(() => draw({ background: 'image', imageSrc: '' })).not.toThrow();
  });
});

describe('Lyric Canvas layout', () => {
  const ctxFor = (w: number, h: number) => recordingContext([], w, h);

  it('wraps long lines inside the title-safe area for 16:9 and 9:16', () => {
    const long = 'Et mon âme s’envole au-delà des mots, au-delà des nuages et des néons qui brillent';
    for (const [w, h] of [[1280, 720], [1080, 1920]] as Array<[number, number]>) {
      const layout = layoutLyricLine(ctxFor(w, h), long, w, h, 'karaoke', 1);
      const area = lyricSafeArea(w, h);
      expect(layout.rows.length).toBeGreaterThan(1);
      expect(layout.rows.length).toBeLessThanOrEqual(h > w ? 5 : 3);
      layout.rows.forEach((row) => expect(row.width).toBeLessThanOrEqual(area.w + 0.5));
      expect(layout.height).toBeLessThanOrEqual(area.h);
    }
  });

  it('balances rows instead of leaving a lonely last word', () => {
    const layout = layoutLyricLine(ctxFor(1280, 720), 'Lumière, lumière, emporte-moi là-bas', 1280, 720, 'karaoke', 1.2);
    if (layout.rows.length > 1) {
      const widths = layout.rows.map((row) => row.width);
      expect(Math.min(...widths) / Math.max(...widths)).toBeGreaterThan(0.5);
    }
  });

  it('shrinks the type for very long lines and breaks unbreakable words safely', () => {
    const short = layoutLyricLine(ctxFor(1280, 720), 'Été', 1280, 720, 'karaoke', 1);
    const long = layoutLyricLine(ctxFor(1280, 720), 'mot '.repeat(40), 1280, 720, 'karaoke', 1);
    expect(long.fontSize).toBeLessThan(short.fontSize);
    const giant = layoutLyricLine(ctxFor(1080, 1920), 'Anticonstitutionnellementissimementextraordinaire🎶', 1080, 1920, 'kinetic', 1.2);
    giant.rows.forEach((row) => expect(row.width).toBeLessThanOrEqual(lyricSafeArea(1080, 1920).w + 0.5));
    expect(giant.rows.map((row) => row.words.map((word) => word.text).join('')).join('')).toContain('🎶');
  });

  it('uppercases French accents correctly for the kinetic preset', () => {
    const layout = layoutLyricLine(ctxFor(1280, 720), 'cœur éclat çà', 1280, 720, 'kinetic', 1);
    expect(layout.rows.flatMap((row) => row.words.map((word) => word.text))).toEqual(['CŒUR', 'ÉCLAT', 'ÇÀ']);
  });
});

describe('Lyric Canvas config and signals', () => {
  it('returns safe defaults and clamps / validates every field', () => {
    expect(validateLyricCanvasConfig(null)).toEqual(lyricCanvasDefaultConfig);
    expect(validateLyricCanvasConfig({
      motionSpeed: 9, textMotion: -1, preset: 'marquee', background: 'video', lyricsOffset: 99,
      primaryColor: 'red', imageSrc: 'https://example.com/a.jpg', lyrics: 42,
    })).toMatchObject({
      motionSpeed: 1.8, textMotion: 0.2, preset: 'karaoke', background: 'aurora', lyricsOffset: 30,
      primaryColor: lyricCanvasDefaultConfig.primaryColor, imageSrc: '', lyrics: '',
    });
    expect(validateLyricCanvasConfig({ lyrics: 'a\r\nb' }).lyrics).toBe('a\nb');
    expect(validateLyricCanvasConfig({ lyrics: 'x'.repeat(30_000) }).lyrics).toHaveLength(20_000);
  });

  it('silences beat punches when Dynamics is 0 and softens the decay with Fluidity', () => {
    const frame = { time: 2.05, duration: 60, progress: 0, energy: 0.8, onset: 0.5, bpm: 120 };
    expect(lyricSignals(frame, validateLyricCanvasConfig({ energyResponse: 0 })).hit).toBe(0);
    const tight = lyricSignals(frame, validateLyricCanvasConfig({ motionSpeed: 0.3 })).kick;
    const smooth = lyricSignals(frame, validateLyricCanvasConfig({ motionSpeed: 1.8 })).kick;
    expect(smooth).toBeGreaterThan(tight);
  });
});
