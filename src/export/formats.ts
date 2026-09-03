export type ExportPresetId = '720p-widescreen' | '1080p-widescreen' | '1080p-vertical';

export type ExportPreset = {
  id: ExportPresetId;
  width: number;
  height: number;
  frameRate: number;
  videoBitRate: number;
  suffix: string;
};

export const EXPORT_PRESETS: readonly ExportPreset[] = [
  { id: '720p-widescreen', width: 1280, height: 720, frameRate: 30, videoBitRate: 6_000_000, suffix: '720p' },
  { id: '1080p-widescreen', width: 1920, height: 1080, frameRate: 30, videoBitRate: 10_000_000, suffix: '1080p' },
  { id: '1080p-vertical', width: 1080, height: 1920, frameRate: 30, videoBitRate: 10_000_000, suffix: '1080p-9x16' },
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
