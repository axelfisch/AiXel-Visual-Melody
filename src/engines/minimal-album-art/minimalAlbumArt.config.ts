import type { EngineParameterDefinition } from '../engine.types';
import type { MinimalAlbumArtConfig } from './minimalAlbumArt.types';

export const minimalAlbumArtDefaultConfig: MinimalAlbumArtConfig = {
  rotationSpeed: 0.22,
  energyResponse: 1,
  grooveDetail: 20,
  glowIntensity: 1,
  spaceScale: 1,
  colorSaturation: 1,
  sparkleDensity: 0.6,
  warmth: 0,
  discColor: '#090a0e',
  accentColor: '#e7c977',
  backgroundHue: 225,
  showTitle: true,
};

export const minimalAlbumArtParameters: EngineParameterDefinition[] = [
  { id: 'rotationSpeed', label: 'Rotation', type: 'number', defaultValue: 0.22, min: 0, max: 1, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1, min: 0, max: 2, step: 0.05 },
  { id: 'grooveDetail', label: 'Groove detail', type: 'number', defaultValue: 20, min: 8, max: 40, step: 1 },
  { id: 'glowIntensity', label: 'Glow', type: 'number', defaultValue: 1, min: 0.5, max: 1.8, step: 0.05 },
  { id: 'spaceScale', label: 'Spatial scale', type: 'number', defaultValue: 1, min: 0.8, max: 1.3, step: 0.02 },
  { id: 'colorSaturation', label: 'Color saturation', type: 'number', defaultValue: 1, min: 0.4, max: 1.6, step: 0.05 },
  { id: 'sparkleDensity', label: 'Ambient sparkle', type: 'number', defaultValue: 0.6, min: 0, max: 1.6, step: 0.05 },
  { id: 'warmth', label: 'Warmth', type: 'number', defaultValue: 0, min: -1, max: 1, step: 0.05 },
  { id: 'accentColor', label: 'Gold accent', type: 'color', defaultValue: '#e7c977' },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function validateMinimalAlbumArtConfig(value: unknown): MinimalAlbumArtConfig {
  const config = value && typeof value === 'object' ? value as Partial<MinimalAlbumArtConfig> : {};
  return {
    rotationSpeed: numberInRange(config.rotationSpeed, minimalAlbumArtDefaultConfig.rotationSpeed, 0, 1),
    energyResponse: numberInRange(config.energyResponse, minimalAlbumArtDefaultConfig.energyResponse, 0, 2),
    grooveDetail: Math.round(numberInRange(config.grooveDetail, minimalAlbumArtDefaultConfig.grooveDetail, 8, 40)),
    glowIntensity: numberInRange(config.glowIntensity, minimalAlbumArtDefaultConfig.glowIntensity, 0.5, 1.8),
    spaceScale: numberInRange(config.spaceScale, minimalAlbumArtDefaultConfig.spaceScale, 0.8, 1.3),
    colorSaturation: numberInRange(config.colorSaturation, minimalAlbumArtDefaultConfig.colorSaturation, 0.4, 1.6),
    sparkleDensity: numberInRange(config.sparkleDensity, minimalAlbumArtDefaultConfig.sparkleDensity, 0, 1.6),
    warmth: numberInRange(config.warmth, minimalAlbumArtDefaultConfig.warmth, -1, 1),
    discColor: color(config.discColor, minimalAlbumArtDefaultConfig.discColor),
    accentColor: color(config.accentColor, minimalAlbumArtDefaultConfig.accentColor),
    backgroundHue: numberInRange(config.backgroundHue, minimalAlbumArtDefaultConfig.backgroundHue, 0, 360),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : minimalAlbumArtDefaultConfig.showTitle,
  };
}
