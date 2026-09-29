import { describe, expect, it, vi } from 'vitest';
import type { AudioAnalysis } from '../../audio';
import { drawExportFrame } from '../../export/renderMp4';
import type { EngineFrame, RenderSurface, VisualEngine } from '../engine.types';
import { createLayerMixEngine, getLayerMixEngine, layerCanvasFor, renderLayerMixFrame, type LayerCanvas } from './layerMix.compositor';

type Log = string[];

/** Recording 2D context: logs calls and assignments (tagged) so the composite order can be asserted. */
function recordingContext(log: Log, tag: string, width = 1280, height = 720) {
  const canvas = { width, height, tag };
  const gradient = { addColorStop: () => undefined };
  const target: Record<string, unknown> = {
    canvas,
    measureText: (text: string) => ({ width: String(text).length * 8 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };
  return new Proxy(target, {
    get(obj, key: string) {
      if (key in obj) return obj[key];
      return (...args: unknown[]) => {
        log.push(`${tag}.${key}(${args.map((arg) => (typeof arg === 'object' && arg && 'tag' in arg ? (arg as { tag: string }).tag : String(arg))).join(',')})`);
      };
    },
    set(obj, key: string, value) {
      obj[key] = value;
      log.push(`${tag}.${key}=${String(value)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function fakeEngine(id: string, log: Log): VisualEngine<{ id: string }> {
  return {
    id,
    name: id,
    description: id,
    availability: 'implemented',
    defaultConfig: { id },
    parameters: [],
    validateConfig: (value) => ({ id: (value as { id?: string })?.id ?? id }),
    render: (surface: RenderSurface, frame: EngineFrame) => {
      log.push(`render ${id} t=${frame.time} transparent=${surface.transparent === true} ${surface.width}x${surface.height}`);
    },
  };
}

function layerFactory(log: Log) {
  const created: LayerCanvas[] = [];
  const factory = vi.fn((width: number, height: number) => {
    const ctx = recordingContext(log, 'layer', width, height);
    const layer = { canvas: ctx.canvas as unknown as LayerCanvas['canvas'], ctx };
    created.push(layer);
    return layer;
  });
  return { factory, created };
}

const frame: EngineFrame = { time: 3.2, duration: 60, progress: 3.2 / 60, energy: 0.6, onset: 0.4, bpm: 118, title: 'Naomi' };

describe('two-layer compositor', () => {
  it('draws layer 1, the dim, then layer 2 from an offscreen canvas with opacity + blend', () => {
    const log: Log = [];
    const context = recordingContext(log, 'main');
    const { factory } = layerFactory(log);
    renderLayerMixFrame(
      { context, width: 1280, height: 720, pixelRatio: 1 },
      frame,
      { base: fakeEngine('jazz-geometry', log), baseConfig: { id: 'a' }, overlay: fakeEngine('dance-avatars', log), overlayConfig: { id: 'b' } },
      { opacity: 0.85, blendMode: 'screen', backgroundDim: 0.25 },
      factory,
    );
    const baseAt = log.indexOf('render jazz-geometry t=3.2 transparent=false 1280x720');
    const dimAt = log.indexOf('main.fillRect(0,0,1280,720)');
    const clearAt = log.indexOf('layer.clearRect(0,0,1280,720)');
    const overlayAt = log.indexOf('render dance-avatars t=3.2 transparent=true 1280x720');
    const drawAt = log.indexOf('main.drawImage(layer,0,0,1280,720)');
    expect(baseAt).toBeGreaterThanOrEqual(0);
    expect(dimAt).toBeGreaterThan(baseAt);
    expect(log.slice(baseAt, dimAt)).toContain('main.globalAlpha=0.25');
    expect(clearAt).toBeGreaterThan(dimAt);
    expect(overlayAt).toBeGreaterThan(clearAt);
    expect(drawAt).toBeGreaterThan(overlayAt);
    const composite = log.slice(overlayAt, drawAt);
    expect(composite).toContain('main.globalAlpha=0.85');
    expect(composite).toContain('main.globalCompositeOperation=screen');
  });

  it('shares one frame (same time / energy / beat clock) between both layers', () => {
    const seen: EngineFrame[] = [];
    const base = { ...fakeEngine('cosmic-waves', []), render: (_s: RenderSurface, f: EngineFrame) => { seen.push(f); } };
    const overlay = { ...fakeEngine('lyric-canvas', []), render: (_s: RenderSurface, f: EngineFrame) => { seen.push(f); } };
    const { factory } = layerFactory([]);
    renderLayerMixFrame({ context: recordingContext([], 'main'), width: 640, height: 360, pixelRatio: 1 }, frame,
      { base, baseConfig: { id: 'a' }, overlay, overlayConfig: { id: 'b' } }, { opacity: 1, blendMode: 'normal', backgroundDim: 0 }, factory);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
  });

  it('skips the dim at 0 % and layer 2 at 0 % opacity', () => {
    const log: Log = [];
    const { factory } = layerFactory(log);
    renderLayerMixFrame({ context: recordingContext(log, 'main'), width: 100, height: 100, pixelRatio: 1 }, frame,
      { base: fakeEngine('a', log), baseConfig: { id: 'a' }, overlay: fakeEngine('b', log), overlayConfig: { id: 'b' } },
      { opacity: 0, blendMode: 'normal', backgroundDim: 0 }, factory);
    expect(log.some((line) => line.startsWith('main.fillRect'))).toBe(false);
    expect(log.some((line) => line.startsWith('render b'))).toBe(false);
  });

  it('reuses one offscreen canvas per destination (no per-frame allocation) and resizes it on demand', () => {
    const log: Log = [];
    const context = recordingContext(log, 'main');
    const { factory, created } = layerFactory(log);
    const pair = { base: fakeEngine('a', log), baseConfig: { id: 'a' }, overlay: fakeEngine('b', log), overlayConfig: { id: 'b' } };
    const blend = { opacity: 0.5, blendMode: 'screen' as const, backgroundDim: 0 };
    for (let index = 0; index < 5; index += 1) {
      renderLayerMixFrame({ context, width: 1280, height: 720, pixelRatio: 1 }, { ...frame, time: index / 30 }, pair, blend, factory);
    }
    expect(factory).toHaveBeenCalledTimes(1);
    renderLayerMixFrame({ context, width: 1920, height: 1080, pixelRatio: 1 }, frame, pair, blend, factory);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(created[0].canvas.width).toBe(1920);
    expect(created[0].canvas.height).toBe(1080);
    expect(layerCanvasFor(context, 1920, 1080, factory)).toBe(created[0]);
  });

  it('falls back to drawing layer 2 in place (transparent) when no offscreen canvas exists', () => {
    const log: Log = [];
    renderLayerMixFrame({ context: recordingContext(log, 'main'), width: 100, height: 100, pixelRatio: 1 }, frame,
      { base: fakeEngine('a', log), baseConfig: { id: 'a' }, overlay: fakeEngine('b', log), overlayConfig: { id: 'b' } },
      { opacity: 0.5, blendMode: 'screen', backgroundDim: 0 }, () => null);
    expect(log).toContain('render b t=3.2 transparent=true 100x100');
    expect(log.some((line) => line.includes('drawImage'))).toBe(false);
  });

  it('wraps two engines as one VisualEngine (validate, prepare, id) and refuses the same engine twice', async () => {
    const log: Log = [];
    const base = { ...fakeEngine('neon-velvet', log), prepare: vi.fn(async () => undefined) };
    const overlay = { ...fakeEngine('liquid-colors', log), prepare: vi.fn(async () => undefined) };
    const mix = createLayerMixEngine(base as VisualEngine, overlay as VisualEngine, layerFactory(log).factory);
    expect(mix.id).toBe('mix:neon-velvet+liquid-colors');
    expect(mix.name).toBe('neon-velvet + liquid-colors');
    const config = mix.validateConfig({ base: { id: 'x' }, opacity: 7, blendMode: 'nope' });
    expect(config).toEqual({ base: { id: 'x' }, overlay: { id: 'liquid-colors' }, opacity: 1, blendMode: 'normal', backgroundDim: 0 });
    await mix.prepare?.(config);
    expect(base.prepare).toHaveBeenCalledWith({ id: 'x' });
    expect(overlay.prepare).toHaveBeenCalledWith({ id: 'liquid-colors' });
    expect(() => createLayerMixEngine(base as VisualEngine, base as VisualEngine)).toThrow();
  });

  it('memoises the registry pair engine', () => {
    expect(getLayerMixEngine('jazz-geometry', 'dance-avatars')).toBe(getLayerMixEngine('jazz-geometry', 'dance-avatars'));
    expect(() => getLayerMixEngine('jazz-geometry', 'jazz-geometry')).toThrow();
  });

  it('export draws the watermark once, on top of the composite', () => {
    const log: Log = [];
    const context = recordingContext(log, 'main');
    const mix = createLayerMixEngine(fakeEngine('a', log) as VisualEngine, fakeEngine('b', log) as VisualEngine, layerFactory(log).factory);
    const analysis = { duration: 60, bpm: 118, energy: [0.5], waveform: [0.5], sampleRate: 44100, peak: 1, averageEnergy: 0.5, name: 'Naomi' } as unknown as AudioAnalysis;
    drawExportFrame({ context, width: 1280, height: 720 }, mix, mix.validateConfig({}), analysis, 1, true);
    const drawAt = log.indexOf('main.drawImage(layer,0,0,1280,720)');
    const watermarkCalls = log.filter((line) => line.startsWith('main.fillText'));
    expect(drawAt).toBeGreaterThan(-1);
    expect(watermarkCalls.length).toBeGreaterThan(0);
    const firstWatermark = log.findIndex((line) => line.startsWith('main.fillText'));
    expect(firstWatermark).toBeGreaterThan(drawAt);
    expect(log.filter((line) => line.startsWith('layer.fillText'))).toHaveLength(0);
  });
});
