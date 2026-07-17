import type { EngineFrame, RenderSurface } from '../engine.types';
import type { CosmicWavesConfig } from './cosmicWaves.types';

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

function drawWave(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerY: number,
  amplitude: number,
  phase: number,
  color: string,
  alpha: number,
  lineWidth: number,
) {
  context.beginPath();
  for (let x = -40; x <= width + 40; x += 12) {
    const normalized = x / width;
    const envelope = Math.sin(Math.PI * clamp(normalized));
    const y = centerY
      + Math.sin(normalized * TAU * 1.45 + phase) * amplitude * envelope
      + Math.sin(normalized * TAU * 3.1 - phase * 0.62) * amplitude * 0.2;
    if (x === -40) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.stroke();
}

export function renderCosmicWaves(surface: RenderSurface, frame: EngineFrame, config: CosmicWavesConfig) {
  const { context, width, height } = surface;
  const energy = clamp(frame.energy * config.energyResponse);
  const phase = frame.time * config.waveSpeed * TAU;

  const background = context.createRadialGradient(width * 0.48, height * 0.42, 16, width * 0.5, height * 0.48, width * 0.78);
  background.addColorStop(0, `hsl(${226 + energy * 12} 48% ${16 + energy * 8}%)`);
  background.addColorStop(0.48, '#0b1024');
  background.addColorStop(1, '#03050b');
  context.globalAlpha = 1;
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const nebula = context.createRadialGradient(width * 0.28, height * 0.36, 0, width * 0.28, height * 0.36, width * 0.42);
  nebula.addColorStop(0, `rgba(92, 155, 255, ${0.13 + energy * 0.13})`);
  nebula.addColorStop(0.46, `rgba(91, 70, 196, ${0.08 + energy * 0.08})`);
  nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = nebula;
  context.fillRect(0, 0, width, height);

  const starCount = Math.round(74 * config.particleDensity);
  for (let index = 0; index < starCount; index += 1) {
    const seedX = (index * 73 + 19) % 997;
    const seedY = (index * 151 + 47) % 991;
    const x = (seedX / 997) * width;
    const y = (seedY / 991) * height * 0.84;
    const pulse = 0.5 + 0.5 * Math.sin(frame.time * (0.35 + (index % 5) * 0.07) + index * 1.7);
    const radius = 0.6 + (index % 4) * 0.42 + energy * pulse * 0.8;
    context.globalAlpha = 0.18 + pulse * 0.42 + energy * 0.18;
    context.fillStyle = index % 7 === 0 ? config.cyanAccent : '#ffffff';
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
  }

  context.save();
  context.globalCompositeOperation = 'screen';
  context.shadowBlur = 24 + energy * 30;
  context.shadowColor = config.violetAccent;
  drawWave(context, width, height, height * 0.49, 58 + energy * 54, phase, config.violetAccent, 0.28 + energy * 0.3, 18 + energy * 10);
  context.shadowColor = config.cyanAccent;
  drawWave(context, width, height, height * 0.53, 42 + energy * 42, phase + 1.4, config.cyanAccent, 0.42 + energy * 0.36, 6 + energy * 7);
  context.shadowBlur = 12 + energy * 18;
  drawWave(context, width, height, height * 0.57, 27 + energy * 32, -phase * 0.72, '#d8e8ff', 0.26 + energy * 0.3, 2.2 + energy * 2);
  context.restore();

  const horizon = context.createLinearGradient(0, height * 0.54, 0, height);
  horizon.addColorStop(0, 'rgba(5, 8, 20, 0)');
  horizon.addColorStop(1, 'rgba(2, 3, 8, 0.82)');
  context.globalAlpha = 1;
  context.fillStyle = horizon;
  context.fillRect(0, height * 0.5, width, height * 0.5);

  if (config.showTitle && frame.title) {
    context.fillStyle = '#eef1fb';
    context.textAlign = 'center';
    context.font = '500 30px Manrope, sans-serif';
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
  context.globalAlpha = 1;
}
