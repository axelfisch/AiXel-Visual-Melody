import { describe, expect, it, vi } from 'vitest';
import { WATERMARK_LABEL, drawWatermark } from './watermark';

describe('drawWatermark', () => {
  it('paints the brand mark in the bottom-right corner', () => {
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    drawWatermark(context, 1280, 720);

    expect(context.fillText).toHaveBeenCalledWith(WATERMARK_LABEL, 1252, 692);
  });
});
