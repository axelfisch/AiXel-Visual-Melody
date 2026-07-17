import type { VisualEngine } from './engine.types';
import { CosmicWavesEngine } from './cosmic-waves/CosmicWavesEngine';
import { JazzGeometryEngine } from './jazz-geometry/JazzGeometryEngine';
import { MinimalAlbumArtEngine } from './minimal-album-art/MinimalAlbumArtEngine';

const engines = new Map<string, VisualEngine>([
  [MinimalAlbumArtEngine.id, MinimalAlbumArtEngine as VisualEngine],
  [CosmicWavesEngine.id, CosmicWavesEngine as VisualEngine],
  [JazzGeometryEngine.id, JazzGeometryEngine as VisualEngine],
]);

export function getEngine(id: string): VisualEngine {
  const engine = engines.get(id);
  if (!engine) throw new Error(`Moteur visuel inconnu: ${id}`);
  return engine;
}

export function listEngines(): VisualEngine[] {
  return [...engines.values()];
}

export function getEngineOrDefault(id: string): VisualEngine {
  return engines.get(id) ?? MinimalAlbumArtEngine as VisualEngine;
}
