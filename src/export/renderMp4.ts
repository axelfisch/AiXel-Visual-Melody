import { energyAt, type AudioAnalysis } from '../audio';
import type { VisualEngine } from '../engines/engine.types';
import type { ExportSettings } from '../project/project.types';
import {
  DEFAULT_END_CARD_CREDITS,
  EXPORT_END_CARD_DURATION,
  renderEndCard,
  type EndCardCredits,
} from './endCard';
import { getExportPaletteColors, renderPaletteEdgeTint } from './paletteBackdrop';

export type RenderMp4Progress = {
  progress: number;
  renderedTime: number;
  duration: number;
  canvas: HTMLCanvasElement;
};

export type RenderMp4Options = {
  analysis: AudioAnalysis;
  engine: VisualEngine;
  engineConfig?: unknown;
  settings: ExportSettings;
  mimeType: string;
  canvas?: HTMLCanvasElement;
  signal?: AbortSignal;
  endCardCredits?: Partial<EndCardCredits>;
  onProgress?: (progress: RenderMp4Progress) => void;
};

function abortError() {
  return new DOMException('Le rendu MP4 a été annulé.', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

function waitForAnimationFrame(signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(abortError());

  return new Promise<void>((resolve, reject) => {
    let frameId = 0;
    const cleanup = () => signal?.removeEventListener('abort', cancel);
    const cancel = () => {
      if (frameId) cancelAnimationFrame(frameId);
      cleanup();
      reject(abortError());
    };

    signal?.addEventListener('abort', cancel, { once: true });
    frameId = requestAnimationFrame(() => {
      cleanup();
      resolve();
    });
  });
}

export async function renderMp4({
  analysis,
  engine,
  engineConfig,
  settings,
  mimeType,
  canvas = document.createElement('canvas'),
  signal,
  endCardCredits,
  onProgress,
}: RenderMp4Options): Promise<Blob> {
  throwIfAborted(signal);

  canvas.width = settings.width;
  canvas.height = settings.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error("Le canevas d’export n’est pas disponible.");

  const credits = { ...DEFAULT_END_CARD_CREDITS, ...endCardCredits };
  const totalDuration = analysis.duration + EXPORT_END_CARD_DURATION;
  const config = engine.validateConfig(engineConfig ?? engine.defaultConfig);
  const paletteColors = getExportPaletteColors(engine, config);
  const renderInitialFrame = () => {
    engine.render(
      { context, width: canvas.width, height: canvas.height, pixelRatio: 1 },
      {
        time: 0,
        duration: analysis.duration,
        progress: 0,
        energy: energyAt(analysis, 0),
        bpm: analysis.bpm,
        title: analysis.name,
      },
      config,
    );
    renderPaletteEdgeTint(context, canvas.width, canvas.height, paletteColors);
  };
  renderInitialFrame();
  onProgress?.({ progress: 0, renderedTime: 0, duration: totalDuration, canvas });

  // Seed the canvas before captureStream/MediaRecorder initialization. On a fresh
  // HTTPS deployment, some browsers otherwise produce a first MP4 with audio but
  // no recognized video track; a second export works only because the canvas then
  // already contains its last rendered frame.
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const source = audioContext.createBufferSource();
  source.buffer = analysis.buffer;
  source.connect(destination);

  // A zero-rate canvas stream lets us submit every painted frame explicitly.
  // This is more reliable than waiting for Safari to detect the first canvas
  // mutation on a fresh page, which previously made the first MP4 audio-only.
  const canvasStream = canvas.captureStream(0);
  const videoTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
  if (!videoTrack) throw new Error("Le flux vidéo d’export n’est pas disponible.");
  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: settings.videoBitRate,
  });
  const chunks: Blob[] = [];
  let animationFrame = 0;
  const requestVideoFrame = () => videoTrack.requestFrame?.();
  const recorderStarted = new Promise<void>((resolve) => {
    recorder.onstart = () => resolve();
  });

  const complete = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("L’encodeur MP4 a rencontré une erreur."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  const stopRecorder = () => {
    if (recorder.state !== 'inactive') recorder.stop();
  };

  try {
    recorder.start(250);
    await recorderStarted;

    // Submit two painted frames only after MediaRecorder confirms it is active,
    // and do so before audio starts. The first export now receives a real video
    // keyframe instead of relying on state left behind by a previous attempt.
    renderInitialFrame();
    requestVideoFrame();
    await waitForAnimationFrame(signal);
    renderInitialFrame();
    requestVideoFrame();
    throwIfAborted(signal);
    source.start();
    const startedAt = audioContext.currentTime;

    await new Promise<void>((resolve, reject) => {
      const finish = (callback: () => void) => {
        signal?.removeEventListener('abort', cancel);
        callback();
      };
      const cancel = () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        finish(() => reject(abortError()));
      };
      signal?.addEventListener('abort', cancel, { once: true });

      const frame = () => {
        try {
          throwIfAborted(signal);
          const renderedTime = Math.min(totalDuration, audioContext.currentTime - startedAt);
          const progress = totalDuration > 0 ? renderedTime / totalDuration : 1;
          if (renderedTime < analysis.duration) {
            const trackProgress = analysis.duration > 0 ? renderedTime / analysis.duration : 1;
            engine.render(
              { context, width: canvas.width, height: canvas.height, pixelRatio: 1 },
              {
                time: renderedTime,
                duration: analysis.duration,
                progress: trackProgress,
                energy: energyAt(analysis, renderedTime),
                bpm: analysis.bpm,
                title: analysis.name,
              },
              config,
            );
            renderPaletteEdgeTint(context, canvas.width, canvas.height, paletteColors);
          } else {
            renderEndCard({
              context,
              width: canvas.width,
              height: canvas.height,
              elapsed: renderedTime - analysis.duration,
              duration: EXPORT_END_CARD_DURATION,
              paletteColors,
              ...credits,
            });
          }
          requestVideoFrame();
          onProgress?.({ progress, renderedTime, duration: totalDuration, canvas });

          if (renderedTime < totalDuration) animationFrame = requestAnimationFrame(frame);
          else finish(resolve);
        } catch (reason) {
          finish(() => reject(reason));
        }
      };

      animationFrame = requestAnimationFrame(frame);
    });

    stopRecorder();
    return await complete;
  } catch (reason) {
    try {
      source.stop();
    } catch {
      // The source may not have started or may already be stopped.
    }
    stopRecorder();
    throw reason;
  } finally {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    stream.getTracks().forEach((track) => track.stop());
    canvasStream.getTracks().forEach((track) => track.stop());
    await audioContext.close();
  }
}
