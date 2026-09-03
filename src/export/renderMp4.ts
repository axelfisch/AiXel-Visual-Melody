import { energyAt, type AudioAnalysis } from '../audio';
import type { VisualEngine } from '../engines/engine.types';
import type { ExportSettings } from '../project/project.types';
import {
  DEFAULT_END_CARD_CREDITS,
  EXPORT_END_CARD_DURATION,
  renderEndCard,
  type EndCardCredits,
} from './endCard';
import { drawWatermark } from './watermark';

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
  const stampWatermark = () => {
    if (settings.watermark !== false) drawWatermark(context, canvas.width, canvas.height);
  };
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
    stampWatermark();
  };
  renderInitialFrame();
  onProgress?.({ progress: 0, renderedTime: 0, duration: totalDuration, canvas });

  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const source = audioContext.createBufferSource();
  source.buffer = analysis.buffer;
  source.connect(destination);

  const canvasStream = canvas.captureStream(settings.frameRate);
  const videoTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
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
    recorder.start(1000);
    renderInitialFrame();
    videoTrack?.requestFrame?.();
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
            stampWatermark();
          } else {
            renderEndCard({
              context,
              width: canvas.width,
              height: canvas.height,
              elapsed: renderedTime - analysis.duration,
              duration: EXPORT_END_CARD_DURATION,
              ...credits,
            });
          }
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
