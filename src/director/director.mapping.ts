import { getEngine } from '../engines/engine.registry';
import type { EngineParameterDefinition } from '../engines/engine.types';
import type { EngineParameterValue } from '../project/project.types';
import { validateDirectorState } from './director.profiles';
import type { DirectorDimension, DirectorEngineMapping, DirectorState } from './director.types';

type Adapter = {
  speedParameter: string;
  structureParameter?: string;
  structureDimensions?: Array<{ dimension: DirectorDimension; weight: number }>;
};

const adapters: Record<string, Adapter> = {
  'minimal-album-art': { speedParameter: 'rotationSpeed' },
  'cosmic-waves': {
    speedParameter: 'waveSpeed',
    structureParameter: 'particleDensity',
    structureDimensions: [
      { dimension: 'particles', weight: 0.72 },
      { dimension: 'motionComplexity', weight: 0.28 },
    ],
  },
  'jazz-geometry': {
    speedParameter: 'rotationSpeed',
    structureParameter: 'ringCount',
    structureDimensions: [{ dimension: 'motionComplexity', weight: 1 }],
  },
  'liquid-colors': {
    speedParameter: 'flowSpeed',
    structureParameter: 'inkDensity',
    structureDimensions: [
      { dimension: 'particles', weight: 0.34 },
      { dimension: 'motionComplexity', weight: 0.66 },
    ],
  },
  'frequency-city': {
    speedParameter: 'pulseSpeed',
    structureParameter: 'buildingCount',
    structureDimensions: [{ dimension: 'motionComplexity', weight: 1 }],
  },
  'neon-velvet': {
    speedParameter: 'trailSpeed',
    structureParameter: 'trailCount',
    structureDimensions: [{ dimension: 'motionComplexity', weight: 1 }],
  },
};

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

function weightedPercent(state: DirectorState, dimensions: NonNullable<Adapter['structureDimensions']>) {
  const totalWeight = dimensions.reduce((sum, item) => sum + item.weight, 0) || 1;
  return dimensions.reduce((sum, item) => sum + state[item.dimension] * item.weight, 0) / totalWeight;
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
  const supportedDimensions: DirectorDimension[] = ['fluidity', 'dynamics'];

  parameters[adapter.speedParameter] = interpolateAroundDefault(
    definitionFor(engine.parameters, adapter.speedParameter),
    state.fluidity,
  );
  parameters.energyResponse = interpolateAroundDefault(
    definitionFor(engine.parameters, 'energyResponse'),
    state.dynamics,
  );

  if (adapter.structureParameter && adapter.structureDimensions) {
    parameters[adapter.structureParameter] = interpolateAroundDefault(
      definitionFor(engine.parameters, adapter.structureParameter),
      weightedPercent(state, adapter.structureDimensions),
    );
    supportedDimensions.push(...adapter.structureDimensions.map((item) => item.dimension));
  }

  const uniqueDimensions = [...new Set(supportedDimensions)];
  return {
    supportedDimensions: uniqueDimensions,
    parameters: engine.validateConfig(parameters) as Record<string, EngineParameterValue>,
  };
}

export function directorCapabilities(engineId: string): DirectorDimension[] {
  const adapter = adapters[engineId];
  if (!adapter) throw new Error(`Adaptateur AiXel Director introuvable: ${engineId}`);
  return [...new Set<DirectorDimension>([
    'fluidity',
    'dynamics',
    ...(adapter.structureDimensions?.map((item) => item.dimension) ?? []),
  ])];
}
