import type { LyricCanvasPreset } from './lyricCanvas.types';

// Typography layout: safe margins, automatic wrapping and font sizing for 16:9 and 9:16.
// Layout only depends on the text, canvas size, preset and Space fader, and on the
// measured glyph widths of the (already loaded) fonts, so Preview ≡ Export.

const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol"';
export const LYRIC_FONT_SANS = `Manrope, Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", ${EMOJI}, sans-serif`;
export const LYRIC_FONT_SERIF = `"Cormorant Garamond", Georgia, "Times New Roman", "Noto Serif", ${EMOJI}, serif`;
export const LYRIC_FONT_MONO = `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", "DejaVu Sans Mono", ${EMOJI}, monospace`;

export type PresetTypography = {
  family: string;
  weight: number;
  italic: boolean;
  /** Relative to the base type size for the canvas. */
  sizeFactor: number;
  upper: boolean;
  lineHeight: number;
  align: 'center' | 'left';
  maxRows: { landscape: number; portrait: number };
};

export const PRESET_TYPOGRAPHY: Record<LyricCanvasPreset, PresetTypography> = {
  karaoke: { family: LYRIC_FONT_SANS, weight: 800, italic: false, sizeFactor: 1, upper: false, lineHeight: 1.2, align: 'center', maxRows: { landscape: 3, portrait: 5 } },
  kinetic: { family: LYRIC_FONT_SANS, weight: 800, italic: false, sizeFactor: 1.16, upper: true, lineHeight: 1.12, align: 'center', maxRows: { landscape: 3, portrait: 5 } },
  neon: { family: LYRIC_FONT_SANS, weight: 600, italic: false, sizeFactor: 1.04, upper: false, lineHeight: 1.26, align: 'center', maxRows: { landscape: 3, portrait: 5 } },
  typewriter: { family: LYRIC_FONT_MONO, weight: 500, italic: false, sizeFactor: 0.8, upper: false, lineHeight: 1.42, align: 'left', maxRows: { landscape: 3, portrait: 6 } },
  cinematic: { family: LYRIC_FONT_SERIF, weight: 600, italic: false, sizeFactor: 1.14, upper: false, lineHeight: 1.12, align: 'center', maxRows: { landscape: 3, portrait: 5 } },
};

export type SafeArea = { x: number; y: number; w: number; h: number };

/** Title-safe area: 10% margins in 16:9, wider vertical margins in 9:16 (UI overlays of social apps). */
export function lyricSafeArea(width: number, height: number): SafeArea {
  const portrait = height > width;
  const mx = width * (portrait ? 0.08 : 0.1);
  const my = height * (portrait ? 0.14 : 0.1);
  return { x: mx, y: my, w: width - mx * 2, h: height - my * 2 };
}

export function lyricFont(preset: LyricCanvasPreset, size: number): string {
  const type = PRESET_TYPOGRAPHY[preset];
  return `${type.italic ? 'italic ' : ''}${type.weight} ${Math.max(1, Math.round(size * 10) / 10)}px ${type.family}`;
}

/** Base type size before wrapping, scaled by the Space fader. */
export function baseLyricSize(width: number, height: number, preset: LyricCanvasPreset, spaceScale: number): number {
  const portrait = height > width;
  const unit = portrait ? width * 0.1 : height * 0.1;
  return unit * spaceScale * PRESET_TYPOGRAPHY[preset].sizeFactor;
}

export type LayoutWord = { text: string; index: number; x: number; width: number };
export type LayoutRow = { words: LayoutWord[]; width: number; y: number };
export type LyricLayout = {
  font: string;
  fontSize: number;
  lineHeight: number;
  rows: LayoutRow[];
  width: number;
  height: number;
  maxWidth: number;
  spaceWidth: number;
  align: 'center' | 'left';
};

export function displayText(text: string, preset: LyricCanvasPreset): string {
  return PRESET_TYPOGRAPHY[preset].upper ? text.toLocaleUpperCase('fr-FR') : text;
}

type Piece = { text: string; index: number; width: number };

function measure(ctx: CanvasRenderingContext2D, text: string): number {
  const width = ctx.measureText(text).width;
  return Number.isFinite(width) ? width : 0;
}

