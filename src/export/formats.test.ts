import { describe, expect, it } from 'vitest';
import { exportSettingsFromPreset, getExportPreset } from './formats';

describe('export formats', () => {
  it('resolves the three public presets', () => {
    expect(getExportPreset('720p-widescreen')).toMatchObject({ width: 1280, height: 720 });
    expect(getExportPreset('1080p-widescreen')).toMatchObject({ width: 1920, height: 1080 });
    expect(getExportPreset('1080p-vertical')).toMatchObject({ width: 1080, height: 1920 });
  });

  it('falls back to 720p widescreen', () => {
    expect(getExportPreset('unknown').id).toBe('720p-widescreen');
  });

  it('builds export settings with watermark on by default', () => {
    expect(exportSettingsFromPreset('1080p-vertical')).toEqual({
      format: 'mp4',
      presetId: '1080p-vertical',
      width: 1080,
      height: 1920,
      frameRate: 30,
      videoBitRate: 10_000_000,
      watermark: true,
    });
  });
});
