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

/**
 * Transient (onset) strength at `time`: how far the current energy jumps above
 * the recent average, held with a short exponential release so a hit stays
 * visible for a few frames. Pure function of the analysis → Preview ≡ Export.
 */
export function onsetAt(analysis: Pick<ProjectAnalysis, 'energy'>, time: number): number {
  const values = analysis.energy;
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.floor(time * ENERGY_FRAMES_PER_SECOND)));
  const raw = (at: number) => {
    if (at < 1) return 0;
    let sum = 0;
    let count = 0;
    for (let back = Math.max(0, at - 8); back < at; back += 1) {
      sum += values[back];
      count += 1;
    }
    return clamp((values[at] - sum / Math.max(1, count)) * 3.2);
  };
  let onset = 0;
  for (let hold = 0; hold <= 5 && index - hold >= 0; hold += 1) {
    onset = Math.max(onset, raw(index - hold) * 0.72 ** hold);
  }
  return onset;
}

export function energyAt(analysis: Pick<ProjectAnalysis, 'energy'>, time: number): number {
  const index = Math.min(
    analysis.energy.length - 1,
    Math.max(0, Math.floor(time * ENERGY_FRAMES_PER_SECOND)),
  );
  return analysis.energy[index] ?? 0;
}
