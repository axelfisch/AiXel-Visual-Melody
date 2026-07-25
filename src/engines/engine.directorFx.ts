// Shared rendering helpers that let every engine respond to the full set of
// AiXel Director dimensions (light, colorEnergy, space, particles, emotion)
// in addition to the speed/energy/structure parameters each engine already had.

function hexToHsl(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff';
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h: number;
  switch (max) {
    case r: h = ((g - b) / delta + (g < b ? 6 : 0)); break;
    case g: h = (b - r) / delta + 2; break;
    default: h = (r - g) / delta + 4;
  }
  return [h * 60, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const saturation = Math.min(100, Math.max(0, s)) / 100;
  const lightness = Math.min(100, Math.max(0, l)) / 100;
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Scales a hex accent color's saturation by `factor` (Director's Color Energy fader). */
export function adjustSaturation(hex: string, factor: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s * factor, l);
}

/**
 * Draws a light ambient sparkle field so the Particles fader always has a
 * visible effect, even on engines whose native structure parameter is
 * driven by Motion Complexity instead.
 */
export function drawAmbientSparkles(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  density: number,
  color: string,
) {
  if (density <= 0.01) return;
  const count = Math.round(50 * density);
  for (let index = 0; index < count; index += 1) {
    const seedX = (index * 97 + 13) % 997;
    const seedY = (index * 181 + 29) % 991;
    const x = (seedX / 997) * width;
    const y = (seedY / 991) * height;
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * (0.6 + (index % 6) * 0.11) + index * 2.1));
    context.globalAlpha = Math.min(1, 0.1 * density + twinkle * 0.2 * density);
    context.fillStyle = index % 3 === 0 ? color : '#ffffff';
    context.beginPath();
    context.arc(x, y, 0.6 + (index % 4) * 0.35, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

/**
 * Blends a warm or cool tint across the frame (Director's Emotion fader).
 * Uses a soft-light blend at a low alpha so it never washes out the artwork.
 */
export function applyWarmthOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  warmth: number,
) {
  if (Math.abs(warmth) < 0.02) return;
  context.save();
  context.globalCompositeOperation = 'soft-light';
  context.globalAlpha = Math.min(0.36, Math.abs(warmth) * 0.32);
  context.fillStyle = warmth > 0 ? '#ff9d5c' : '#5c8cff';
  context.fillRect(0, 0, width, height);
  context.restore();
  context.globalAlpha = 1;
}
