export function estimateBpm(samples: Float32Array, sampleRate: number): number {
  // Estimation MVP par enveloppe énergétique. Elle guide le mouvement visuel mais
  // ne prétend pas remplacer une détection musicale professionnelle.
  const windowDuration = 0.05;
  const windowSize = Math.max(1, Math.floor(sampleRate * windowDuration));
  const envelope: number[] = [];
  for (let start = 0; start < samples.length; start += windowSize) {
    let sum = 0;
    const end = Math.min(samples.length, start + windowSize);
    for (let index = start; index < end; index += 1) sum += samples[index] * samples[index];
    envelope.push(Math.sqrt(sum / Math.max(1, end - start)));
  }
  const mean = envelope.reduce((sum, value) => sum + value, 0) / Math.max(1, envelope.length);
  const peaks = envelope
    .map((value, index) => ({ value, index }))
    .filter(({ value, index }) => value > mean * 1.35 && value >= (envelope[index - 1] ?? 0) && value > (envelope[index + 1] ?? 0));

  let bestBpm = 120;
  let bestScore = -Infinity;
  for (let bpm = 60; bpm <= 180; bpm += 1) {
    const interval = (60 / bpm) / windowDuration;
    let score = 0;
    for (let first = 0; first < peaks.length; first += 1) {
      for (let second = first + 1; second < Math.min(peaks.length, first + 9); second += 1) {
        const distance = peaks[second].index - peaks[first].index;
        const nearestBeat = Math.max(1, Math.round(distance / interval));
        const error = Math.abs(distance - nearestBeat * interval);
        if (error < 1.5) score += peaks[first].value * peaks[second].value * (1 - error / 1.5);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }
  return bestBpm;
}
