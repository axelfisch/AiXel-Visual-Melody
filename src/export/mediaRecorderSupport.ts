export const MP4_MIME_TYPES = ['video/mp4;codecs=h264,aac', 'video/mp4'] as const;

type MediaRecorderSupport = Pick<typeof MediaRecorder, 'isTypeSupported'>;

export function getSupportedMp4MimeType(
  mediaRecorder: MediaRecorderSupport | undefined = globalThis.MediaRecorder,
): string | null {
  if (!mediaRecorder) return null;
  return MP4_MIME_TYPES.find((type) => mediaRecorder.isTypeSupported(type)) ?? null;
}
