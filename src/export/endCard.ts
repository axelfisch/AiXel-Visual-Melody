import type { ProjectEndCardMode } from '../project/project.types';

export const EXPORT_END_CARD_DURATION = 3;

export const endCardDuration = (mode: ProjectEndCardMode) => mode === 'clean' ? 0 : EXPORT_END_CARD_DURATION;

export type EndCardCredits = {
  appName: string;
  artistName: string;
  trackName: string;
};

export const DEFAULT_END_CARD_CREDITS: EndCardCredits = {
  appName: 'AiXel Visual Melody',
  artistName: 'Independent Artist',
  trackName: 'Visual Melody',
};

type RenderEndCardOptions = EndCardCredits & {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  elapsed: number;
  duration: number;
  mode?: Exclude<ProjectEndCardMode, 'clean'>;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function renderEndCard({
  context,
  width,
  height,
  elapsed,
  duration,
  appName,
  artistName,
  trackName,
  mode = 'aixel',
}: RenderEndCardOptions) {
  const fadeIn = clamp01(elapsed / 0.55);
  const fadeOut = clamp01((duration - elapsed) / 0.55);
  const opacity = Math.min(fadeIn, fadeOut);
  const unit = Math.min(width, height) / 720;

  context.save();
  context.globalAlpha = 1;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#030712');
  background.addColorStop(0.55, '#080b19');
  background.addColorStop(1, '#120b24');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.16 * opacity;
  context.strokeStyle = '#7fe0ff';
  context.lineWidth = 1.2 * unit;
  for (let ring = 0; ring < 4; ring += 1) {
    context.beginPath();
    context.arc(width / 2, height / 2, (96 + ring * 42) * unit, 0, Math.PI * 2);
    context.stroke();
  }

  context.globalAlpha = 0.42 * opacity;
  context.fillStyle = '#e7c977';
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
  context.fillText(mode === 'artist' ? 'A VISUAL RELEASE BY' : 'VISUAL CREATED WITH', width / 2, height / 2 - 92 * unit);

  const brandGradient = context.createLinearGradient(width * 0.34, 0, width * 0.66, 0);
  brandGradient.addColorStop(0, '#f5f1e7');
  brandGradient.addColorStop(0.55, '#7fe0ff');
  brandGradient.addColorStop(1, '#b18aff');
  context.fillStyle = brandGradient;
  context.font = `500 ${56 * unit}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText(mode === 'artist' ? artistName : appName, width / 2, height / 2 - 20 * unit);

  context.strokeStyle = 'rgba(231, 201, 119, 0.7)';
  context.lineWidth = 1 * unit;
  context.beginPath();
  context.moveTo(width / 2 - 180 * unit, height / 2 + 35 * unit);
  context.lineTo(width / 2 + 180 * unit, height / 2 + 35 * unit);
  context.stroke();

  context.fillStyle = '#f5f1e7';
  context.font = `400 ${24 * unit}px Georgia, 'Times New Roman', serif`;
  context.fillText(mode === 'artist' ? trackName : `Music by ${artistName}`, width / 2, height / 2 + 83 * unit);

  context.globalAlpha = 0.68 * opacity;
  context.fillStyle = '#cbd3ed';
  context.font = `400 ${13 * unit}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText(mode === 'artist' ? 'Artist release visual' : 'Every Note Becomes Light.', width / 2, height - 54 * unit);

  context.restore();
}
