import type { EngineParameterDefinition } from '../engine.types';
import {
  IMAGE_PULSE_FRAMINGS,
  IMAGE_PULSE_STYLES,
  type ImagePulseConfig,
  type ImagePulseFraming,
  type ImagePulseStyle,
} from './imagePulse.types';

export const imagePulseDefaultConfig: ImagePulseConfig = {
  pulseSpeed: 0.7,
  energyResponse: 1.1,
  effectComplexity: 0.6,
  glowIntensity: 1.1,
  spaceScale: 1,
  colorSaturation: 1,
  sparkleDensity: 0.5,
  warmth: 0,
  primaryColor: '#9eeaff',
  accentColor: '#8a6bff',
  style: 'pulse',
  framing: 'fill',
  imageSrc: '',
  showTitle: true,
};

export const imagePulseParameters: EngineParameterDefinition[] = [
  { id: 'pulseSpeed', label: 'Drift speed', type: 'number', defaultValue: 0.7, min: 0.2, max: 1.6, step: 0.02 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1.1, min: 0, max: 2, step: 0.05 },
  { id: 'effectComplexity', label: 'Effect complexity', type: 'number', defaultValue: 0.6, min: 0.2, max: 1, step: 0.05 },
  { id: 'glowIntensity', label: 'Glow', type: 'number', defaultValue: 1.1, min: 0.5, max: 1.8, step: 0.05 },
  { id: 'spaceScale', label: 'Spatial scale', type: 'number', defaultValue: 1, min: 0.72, max: 1.28, step: 0.02 },
  { id: 'colorSaturation', label: 'Color saturation', type: 'number', defaultValue: 1, min: 0.4, max: 1.6, step: 0.05 },
  { id: 'sparkleDensity', label: 'Particle shimmer', type: 'number', defaultValue: 0.5, min: 0, max: 1.6, step: 0.05 },
  { id: 'warmth', label: 'Warmth', type: 'number', defaultValue: 0, min: -1, max: 1, step: 0.05 },
  { id: 'primaryColor', label: 'Primary color', type: 'color', defaultValue: '#9eeaff' },
  { id: 'accentColor', label: 'Accent color', type: 'color', defaultValue: '#8a6bff' },
  { id: 'style', label: 'Pulse style', type: 'select', defaultValue: 'pulse', options: [...IMAGE_PULSE_STYLES] },
  { id: 'framing', label: 'Framing', type: 'select', defaultValue: 'fill', options: [...IMAGE_PULSE_FRAMINGS] },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

function asStyle(value: unknown): ImagePulseStyle {
  return IMAGE_PULSE_STYLES.includes(value as ImagePulseStyle) ? (value as ImagePulseStyle) : imagePulseDefaultConfig.style;
}

function asFraming(value: unknown): ImagePulseFraming {
  return IMAGE_PULSE_FRAMINGS.includes(value as ImagePulseFraming)
    ? (value as ImagePulseFraming)
    : imagePulseDefaultConfig.framing;
}

/** Only in-memory object URLs and inline raster data URLs are accepted as image sources. */
export function isImagePulseSource(value: unknown): value is string {
  return typeof value === 'string'
    && (value.startsWith('blob:') || /^data:image\/(png|jpeg|webp);/i.test(value));
}

export function validateImagePulseConfig(value: unknown): ImagePulseConfig {
  const config = value && typeof value === 'object' ? value as Partial<ImagePulseConfig> : {};
  const d = imagePulseDefaultConfig;
  return {
    pulseSpeed: numberInRange(config.pulseSpeed, d.pulseSpeed, 0.2, 1.6),
    energyResponse: numberInRange(config.energyResponse, d.energyResponse, 0, 2),
    effectComplexity: numberInRange(config.effectComplexity, d.effectComplexity, 0.2, 1),
    glowIntensity: numberInRange(config.glowIntensity, d.glowIntensity, 0.5, 1.8),
    spaceScale: numberInRange(config.spaceScale, d.spaceScale, 0.72, 1.28),
    colorSaturation: numberInRange(config.colorSaturation, d.colorSaturation, 0.4, 1.6),
    sparkleDensity: numberInRange(config.sparkleDensity, d.sparkleDensity, 0, 1.6),
    warmth: numberInRange(config.warmth, d.warmth, -1, 1),
    primaryColor: color(config.primaryColor, d.primaryColor),
    accentColor: color(config.accentColor, d.accentColor),
    style: asStyle(config.style),
    framing: asFraming(config.framing),
    imageSrc: isImagePulseSource(config.imageSrc) ? config.imageSrc : '',
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : d.showTitle,
  };
}
