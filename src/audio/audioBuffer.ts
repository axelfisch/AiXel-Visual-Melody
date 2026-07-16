export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) throw new Error("L’analyse audio n’est pas disponible dans ce navigateur.");

  const context = new AudioContextConstructor();
  try {
    return await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("Le fichier audio n’a pas pu être décodé.");
  } finally {
    await context.close();
  }
}

export function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels < 1) throw new Error('Le fichier audio ne contient aucun canal.');
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) mono[index] += data[index] / buffer.numberOfChannels;
  }
  return mono;
}
