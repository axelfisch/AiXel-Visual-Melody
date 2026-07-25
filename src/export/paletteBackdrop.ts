import type { VisualEngine } from '../engines/engine.types';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function hexToRgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getExportPaletteColors(
  engine: VisualEngine,
  config: object,
): string[] {
  const values = config as Record<string, unknown>;
  return engine.parameters
    .filter((parameter) => parameter.type === 'color')
    .map((parameter) => values[parameter.id])
    .filter((value): value is string => typeof value === 'string' && HEX_COLOR.test(value));
}

export function renderPaletteEdgeTint(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: string[],
) {
  if (!colors.length) return;

  const left = colors[0];
  const right = colors[1] ?? colors[0];
  const edgeTint = context.createLinearGradient(0, 0, width, 0);
  edgeTint.addColorStop(0, hexToRgba(left, 0.78));
  edgeTint.addColorStop(0.34, hexToRgba(left, 0));
  edgeTint.addColorStop(0.66, hexToRgba(right, 0));
  edgeTint.addColorStop(1, hexToRgba(right, 0.78));

  context.save();
  context.globalAlpha = 0.72;
  context.globalCompositeOperation = 'soft-light';
  context.fillStyle = edgeTint;
  context.fillRect(0, 0, width, height);
  context.restore();
}
