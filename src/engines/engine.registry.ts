import type { VisualEngine } from './engine.types';
import { MinimalAlbumArtEngine } from './minimal-album-art/MinimalAlbumArtEngine';

const engines = new Map<string, VisualEngine>([[MinimalAlbumArtEngine.id, MinimalAlbumArtEngine as VisualEngine]]);

export function getEngine(id: string): VisualEngine {
  const engine = engines.get(id);
  if (!engine) throw new Error(`Moteur visuel inconnu: ${id}`);
  return engine;
}

export function listEngines(): VisualEngine[] {
  return [...engines.values()];
}
