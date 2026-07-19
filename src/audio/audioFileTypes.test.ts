import { describe, expect, it } from 'vitest';
import { AUDIO_FILE_ACCEPT, hasSupportedAudioExtension } from './audioFileTypes';

describe('audio file selection', () => {
  it('uses explicit extensions instead of the broken iOS audio wildcard', () => {
    expect(AUDIO_FILE_ACCEPT).toBe('.aac,.flac,.m4a,.mp3,.ogg,.wav');
    expect(AUDIO_FILE_ACCEPT).not.toContain('audio/*');
  });

  it('matches supported extensions case-insensitively', () => {
    expect(hasSupportedAudioExtension('Song.WAV')).toBe(true);
    expect(hasSupportedAudioExtension('Song.m4a')).toBe(true);
    expect(hasSupportedAudioExtension('Movie.mp4')).toBe(false);
  });
});
