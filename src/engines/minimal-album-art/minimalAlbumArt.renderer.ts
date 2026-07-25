import type { EngineFrame, RenderSurface } from '../engine.types';
import { adjustSaturation, applyWarmthOverlay, drawAmbientSparkles } from '../engine.directorFx';
import type { MinimalAlbumArtConfig } from './minimalAlbumArt.types';

export function renderMinimalAlbumArt(surface: RenderSurface, frame: EngineFrame, config: MinimalAlbumArtConfig) {
  const { context, width, height } = surface;
  const energy = Math.min(1, Math.max(0, frame.energy * config.energyResponse));
  const accent = adjustSaturation(config.accentColor, config.colorSaturation);
  const gradient = context.createRadialGradient(width * 0.5, height * 0.45, 20, width * 0.5, height * 0.45, width * 0.75 * config.spaceScale);
  gradient.addColorStop(0, `hsl(${config.backgroundHue + energy * 20} 34% ${14 + energy * 7}%)`);
  gradient.addColorStop(1, '#05060b');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2 - 20);
  context.rotate(frame.time * config.rotationSpeed);
  const radius = Math.min(width, height) * 0.247 * config.spaceScale + energy * 24;
  context.shadowBlur = 18 * config.glowIntensity;
  context.shadowColor = accent;
  context.fillStyle = config.discColor;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  const grooveStep = Math.max(2, radius / config.grooveDetail);
  for (let ring = 25; ring < radius; ring += grooveStep) {
    context.strokeStyle = `rgba(231,201,119,${0.04 + energy * 0.08})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(0, 0, ring, 0, Math.PI * 2);
    context.stroke();
  }
  context.shadowBlur = 12 * config.glowIntensity;
  context.shadowColor = accent;
  context.fillStyle = accent;
  context.beginPath();
  context.arc(0, 0, 42 + energy * 8, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = '#05060b';
  context.beginPath();
  context.arc(0, 0, 7, 0, Math.PI * 2);
  context.fill();
  context.restore();

  drawAmbientSparkles(context, width, height, frame.time, config.sparkleDensity, accent);
  applyWarmthOverlay(context, width, height, config.warmth);

  if (config.showTitle && frame.title) {
    context.fillStyle = '#eef1fb';
    context.textAlign = 'center';
    context.font = '500 30px Manrope, sans-serif';
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
}
