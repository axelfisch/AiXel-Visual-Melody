import type { EngineParameterDefinition } from '../engine.types';
import type { MinimalAlbumArtConfig } from './minimalAlbumArt.types';

export const minimalAlbumArtDefaultConfig: MinimalAlbumArtConfig = {
  rotationSpeed: 0.22,
  energyResponse: 1,
  discColor: '#090a0e',
  accentColor: '#e7c977',
  backgroundHue: 225,
  showTitle: true,
};

export const minimalAlbumArtParameters: EngineParameterDefinition[] = [
  { id: 'rotationSpeed', label: 'Rotation', type: 'number', defaultValue: 0.22, min: 0, max: 1, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1, min: 0, max: 2, step: 0.05 },
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
    discColor: color(config.discColor, minimalAlbumArtDefaultConfig.discColor),
    accentColor: color(config.accentColor, minimalAlbumArtDefaultConfig.accentColor),
    backgroundHue: numberInRange(config.backgroundHue, minimalAlbumArtDefaultConfig.backgroundHue, 0, 360),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : minimalAlbumArtDefaultConfig.showTitle,
  };
}
