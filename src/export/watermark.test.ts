import { describe, expect, it, vi } from 'vitest';
import { drawWatermark, watermarkLayout } from './watermark';

function fakeContext() {
  const gradient = { addColorStop: vi.fn() } as unknown as CanvasGradient;
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('drawWatermark', () => {
  it('burns "AiXel Visual Melody" into the frame', () => {
    const context = fakeContext();
    drawWatermark(context, 1280, 720);
    expect(context.fillText).toHaveBeenCalledWith('AiXel', expect.any(Number), expect.any(Number));
    expect(context.fillText).toHaveBeenCalledWith(' Visual Melody', expect.any(Number), expect.any(Number));
    expect(context.fill).toHaveBeenCalled();
    expect(context.save).toHaveBeenCalledOnce();
    expect(context.restore).toHaveBeenCalledOnce();
  });

  it('sits bottom-right in 16:9 and top-right in 9:16, inside the frame', () => {
    const wide = watermarkLayout(fakeContext(), 1280, 720);
    expect(wide.x + wide.width).toBeLessThan(1280);
    expect(wide.y).toBeGreaterThan(720 / 2);
    expect(wide.y + wide.height).toBeLessThan(720);
    const tall = watermarkLayout(fakeContext(), 720, 1280);
    expect(tall.y).toBeLessThan(1280 / 4);
    expect(tall.x).toBeGreaterThan(0);
  });

  it('scales with the short side of the frame', () => {
    const small = watermarkLayout(fakeContext(), 1280, 720);
    const large = watermarkLayout(fakeContext(), 1920, 1080);
    expect(large.fontSize / small.fontSize).toBeCloseTo(1.5, 5);
  });

  it('works without measureText', () => {
    const context = fakeContext() as unknown as Record<string, unknown>;
    delete context.measureText;
    expect(() => drawWatermark(context as unknown as CanvasRenderingContext2D, 1280, 720)).not.toThrow();
  });
});
