import { decodeAudioFile, mixToMono } from './audioBuffer';
import type { AnalyzeAudioResult } from './audio.types';
import { buildEnergyTimeline } from './energy';
import { estimateBpm } from './tempo';
import { buildWaveform } from './waveform';

export const MAX_AUDIO_FILE_SIZE = 150 * 1024 * 1024;
export const MAX_AUDIO_DURATION = 15 * 60;

function validateFile(file: File) {
  if (file.size === 0) throw new Error('Le fichier audio est vide.');
  if (file.size > MAX_AUDIO_FILE_SIZE) throw new Error('Le fichier dépasse la limite de 150 Mo.');
  const audioExtension = /\.(aac|flac|m4a|mp3|ogg|wav)$/i.test(file.name);
  if (file.type && !file.type.startsWith('audio/') && !audioExtension) {
    throw new Error('Veuillez choisir un fichier audio compatible.');
  }
}

export async function analyzeAudioFile(file: File): Promise<AnalyzeAudioResult> {
  validateFile(file);
  const decodedAudio = await decodeAudioFile(file);
  if (!Number.isFinite(decodedAudio.duration) || decodedAudio.duration <= 0) throw new Error('La durée audio est invalide.');
  if (decodedAudio.duration > MAX_AUDIO_DURATION) throw new Error('La durée maximale prise en charge est de 15 minutes.');
  if (decodedAudio.length < 1 || decodedAudio.numberOfChannels < 1) throw new Error('Le signal audio est vide.');

  const mono = mixToMono(decodedAudio);
  const waveform = buildWaveform(mono);
  const energy = buildEnergyTimeline(mono, decodedAudio.sampleRate);
  let peak = 0;
  for (const sample of mono) peak = Math.max(peak, Math.abs(sample));

  return {
    name: file.name.replace(/\.[^.]+$/, ''),
    duration: decodedAudio.duration,
    decodedAudio,
    analysis: {
      sampleRate: decodedAudio.sampleRate,
      bpm: estimateBpm(mono, decodedAudio.sampleRate),
      peak,
      averageEnergy: energy.reduce((sum, value) => sum + value, 0) / Math.max(1, energy.length),
      waveform,
      energy,
    },
  };
}
