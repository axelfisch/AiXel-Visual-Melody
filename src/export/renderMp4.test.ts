import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AudioAnalysis } from '../audio';
import type { VisualEngine } from '../engines/engine.types';
import { DEFAULT_EXPORT_SETTINGS } from '../project/project.defaults';
import { renderMp4 } from './renderMp4';

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

function fakeCanvas() {
  const stream = new FakeMediaStream(tracks());
  return {
    width: 0,
    height: 0,
    getContext: () => ({} as CanvasRenderingContext2D),
    captureStream: () => stream,
  } as unknown as HTMLCanvasElement;
}

afterEach(() => vi.unstubAllGlobals());

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
    const canvas = fakeCanvas();

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
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ progress: 1, renderedTime: 1, canvas }));
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
});
