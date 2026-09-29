/** Kinetic typography looks, all driven by the same Director faders and Creator colors. */
export type LyricCanvasPreset = 'karaoke' | 'kinetic' | 'neon' | 'typewriter' | 'cinematic';

/** What sits behind the words. `image` reuses the project image and falls back to `aurora` without one. */
export type LyricCanvasBackground = 'aurora' | 'particles' | 'image';

export type LyricCanvasConfig = {
  /** Fluidity: background drift, particle flow and how soft / long line transitions are. */
  motionSpeed: number;
  /** Dynamics: how hard beats, energy and transients push text scale, lift and flashes. */
  energyResponse: number;
  /** Motion Complexity: per-word motion (bounce, tilt, jitter) and number of background light layers. */
  textMotion: number;
  /** Light: text glow / bloom, background light orbs, highlight sheen. */
  glowIntensity: number;
  /** Space: type size, line spacing and vignette radius. */
  spaceScale: number;
  /** Color Energy: saturation of the Creator primary / accent colors across text and background. */
  colorSaturation: number;
  /** Particles: floating dust / bokeh and beat bursts. */
  sparkleDensity: number;
  /** Emotion: warm ↔ cool grade. */
  warmth: number;
  primaryColor: string;
  accentColor: string;
  preset: LyricCanvasPreset;
  background: LyricCanvasBackground;
  /** Raw lyrics text: plain lines (blank line = section break) or LRC `[mm:ss.xx]` timestamps. */
  lyrics: string;
  /** Global timing nudge in seconds (positive = lyrics appear later). */
  lyricsOffset: number;
  /** Object URL of the project image, used by the `image` background. */
  imageSrc: string;
  showTitle: boolean;
};

export const LYRIC_CANVAS_PRESETS: LyricCanvasPreset[] = ['karaoke', 'kinetic', 'neon', 'typewriter', 'cinematic'];
export const LYRIC_CANVAS_BACKGROUNDS: LyricCanvasBackground[] = ['aurora', 'particles', 'image'];

export const LYRICS_MAX_LENGTH = 20_000;
export const LYRICS_OFFSET_LIMIT = 30;
