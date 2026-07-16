const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function buildWaveform(samples: Float32Array, bins = 96): number[] {
  if (bins < 1) return [];
  return Array.from({ length: bins }, (_, index) => {
    const start = Math.floor((index * samples.length) / bins);
    const end = Math.max(start + 1, Math.floor(((index + 1) * samples.length) / bins));
    let peak = 0;
    for (let sample = start; sample < Math.min(samples.length, end); sample += 1) {
      peak = Math.max(peak, Math.abs(samples[sample]));
    }
    return 12 + clamp(peak) * 88;
  });
}
