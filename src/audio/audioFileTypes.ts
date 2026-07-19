export const SUPPORTED_AUDIO_EXTENSIONS = ['aac', 'flac', 'm4a', 'mp3', 'ogg', 'wav'] as const;

// Do not replace this with `audio/*`. WebKit bug 242110 makes that wildcard
// open an iPhone/iPad picker filtered for video files instead of audio files.
// Explicit extensions keep Files selectable on iOS while remaining portable.
export const AUDIO_FILE_ACCEPT = SUPPORTED_AUDIO_EXTENSIONS
  .map((extension) => `.${extension}`)
  .join(',');

export function hasSupportedAudioExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension !== undefined && SUPPORTED_AUDIO_EXTENSIONS.some((supported) => supported === extension);
}
