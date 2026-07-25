import type { EngineFrame, RenderSurface } from '../engine.types';
import { adjustSaturation, applyWarmthOverlay, drawAmbientSparkles } from '../engine.directorFx';
import type { FrequencyCityConfig } from './frequencyCity.types';

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

function seeded(index: number, multiplier: number, offset: number) {
  return ((index * multiplier + offset) % 997) / 997;
}

export function renderFrequencyCity(surface: RenderSurface, frame: EngineFrame, config: FrequencyCityConfig) {
  const { context, width, height } = surface;
  const energy = clamp(frame.energy * config.energyResponse);
  const tempo = Math.max(0.72, frame.bpm / 60);
  const horizonY = height * 0.72;
  const colors = [config.magentaAccent, config.cyanAccent, config.violetAccent].map((accent) =>
    adjustSaturation(accent, config.colorSaturation),
  );
  const cyan = colors[1];

  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#050710');
  sky.addColorStop(0.48, `hsl(268 42% ${10 + energy * 5}%)`);
  sky.addColorStop(0.72, '#170a27');
  sky.addColorStop(1, '#04050a');
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const cityGlow = context.createRadialGradient(width * 0.5, horizonY, 0, width * 0.5, horizonY, width * 0.54 * config.spaceScale);
  cityGlow.addColorStop(0, `rgba(231, 80, 180, ${0.12 + energy * 0.13})`);
  cityGlow.addColorStop(0.42, `rgba(95, 208, 255, ${0.05 + energy * 0.07})`);
  cityGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = cityGlow;
  context.fillRect(0, height * 0.15, width, height * 0.72);

  for (let index = 0; index < 54; index += 1) {
    const x = seeded(index, 83, 17) * width;
    const y = seeded(index, 149, 43) * height * 0.54;
    const shimmer = 0.5 + 0.5 * Math.sin(frame.time * (0.32 + (index % 5) * 0.06) + index * 1.71);
    context.globalAlpha = 0.08 + shimmer * 0.28 + energy * 0.14;
    context.fillStyle = index % 8 === 0 ? cyan : '#edf4ff';
    context.fillRect(x, y, 1 + (index % 3) * 0.45, 1 + (index % 3) * 0.45);
  }

  context.save();
  context.globalCompositeOperation = 'screen';
  const buildingWidth = width / config.buildingCount;
  for (let index = 0; index < config.buildingCount; index += 1) {
    const seed = seeded(index, 73, 29);
    const secondarySeed = seeded(index, 157, 61);
    const independentPulse = 0.5 + 0.5 * Math.sin(
      frame.time * config.pulseSpeed * tempo * TAU * (0.72 + (index % 5) * 0.08) + index * 1.13,
    );
    const baseHeight = height * (0.12 + seed * 0.31);
    const reactiveHeight = energy * height * (0.05 + secondarySeed * 0.16) * (0.46 + independentPulse * 0.54);
    const buildingHeight = baseHeight + reactiveHeight;
    const x = index * buildingWidth + buildingWidth * 0.09;
    const y = horizonY - buildingHeight;
    const actualWidth = buildingWidth * (0.7 + secondarySeed * 0.18);
    const accent = colors[index % colors.length];

    const facade = context.createLinearGradient(0, y, 0, horizonY);
    facade.addColorStop(0, `${accent}${energy > 0.45 ? 'e6' : 'b8'}`);
    facade.addColorStop(0.22, `${accent}80`);
    facade.addColorStop(1, '#080914');
    context.globalAlpha = 0.58 + energy * 0.28;
    context.fillStyle = facade;
    context.shadowBlur = (8 + energy * 18) * config.glowIntensity;
    context.shadowColor = accent;
    context.fillRect(x, y, actualWidth, buildingHeight);

    context.globalAlpha = 0.5 + energy * 0.38;
    context.strokeStyle = accent;
    context.lineWidth = 1 + energy * 1.2;
    context.strokeRect(x, y, actualWidth, buildingHeight);

    const windowColumns = actualWidth > 34 ? 3 : 2;
    const windowRows = Math.max(2, Math.floor(buildingHeight / 32));
    const gapX = actualWidth / (windowColumns + 1);
    const gapY = buildingHeight / (windowRows + 1);
    for (let row = 1; row <= windowRows; row += 1) {
      for (let column = 1; column <= windowColumns; column += 1) {
        const lit = (row * 7 + column * 11 + index * 3) % 5 !== 0;
        context.globalAlpha = lit ? 0.22 + energy * 0.36 : 0.04;
        context.fillStyle = lit ? '#eaf7ff' : accent;
        context.fillRect(x + gapX * column - 1.5, y + gapY * row - 1, 3, 2);
      }
    }

    if (index % 5 === 1 || index % 7 === 3) {
      const antennaHeight = 16 + secondarySeed * 32 + energy * 16;
      context.globalAlpha = 0.5 + energy * 0.4;
      context.strokeStyle = accent;
      context.beginPath();
      context.moveTo(x + actualWidth * 0.5, y);
      context.lineTo(x + actualWidth * 0.5, y - antennaHeight);
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(x + actualWidth * 0.5, y - antennaHeight, 1.6 + energy * 1.5, 0, TAU);
      context.fill();
    }
  }
  context.restore();

  const floor = context.createLinearGradient(0, horizonY, 0, height);
  floor.addColorStop(0, `rgba(95, 208, 255, ${0.08 + energy * 0.07})`);
  floor.addColorStop(0.4, 'rgba(12, 7, 24, 0.64)');
  floor.addColorStop(1, 'rgba(3, 4, 8, 0.96)');
  context.globalAlpha = 1;
  context.fillStyle = floor;
  context.fillRect(0, horizonY, width, height - horizonY);

  context.strokeStyle = cyan;
  context.lineWidth = 1;
  for (let line = 0; line < 7; line += 1) {
    const y = horizonY + 18 + line * 22;
    context.globalAlpha = 0.2 * (1 - line / 7);
    context.beginPath();
    context.moveTo(width * (0.04 + line * 0.025), y);
    context.lineTo(width * (0.96 - line * 0.025), y);
    context.stroke();
  }

  drawAmbientSparkles(context, width, height, frame.time, config.sparkleDensity, cyan);
  applyWarmthOverlay(context, width, height, config.warmth);

  if (config.showTitle && frame.title) {
    context.fillStyle = '#f4efff';
    context.textAlign = 'center';
    context.font = '500 30px Manrope, sans-serif';
    context.fillText(frame.title, width / 2, height - 54, width - 120);
  }
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
}
