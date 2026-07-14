import type { ProjectAnalysis } from '../project/project.types';

export const ENERGY_FRAMES_PER_SECOND = 30;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function buildEnergyTimeline(
  samples: Float32Array,
  sampleRate: number,
  framesPerSecond = ENERGY_FRAMES_PER_SECOND,
): number[] {
  const frameSize = Math.max(1, Math.floor(sampleRate / framesPerSecond));
  const values: number[] = [];
  let maximum = 0;
  for (let start = 0; start < samples.length; start += frameSize) {
    let sum = 0;
    const end = Math.min(samples.length, start + frameSize);
    for (let index = start; index < end; index += 1) sum += samples[index] * samples[index];
    const rms = Math.sqrt(sum / Math.max(1, end - start));
    values.push(rms);
    maximum = Math.max(maximum, rms);
  }
  if (maximum === 0) return values.map(() => 0);
  return values.map((value) => clamp(value / maximum));
}

export function energyAt(analysis: Pick<ProjectAnalysis, 'energy'>, time: number): number {
  const index = Math.min(
    analysis.energy.length - 1,
    Math.max(0, Math.floor(time * ENERGY_FRAMES_PER_SECOND)),
  );
  return analysis.energy[index] ?? 0;
}
