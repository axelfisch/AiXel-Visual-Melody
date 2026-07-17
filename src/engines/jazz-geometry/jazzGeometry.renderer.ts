import type { EngineFrame, RenderSurface } from '../engine.types';
import type { JazzGeometryConfig } from './jazzGeometry.types';

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

function polygon(
  context: CanvasRenderingContext2D,
  sides: number,
  radius: number,
  rotation: number,
) {
  context.beginPath();
  for (let point = 0; point <= sides; point += 1) {
    const angle = rotation + (point / sides) * TAU;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
}

export function renderJazzGeometry(surface: RenderSurface, frame: EngineFrame, config: JazzGeometryConfig) {
  const { context, width, height } = surface;
  const energy = clamp(frame.energy * config.energyResponse);
  const pulse = 0.5 + 0.5 * Math.sin(frame.time * Math.max(0.7, frame.bpm / 60) * Math.PI);
  const centerX = width * 0.5;
  const centerY = height * 0.47;
  const minDimension = Math.min(width, height);

  const background = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.72);
  background.addColorStop(0, `hsl(226 26% ${15 + energy * 6}%)`);
  background.addColorStop(0.52, '#0d101b');
  background.addColorStop(1, '#04050a');
  context.globalAlpha = 1;
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(centerX, centerY);

  const halo = context.createRadialGradient(0, 0, 0, 0, 0, minDimension * 0.33);
  halo.addColorStop(0, `rgba(231, 201, 119, ${0.08 + energy * 0.08})`);
  halo.addColorStop(0.5, `rgba(112, 137, 207, ${0.04 + energy * 0.07})`);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, minDimension * 0.34, 0, TAU);
  context.fill();

  for (let ring = 0; ring < config.ringCount; ring += 1) {
    const normalized = config.ringCount > 1 ? ring / (config.ringCount - 1) : 0;
    const radius = minDimension * (0.075 + normalized * 0.285) + energy * (5 + normalized * 18);
    const direction = ring % 2 === 0 ? 1 : -1;
    const rotation = frame.time * config.rotationSpeed * direction * (0.72 + normalized * 0.54) + ring * 0.41;
    const arcLength = Math.PI * (0.72 + (ring % 4) * 0.16 + energy * 0.18);

    context.save();
    context.rotate(rotation);
    context.globalAlpha = 0.18 + normalized * 0.28 + energy * 0.22;
    context.strokeStyle = ring % 3 === 0 ? config.iceAccent : config.goldAccent;
    context.lineWidth = 1 + (1 - normalized) * 1.6 + energy * 1.8;
    context.shadowBlur = ring % 3 === 0 ? 10 + energy * 16 : 5 + energy * 10;
    context.shadowColor = context.strokeStyle as string;
    context.beginPath();
    context.arc(0, 0, radius, -arcLength * 0.5, arcLength * 0.5);
    context.stroke();
    context.beginPath();
    context.arc(0, 0, radius, Math.PI - arcLength * 0.38, Math.PI + arcLength * 0.38);
    context.stroke();

    const orbitalAngle = rotation * 1.7 + ring * 0.9;
    context.globalAlpha = 0.4 + energy * 0.45;
    context.fillStyle = ring % 3 === 0 ? config.iceAccent : config.goldAccent;
    context.beginPath();
    context.arc(Math.cos(orbitalAngle) * radius, Math.sin(orbitalAngle) * radius, 1.8 + energy * 2.6, 0, TAU);
    context.fill();
    context.restore();
  }

  const polygonRotation = frame.time * config.rotationSpeed * 0.7;
  context.globalAlpha = 0.28 + energy * 0.34;
  context.strokeStyle = config.iceAccent;
  context.lineWidth = 1.2 + energy * 1.4;
  polygon(context, 6, minDimension * (0.12 + energy * 0.018), polygonRotation);
  context.stroke();
  context.globalAlpha = 0.2 + energy * 0.4;
  context.strokeStyle = config.goldAccent;
  polygon(context, 3, minDimension * (0.082 + pulse * 0.012 + energy * 0.012), -polygonRotation * 1.4 + Math.PI / 2);
  context.stroke();

  const core = context.createRadialGradient(0, 0, 0, 0, 0, 38 + energy * 20);
  core.addColorStop(0, `rgba(255, 247, 218, ${0.82 + energy * 0.18})`);
  core.addColorStop(0.24, `rgba(231, 201, 119, ${0.44 + energy * 0.3})`);
  core.addColorStop(1, 'rgba(231, 201, 119, 0)');
  context.globalAlpha = 1;
  context.fillStyle = core;
  context.beginPath();
  context.arc(0, 0, 38 + energy * 20, 0, TAU);
  context.fill();
  context.fillStyle = '#07080d';
  context.beginPath();
  context.arc(0, 0, 7 + energy * 2, 0, TAU);
  context.fill();
  context.restore();

  const vignette = context.createRadialGradient(centerX, centerY, minDimension * 0.2, centerX, centerY, width * 0.68);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  if (config.showTitle && frame.title) {
    context.globalAlpha = 1;
    context.fillStyle = '#eef1fb';
    context.textAlign = 'center';
    context.font = '500 30px Manrope, sans-serif';
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
  context.globalAlpha = 1;
}
