export const WATERMARK_LABEL = 'AiXel Visual Melody';
const BRAND = 'AiXel';
const PRODUCT = 'Visual Melody';

export type WatermarkLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  unit: number;
};

function textWidth(context: CanvasRenderingContext2D, text: string, fallbackSize: number) {
  const measured = typeof context.measureText === 'function' ? context.measureText(text).width : NaN;
  return Number.isFinite(measured) && measured > 0 ? measured : text.length * fallbackSize * 0.56;
}

const brandFont = (size: number) => `700 ${size}px Manrope, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
const productFont = (size: number) => `500 ${size}px Manrope, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

/**
 * Pill placement: bottom-right in 16:9, top-right in 9:16 (clear of the caption
 * and action overlays of vertical social players). Sized from the short side so
 * it reads the same at 720p and 1080p.
 */
export function watermarkLayout(context: CanvasRenderingContext2D, width: number, height: number): WatermarkLayout {
  const unit = Math.min(width, height) / 720;
  const fontSize = 15 * unit;
  const padX = 12 * unit;
  const mark = 16 * unit;
  const gap = 8 * unit;
  context.font = brandFont(fontSize);
  const brand = textWidth(context, BRAND, fontSize);
  context.font = productFont(fontSize);
  const product = textWidth(context, ` ${PRODUCT}`, fontSize);
  const pillWidth = padX * 2 + mark + gap + brand + product;
  const pillHeight = 32 * unit;
  const margin = 26 * unit;
  const portrait = height > width;
  return {
    x: width - margin - pillWidth,
    y: portrait ? Math.max(margin, height * 0.045) : height - margin - pillHeight,
    width: pillWidth,
    height: pillHeight,
    fontSize,
    unit,
  };
}

function pill(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  context.lineTo(x + r, y + h);
  context.arc(x + r, y + r, r, Math.PI / 2, (Math.PI * 3) / 2);
  context.closePath();
}

/**
 * Burns the Free-tier brand mark into an exported frame: a glass pill with a
 * small gold waveform glyph and "AiXel Visual Melody". Drawn on the export
 * canvas itself, so it is part of the encoded video (not a CSS overlay).
 */
export function drawWatermark(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save();
  const layout = watermarkLayout(context, width, height);
  const { x, y, width: w, height: h, fontSize, unit } = layout;
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.shadowColor = 'rgba(0, 0, 0, 0.35)';
  context.shadowBlur = 10 * unit;
  context.fillStyle = 'rgba(6, 8, 16, 0.46)';
  pill(context, x, y, w, h);
  context.fill();
  context.shadowBlur = 0;
  context.lineWidth = Math.max(1, unit);
  context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  context.stroke();

  // Gold waveform glyph.
  const markX = x + 12 * unit;
  const midY = y + h / 2;
  const bars = [0.42, 0.82, 0.58, 1, 0.5];
  const barWidth = 2.2 * unit;
  const step = 3.4 * unit;
  const gold = context.createLinearGradient(markX, midY - 8 * unit, markX, midY + 8 * unit);
  gold.addColorStop(0, '#f6e7b4');
  gold.addColorStop(1, '#d9b45a');
  context.fillStyle = gold;
  bars.forEach((scale, index) => {
    const barHeight = 14 * unit * scale;
    context.fillRect(markX + index * step, midY - barHeight / 2, barWidth, barHeight);
  });

  // Wordmark.
  const textX = markX + 16 * unit + 8 * unit;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.font = brandFont(fontSize);
  context.fillStyle = 'rgba(255, 255, 255, 0.94)';
  context.fillText(BRAND, textX, midY + 0.5 * unit);
  const brandWidth = textWidth(context, BRAND, fontSize);
  context.font = productFont(fontSize);
  context.fillStyle = 'rgba(236, 240, 255, 0.72)';
  context.fillText(` ${PRODUCT}`, textX + brandWidth, midY + 0.5 * unit);
  context.restore();
}