/** Splits a word that cannot fit on one row into grapheme-safe chunks (emoji / accents stay intact). */
function breakWord(ctx: CanvasRenderingContext2D, word: string, index: number, maxWidth: number): Piece[] {
  const pieces: Piece[] = [];
  let current = '';
  for (const char of Array.from(word)) {
    const candidate = current + char;
    if (current && measure(ctx, candidate) > maxWidth) {
      pieces.push({ text: current, index, width: measure(ctx, current) });
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push({ text: current, index, width: measure(ctx, current) });
  return pieces;
}

function wrap(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number, allowBreak: boolean) {
  const spaceWidth = measure(ctx, ' ');
  const pieces: Piece[] = [];
  words.forEach((word, index) => {
    const width = measure(ctx, word);
    if (width > maxWidth && allowBreak) pieces.push(...breakWord(ctx, word, index, maxWidth));
    else pieces.push({ text: word, index, width });
  });
  const rows: Array<{ words: LayoutWord[]; width: number }> = [];
  let row: LayoutWord[] = [];
  let x = 0;
  for (const piece of pieces) {
    const next = row.length ? x + spaceWidth + piece.width : piece.width;
    if (row.length && next > maxWidth) {
      rows.push({ words: row, width: x });
      row = [];
      x = 0;
    }
    const at = row.length ? x + spaceWidth : 0;
    row.push({ text: piece.text, index: piece.index, x: at, width: piece.width });
    x = at + piece.width;
  }
  if (row.length) rows.push({ words: row, width: x });
  return { rows, spaceWidth };
}

/**
 * Wraps `text` inside the safe area, shrinking the type until it fits the preset's
 * row budget. Words wider than a full row are only broken as a last resort.
 */
export function layoutLyricLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  preset: LyricCanvasPreset,
  spaceScale: number,
  scale = 1,
): LyricLayout {
  const type = PRESET_TYPOGRAPHY[preset];
  const portrait = height > width;
  const area = lyricSafeArea(width, height);
  const maxWidth = area.w;
  const maxRows = portrait ? type.maxRows.portrait : type.maxRows.landscape;
  const words = displayText(text, preset).split(/\s+/).filter(Boolean);
  const base = baseLyricSize(width, height, preset, spaceScale) * scale;
  const minSize = base * 0.42;
  let size = base;
  let result = { rows: [] as Array<{ words: LayoutWord[]; width: number }>, spaceWidth: 0 };
  for (let attempt = 0; attempt < 16; attempt += 1) {
    ctx.font = lyricFont(preset, size);
    const last = size * 0.9 < minSize;
    result = wrap(ctx, words, maxWidth, last);
    const fits = result.rows.length <= maxRows
      && result.rows.every((row) => row.width <= maxWidth + 0.5)
      && result.rows.length * size * type.lineHeight <= area.h;
    if (fits || last) break;
    size *= 0.9;
  }
  // Balance multi-row lines (no lonely last word): narrowest width that keeps the row count.
  if (result.rows.length > 1) {
    const count = result.rows.length;
    const total = result.rows.reduce((sum, row) => sum + row.width, 0);
    let lo = total / count;
    let hi = maxWidth;
    for (let step = 0; step < 12; step += 1) {
      const mid = (lo + hi) / 2;
      if (wrap(ctx, words, mid, false).rows.length <= count) hi = mid;
      else lo = mid;
    }
    const balanced = wrap(ctx, words, hi, false);
    if (balanced.rows.length === count && balanced.rows.every((row) => row.width <= maxWidth + 0.5)) result = balanced;
  }
  const lineHeight = size * type.lineHeight;
  const rows: LayoutRow[] = result.rows.map((row, index) => ({
    ...row,
    y: (index - (result.rows.length - 1) / 2) * lineHeight,
  }));
  return {
    font: lyricFont(preset, size),
    fontSize: size,
    lineHeight,
    rows,
    width: rows.reduce((max, row) => Math.max(max, row.width), 0),
    height: rows.length * lineHeight,
    maxWidth,
    spaceWidth: result.spaceWidth,
    align: type.align,
  };
}
