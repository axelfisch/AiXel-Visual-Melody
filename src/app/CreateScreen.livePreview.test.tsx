import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DanceAvatarsEngine } from '../engines/dance-avatars/DanceAvatarsEngine';
import { ImagePulseEngine } from '../engines/image-pulse/ImagePulseEngine';
import { LyricCanvasEngine } from '../engines/lyric-canvas/LyricCanvasEngine';
import { ParticleSphereEngine } from '../engines/particle-sphere/ParticleSphereEngine';
import { liveFrameAt, syntheticBeat, SYNTHETIC_BPM } from '../engines/engine.liveClock';
import type { EngineFrame } from '../engines/engine.types';
import { LocaleProvider } from '../i18n/LocaleContext';
import { ProjectProvider } from '../project/project.context';
import { App } from './App';

/** No-op 2D context that tolerates every call the engines make (jsdom has no canvas backend). */
function fakeContext(width = 1280, height = 720): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => undefined };
  const target: Record<string, unknown> = {
    canvas: { width, height },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => null,
    measureText: (text: string) => ({ width: String(text).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  };
  return new Proxy(target, {
    get: (obj, key: string) => (key in obj ? obj[key] : () => undefined),
    set: (obj, key: string, value) => { obj[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

class FakeOffscreen {
  width: number;
  height: number;
  constructor(width: number, height: number) { this.width = width; this.height = height; }
  getContext() { return fakeContext(this.width, this.height); }
}

type RenderCall = [unknown, EngineFrame, Record<string, unknown>];
const lastConfig = (spy: { mock: { calls: unknown[][] } }) =>
  (spy.mock.calls[spy.mock.calls.length - 1] as RenderCall)[2];

function renderCreate() {
  window.location.hash = '#create';
  return render(
    <LocaleProvider>
      <ProjectProvider>
        <App />
      </ProjectProvider>
    </LocaleProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem('aixel-visual-melody-locale', 'en');
  vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return fakeContext(this.width, this.height) as never;
  } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.location.hash = '';
});

describe('Create screen live preview', () => {
  it('mounts the real Dance Avatars renderer (not the old CSS figure) and follows gender/style changes', () => {
    const renderSpy = vi.spyOn(DanceAvatarsEngine, 'render');
    const { container } = renderCreate();

    fireEvent.click(screen.getByRole('button', { name: 'Dance Avatars' }));

    const canvas = screen.getByTestId('live-engine-preview');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveAttribute('data-engine', 'dance-avatars');
    expect(container.querySelector('.avatar-figure, .avatar-visual')).toBeNull();
    expect(renderSpy).toHaveBeenCalled();
    expect(lastConfig(renderSpy)).toMatchObject({ gender: 'female', style: 'neon' });
    // Real renderer receives a canvas-sized surface.
    const [surface] = renderSpy.mock.calls[renderSpy.mock.calls.length - 1] as RenderCall;
    expect(surface).toMatchObject({ width: 1280, height: 720 });

    fireEvent.click(screen.getByRole('button', { name: 'Male / Homme' }));
    expect(lastConfig(renderSpy)).toMatchObject({ gender: 'male', style: 'neon' });

    fireEvent.click(screen.getByRole('button', { name: 'Hologram / Hologramme' }));
    expect(lastConfig(renderSpy)).toMatchObject({ gender: 'male', style: 'hologram' });

    fireEvent.click(screen.getByRole('button', { name: 'Female / Femme' }));
    expect(lastConfig(renderSpy)).toMatchObject({ gender: 'female', style: 'hologram' });
  });

  it('pushes Creator palette colors and Director faders into the live render', () => {
    const renderSpy = vi.spyOn(DanceAvatarsEngine, 'render');
    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'Dance Avatars' }));

    const glowBefore = lastConfig(renderSpy).glowIntensity as number;
    fireEvent.change(screen.getByRole('slider', { name: 'Light' }), { target: { value: '100' } });
    expect(lastConfig(renderSpy).glowIntensity as number).toBeGreaterThan(glowBefore);

    fireEvent.click(screen.getByTitle('Solar Gold'));
    const { primaryColor } = lastConfig(renderSpy);
    expect(primaryColor).not.toBe('#9eeaff');
  });

  it('keeps animating without audio using the synthetic 118 BPM clock', async () => {
    const renderSpy = vi.spyOn(DanceAvatarsEngine, 'render');
    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'Dance Avatars' }));
    const before = renderSpy.mock.calls.length;
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
    expect(renderSpy.mock.calls.length).toBeGreaterThan(before);
    const frame = (renderSpy.mock.calls[renderSpy.mock.calls.length - 1] as RenderCall)[1];
    expect(frame.bpm).toBe(SYNTHETIC_BPM);
    expect(frame.energy).toBeGreaterThan(0);
  });

  it.each([
    ['Particle Sphere', ParticleSphereEngine, 'particle-sphere'],
    ['Image Pulse', ImagePulseEngine, 'image-pulse'],
    ['Lyric Canvas', LyricCanvasEngine, 'lyric-canvas'],
  ] as const)('renders %s through its real engine', (label, engine, id) => {
    const renderSpy = vi.spyOn(engine, 'render').mockImplementation(() => undefined);
    const { container } = renderCreate();
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.getByTestId('live-engine-preview')).toHaveAttribute('data-engine', id);
    expect(renderSpy).toHaveBeenCalled();
    expect(container.querySelector('.pulse-visual, .lyrics-visual, .sphere-visual')).toBeNull();
  });

  it('feeds typed lyrics into the Lyric Canvas render config', () => {
    const renderSpy = vi.spyOn(LyricCanvasEngine, 'render').mockImplementation(() => undefined);
    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'Lyric Canvas' }));
    fireEvent.change(screen.getByLabelText('Lyrics'), { target: { value: 'Hello night\nSecond line' } });
    expect(lastConfig(renderSpy).lyrics).toBe('Hello night\nSecond line');
  });
});

describe('live preview clock', () => {
  it('beats at 118 BPM with a kick on every beat', () => {
    const beat = 60 / SYNTHETIC_BPM;
    expect(syntheticBeat(0).onset).toBeGreaterThan(0.8);
    expect(syntheticBeat(beat * 0.6).onset).toBe(0);
    expect(syntheticBeat(beat * 2.02).energy).toBeGreaterThan(syntheticBeat(beat * 2.6).energy);
  });

  it('loops over the real analysed energy when audio is loaded', () => {
    const analysis = { sampleRate: 44100, bpm: 96, peak: 1, averageEnergy: 0.4, waveform: [], energy: Array.from({ length: 300 }, (_, i) => (i % 30) / 30) };
    const frame = liveFrameAt({ elapsed: 12.5, analysis, duration: 10, title: 'T' });
    expect(frame.time).toBeCloseTo(2.5);
    expect(frame.bpm).toBe(96);
    expect(frame.energy).toBeCloseTo(analysis.energy[75]);
  });
});
