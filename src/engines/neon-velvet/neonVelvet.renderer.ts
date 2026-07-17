import type { EngineFrame, RenderSurface } from '../engine.types';
import type { NeonVelvetConfig } from './neonVelvet.types';

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

function drawTrailPath(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  lane: number,
  phase: number,
  energy: number,
) {
  const startY = height * (0.2 + lane * 0.072);
  const sway = height * (0.07 + lane * 0.006 + energy * 0.035);
  context.beginPath();
  context.moveTo(-width * 0.08, startY + Math.sin(phase) * sway);
  context.bezierCurveTo(
    width * 0.18,
    startY - sway * (1.3 + Math.cos(phase * 0.7) * 0.35),
    width * 0.38,
    startY + sway * (1.6 + Math.sin(phase * 0.9) * 0.4),
    width * 0.56,
    startY + Math.cos(phase * 0.63 + lane) * sway * 0.45,
  );
  context.bezierCurveTo(
    width * 0.73,
    startY - sway * (1.4 + Math.sin(phase * 0.82) * 0.32),
    width * 0.9,
    startY + sway * (1.1 + Math.cos(phase * 0.74) * 0.3),
    width * 1.08,
    startY + Math.sin(phase * 0.58 + lane * 0.4) * sway,
  );
}

function drawVelvetFold(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  x: number,
  color: string,
  intensity: number,
) {
  const fold = context.createLinearGradient(x - width * 0.2, 0, x + width * 0.2, height);
  fold.addColorStop(0, `${color}00`);
  fold.addColorStop(0.42, `${color}0d`);
  fold.addColorStop(0.5, `${color}2b`);
  fold.addColorStop(0.58, `${color}0b`);
  fold.addColorStop(1, `${color}00`);
  context.globalAlpha = intensity;
  context.fillStyle = fold;
  context.fillRect(0, 0, width, height);
}

export function renderNeonVelvet(surface: RenderSurface, frame: EngineFrame, config: NeonVelvetConfig) {
  const { context, width, height } = surface;
  const energy = clamp(frame.energy * config.energyResponse);
  const tempo = Math.max(0.7, frame.bpm / 60);
  const phase = frame.time * config.trailSpeed * tempo * TAU;
  const colors = [config.cyanAccent, config.violetAccent, config.magentaAccent];

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#070713');
  background.addColorStop(0.46, '#19072d');
  background.addColorStop(0.72, '#27083a');
  background.addColorStop(1, '#060711');
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  drawVelvetFold(context, width, height, width * 0.28, config.violetAccent, 0.72 + energy * 0.2);
  drawVelvetFold(context, width, height, width * 0.68, config.magentaAccent, 0.62 + energy * 0.22);

  const centralGlow = context.createRadialGradient(width * 0.52, height * 0.48, 0, width * 0.52, height * 0.48, width * 0.56);
  centralGlow.addColorStop(0, `rgba(138, 107, 255, ${0.11 + energy * 0.12})`);
  centralGlow.addColorStop(0.46, `rgba(231, 80, 180, ${0.055 + energy * 0.08})`);
  centralGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.globalAlpha = 1;
  context.fillStyle = centralGlow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'screen';
  for (let lane = 0; lane < config.trailCount; lane += 1) {
    const color = colors[lane % colors.length];
    const lanePhase = phase * (0.44 + lane * 0.035) + lane * 0.82;
    const pulse = 0.5 + 0.5 * Math.sin(lanePhase * 1.4 + lane);

    drawTrailPath(context, width, height, lane, lanePhase, energy);
    context.globalAlpha = 0.08 + energy * 0.11;
    context.strokeStyle = color;
    context.lineWidth = 16 + energy * 18;
    context.shadowBlur = 30 + energy * 36;
    context.shadowColor = color;
    context.stroke();

    drawTrailPath(context, width, height, lane, lanePhase, energy);
    context.globalAlpha = 0.34 + energy * 0.42;
    context.strokeStyle = color;
    context.lineWidth = 1.4 + energy * 2.4;
    context.setLineDash([42 + lane * 3, 28 + (lane % 3) * 9]);
    context.lineDashOffset = -frame.time * (54 + lane * 8) * config.trailSpeed - lane * 31;
    context.shadowBlur = 10 + energy * 20;
    context.stroke();

    drawTrailPath(context, width, height, lane, lanePhase, energy);
    context.globalAlpha = 0.25 + pulse * 0.3 + energy * 0.24;
    context.strokeStyle = '#f7f1ff';
    context.lineWidth = 0.8 + energy * 1.1;
    context.setLineDash([3, 92 + lane * 5]);
    context.lineDashOffset = -frame.time * (96 + lane * 11) * config.trailSpeed;
    context.shadowBlur = 16 + energy * 24;
    context.shadowColor = color;
    context.stroke();
  }
  context.setLineDash([]);
  context.restore();

  for (let index = 0; index < 36; index += 1) {
    const x = (((index * 83 + 41) % 997) / 997) * width;
    const y = (((index * 149 + 73) % 991) / 991) * height * 0.82;
    const shimmer = 0.5 + 0.5 * Math.sin(phase * 0.18 + index * 1.73);
    context.globalAlpha = 0.07 + shimmer * 0.2 + energy * 0.13;
    context.fillStyle = colors[index % colors.length];
    context.beginPath();
    context.arc(x, y, 1 + (index % 3) * 0.55 + energy, 0, TAU);
    context.fill();
  }

  const vignette = context.createRadialGradient(width * 0.5, height * 0.46, height * 0.12, width * 0.5, height * 0.46, width * 0.72);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.68, 'rgba(0, 0, 0, 0.12)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.64)');
  context.globalAlpha = 1;
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  if (config.showTitle && frame.title) {
    context.fillStyle = '#f8f2ff';
    context.textAlign = 'center';
    context.font = '500 30px Manrope, sans-serif';
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.setLineDash([]);
}
