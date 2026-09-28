import type { EngineParameterDefinition } from '../engine.types';
import type { ParticleSphereConfig } from './particleSphere.types';

export const particleSphereDefaultConfig: ParticleSphereConfig = {
  orbitSpeed: 0.28,
  energyResponse: 1.2,
  particleDensity: 0.72,
  glowIntensity: 1.15,
  spaceScale: 1,
  colorSaturation: 1,
  sparkleDensity: 0.55,
  warmth: 0,
  primaryColor: '#9eeaff',
  accentColor: '#8a6bff',
  showTitle: true,
};

export const particleSphereParameters: EngineParameterDefinition[] = [
  { id: 'orbitSpeed', label: 'Orbit speed', type: 'number', defaultValue: 0.28, min: 0.05, max: 0.9, step: 0.01 },
  { id: 'energyResponse', label: 'Dynamics', type: 'number', defaultValue: 1.2, min: 0, max: 2, step: 0.05 },
  { id: 'particleDensity', label: 'Particle density', type: 'number', defaultValue: 0.72, min: 0.2, max: 1, step: 0.05 },
  { id: 'glowIntensity', label: 'Glow', type: 'number', defaultValue: 1.15, min: 0.5, max: 1.8, step: 0.05 },
  { id: 'spaceScale', label: 'Spatial scale', type: 'number', defaultValue: 1, min: 0.72, max: 1.28, step: 0.02 },
  { id: 'colorSaturation', label: 'Color saturation', type: 'number', defaultValue: 1, min: 0.4, max: 1.6, step: 0.05 },
  { id: 'sparkleDensity', label: 'Particle shimmer', type: 'number', defaultValue: 0.55, min: 0, max: 1.6, step: 0.05 },
  { id: 'warmth', label: 'Warmth', type: 'number', defaultValue: 0, min: -1, max: 1, step: 0.05 },
  { id: 'primaryColor', label: 'Primary color', type: 'color', defaultValue: '#9eeaff' },
  { id: 'accentColor', label: 'Accent color', type: 'color', defaultValue: '#8a6bff' },
  { id: 'showTitle', label: 'Show title', type: 'boolean', defaultValue: true },
];

const numberInRange = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
const color = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function validateParticleSphereConfig(value: unknown): ParticleSphereConfig {
  const config = value && typeof value === 'object' ? value as Partial<ParticleSphereConfig> : {};
  return {
    orbitSpeed: numberInRange(config.orbitSpeed, particleSphereDefaultConfig.orbitSpeed, 0.05, 0.9),
    energyResponse: numberInRange(config.energyResponse, particleSphereDefaultConfig.energyResponse, 0, 2),
    particleDensity: numberInRange(config.particleDensity, particleSphereDefaultConfig.particleDensity, 0.2, 1),
    glowIntensity: numberInRange(config.glowIntensity, particleSphereDefaultConfig.glowIntensity, 0.5, 1.8),
    spaceScale: numberInRange(config.spaceScale, particleSphereDefaultConfig.spaceScale, 0.72, 1.28),
    colorSaturation: numberInRange(config.colorSaturation, particleSphereDefaultConfig.colorSaturation, 0.4, 1.6),
    sparkleDensity: numberInRange(config.sparkleDensity, particleSphereDefaultConfig.sparkleDensity, 0, 1.6),
    warmth: numberInRange(config.warmth, particleSphereDefaultConfig.warmth, -1, 1),
    primaryColor: color(config.primaryColor, particleSphereDefaultConfig.primaryColor),
    accentColor: color(config.accentColor, particleSphereDefaultConfig.accentColor),
    showTitle: typeof config.showTitle === 'boolean' ? config.showTitle : particleSphereDefaultConfig.showTitle,
  };
}
