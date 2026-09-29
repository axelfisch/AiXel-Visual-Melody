import type { Capabilities } from '../entitlements/entitlements.types';
import type { ExportSettings } from '../project/project.types';
import { getExportPreset, type ExportPreset } from './formats';

export type ExportGateResult = {
  /** Settings the export pipeline actually renders with. */
  settings: ExportSettings;
  /** The requested resolution needed Creator Pro and was lowered to 720p. */
  downgraded: boolean;
  /** A watermark-free export was requested without Creator Pro. */
  watermarkForced: boolean;
};

export function isProPreset(preset: ExportPreset): boolean {
  return preset.tier === 'pro';
}

/** Largest Free preset with the same orientation (16:9 → 1280×720, 9:16 → 720×1280). */
export function freeFallbackPreset(preset: ExportPreset): ExportPreset {
  return getExportPreset(preset.height > preset.width ? '720p-vertical' : '720p-widescreen');
}

/**
 * Applies the plan to export settings. The export pipeline calls this itself
 * (see `renderMp4`), so the UI cannot unlock 1080p or remove the watermark by
 * passing different settings: dimensions always come from a known preset, Free
 * is capped at 720p and always watermarked.
 */
export function enforceExportEntitlements(settings: ExportSettings, capabilities: Capabilities): ExportGateResult {
  const requested = getExportPreset(settings.presetId);
  const downgraded = isProPreset(requested) && !capabilities.export1080p;
  const preset = downgraded ? freeFallbackPreset(requested) : requested;
  const wantsClean = settings.watermark === false;
  const watermark = capabilities.removeWatermark ? !wantsClean : true;
  return {
    settings: {
      ...settings,
      format: 'mp4',
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
      frameRate: preset.frameRate,
      videoBitRate: preset.videoBitRate,
      watermark,
    },
    downgraded,
    watermarkForced: wantsClean && !capabilities.removeWatermark,
  };
}
