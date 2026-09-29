import { describe, expect, it } from 'vitest';
import { EXPORT_PRESETS, exportSettingsFromPreset, getExportPreset } from './formats';

describe('export formats', () => {
  it('resolves the four public presets', () => {
    expect(getExportPreset('720p-widescreen')).toMatchObject({ width: 1280, height: 720, tier: 'free' });
    expect(getExportPreset('720p-vertical')).toMatchObject({ width: 720, height: 1280, tier: 'free' });
    expect(getExportPreset('1080p-widescreen')).toMatchObject({ width: 1920, height: 1080, tier: 'pro' });
    expect(getExportPreset('1080p-vertical')).toMatchObject({ width: 1080, height: 1920, tier: 'pro' });
  });

  it('keeps every 1080p preset behind the Pro tier', () => {
    for (const preset of EXPORT_PRESETS) {
      expect(preset.tier).toBe(Math.max(preset.width, preset.height) > 1280 ? 'pro' : 'free');
    }
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
