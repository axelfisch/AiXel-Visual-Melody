import type { EngineFrame, RenderSurface } from '../engine.types';
import type { MinimalAlbumArtConfig } from './minimalAlbumArt.types';

export function renderMinimalAlbumArt(surface: RenderSurface, frame: EngineFrame, config: MinimalAlbumArtConfig) {
  const { context, width, height } = surface;
  const energy = Math.min(1, Math.max(0, frame.energy * config.energyResponse));
  const gradient = context.createRadialGradient(width * 0.5, height * 0.45, 20, width * 0.5, height * 0.45, width * 0.75);
  gradient.addColorStop(0, `hsl(${config.backgroundHue + energy * 20} 34% ${14 + energy * 7}%)`);
  gradient.addColorStop(1, '#05060b');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2 - 20);
  context.rotate(frame.time * config.rotationSpeed);
  const radius = Math.min(width, height) * 0.247 + energy * 24;
  context.fillStyle = config.discColor;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  for (let ring = 25; ring < radius; ring += 9) {
    context.strokeStyle = `rgba(231,201,119,${0.04 + energy * 0.08})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(0, 0, ring, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = config.accentColor;
  context.beginPath();
  context.arc(0, 0, 42 + energy * 8, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#05060b';
  context.beginPath();
  context.arc(0, 0, 7, 0, Math.PI * 2);
  context.fill();
  context.restore();
  if (config.showTitle && frame.title) {
    context.fillStyle = '#eef1fb';
    context.textAlign = 'center';
    context.font = '500 30px Manrope, sans-serif';
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
}
