// In-memory registry of decoded Image Pulse sources, keyed by the object URL
// stored in `project.engine.parameters.imageSrc`. Preview (EngineCanvas) and
// Export (renderMp4) both render through the same engine and therefore read the
// exact same decoded pixels from here.

export type PulseImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
};

/** Very large uploads are downscaled once so every frame stays cheap at 1080p. */
export const PULSE_IMAGE_MAX_SIDE = 2560;

const images = new Map<string, PulseImage>();
const pending = new Map<string, Promise<PulseImage | null>>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function registerPulseImage(src: string, image: PulseImage) {
  images.set(src, image);
  notify();
}

export function getPulseImage(src: string): PulseImage | undefined {
  return src ? images.get(src) : undefined;
}

export function releasePulseImage(src: string) {
  pending.delete(src);
  if (images.delete(src)) notify();
}

export function subscribePulseImages(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function downscale(image: HTMLImageElement, width: number, height: number): PulseImage {
  const ratio = Math.min(1, PULSE_IMAGE_MAX_SIDE / Math.max(width, height));
  if (ratio >= 1 || typeof document === 'undefined') return { source: image, width, height };
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const context = canvas.getContext('2d');
  if (!context) return { source: image, width, height };
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { source: canvas, width: canvas.width, height: canvas.height };
}

/** Decodes `src` (once) and registers it. Resolves null when the browser cannot decode it. */
export function loadPulseImage(src: string): Promise<PulseImage | null> {
  if (!src) return Promise.resolve(null);
  const existing = images.get(src);
  if (existing) return Promise.resolve(existing);
  const inFlight = pending.get(src);
  if (inFlight) return inFlight;
  if (typeof Image === 'undefined') return Promise.resolve(null);

  const promise = new Promise<PulseImage | null>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) {
        resolve(null);
        return;
      }
      const decoded = downscale(image, width, height);
      if (pending.get(src) === promise) {
        pending.delete(src);
        registerPulseImage(src, decoded);
      }
      resolve(decoded);
    };
    image.onerror = () => {
      pending.delete(src);
      resolve(null);
    };
    image.src = src;
  });
  pending.set(src, promise);
  return promise;
}
