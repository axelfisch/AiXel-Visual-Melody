import { energyAt, onsetAt } from '../audio';
import type { ProjectAnalysis } from '../project/project.types';
import type { EngineFrame } from './engine.types';

/** Tempo used to animate live previews before any track has been analysed. */
export const SYNTHETIC_BPM = 118;
/** Loop length (seconds) of the synthetic clock when no audio is loaded. */
export const SYNTHETIC_DURATION = 32;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Deterministic stand-in for a real track: a four-on-the-floor kick at `bpm`
 * (accented downbeat), riding on a slow 16 s swell, so every engine gets a
 * believable energy/onset signal on the Create screen without audio.
 */
export function syntheticBeat(time: number, bpm = SYNTHETIC_BPM): { energy: number; onset: number } {
  const beats = Math.max(0, time) * (bpm / 60);
  const phase = beats - Math.floor(beats);
  const accent = Math.floor(beats) % 4 === 0 ? 1 : 0.78;
  const kick = Math.exp(-phase * 7) * accent;
  const swell = 0.5 + 0.5 * Math.sin((time / 16) * Math.PI * 2 - Math.PI / 2);
  return {
    energy: clamp01(0.36 + 0.2 * swell + 0.34 * kick),
    onset: clamp01(phase < 0.4 ? kick * 1.1 : 0),
  };
}

/**
 * Builds the frame an engine renders at `elapsed` seconds of live preview.
 * With an analysed track the preview loops over the real energy timeline
 * (same `energyAt`/`onsetAt` as Preview and Export); otherwise it uses the
 * synthetic 118 BPM clock above.
 */
export function liveFrameAt({
  elapsed,
  analysis,
  duration,
  syntheticDuration = SYNTHETIC_DURATION,
  title,
}: {
  elapsed: number;
  analysis?: ProjectAnalysis | null;
  duration?: number | null;
  syntheticDuration?: number;
  title?: string;
}): EngineFrame {
  if (analysis && analysis.energy.length > 0 && duration && duration > 0) {
    const time = elapsed % duration;
    return {
      time,
      duration,
      progress: time / duration,
      energy: energyAt(analysis, time),
      onset: onsetAt(analysis, time),
      bpm: analysis.bpm || SYNTHETIC_BPM,
      title,
    };
  }
  const loop = syntheticDuration > 1 ? syntheticDuration : SYNTHETIC_DURATION;
  const time = elapsed % loop;
  const { energy, onset } = syntheticBeat(time);
  return { time, duration: loop, progress: time / loop, energy, onset, bpm: SYNTHETIC_BPM, title };
}
