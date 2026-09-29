import type { VisualEngine } from '../engine.types';
import { loadPulseImage } from '../image-pulse/imagePulse.images';
import { lyricCanvasDefaultConfig, lyricCanvasParameters, validateLyricCanvasConfig } from './lyricCanvas.config';
import { lyricFont } from './lyricCanvas.layout';
import { renderLyricCanvas } from './lyricCanvas.renderer';
import { LYRIC_CANVAS_PRESETS, type LyricCanvasConfig } from './lyricCanvas.types';

/**
 * Makes sure the web fonts used by the presets are loaded before Export starts
 * (and before Preview redraws), so text measurement and wrapping are identical.
 * Never blocks for more than a moment when offline.
 */
export async function loadLyricFonts(timeoutMs = 2500): Promise<void> {
  const fonts = typeof document !== 'undefined' ? (document as Document & { fonts?: FontFaceSet }).fonts : undefined;
  if (!fonts?.load) return;
  const sample = 'Aa Éé Çç àâêîôûœ ♪';
  const loads = LYRIC_CANVAS_PRESETS.map((preset) => fonts.load(lyricFont(preset, 48), sample).catch(() => []));
  await Promise.race([
    Promise.all(loads).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

export const LyricCanvasEngine: VisualEngine<LyricCanvasConfig> = {
  id: 'lyric-canvas',
  name: 'Lyric Canvas',
  description: 'Cinematic synchronized lyrics — karaoke, kinetic, neon, typewriter and cinematic typography.',
  availability: 'implemented',
  defaultConfig: lyricCanvasDefaultConfig,
  parameters: lyricCanvasParameters,
  validateConfig: validateLyricCanvasConfig,
  render: renderLyricCanvas,
  async prepare(config) {
    await Promise.all([
      loadLyricFonts(),
      config.background === 'image' && config.imageSrc ? loadPulseImage(config.imageSrc) : Promise.resolve(null),
    ]);
  },
};
