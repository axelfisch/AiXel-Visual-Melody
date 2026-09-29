import { describe, expect, it } from 'vitest';
import { CREATOR_PRO_CAPABILITIES, FREE_CAPABILITIES } from '../entitlements';
import { enforceExportEntitlements, freeFallbackPreset, isProPreset } from './exportGates';
import { exportSettingsFromPreset, getExportPreset } from './formats';

describe('enforceExportEntitlements', () => {
  it('clamps Free 1080p 16:9 to 1280×720 and keeps the watermark', () => {
    const result = enforceExportEntitlements(exportSettingsFromPreset('1080p-widescreen', false), FREE_CAPABILITIES);
    expect(result.settings).toMatchObject({ presetId: '720p-widescreen', width: 1280, height: 720, videoBitRate: 6_000_000, watermark: true });
    expect(result.downgraded).toBe(true);
    expect(result.watermarkForced).toBe(true);
  });

  it('keeps the orientation when clamping Free 9:16 to 720×1280', () => {
    const result = enforceExportEntitlements(exportSettingsFromPreset('1080p-vertical'), FREE_CAPABILITIES);
    expect(result.settings).toMatchObject({ presetId: '720p-vertical', width: 720, height: 1280, watermark: true });
  });

  it('ignores hand-made dimensions: size always comes from a known preset', () => {
    const forged = { ...exportSettingsFromPreset('720p-widescreen'), width: 3840, height: 2160, videoBitRate: 50_000_000 };
    expect(enforceExportEntitlements(forged, FREE_CAPABILITIES).settings).toMatchObject({ width: 1280, height: 720, videoBitRate: 6_000_000 });
    const unknown = { ...forged, presetId: 'custom-4k' } as unknown as typeof forged;
    expect(enforceExportEntitlements(unknown, CREATOR_PRO_CAPABILITIES).settings).toMatchObject({ presetId: '720p-widescreen', width: 1280, height: 720 });
  });

  it('lets Creator Pro export 1080p in both orientations without watermark', () => {
    const wide = enforceExportEntitlements(exportSettingsFromPreset('1080p-widescreen', false), CREATOR_PRO_CAPABILITIES);
    expect(wide.settings).toMatchObject({ width: 1920, height: 1080, videoBitRate: 10_000_000, watermark: false });
    expect(wide.downgraded).toBe(false);
    expect(wide.watermarkForced).toBe(false);
    const tall = enforceExportEntitlements(exportSettingsFromPreset('1080p-vertical', false), CREATOR_PRO_CAPABILITIES);
    expect(tall.settings).toMatchObject({ width: 1080, height: 1920, watermark: false });
  });

  it('lets Creator Pro keep the watermark when they want it', () => {
    const result = enforceExportEntitlements(exportSettingsFromPreset('1080p-widescreen', true), CREATOR_PRO_CAPABILITIES);
    expect(result.settings.watermark).toBe(true);
  });

  it('flags Pro presets and maps them to the Free preset of the same orientation', () => {
    expect(isProPreset(getExportPreset('1080p-widescreen'))).toBe(true);
    expect(isProPreset(getExportPreset('720p-vertical'))).toBe(false);
    expect(freeFallbackPreset(getExportPreset('1080p-vertical')).id).toBe('720p-vertical');
    expect(freeFallbackPreset(getExportPreset('1080p-widescreen')).id).toBe('720p-widescreen');
  });
});
