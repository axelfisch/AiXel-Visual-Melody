import type { EngineParameterDefinition } from '../engine.types';
import {
  LYRIC_CANVAS_BACKGROUNDS,
  LYRIC_CANVAS_PRESETS,
  LYRICS_MAX_LENGTH,
  LYRICS_OFFSET_LIMIT,
  type LyricCanvasBackground,
  type LyricCanvasConfig,
  type LyricCanvasPreset,
} from './lyricCanvas.types';

export const lyricCanvasDefaultConfig: LyricCanvasConfig = {
  motionSpeed: 1,
  energyResponse: 1,
  textMotion: 0.6,
  glowIntensity: 1,
  spaceScale: 1,
  colorSaturation: 1,
  sparkleDensity: 0.5,
  warmth: 0,
  primaryColor: '#9eeaff',
  accentColor: '#8a6bff',
  preset: 'karaoke',
  background: 'aurora',
  lyrics: '',
  lyricsOffset: 0,
  imageSrc: '',
  showTitle: true,
};

export const lyricCanvasParameters: EngineParameterDefinition[] = [
  { id: 'motionSpeed', label: 'Motion speed', type: 'number', defaultValue: 1, min: 0.3, max: 1.8, step: 0.02 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1, min: 0, max: 2, step: 0.05 },
  { id: 'textMotion', label: 'Text motion', type: 'number', defaultValue: 0.6, min: 0.2, max: 1, step: 0.05 },
  { id: 'glowIntensity', label: 'Glow', type: 'number', defaultValue: 1, min: 0.3, max: 1.8, step: 0.05 },
  { id: 'spaceScale', label: 'Type scale', type: 'number', defaultValue: 1, min: 0.78, max: 1.22, step: 0.02 },
  { id: 'colorSaturation', label: 'Color saturation', type: 'number', defaultValue: 1, min: 0.4, max: 1.6, step: 0.05 },
  { id: 'sparkleDensity', label: 'Particles', type: 'number', defaultValue: 0.5, min: 0, max: 1.6, step: 0.05 },
  { id: 'warmth', label: 'Warmth', type: 'number', defaultValue: 0, min: -1, max: 1, step: 0.05 },
  { id: 'primaryColor', label: 'Primary color', type: 'color', defaultValue: '#9eeaff' },
  { id: 'accentColor', label: 'Accent color', type: 'color', defaultValue: '#8a6bff' },
  { id: 'preset', label: 'Typography preset', type: 'select', defaultValue: 'karaoke', options: [...LYRIC_CANVAS_PRESETS] },
  { id: 'background', label: 'Background', type: 'select', defaultValue: 'aurora', options: [...LYRIC_CANVAS_BACKGROUNDS] },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

function asPreset(value: unknown): LyricCanvasPreset {
  return LYRIC_CANVAS_PRESETS.includes(value as LyricCanvasPreset) ? (value as LyricCanvasPreset) : lyricCanvasDefaultConfig.preset;
}

function asBackground(value: unknown): LyricCanvasBackground {
  return LYRIC_CANVAS_BACKGROUNDS.includes(value as LyricCanvasBackground)
    ? (value as LyricCanvasBackground)
    : lyricCanvasDefaultConfig.background;
}

/** Only in-memory object URLs and inline raster data URLs are accepted as background images. */
export function isLyricImageSource(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('blob:') || /^data:image\/(png|jpeg|webp);/i.test(value));
}

/** Normalizes pasted lyrics: string only, unified newlines, bounded length. */
export function normalizeLyrics(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').slice(0, LYRICS_MAX_LENGTH);
}

export function validateLyricCanvasConfig(value: unknown): LyricCanvasConfig {
  const config = value && typeof value === 'object' ? value as Partial<LyricCanvasConfig> : {};
  const d = lyricCanvasDefaultConfig;
  return {
    motionSpeed: numberInRange(config.motionSpeed, d.motionSpeed, 0.3, 1.8),
    energyResponse: numberInRange(config.energyResponse, d.energyResponse, 0, 2),
    textMotion: numberInRange(config.textMotion, d.textMotion, 0.2, 1),
    glowIntensity: numberInRange(config.glowIntensity, d.glowIntensity, 0.3, 1.8),
    spaceScale: numberInRange(config.spaceScale, d.spaceScale, 0.78, 1.22),
    colorSaturation: numberInRange(config.colorSaturation, d.colorSaturation, 0.4, 1.6),
    sparkleDensity: numberInRange(config.sparkleDensity, d.sparkleDensity, 0, 1.6),
    warmth: numberInRange(config.warmth, d.warmth, -1, 1),
    primaryColor: color(config.primaryColor, d.primaryColor),
    accentColor: color(config.accentColor, d.accentColor),
    preset: asPreset(config.preset),
    background: asBackground(config.background),
    lyrics: normalizeLyrics(config.lyrics),
    lyricsOffset: numberInRange(config.lyricsOffset, d.lyricsOffset, -LYRICS_OFFSET_LIMIT, LYRICS_OFFSET_LIMIT),
    imageSrc: isLyricImageSource(config.imageSrc) ? config.imageSrc : '',
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : d.showTitle,
  };
}
