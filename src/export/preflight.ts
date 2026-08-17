import type { ExportSettings } from '../project/project.types';
import { aspectRatioOf, resolutionOf } from './exportFormats';
import { OUTPUT_PROFILES } from './outputProfiles';

export type ExportPreflightCode =
  | 'invalid_dimensions'
  | 'unsupported_profile'
  | 'duration_limit'
  | 'memory_limit'
  | 'missing_audio_context'
  | 'missing_canvas_capture'
  | 'missing_media_recorder'
  | 'unsupported_codec';

export type ExportPreflightFailure = { ok: false; code: ExportPreflightCode; message: string };
export type ExportPreflightResult = { ok: true; estimatedWorkingBytes: number } | ExportPreflightFailure;

export type ExportPreflightEnvironment = {
  AudioContext?: unknown;
  MediaRecorder?: unknown;
  canvasCaptureSupported: boolean;
  mimeType: string | null;
  maxWorkingBytes?: number;
};

export const MAX_EXPORT_DURATION_SECONDS = 15 * 60;
export const DEFAULT_MAX_WORKING_BYTES = 256 * 1024 * 1024;

export function estimateExportWorkingBytes(settings: ExportSettings): number {
  // Canvas backing store + encoder input/output surfaces + one safety surface.
  return settings.width * settings.height * 4 * 4;
}

export function preflightExport(
  settings: ExportSettings,
  duration: number,
  environment: ExportPreflightEnvironment,
): ExportPreflightResult {
  const resolution = resolutionOf(settings);
  if (!resolution || aspectRatioOf(settings) !== settings.aspectRatio) {
    return { ok: false, code: 'invalid_dimensions', message: 'The selected output dimensions do not match its aspect ratio.' };
  }
  const profile = OUTPUT_PROFILES[resolution];
  if (settings.frameRate !== profile.frameRate || settings.videoBitRate !== profile.videoBitRate) {
    return { ok: false, code: 'unsupported_profile', message: 'This frame-rate and bitrate combination is not supported.' };
  }
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_EXPORT_DURATION_SECONDS) {
    return { ok: false, code: 'duration_limit', message: 'Local export supports tracks up to 15 minutes.' };
  }
  const estimatedWorkingBytes = estimateExportWorkingBytes(settings);
  if (estimatedWorkingBytes > (environment.maxWorkingBytes ?? DEFAULT_MAX_WORKING_BYTES)) {
    return { ok: false, code: 'memory_limit', message: 'This device does not have the declared memory budget for this output.' };
  }
  if (!environment.AudioContext) {
    return { ok: false, code: 'missing_audio_context', message: 'This browser cannot prepare the local audio track.' };
  }
  if (!environment.canvasCaptureSupported) {
    return { ok: false, code: 'missing_canvas_capture', message: 'This browser cannot capture the visual canvas.' };
  }
  if (!environment.MediaRecorder) {
    return { ok: false, code: 'missing_media_recorder', message: 'This browser cannot record the local video.' };
  }
  if (!environment.mimeType) {
    return { ok: false, code: 'unsupported_codec', message: 'This browser does not provide a supported MP4 codec.' };
  }
  return { ok: true, estimatedWorkingBytes };
}

export function browserExportEnvironment(canvas: HTMLCanvasElement, mimeType: string | null): ExportPreflightEnvironment {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const deviceBudget = typeof deviceMemory === 'number' && Number.isFinite(deviceMemory)
    ? Math.floor(deviceMemory * 1024 * 1024 * 1024 * 0.08)
    : DEFAULT_MAX_WORKING_BYTES;
  return {
    AudioContext: globalThis.AudioContext,
    MediaRecorder: globalThis.MediaRecorder,
    canvasCaptureSupported: typeof canvas.captureStream === 'function',
    mimeType,
    maxWorkingBytes: Math.min(DEFAULT_MAX_WORKING_BYTES, deviceBudget),
  };
}
