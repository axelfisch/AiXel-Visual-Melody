import type { EngineParameterDefinition } from '../engine.types';
import {
  DANCE_AVATAR_GENDERS,
  DANCE_AVATAR_STYLES,
  type DanceAvatarGender,
  type DanceAvatarStyle,
  type DanceAvatarsConfig,
} from './danceAvatars.types';

export const danceAvatarsDefaultConfig: DanceAvatarsConfig = {
  danceSpeed: 0.55,
  energyResponse: 1.15,
  limbExpressiveness: 0.72,
  glowIntensity: 1.1,
  spaceScale: 1,
  colorSaturation: 1,
  sparkleDensity: 0.5,
  warmth: 0,
  primaryColor: '#9eeaff',
  accentColor: '#8a6bff',
  gender: 'female',
  style: 'neon',
  showTitle: true,
};

export const danceAvatarsParameters: EngineParameterDefinition[] = [
  { id: 'danceSpeed', label: 'Dance speed', type: 'number', defaultValue: 0.55, min: 0.15, max: 1.2, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1.15, min: 0, max: 2, step: 0.05 },
  { id: 'limbExpressiveness', label: 'Limb expressiveness', type: 'number', defaultValue: 0.72, min: 0.25, max: 1.2, step: 0.05 },
  { id: 'glowIntensity', label: 'Glow', type: 'number', defaultValue: 1.1, min: 0.5, max: 1.8, step: 0.05 },
  { id: 'spaceScale', label: 'Spatial scale', type: 'number', defaultValue: 1, min: 0.72, max: 1.28, step: 0.02 },
  { id: 'colorSaturation', label: 'Color saturation', type: 'number', defaultValue: 1, min: 0.4, max: 1.6, step: 0.05 },
  { id: 'sparkleDensity', label: 'Particle shimmer', type: 'number', defaultValue: 0.5, min: 0, max: 1.6, step: 0.05 },
  { id: 'warmth', label: 'Warmth', type: 'number', defaultValue: 0, min: -1, max: 1, step: 0.05 },
  { id: 'primaryColor', label: 'Primary color', type: 'color', defaultValue: '#9eeaff' },
  { id: 'accentColor', label: 'Accent color', type: 'color', defaultValue: '#8a6bff' },
  {
    id: 'gender',
    label: 'Gender',
    type: 'select',
    defaultValue: 'female',
    options: [...DANCE_AVATAR_GENDERS],
  },
  {
    id: 'style',
    label: 'Avatar style',
    type: 'select',
    defaultValue: 'neon',
    options: [...DANCE_AVATAR_STYLES],
  },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

function asGender(value: unknown): DanceAvatarGender {
  return value === 'male' || value === 'female' ? value : danceAvatarsDefaultConfig.gender;
}

function asStyle(value: unknown): DanceAvatarStyle {
  return DANCE_AVATAR_STYLES.includes(value as DanceAvatarStyle)
    ? (value as DanceAvatarStyle)
    : danceAvatarsDefaultConfig.style;
}

export function validateDanceAvatarsConfig(value: unknown): DanceAvatarsConfig {
  const config = value && typeof value === 'object' ? value as Partial<DanceAvatarsConfig> : {};
  return {
    danceSpeed: numberInRange(config.danceSpeed, danceAvatarsDefaultConfig.danceSpeed, 0.15, 1.2),
    energyResponse: numberInRange(config.energyResponse, danceAvatarsDefaultConfig.energyResponse, 0, 2),
    limbExpressiveness: numberInRange(
      config.limbExpressiveness,
      danceAvatarsDefaultConfig.limbExpressiveness,
      0.25,
      1.2,
    ),
    glowIntensity: numberInRange(config.glowIntensity, danceAvatarsDefaultConfig.glowIntensity, 0.5, 1.8),
    spaceScale: numberInRange(config.spaceScale, danceAvatarsDefaultConfig.spaceScale, 0.72, 1.28),
    colorSaturation: numberInRange(config.colorSaturation, danceAvatarsDefaultConfig.colorSaturation, 0.4, 1.6),
    sparkleDensity: numberInRange(config.sparkleDensity, danceAvatarsDefaultConfig.sparkleDensity, 0, 1.6),
    warmth: numberInRange(config.warmth, danceAvatarsDefaultConfig.warmth, -1, 1),
    primaryColor: color(config.primaryColor, danceAvatarsDefaultConfig.primaryColor),
    accentColor: color(config.accentColor, danceAvatarsDefaultConfig.accentColor),
    gender: asGender(config.gender),
    style: asStyle(config.style),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : danceAvatarsDefaultConfig.showTitle,
  };
}
