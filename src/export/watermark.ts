export const WATERMARK_LABEL = 'AiXel Visual Melody';

export function drawWatermark(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const unit = Math.min(width, height) / 720;
  const pad = 28 * unit;
  const size = 16 * unit;

  context.save();
  context.textAlign = 'right';
  context.textBaseline = 'bottom';
  context.font = `600 ${size}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillStyle = 'rgba(3, 7, 18, 0.45)';
  context.fillText(WATERMARK_LABEL, width - pad + unit, height - pad + unit);
  context.fillStyle = 'rgba(231, 201, 119, 0.82)';
  context.fillText(WATERMARK_LABEL, width - pad, height - pad);
  context.restore();
}
