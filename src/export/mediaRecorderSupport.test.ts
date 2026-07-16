import { describe, expect, it, vi } from 'vitest';
import { getSupportedMp4MimeType, MP4_MIME_TYPES } from './mediaRecorderSupport';

describe('getSupportedMp4MimeType', () => {
  it('prefers the explicit H.264/AAC MP4 profile', () => {
    const isTypeSupported = vi.fn(() => true);

    expect(getSupportedMp4MimeType({ isTypeSupported })).toBe(MP4_MIME_TYPES[0]);
    expect(isTypeSupported).toHaveBeenCalledTimes(1);
  });

  it('falls back to the generic MP4 container', () => {
    const isTypeSupported = vi.fn((type: string) => type === 'video/mp4');

    expect(getSupportedMp4MimeType({ isTypeSupported })).toBe('video/mp4');
  });

  it('returns null when MediaRecorder or MP4 support is unavailable', () => {
    expect(getSupportedMp4MimeType(undefined)).toBeNull();
    expect(getSupportedMp4MimeType({ isTypeSupported: () => false })).toBeNull();
  });
});
