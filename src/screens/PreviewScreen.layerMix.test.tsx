import { cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLayerMixEngine } from '../engines/layer-mix/layerMix.compositor';
import { LocaleProvider } from '../i18n/LocaleContext';
import { ProjectProvider, useProject } from '../project/project.context';
import { resolveProjectRender } from '../project/project.render';
import { PreviewScreen } from './PreviewScreen';

function fakeContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => undefined };
  const target: Record<string, unknown> = {
    canvas: { width: 1280, height: 720 },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: (text: string) => ({ width: String(text).length * 10 }),
  };
  return new Proxy(target, {
    get: (obj, key: string) => (key in obj ? obj[key] : () => undefined),
    set: (obj, key: string, value) => { obj[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

let latestProject: ReturnType<typeof useProject>['project'] | null = null;

function MixedProject() {
  const { project, dispatch } = useProject();
  latestProject = project;
  useEffect(() => {
    dispatch({ type: 'SET_AUDIO_SOURCE', audio: { fileName: 'Naomi.wav', mimeType: 'audio/wav', size: 10, duration: 30, objectUrl: 'blob:naomi' } });
    dispatch({ type: 'ANALYSIS_COMPLETED', analysis: { sampleRate: 44100, bpm: 118, peak: 1, averageEnergy: 0.5, waveform: [0.2, 0.5], energy: [0.2, 0.8, 0.4] } });
    dispatch({ type: 'SELECT_ENGINE', engineId: 'cosmic-waves' });
    dispatch({ type: 'SET_LAYER_OVERLAY', engineId: 'lyric-canvas' });
  }, [dispatch]);
  return <PreviewScreen onNavigate={() => undefined} autoPlay={false} onAutoPlayHandled={() => undefined} />;
}

describe('PreviewScreen with a two-layer mix', () => {
  beforeEach(() => {
    localStorage.setItem('aixel-visual-melody-locale', 'fr');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeContext() as never);
    vi.stubGlobal('OffscreenCanvas', class { width = 1280; height = 720; getContext() { return fakeContext(); } });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the same composite engine + config as Create and Export (WYSIWYG)', () => {
    const mixEngine = getLayerMixEngine('cosmic-waves', 'lyric-canvas');
    const renderSpy = vi.spyOn(mixEngine, 'render');
    render(
      <LocaleProvider>
        <ProjectProvider>
          <MixedProject />
        </ProjectProvider>
      </LocaleProvider>,
    );
    expect(screen.getByText(/Cosmic Waves \+ Lyric Canvas · Aperçu en direct/)).toBeInTheDocument();
    expect(renderSpy).toHaveBeenCalled();
    const expected = resolveProjectRender(latestProject!);
    expect(expected.engine).toBe(mixEngine);
    const [, frame, config] = renderSpy.mock.calls[renderSpy.mock.calls.length - 1];
    expect(config).toEqual(mixEngine.validateConfig(expected.config));
    expect(frame.bpm).toBe(118);
  });
});
