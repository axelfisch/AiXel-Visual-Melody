export type ImagePulseStyle = 'pulse' | 'glow' | 'ripple' | 'glitch' | 'kaleido';

/** How the uploaded image sits in the frame. */
export type ImagePulseFraming = 'fill' | 'card';

export type ImagePulseConfig = {
  /** Fluidity: drift, ripple propagation, particle and kaleidoscope speed + beat-decay softness. */
  pulseSpeed: number;
  /** Dynamics: how hard energy, beats and transients push zoom, kick, flashes and glitches. */
  energyResponse: number;
  /** Motion Complexity: ripple rings, glitch slices, kaleidoscope mirrors, light leaks, camera path harmonics. */
  effectComplexity: number;
  /** Light: bloom, transient flashes, light leaks. */
  glowIntensity: number;
  /** Space: framing distance (tight crop ↔ wide), vignette radius, particle spread. */
  spaceScale: number;
  /** Color Energy: image saturation + strength of the Creator primary/accent tint. */
  colorSaturation: number;
  /** Particles: floating light motes and beat bursts around the image. */
  sparkleDensity: number;
  /** Emotion: warm ↔ cool grade. */
  warmth: number;
  primaryColor: string;
  accentColor: string;
  style: ImagePulseStyle;
  framing: ImagePulseFraming;
  /** Object URL (or data URL) of the uploaded image; '' renders the procedural placeholder. */
  imageSrc: string;
  showTitle: boolean;
};

export const IMAGE_PULSE_STYLES: ImagePulseStyle[] = ['pulse', 'glow', 'ripple', 'glitch', 'kaleido'];
export const IMAGE_PULSE_FRAMINGS: ImagePulseFraming[] = ['fill', 'card'];

/** Accepted upload formats. */
export const IMAGE_PULSE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const IMAGE_PULSE_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
export const IMAGE_PULSE_MAX_FILE_SIZE = 25 * 1024 * 1024;
