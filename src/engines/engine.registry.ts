import type { VisualEngine } from './engine.types';
import { CosmicWavesEngine } from './cosmic-waves/CosmicWavesEngine';
import { FrequencyCityEngine } from './frequency-city/FrequencyCityEngine';
import { JazzGeometryEngine } from './jazz-geometry/JazzGeometryEngine';
import { LiquidColorsEngine } from './liquid-colors/LiquidColorsEngine';
import { MinimalAlbumArtEngine } from './minimal-album-art/MinimalAlbumArtEngine';
import { NeonVelvetEngine } from './neon-velvet/NeonVelvetEngine';

const engines = new Map<string, VisualEngine>([
  [MinimalAlbumArtEngine.id, MinimalAlbumArtEngine as VisualEngine],
  [CosmicWavesEngine.id, CosmicWavesEngine as VisualEngine],
  [FrequencyCityEngine.id, FrequencyCityEngine as VisualEngine],
  [JazzGeometryEngine.id, JazzGeometryEngine as VisualEngine],
  [LiquidColorsEngine.id, LiquidColorsEngine as VisualEngine],
  [NeonVelvetEngine.id, NeonVelvetEngine as VisualEngine],
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
