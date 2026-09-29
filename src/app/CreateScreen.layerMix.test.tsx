import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DanceAvatarsEngine } from '../engines/dance-avatars/DanceAvatarsEngine';
import { JazzGeometryEngine } from '../engines/jazz-geometry/JazzGeometryEngine';
import { LiquidColorsEngine } from '../engines/liquid-colors/LiquidColorsEngine';
import { NeonVelvetEngine } from '../engines/neon-velvet/NeonVelvetEngine';
import { getLayerMixEngine } from '../engines/layer-mix/layerMix.compositor';
import type { EngineFrame, RenderSurface } from '../engines/engine.types';
import { LocaleProvider } from '../i18n/LocaleContext';
import { ProjectProvider } from '../project/project.context';
import { App } from './App';

/** No-op 2D context that tolerates every call the engines make (jsdom has no canvas backend). */
function fakeContext(width = 1280, height = 720): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => undefined };
  const target: Record<string, unknown> = {
    canvas: { width, height },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => null,
    measureText: (text: string) => ({ width: String(text).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  };
  return new Proxy(target, {
    get: (obj, key: string) => (key in obj ? obj[key] : () => undefined),
    set: (obj, key: string, value) => { obj[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

class FakeOffscreen {
  width: number;
  height: number;
  constructor(width: number, height: number) { this.width = width; this.height = height; }
  getContext() { return fakeContext(this.width, this.height); }
}

type RenderCall = [unknown, EngineFrame, Record<string, unknown>];
const lastConfig = (spy: { mock: { calls: unknown[][] } }) =>
  (spy.mock.calls[spy.mock.calls.length - 1] as RenderCall)[2];

function renderCreate() {
  window.location.hash = '#create';
  return render(
    <LocaleProvider>
      <ProjectProvider>
        <App />
      </ProjectProvider>
    </LocaleProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem('aixel-visual-melody-locale', 'fr');
  vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return fakeContext(this.width, this.height) as never;
  } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.location.hash = '';
});

describe('Create screen two-layer mix (Mixer deux moteurs)', () => {
  it('is off by default: single engine, no layer choices', () => {
    renderCreate();
    expect(screen.getByRole('switch', { name: 'Mixer deux moteurs' })).not.toBeChecked();
    expect(screen.queryByRole('region', { name: 'Couche 2 (premier plan)' })).toBeNull();
  });

  it('mixes Jazz Geometry (fond) + Avatars danse (premier plan) live, with the shared clock and a transparent layer 2', () => {
    const jazzSpy = vi.spyOn(JazzGeometryEngine, 'render');
    const avatarSpy = vi.spyOn(DanceAvatarsEngine, 'render');
    const mixSpy = vi.spyOn(getLayerMixEngine('jazz-geometry', 'dance-avatars'), 'render');
    renderCreate();

    fireEvent.click(screen.getByRole('switch', { name: 'Mixer deux moteurs' }));
    const layer1 = screen.getByRole('region', { name: 'Couche 1 (fond)' });
    const layer2 = screen.getByRole('region', { name: 'Couche 2 (premier plan)' });
    expect(within(layer2).getByRole('button', { name: 'Aucune' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(layer1).getByRole('button', { name: 'Jazz Geometry' }));
    fireEvent.click(within(layer2).getByRole('button', { name: 'Avatars danse' }));

    const canvas = screen.getByTestId('live-engine-preview');
    expect(canvas).toHaveAttribute('data-engine', 'mix:jazz-geometry+dance-avatars');
    expect(screen.getByText('Jazz Geometry + Avatars danse')).toBeInTheDocument();
    expect(within(layer2).getByRole('button', { name: 'Jazz Geometry' })).toBeDisabled();
    expect(within(layer1).getByRole('button', { name: 'Avatars danse' })).toBeDisabled();

    expect(jazzSpy).toHaveBeenCalled();
    expect(avatarSpy).toHaveBeenCalled();
    const jazzCall = jazzSpy.mock.calls[jazzSpy.mock.calls.length - 1] as [RenderSurface, EngineFrame, unknown];
    const avatarCall = avatarSpy.mock.calls[avatarSpy.mock.calls.length - 1] as [RenderSurface, EngineFrame, Record<string, unknown>];
    expect(avatarCall[0].transparent).toBe(true);
    expect(jazzCall[0].transparent).toBeFalsy();
    expect(avatarCall[1]).toBe(jazzCall[1]);
    expect(avatarCall[2].showTitle).toBe(false);

    expect(screen.getByRole('slider', { name: 'Opacité de la couche 2' })).toHaveValue('85');
    expect(screen.getByRole('button', { name: 'Normal' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Écran' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Assombrir le fond' }), { target: { value: '40' } });
    const mixConfig = lastConfig(mixSpy) as { blendMode: string; backgroundDim: number; opacity: number };
    expect(mixConfig).toMatchObject({ blendMode: 'screen', backgroundDim: 0.4, opacity: 0.85 });

    // Layer 2 avatar options drive layer 2 only.
    fireEvent.click(screen.getByRole('button', { name: 'Hologramme / Hologram' }));
    fireEvent.click(screen.getByRole('button', { name: 'Femme / Female' }));
    expect(lastConfig(avatarSpy)).toMatchObject({ style: 'hologram', gender: 'female' });

    fireEvent.click(within(screen.getByRole('region', { name: 'Couche 2 (premier plan)' })).getByRole('button', { name: 'Aucune' }));
    expect(screen.queryByTestId('live-engine-preview')).toBeNull();
  });

  it('mixes two classic engines (Neon Velvet + Liquid Colors) with screen 50 % by default', () => {
    const neonSpy = vi.spyOn(NeonVelvetEngine, 'render');
    const liquidSpy = vi.spyOn(LiquidColorsEngine, 'render');
    renderCreate();
    fireEvent.click(screen.getByRole('switch', { name: 'Mixer deux moteurs' }));
    fireEvent.click(within(screen.getByRole('region', { name: 'Couche 1 (fond)' })).getByRole('button', { name: 'Neon Velvet' }));
    fireEvent.click(within(screen.getByRole('region', { name: 'Couche 2 (premier plan)' })).getByRole('button', { name: 'Liquid Colors' }));
    expect(screen.getByTestId('live-engine-preview')).toHaveAttribute('data-engine', 'mix:neon-velvet+liquid-colors');
    expect(neonSpy).toHaveBeenCalled();
    expect(liquidSpy).toHaveBeenCalled();
    expect(screen.getByRole('slider', { name: 'Opacité de la couche 2' })).toHaveValue('50');
    expect(screen.getByRole('button', { name: 'Écran' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Inverser les couches' }));
    expect(screen.getByTestId('live-engine-preview')).toHaveAttribute('data-engine', 'mix:liquid-colors+neon-velvet');

    fireEvent.click(screen.getByRole('switch', { name: 'Mixer deux moteurs' }));
    expect(screen.queryByRole('region', { name: 'Couche 2 (premier plan)' })).toBeNull();
    expect(screen.queryByTestId('live-engine-preview')).toBeNull();
  });
});
