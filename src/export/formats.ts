export type ExportPresetId = '720p-widescreen' | '720p-vertical' | '1080p-widescreen' | '1080p-vertical';

/** `free` presets are available to everyone; `pro` presets need the Creator Pro `export1080p` capability. */
export type ExportTier = 'free' | 'pro';

export type ExportPreset = {
  id: ExportPresetId;
  width: number;
  height: number;
  frameRate: number;
  videoBitRate: number;
  suffix: string;
  tier: ExportTier;
};

export const EXPORT_PRESETS: readonly ExportPreset[] = [
  { id: '720p-widescreen', width: 1280, height: 720, frameRate: 30, videoBitRate: 6_000_000, suffix: '720p', tier: 'free' },
  { id: '720p-vertical', width: 720, height: 1280, frameRate: 30, videoBitRate: 6_000_000, suffix: '720p-9x16', tier: 'free' },
  { id: '1080p-widescreen', width: 1920, height: 1080, frameRate: 30, videoBitRate: 10_000_000, suffix: '1080p', tier: 'pro' },
  { id: '1080p-vertical', width: 1080, height: 1920, frameRate: 30, videoBitRate: 10_000_000, suffix: '1080p-9x16', tier: 'pro' },
] as const;

export const DEFAULT_EXPORT_PRESET_ID: ExportPresetId = '720p-widescreen';

export function getExportPreset(id: string | null | undefined): ExportPreset {
  return EXPORT_PRESETS.find((preset) => preset.id === id) ?? EXPORT_PRESETS[0];
}

export function exportSettingsFromPreset(id: ExportPresetId, watermark = true) {
  const preset = getExportPreset(id);
  return {
    format: 'mp4' as const,
    presetId: preset.id,
    width: preset.width,
    height: preset.height,
    frameRate: preset.frameRate,
    videoBitRate: preset.videoBitRate,
    watermark,
  };
}
