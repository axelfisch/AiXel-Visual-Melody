import { describe, expect, it, vi } from 'vitest';
import type { VisualEngine } from '../engines/engine.types';
import { getExportPaletteColors, renderPaletteEdgeTint } from './paletteBackdrop';

const engine = {
  id: 'palette-engine',
  name: 'Palette engine',
  description: 'Test',
  availability: 'implemented',
  defaultConfig: {},
  parameters: [
    { id: 'accentA', label: 'A', type: 'color', defaultValue: '#ffffff' },
    { id: 'motion', label: 'Motion', type: 'number', defaultValue: 1 },
    { id: 'accentB', label: 'B', type: 'color', defaultValue: '#ffffff' },
  ],
  validateConfig: (value: unknown) => value as Record<string, unknown>,
  render: vi.fn(),
} satisfies VisualEngine;

describe('export palette backdrop', () => {
  it('reads the active engine accent colors in parameter order', () => {
    expect(getExportPaletteColors(engine, {
      accentA: '#ffb347',
      motion: 0.5,
      accentB: '#ff7b54',
    })).toEqual(['#ffb347', '#ff7b54']);
  });

  it('tints both outside edges while leaving the center transparent', () => {
    const addColorStop = vi.fn();
    const context = {
      createLinearGradient: vi.fn(() => ({ addColorStop })),
      fillRect: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    renderPaletteEdgeTint(context, 1280, 720, ['#ffb347', '#ff7b54']);

    expect(addColorStop).toHaveBeenCalledTimes(4);
    expect(addColorStop).toHaveBeenNthCalledWith(2, 0.34, 'rgba(255, 179, 71, 0)');
    expect(addColorStop).toHaveBeenNthCalledWith(3, 0.66, 'rgba(255, 123, 84, 0)');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1280, 720);
  });
});
