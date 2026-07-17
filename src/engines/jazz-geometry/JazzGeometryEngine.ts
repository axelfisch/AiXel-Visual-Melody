import type { VisualEngine } from '../engine.types';
import { jazzGeometryDefaultConfig, jazzGeometryParameters, validateJazzGeometryConfig } from './jazzGeometry.config';
import { renderJazzGeometry } from './jazzGeometry.renderer';
import type { JazzGeometryConfig } from './jazzGeometry.types';

export const JazzGeometryEngine: VisualEngine<JazzGeometryConfig> = {
  id: 'jazz-geometry',
  name: 'Jazz Geometry',
  description: 'Concentric harmonic rings, alternating rotation and restrained gold geometry.',
  availability: 'implemented',
  defaultConfig: jazzGeometryDefaultConfig,
  parameters: jazzGeometryParameters,
  validateConfig: validateJazzGeometryConfig,
  render: renderJazzGeometry,
};
