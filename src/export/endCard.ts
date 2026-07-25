export const EXPORT_END_CARD_DURATION = 3;

export type EndCardCredits = {
  appName: string;
  artistName: string;
};

export const DEFAULT_END_CARD_CREDITS: EndCardCredits = {
  appName: 'AiXel Visual Melody',
  artistName: 'Axel Fisch',
};

type RenderEndCardOptions = EndCardCredits & {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  elapsed: number;
  duration: number;
  paletteColors?: string[];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const validHex = (value: string | undefined): value is string => Boolean(value && /^#[0-9a-f]{6}$/i.test(value));

function darkenHex(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  const scale = Math.max(0, Math.min(1, amount));
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * scale).toString(16).padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

export function renderEndCard({
  context,
  width,
  height,
  elapsed,
  duration,
  appName,
  artistName,
  paletteColors = [],
}: RenderEndCardOptions) {
  const fadeIn = clamp01(elapsed / 0.55);
  const fadeOut = clamp01((duration - elapsed) / 0.55);
  const opacity = Math.min(fadeIn, fadeOut);
  const unit = Math.min(width, height) / 720;

  context.save();
  context.globalAlpha = 1;

  const primary = validHex(paletteColors[0]) ? paletteColors[0] : '#7fe0ff';
  const secondary = validHex(paletteColors[1]) ? paletteColors[1] : primary;
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, darkenHex(primary, 0.14));
  background.addColorStop(0.55, '#05060b');
  background.addColorStop(1, darkenHex(secondary, 0.18));
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.16 * opacity;
  context.strokeStyle = primary;
  context.lineWidth = 1.2 * unit;
  for (let ring = 0; ring < 4; ring += 1) {
    context.beginPath();
    context.arc(width / 2, height / 2, (96 + ring * 42) * unit, 0, Math.PI * 2);
    context.stroke();
  }

  context.globalAlpha = 0.42 * opacity;
  context.fillStyle = secondary;
  for (let index = 0; index < 26; index += 1) {
    const x = ((index * 193) % 997) / 997 * width;
    const y = ((index * 317) % 719) / 719 * height;
    const radius = (index % 3 === 0 ? 1.6 : 0.8) * unit;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = opacity;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.fillStyle = '#e7c977';
  context.font = `700 ${15 * unit}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText('VISUAL CREATED WITH', width / 2, height / 2 - 92 * unit);

  const brandGradient = context.createLinearGradient(width * 0.34, 0, width * 0.66, 0);
  brandGradient.addColorStop(0, '#f5f1e7');
  brandGradient.addColorStop(0.55, primary);
  brandGradient.addColorStop(1, secondary);
  context.fillStyle = brandGradient;
  context.font = `500 ${56 * unit}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText(appName, width / 2, height / 2 - 20 * unit);

  context.strokeStyle = 'rgba(231, 201, 119, 0.7)';
  context.lineWidth = 1 * unit;
  context.beginPath();
  context.moveTo(width / 2 - 180 * unit, height / 2 + 35 * unit);
  context.lineTo(width / 2 + 180 * unit, height / 2 + 35 * unit);
  context.stroke();

  context.fillStyle = '#f5f1e7';
  context.font = `400 ${24 * unit}px Georgia, 'Times New Roman', serif`;
  context.fillText(`Music by ${artistName}`, width / 2, height / 2 + 83 * unit);

  context.globalAlpha = 0.68 * opacity;
  context.fillStyle = '#cbd3ed';
  context.font = `400 ${13 * unit}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText('Every Note Becomes Light.', width / 2, height - 54 * unit);

  context.restore();
}
