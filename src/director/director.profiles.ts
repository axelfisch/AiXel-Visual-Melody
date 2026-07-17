import type { DirectorMood, DirectorState } from './director.types';

export const directorDefaultState: DirectorState = {
  emotion: 72,
  space: 58,
  fluidity: 64,
  light: 80,
  dynamics: 45,
  particles: 66,
  colorEnergy: 52,
  motionComplexity: 38,
};

export const directorMoodProfiles: Record<DirectorMood, DirectorState> = {
  'More Cinematic': {
    emotion: 78, space: 84, fluidity: 54, light: 72,
    dynamics: 62, particles: 48, colorEnergy: 58, motionComplexity: 70,
  },
  'More Emotional': directorDefaultState,
  'More Dreamy': {
    emotion: 72, space: 88, fluidity: 76, light: 64,
    dynamics: 38, particles: 68, colorEnergy: 48, motionComplexity: 44,
  },
  'More Powerful': {
    emotion: 68, space: 52, fluidity: 58, light: 86,
    dynamics: 88, particles: 56, colorEnergy: 78, motionComplexity: 66,
  },
  'More Organic': {
    emotion: 74, space: 62, fluidity: 82, light: 58,
    dynamics: 54, particles: 46, colorEnergy: 42, motionComplexity: 48,
  },
  'More Minimal': {
    emotion: 48, space: 72, fluidity: 36, light: 52,
    dynamics: 34, particles: 22, colorEnergy: 28, motionComplexity: 20,
  },
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 50));

export function validateDirectorState(value: Partial<DirectorState> | null | undefined): DirectorState {
  return Object.fromEntries(
    Object.entries(directorDefaultState).map(([key, fallback]) => [
      key,
      clampPercent(value?.[key as keyof DirectorState] ?? fallback),
    ]),
  ) as DirectorState;
}
