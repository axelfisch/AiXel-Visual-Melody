import { energyAt, onsetAt, type AudioAnalysis } from '../audio';
import { getEntitlements } from '../entitlements/entitlements.source';
import type { VisualEngine } from '../engines/engine.types';
import type { ExportSettings } from '../project/project.types';
import {
  DEFAULT_END_CARD_CREDITS,
  EXPORT_END_CARD_DURATION,
  renderEndCard,
  type EndCardCredits,
} from './endCard';
import { enforceExportEntitlements } from './exportGates';
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

/**
 * Settings the pipeline will really render with, for the current plan. Free is
 * capped at 720p and always watermarked; Creator Pro unlocks 1080p and a clean
 * export. Read from the single entitlement source, never from the caller.
 */
export function resolveExportSettings(settings: ExportSettings): ExportSettings {
  return enforceExportEntitlements(settings, getEntitlements().capabilities).settings;
}

type FrameSurface = { context: CanvasRenderingContext2D; width: number; height: number };

/** One exported video frame: engine render at `time`, then the watermark when the plan requires it. */
export function drawExportFrame<TConfig extends object>(
  { context, width, height }: FrameSurface,
  engine: VisualEngine<TConfig>,
  config: TConfig,
  analysis: AudioAnalysis,
  time: number,
  watermark: boolean,
) {
  engine.render(
    { context, width, height, pixelRatio: 1 },
    {
      time,
      duration: analysis.duration,
      progress: analysis.duration > 0 ? Math.min(1, time / analysis.duration) : 1,
      energy: energyAt(analysis, time),
      onset: onsetAt(analysis, time),
      bpm: analysis.bpm,
      title: analysis.name,
    },
    config,
  );
  if (watermark) drawWatermark(context, width, height);
}

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

  // Entitlements are enforced here, inside the export pipeline, whatever the UI sent.
  const effective = resolveExportSettings(settings);
  canvas.width = effective.width;
  canvas.height = effective.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error("Le canevas d’export n’est pas disponible.");

  const credits = { ...DEFAULT_END_CARD_CREDITS, ...endCardCredits };
  const totalDuration = analysis.duration + EXPORT_END_CARD_DURATION;
  const config = engine.validateConfig(engineConfig ?? engine.defaultConfig);
  // Engines with external media (Image Pulse) decode it before the first frame.
  if (engine.prepare) {
    await engine.prepare(config);
    throwIfAborted(signal);
  }
  const surface = { context, width: canvas.width, height: canvas.height };
  const renderInitialFrame = () => drawExportFrame(surface, engine, config, analysis, 0, effective.watermark);
  renderInitialFrame();
  onProgress?.({ progress: 0, renderedTime: 0, duration: totalDuration, canvas });

  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const source = audioContext.createBufferSource();
  source.buffer = analysis.buffer;
  source.connect(destination);

  const canvasStream = canvas.captureStream(effective.frameRate);
  const videoTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: effective.videoBitRate,
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
            drawExportFrame(surface, engine, config, analysis, renderedTime, effective.watermark);
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
