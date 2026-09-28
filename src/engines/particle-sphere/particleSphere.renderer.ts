import { adjustSaturation, applyWarmthOverlay } from '../engine.directorFx';
import type { EngineFrame, RenderSurface } from '../engine.types';
import type { ParticleSphereConfig } from './particleSphere.types';

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Scaled for Preview/Export stability (~6k points at full density). */
const MAX_PARTICLES = 6_000;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

type Particle = { x: number; y: number; z: number };

const baseParticles: Particle[] = (() => {
  const points: Particle[] = [];
  for (let index = 0; index < MAX_PARTICLES; index += 1) {
    const y = 1 - (index / (MAX_PARTICLES - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * index;
    points.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
    });
  }
  return points;
})();

function rotateY(point: Particle, angle: number): Particle {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos,
  };
}

function rotateX(point: Particle, angle: number): Particle {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x,
    y: point.y * cos - point.z * sin,
    z: point.y * sin + point.z * cos,
  };
}

function drawRibbon(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  tilt: number,
  color: string,
  alpha: number,
  lineWidth: number,
) {
  context.save();
  context.translate(cx, cy);
  context.rotate(tilt);
  context.beginPath();
  for (let index = 0; index <= 96; index += 1) {
    const angle = (index / 96) * TAU + rotation;
    const ripple = 1 + Math.sin(angle * 3 + rotation) * 0.04;
    const x = Math.cos(angle) * radiusX * ripple;
    const y = Math.sin(angle) * radiusY * ripple;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.strokeStyle = color;
  context.globalAlpha = alpha;
  context.lineWidth = lineWidth;
  context.stroke();
  context.restore();
}

export function renderParticleSphere(surface: RenderSurface, frame: EngineFrame, config: ParticleSphereConfig) {
  const { context, width, height } = surface;
  const energy = clamp(frame.energy * config.energyResponse);
  const primary = adjustSaturation(config.primaryColor, config.colorSaturation);
  const accent = adjustSaturation(config.accentColor, config.colorSaturation);
  const rotation = frame.time * config.orbitSpeed;
  const scale = config.spaceScale * (0.92 + energy * 0.08);
  const count = Math.round(MAX_PARTICLES * config.particleDensity);
  const sphereRadius = Math.min(width, height) * 0.28 * scale;
  const cx = width * 0.5;
  const cy = height * 0.48;
  const pulse = 0.02 + energy * 0.12;

  const background = context.createRadialGradient(cx, cy, 12, cx, cy, width * 0.72);
  background.addColorStop(0, `hsl(226 42% ${10 + energy * 7}%)`);
  background.addColorStop(0.55, '#060914');
  background.addColorStop(1, '#03050b');
  context.globalAlpha = 1;
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const halo = context.createRadialGradient(cx, cy, sphereRadius * 0.2, cx, cy, sphereRadius * 1.55);
  halo.addColorStop(0, `rgba(158, 234, 255, ${0.08 + energy * 0.1})`);
  halo.addColorStop(0.45, `rgba(138, 107, 255, ${0.05 + config.glowIntensity * 0.03})`);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'screen';
  drawRibbon(context, cx, cy, sphereRadius * 1.18, sphereRadius * 0.42, rotation * 0.9, 0.82, primary, 0.14 + energy * 0.12, 1.4);
  drawRibbon(context, cx, cy, sphereRadius * 1.12, sphereRadius * 0.7, -rotation * 0.7, -0.48, accent, 0.12 + energy * 0.1, 1.2);
  drawRibbon(context, cx, cy, sphereRadius * 1.22, sphereRadius * 0.9, rotation * 0.55, 0.22, primary, 0.1 + config.glowIntensity * 0.05, 1);
  context.restore();

  const drawn: Array<{ x: number; y: number; depth: number; size: number; alpha: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const base = baseParticles[index];
    const wave = Math.sin(base.x * 5.3 + frame.time * 0.8) * Math.cos(base.y * 4.1 - frame.time * 0.55)
      + Math.sin(base.z * 6.2 + frame.time * 0.42) * 0.55;
    const displaced: Particle = {
      x: base.x * (1 + wave * pulse),
      y: base.y * (1 + wave * pulse),
      z: base.z * (1 + wave * pulse),
    };
    const spun = rotateX(rotateY(displaced, rotation), rotation * 0.23);
    const perspective = 1.55 / (2.2 - spun.z);
    const x = cx + spun.x * sphereRadius * perspective;
    const y = cy + spun.y * sphereRadius * perspective;
    const depth = (spun.z + 1) * 0.5;
    const shimmer = 0.55 + 0.45 * Math.abs(Math.sin(frame.time * (0.5 + (index % 7) * 0.05) + index));
    drawn.push({
      x,
      y,
      depth,
      size: (0.7 + depth * 1.4 + energy * 0.9) * (0.85 + config.sparkleDensity * 0.25),
      alpha: (0.18 + depth * 0.55 + energy * 0.15) * (0.7 + shimmer * 0.3) * Math.min(1, config.glowIntensity),
    });
  }

  drawn.sort((a, b) => a.depth - b.depth);
  context.save();
  context.shadowBlur = 8 * config.glowIntensity;
  context.shadowColor = primary;
  for (let index = 0; index < drawn.length; index += 1) {
    const point = drawn[index];
    context.globalAlpha = Math.min(1, point.alpha);
    context.fillStyle = index % 11 === 0 ? accent : primary;
    context.beginPath();
    context.arc(point.x, point.y, point.size, 0, TAU);
    context.fill();
  }
  context.restore();
  context.globalAlpha = 1;
  context.shadowBlur = 0;

  // Soft shell outline
  context.beginPath();
  context.ellipse(cx, cy, sphereRadius * 1.05, sphereRadius * 0.98, rotation * 0.2, 0, TAU);
  context.strokeStyle = accent;
  context.globalAlpha = 0.08 + energy * 0.08 + config.glowIntensity * 0.04;
  context.lineWidth = 1.5;
  context.stroke();
  context.globalAlpha = 1;

  applyWarmthOverlay(context, width, height, config.warmth);
  if (config.showTitle && frame.title) {
    context.fillStyle = '#eef1fb';
    context.textAlign = 'center';
    context.font = '500 30px Manrope, sans-serif';
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
}
