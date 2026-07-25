import { getEngine } from '../engines/engine.registry';
import type { EngineParameterDefinition } from '../engines/engine.types';
import type { EngineParameterValue } from '../project/project.types';
import { validateDirectorState } from './director.profiles';
import type { DirectorDimension, DirectorEngineMapping, DirectorState } from './director.types';

type Adapter = {
  /** Numeric parameter driven by the Fluidity fader (playback/animation speed). */
  speedParameter: string;
  /** Numeric parameter driven by the Motion Complexity fader (rings/buildings/trails/grooves/density). */
  structureParameter: string;
};

const adapters: Record<string, Adapter> = {
  'minimal-album-art': { speedParameter: 'rotationSpeed', structureParameter: 'grooveDetail' },
  'cosmic-waves': { speedParameter: 'waveSpeed', structureParameter: 'particleDensity' },
  'jazz-geometry': { speedParameter: 'rotationSpeed', structureParameter: 'ringCount' },
  'liquid-colors': { speedParameter: 'flowSpeed', structureParameter: 'inkDensity' },
  'frequency-city': { speedParameter: 'pulseSpeed', structureParameter: 'buildingCount' },
  'neon-velvet': { speedParameter: 'trailSpeed', structureParameter: 'trailCount' },
  'particle-orb': { speedParameter: 'orbitSpeed', structureParameter: 'particleCount' },
};

/**
 * All eight AiXel Director dimensions map onto a parameter every engine
 * exposes, so every fader is functional for every engine:
 *   fluidity           -> adapter.speedParameter
 *   dynamics           -> energyResponse
 *   motionComplexity   -> adapter.structureParameter
 *   light              -> glowIntensity
 *   space              -> spaceScale
 *   colorEnergy        -> colorSaturation
 *   particles          -> sparkleDensity
 *   emotion            -> warmth
 */
const ALL_DIMENSIONS: DirectorDimension[] = [
  'emotion',
  'space',
  'fluidity',
  'light',
  'dynamics',
  'particles',
  'colorEnergy',
  'motionComplexity',
];

function definitionFor(definitions: EngineParameterDefinition[], id: string) {
  const definition = definitions.find((item) => item.id === id && item.type === 'number');
  if (!definition || definition.min === undefined || definition.max === undefined || typeof definition.defaultValue !== 'number') {
    throw new Error(`Paramètre numérique Director introuvable: ${id}`);
  }
  return definition;
}

function interpolateAroundDefault(definition: EngineParameterDefinition, percent: number) {
  const min = definition.min as number;
  const max = definition.max as number;
  const fallback = definition.defaultValue as number;
  const normalized = Math.min(100, Math.max(0, percent));
  const raw = normalized <= 50
    ? min + (fallback - min) * (normalized / 50)
    : fallback + (max - fallback) * ((normalized - 50) / 50);
  const step = definition.step ?? 0;
  return step > 0 ? Math.round(raw / step) * step : raw;
}

export function mapDirectorToEngine(
  engineId: string,
  directorValue: Partial<DirectorState>,
  baseParameters?: Record<string, EngineParameterValue>,
): DirectorEngineMapping {
  const engine = getEngine(engineId);
  const adapter = adapters[engineId];
  if (!adapter) throw new Error(`Adaptateur AiXel Director introuvable: ${engineId}`);

  const state = validateDirectorState(directorValue);
  const parameters: Record<string, EngineParameterValue> = {
    ...(engine.defaultConfig as Record<string, EngineParameterValue>),
    ...baseParameters,
  };

  parameters[adapter.speedParameter] = interpolateAroundDefault(
    definitionFor(engine.parameters, adapter.speedParameter),
    state.fluidity,
  );
  parameters.energyResponse = interpolateAroundDefault(
    definitionFor(engine.parameters, 'energyResponse'),
    state.dynamics,
  );
  parameters[adapter.structureParameter] = interpolateAroundDefault(
    definitionFor(engine.parameters, adapter.structureParameter),
    state.motionComplexity,
  );
  parameters.glowIntensity = interpolateAroundDefault(
    definitionFor(engine.parameters, 'glowIntensity'),
    state.light,
  );
  parameters.spaceScale = interpolateAroundDefault(
    definitionFor(engine.parameters, 'spaceScale'),
    state.space,
  );
  parameters.colorSaturation = interpolateAroundDefault(
    definitionFor(engine.parameters, 'colorSaturation'),
    state.colorEnergy,
  );
  parameters.sparkleDensity = interpolateAroundDefault(
    definitionFor(engine.parameters, 'sparkleDensity'),
    state.particles,
  );
  parameters.warmth = interpolateAroundDefault(
    definitionFor(engine.parameters, 'warmth'),
    state.emotion,
  );

  return {
    supportedDimensions: [...ALL_DIMENSIONS],
    parameters: engine.validateConfig(parameters) as Record<string, EngineParameterValue>,
  };
}

export function directorCapabilities(engineId: string): DirectorDimension[] {
  if (!adapters[engineId]) throw new Error(`Adaptateur AiXel Director introuvable: ${engineId}`);
  return [...ALL_DIMENSIONS];
}
