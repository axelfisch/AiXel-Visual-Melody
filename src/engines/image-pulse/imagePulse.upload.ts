import { loadPulseImage, type PulseImage } from './imagePulse.images';
import { IMAGE_PULSE_MAX_FILE_SIZE, IMAGE_PULSE_MIME_TYPES } from './imagePulse.types';

export type ImageUploadError = 'unsupported-type' | 'too-large' | 'decode-failed';

export class ImagePulseUploadError extends Error {
  constructor(readonly code: ImageUploadError) {
    super(code);
    this.name = 'ImagePulseUploadError';
  }
}

const EXTENSION_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

/** Resolves the upload MIME type from the file type or, when the browser leaves it blank, its extension. */
export function imagePulseMimeType(file: Pick<File, 'name' | 'type'>): string | null {
  const declared = file.type.toLowerCase();
  if ((IMAGE_PULSE_MIME_TYPES as readonly string[]).includes(declared)) return declared;
  if (declared) return null;
  const extension = file.name.toLowerCase().split('.').pop() ?? '';
  return EXTENSION_TYPES[extension] ?? null;
}

export function validateImagePulseFile(file: Pick<File, 'name' | 'type' | 'size'>): ImageUploadError | null {
  if (!imagePulseMimeType(file)) return 'unsupported-type';
  if (file.size > IMAGE_PULSE_MAX_FILE_SIZE) return 'too-large';
  return null;
}

/** Validates, creates an object URL and decodes the image so it is ready for Preview and Export. */
export async function prepareImagePulseUpload(
  file: File,
  load: (src: string) => Promise<PulseImage | null> = loadPulseImage,
): Promise<{ objectUrl: string; image: PulseImage; mimeType: string }> {
  const invalid = validateImagePulseFile(file);
  if (invalid) throw new ImagePulseUploadError(invalid);
  const objectUrl = URL.createObjectURL(file);
  const image = await load(objectUrl);
  if (!image) {
    URL.revokeObjectURL(objectUrl);
    throw new ImagePulseUploadError('decode-failed');
  }
  return { objectUrl, image, mimeType: imagePulseMimeType(file) ?? file.type };
}
