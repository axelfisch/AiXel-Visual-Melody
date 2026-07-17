import type { EngineFrame, RenderSurface } from '../engine.types';
import type { LiquidColorsConfig } from './liquidColors.types';

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

function drawOrganicField(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  phase: number,
  color: string,
  alpha: number,
) {
  const points = 18;
  const vertices = Array.from({ length: points }, (_, index) => {
    const angle = (index / points) * TAU;
    const distortion = 1
      + Math.sin(angle * 3 + phase) * 0.11
      + Math.cos(angle * 5 - phase * 0.7) * 0.055;
    return {
      x: Math.cos(angle) * radius * distortion,
      y: Math.sin(angle) * radius * distortion * 0.72,
    };
  });

  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(phase * 0.43) * 0.34);
  context.beginPath();
  for (let index = 0; index < points; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % points];
    const midpointX = (current.x + next.x) * 0.5;
    const midpointY = (current.y + next.y) * 0.5;
    if (index === 0) context.moveTo(midpointX, midpointY);
    context.quadraticCurveTo(next.x, next.y, midpointX, midpointY);
  }
  context.closePath();
  context.clip();

  const gradient = context.createRadialGradient(
    -radius * 0.16,
    -radius * 0.12,
    radius * 0.04,
    0,
    0,
    radius,
  );
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.34, color);
  gradient.addColorStop(0.78, `${color}66`);
  gradient.addColorStop(1, `${color}00`);
  context.globalAlpha = alpha;
  context.fillStyle = gradient;
  context.fillRect(-radius * 1.25, -radius, radius * 2.5, radius * 2);
  context.restore();
}

function drawLiquidRibbon(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: number,
  amplitude: number,
  color: string,
  alpha: number,
) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `${color}00`);
  gradient.addColorStop(0.24, color);
  gradient.addColorStop(0.76, color);
  gradient.addColorStop(1, `${color}00`);
  context.globalAlpha = alpha;
  context.strokeStyle = gradient;
  context.lineWidth = 34 + amplitude * 0.16;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(-80, height * 0.52 + Math.sin(phase) * amplitude);
  context.bezierCurveTo(
    width * 0.22,
    height * 0.18 + Math.cos(phase * 0.7) * amplitude,
    width * 0.58,
    height * 0.84 + Math.sin(phase * 0.9) * amplitude,
    width + 80,
    height * 0.42 + Math.cos(phase) * amplitude,
  );
  context.stroke();
}

function drawLiquidBand(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerY: number,
  thickness: number,
  amplitude: number,
  phase: number,
  color: string,
  alpha: number,
) {
  const step = 48;
  const upper: Array<{ x: number; y: number }> = [];
  const lower: Array<{ x: number; y: number }> = [];
  for (let x = -step; x <= width + step; x += step) {
    const normalized = x / width;
    const firstWave = Math.sin(normalized * TAU * 1.18 + phase) * amplitude;
    const secondWave = Math.sin(normalized * TAU * 2.34 - phase * 0.63) * amplitude * 0.24;
    const breathing = Math.sin(normalized * TAU * 0.72 + phase * 0.42) * thickness * 0.18;
    const y = centerY + firstWave + secondWave;
    upper.push({ x, y: y - thickness * 0.5 - breathing });
    lower.push({ x, y: y + thickness * 0.5 + breathing });
  }

  context.beginPath();
  upper.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  [...lower].reverse().forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();

  const gradient = context.createLinearGradient(0, centerY - thickness, width, centerY + thickness);
  gradient.addColorStop(0, `${color}18`);
  gradient.addColorStop(0.36, `${color}cc`);
  gradient.addColorStop(0.72, `${color}8c`);
  gradient.addColorStop(1, `${color}10`);
  context.globalAlpha = alpha;
  context.fillStyle = gradient;
  context.fill();
}

export function renderLiquidColors(surface: RenderSurface, frame: EngineFrame, config: LiquidColorsConfig) {
  const { context, width, height } = surface;
  const energy = clamp(frame.energy * config.energyResponse);
  const beat = 0.5 + 0.5 * Math.sin(frame.time * Math.max(0.7, frame.bpm / 60) * Math.PI);
  const phase = frame.time * config.flowSpeed * TAU;
  const minDimension = Math.min(width, height);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#100b19');
  background.addColorStop(0.5, '#1b1230');
  background.addColorStop(1, '#080a18');
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const colors = [config.orangeAccent, config.magentaAccent, config.indigoAccent];
  context.save();
  context.globalCompositeOperation = 'screen';
  for (let band = 0; band < 6; band += 1) {
    const bandPhase = phase * (0.46 + band * 0.07) + band * 1.16;
    drawLiquidBand(
      context,
      width,
      height,
      height * (0.11 + band * 0.115),
      minDimension * (0.11 + (band % 2) * 0.035),
      34 + band * 8 + energy * 58,
      bandPhase,
      colors[band % colors.length],
      0.28 + config.inkDensity * 0.22 + energy * 0.16,
    );
  }

  const fieldCount = Math.round(4 + config.inkDensity * 3);
  for (let index = 0; index < fieldCount; index += 1) {
    const lane = index / Math.max(1, fieldCount - 1);
    const fieldPhase = phase * (0.48 + (index % 4) * 0.08) + index * 1.37;
    const x = width * (0.12 + lane * 0.76) + Math.sin(fieldPhase) * width * 0.11;
    const y = height * (0.44 + Math.cos(fieldPhase * 0.83 + index) * 0.24);
    const radius = minDimension * (0.18 + (index % 3) * 0.028) * (1 + energy * 0.2 + beat * 0.025);
    drawOrganicField(
      context,
      x,
      y,
      radius,
      fieldPhase,
      colors[index % colors.length],
      0.16 + energy * 0.16 + config.inkDensity * 0.1,
    );
  }

  context.shadowBlur = 28 + energy * 34;
  context.shadowColor = config.magentaAccent;
  drawLiquidRibbon(context, width, height, phase * 0.62, 48 + energy * 62, config.magentaAccent, 0.18 + energy * 0.16);
  context.shadowColor = config.orangeAccent;
  drawLiquidRibbon(context, width, height, -phase * 0.48 + 2.1, 34 + energy * 46, config.orangeAccent, 0.14 + energy * 0.14);
  context.restore();

  for (let index = 0; index < 28; index += 1) {
    const seedX = (index * 89 + 23) % 997;
    const seedY = (index * 163 + 61) % 991;
    const drift = Math.sin(phase * 0.24 + index * 1.9) * 12;
    const x = (seedX / 997) * width + drift;
    const y = (seedY / 991) * height * 0.82;
    context.globalAlpha = 0.08 + energy * 0.18;
    context.fillStyle = colors[index % colors.length];
    context.beginPath();
    context.arc(x, y, 1.4 + (index % 4) * 0.7 + energy * 1.5, 0, TAU);
    context.fill();
  }

  const vignette = context.createRadialGradient(width * 0.5, height * 0.46, minDimension * 0.12, width * 0.5, height * 0.46, width * 0.72);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
  context.globalAlpha = 1;
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  if (config.showTitle && frame.title) {
    context.fillStyle = '#fff4ee';
    context.textAlign = 'center';
    context.font = '500 30px Manrope, sans-serif';
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
}
