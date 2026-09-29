import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AudioAnalysis } from '../audio';
import { setDevPlan } from '../entitlements';
import type { VisualEngine } from '../engines/engine.types';
import { DEFAULT_EXPORT_SETTINGS } from '../project/project.defaults';
import { exportSettingsFromPreset } from './formats';
import { renderMp4 } from './renderMp4';

const watermark = vi.hoisted(() => ({ drawWatermark: vi.fn() }));
vi.mock('./watermark', () => ({ drawWatermark: watermark.drawWatermark, WATERMARK_LABEL: 'AiXel Visual Melody' }));

const tracks = () => [{ stop: vi.fn() } as unknown as MediaStreamTrack];

class FakeMediaStream {
  constructor(private readonly items: MediaStreamTrack[] = []) {}
  getVideoTracks() { return this.items; }
  getAudioTracks() { return this.items; }
  getTracks() { return this.items; }
}

class FakeMediaRecorder {
  static isTypeSupported = () => true;
  state: RecordingState = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['mp4']) } as BlobEvent);
    this.onstop?.(new Event('stop'));
  }
}

class FakeAudioContext {
  static latest: FakeAudioContext | null = null;
  currentTime = 0;
  constructor() {
    FakeAudioContext.latest = this;
  }
  createMediaStreamDestination() {
    return { stream: new FakeMediaStream(tracks()) } as unknown as MediaStreamAudioDestinationNode;
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    } as unknown as AudioBufferSourceNode;
  }
  close = vi.fn(async () => undefined);
}

const analysis = {
  name: 'In the Spirit of Naomi',
  duration: 1,
  buffer: {} as AudioBuffer,
  sampleRate: 48_000,
  bpm: 88,
  peak: 1,
  averageEnergy: 0.5,
  waveform: [0.2, 0.8],
  energy: Array.from({ length: 30 }, () => 0.5),
} satisfies AudioAnalysis;

const engine: VisualEngine = {
  id: 'test-engine',
  name: 'Test engine',
  description: 'Test',
  availability: 'implemented',
  defaultConfig: {},
  parameters: [],
  validateConfig: () => ({}),
  render: vi.fn(),
};

function fakeContext() {
  const gradient = { addColorStop: vi.fn() } as unknown as CanvasGradient;
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function fakeCanvas(onCapture?: () => void, context = fakeContext()) {
  const stream = new FakeMediaStream(tracks());
  return {
    width: 0,
    height: 0,
    getContext: () => context,
    captureStream: () => {
      onCapture?.();
      return stream;
    },
  } as unknown as HTMLCanvasElement;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  setDevPlan(null);
});

function stubRecordingGlobals() {
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('MediaStream', FakeMediaStream);
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    if (!FakeAudioContext.latest) throw new Error('AudioContext was not created.');
    FakeAudioContext.latest.currentTime += 0.6;
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
}

describe('renderMp4', () => {
  it('renders the selected engine with project export settings and reports progress', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('MediaStream', FakeMediaStream);
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      if (!FakeAudioContext.latest) throw new Error('AudioContext was not created.');
      FakeAudioContext.latest.currentTime += 0.6;
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onProgress = vi.fn();
    const context = fakeContext();
    const canvas = fakeCanvas(() => expect(engine.render).toHaveBeenCalledTimes(1), context);

    const result = await renderMp4({
      analysis,
      engine,
      settings: DEFAULT_EXPORT_SETTINGS,
      mimeType: 'video/mp4',
      canvas,
      onProgress,
    });

    expect(result.type).toBe('video/mp4');
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
    expect(engine.render).toHaveBeenCalledTimes(3);
    expect(context.fillText).toHaveBeenCalledWith('AiXel Visual Melody', 640, expect.any(Number));
    expect(context.fillText).toHaveBeenCalledWith('Music by Axel Fisch', 640, expect.any(Number));
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({
      progress: 1,
      renderedTime: 4,
      duration: 4,
      canvas,
    }));
    expect(FakeAudioContext.latest?.close).toHaveBeenCalledOnce();
  });

  it('rejects an already-cancelled render before allocating browser resources', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(renderMp4({
      analysis,
      engine,
      settings: DEFAULT_EXPORT_SETTINGS,
      mimeType: 'video/mp4',
      canvas: fakeCanvas(),
      signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('stops a render cancelled while frames are still being produced', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('MediaStream', FakeMediaStream);
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const controller = new AbortController();

    const rendering = renderMp4({
      analysis,
      engine,
      settings: DEFAULT_EXPORT_SETTINGS,
      mimeType: 'video/mp4',
      canvas: fakeCanvas(),
      signal: controller.signal,
    });
    controller.abort();

    await expect(rendering).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(FakeAudioContext.latest?.close).toHaveBeenCalledOnce();
  });

  describe('plan gates (enforced inside the pipeline)', () => {
    it('Free: a 1080p request renders at 1280×720 with the watermark on every video frame', async () => {
      stubRecordingGlobals();
      const canvas = fakeCanvas();
      await renderMp4({
        analysis,
        engine,
        settings: exportSettingsFromPreset('1080p-widescreen', false),
        mimeType: 'video/mp4',
        canvas,
      });
      expect(canvas.width).toBe(1280);
      expect(canvas.height).toBe(720);
      expect(watermark.drawWatermark).toHaveBeenCalledTimes(3);
      expect(watermark.drawWatermark).toHaveBeenCalledWith(expect.anything(), 1280, 720);
    });

    it('Free: 9:16 1080p is clamped to 720×1280', async () => {
      stubRecordingGlobals();
      const canvas = fakeCanvas();
      await renderMp4({ analysis, engine, settings: exportSettingsFromPreset('1080p-vertical'), mimeType: 'video/mp4', canvas });
      expect([canvas.width, canvas.height]).toEqual([720, 1280]);
      expect(watermark.drawWatermark).toHaveBeenCalledWith(expect.anything(), 720, 1280);
    });

    it('Free: forged dimensions cannot raise the resolution', async () => {
      stubRecordingGlobals();
      const canvas = fakeCanvas();
      await renderMp4({
        analysis,
        engine,
        settings: { ...DEFAULT_EXPORT_SETTINGS, width: 1920, height: 1080, watermark: false },
        mimeType: 'video/mp4',
        canvas,
      });
      expect([canvas.width, canvas.height]).toEqual([1280, 720]);
      expect(watermark.drawWatermark).toHaveBeenCalled();
    });

    it('Creator Pro: 1080p 16:9 and 9:16 without watermark', async () => {
      setDevPlan('creator_pro');
      stubRecordingGlobals();
      const wide = fakeCanvas();
      await renderMp4({ analysis, engine, settings: exportSettingsFromPreset('1080p-widescreen', false), mimeType: 'video/mp4', canvas: wide });
      expect([wide.width, wide.height]).toEqual([1920, 1080]);
      const tall = fakeCanvas();
      await renderMp4({ analysis, engine, settings: exportSettingsFromPreset('1080p-vertical', false), mimeType: 'video/mp4', canvas: tall });
      expect([tall.width, tall.height]).toEqual([1080, 1920]);
      expect(watermark.drawWatermark).not.toHaveBeenCalled();
    });

    it('Creator Pro: keeps the watermark when it is left on', async () => {
      setDevPlan('creator_pro');
      stubRecordingGlobals();
      await renderMp4({ analysis, engine, settings: exportSettingsFromPreset('1080p-widescreen', true), mimeType: 'video/mp4', canvas: fakeCanvas() });
      expect(watermark.drawWatermark).toHaveBeenCalledWith(expect.anything(), 1920, 1080);
    });
  });
});
