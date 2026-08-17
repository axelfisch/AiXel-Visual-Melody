// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { listEngines } from '../engines/engine.registry';
import { dimensionsFor, EXPORT_ASPECT_RATIOS } from './exportFormats';

function fixtureContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() };
  const methods = new Set([
    'arc', 'beginPath', 'bezierCurveTo', 'clip', 'closePath', 'fill', 'fillRect', 'fillText',
    'lineTo', 'moveTo', 'quadraticCurveTo', 'restore', 'rotate', 'save', 'setLineDash',
    'stroke', 'strokeRect', 'translate',
  ]);
  return new Proxy({}, {
    get(_target, property) {
      if (property === 'createLinearGradient' || property === 'createRadialGradient') return () => gradient;
      if (methods.has(String(property))) return vi.fn();
      return undefined;
    },
    set() { return true; },
  }) as CanvasRenderingContext2D;
}

describe('renderer viewport matrix', () => {
  it.each(listEngines().flatMap((engine) => EXPORT_ASPECT_RATIOS.map((aspectRatio) => [engine, aspectRatio] as const)))(
    '$0 renders a deterministic fixture at %s',
    (engine, aspectRatio) => {
      const size = dimensionsFor('1080p', aspectRatio);
      expect(() => engine.render(
        { context: fixtureContext(), ...size, pixelRatio: 1 },
        { time: 42, duration: 180, progress: 42 / 180, energy: 0.5, bpm: 96, title: 'Fixture' },
        engine.validateConfig(engine.defaultConfig),
      )).not.toThrow();
      expect(size.width * size.height).toBeGreaterThan(1_000_000);
    },
  );
});
