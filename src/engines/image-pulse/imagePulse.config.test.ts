import { describe, expect, it } from 'vitest';
import { imagePulseDefaultConfig, isImagePulseSource, validateImagePulseConfig } from './imagePulse.config';
import { validateImagePulseFile, imagePulseMimeType, prepareImagePulseUpload, ImagePulseUploadError } from './imagePulse.upload';

describe('Image Pulse config', () => {
  it('returns safe defaults for invalid input', () => {
    expect(validateImagePulseConfig(null)).toEqual(imagePulseDefaultConfig);
  });

  it('clamps numeric ranges and validates style, framing and colors', () => {
    expect(validateImagePulseConfig({
      pulseSpeed: 9, effectComplexity: -1, style: 'vortex', framing: 'tile', primaryColor: 'red',
    })).toMatchObject({
      pulseSpeed: 1.6, effectComplexity: 0.2, style: 'pulse', framing: 'fill', primaryColor: imagePulseDefaultConfig.primaryColor,
    });
    expect(validateImagePulseConfig({ style: 'kaleido', framing: 'card' })).toMatchObject({ style: 'kaleido', framing: 'card' });
  });

  it('only accepts in-memory object URLs or raster data URLs as image sources', () => {
    expect(isImagePulseSource('blob:https://visualmelody.netlify.app/1234')).toBe(true);
    expect(isImagePulseSource('data:image/png;base64,AAAA')).toBe(true);
    expect(isImagePulseSource('https://example.com/cover.jpg')).toBe(false);
    expect(isImagePulseSource('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(validateImagePulseConfig({ imageSrc: 'javascript:alert(1)' }).imageSrc).toBe('');
  });
});

describe('Image Pulse upload validation', () => {
  it('accepts PNG, JPG and WebP (also by extension when the type is blank)', () => {
    expect(imagePulseMimeType({ name: 'a.png', type: 'image/png' })).toBe('image/png');
    expect(imagePulseMimeType({ name: 'a.JPG', type: '' })).toBe('image/jpeg');
    expect(imagePulseMimeType({ name: 'a.webp', type: '' })).toBe('image/webp');
    expect(imagePulseMimeType({ name: 'a.gif', type: 'image/gif' })).toBeNull();
    expect(imagePulseMimeType({ name: 'a.png', type: 'application/pdf' })).toBeNull();
  });

  it('rejects unsupported types and oversized files', () => {
    expect(validateImagePulseFile({ name: 'a.svg', type: 'image/svg+xml', size: 10 })).toBe('unsupported-type');
    expect(validateImagePulseFile({ name: 'a.jpg', type: 'image/jpeg', size: 30 * 1024 * 1024 })).toBe('too-large');
    expect(validateImagePulseFile({ name: 'a.jpg', type: 'image/jpeg', size: 1024 })).toBeNull();
  });

  it('revokes the object URL when the image cannot be decoded', async () => {
    const created: string[] = [];
    const revoked: string[] = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => { created.push('blob:x'); return 'blob:x'; };
    URL.revokeObjectURL = (url: string) => { revoked.push(url); };
    try {
      const file = new File(['nope'], 'broken.png', { type: 'image/png' });
      await expect(prepareImagePulseUpload(file, async () => null)).rejects.toBeInstanceOf(ImagePulseUploadError);
      expect(revoked).toEqual(created);
      const ok = await prepareImagePulseUpload(file, async () => ({ source: {} as CanvasImageSource, width: 10, height: 20 }));
      expect(ok).toMatchObject({ objectUrl: 'blob:x', mimeType: 'image/png', image: { width: 10, height: 20 } });
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});
