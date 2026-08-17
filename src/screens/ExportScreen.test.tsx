import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioAnalysis } from '../audio';
import { CosmicWavesEngine } from '../engines/cosmic-waves/CosmicWavesEngine';
import { EntitlementProvider, entitlementSnapshotFor } from '../entitlements';
import { LocaleProvider } from '../i18n/LocaleContext';
import { DEFAULT_EXPORT_SETTINGS } from '../project/project.defaults';
import { ExportScreen } from './ExportScreen';

const mocks = vi.hoisted(() => ({
  getSupportedMp4MimeType: vi.fn(),
  renderMp4: vi.fn(),
  preflightExport: vi.fn(),
}));

vi.mock('../export/mediaRecorderSupport', () => ({
  getSupportedMp4MimeType: mocks.getSupportedMp4MimeType,
}));

vi.mock('../export/renderMp4', () => ({
  renderMp4: mocks.renderMp4,
}));

vi.mock('../export/preflight', () => ({
  browserExportEnvironment: vi.fn(() => ({})),
  preflightExport: mocks.preflightExport,
}));

const analysis = {
  name: 'In the Spirit of Naomi',
  duration: 176,
  buffer: {} as AudioBuffer,
  sampleRate: 48_000,
  bpm: 88,
  peak: 1,
  averageEnergy: 0.5,
  waveform: [0.2, 0.8],
  energy: [0.4, 0.7],
} satisfies AudioAnalysis;

function renderExport(element: React.ReactElement) {
  return render(<LocaleProvider>{element}</LocaleProvider>);
}

beforeEach(() => {
  localStorage.setItem('aixel-visual-melody-locale', 'fr');
  mocks.getSupportedMp4MimeType.mockReset();
  mocks.renderMp4.mockReset();
  mocks.preflightExport.mockReset();
  mocks.preflightExport.mockReturnValue({ ok: true, estimatedWorkingBytes: 1 });
  mocks.getSupportedMp4MimeType.mockReturnValue('video/mp4');
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:export') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ExportScreen', () => {
  it('passes the visible Render Progress canvas to the real renderer and completes', async () => {
    mocks.renderMp4.mockImplementation(async (options) => {
      options.onProgress?.({
        progress: 0.5,
        renderedTime: 88,
        duration: analysis.duration,
        canvas: options.canvas,
      });
      return new Blob(['mp4'], { type: 'video/mp4' });
    });
    const user = userEvent.setup();
    renderExport(
      <ExportScreen
        analysis={analysis}
        engine={CosmicWavesEngine}
        previewBackground="#05060b"
        settings={DEFAULT_EXPORT_SETTINGS}
      />,
    );

    const canvas = screen.getByLabelText('Image vidéo actuellement rendue');
    expect(screen.getByText(/Gardez cet onglet visible et actif/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exporter le MP4' }));

    await screen.findByText('MP4 terminé et téléchargé.');
    expect(mocks.renderMp4).toHaveBeenCalledWith(expect.objectContaining({ canvas, engine: CosmicWavesEngine }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    const exportAgain = screen.getByRole('link', { name: 'Télécharger de nouveau' });
    expect(exportAgain).toHaveAttribute('href', 'blob:export');
    expect(exportAgain).toHaveAttribute('download', 'In-the-Spirit-of-Naomi.mp4');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('keeps the completed MP4 available until the screen unmounts', async () => {
    mocks.renderMp4.mockResolvedValue(new Blob(['mp4'], { type: 'video/mp4' }));
    const user = userEvent.setup();
    const view = renderExport(<ExportScreen analysis={analysis} previewBackground="#05060b" settings={DEFAULT_EXPORT_SETTINGS} />);

    await user.click(screen.getByRole('button', { name: 'Exporter le MP4' }));
    await screen.findByText('MP4 terminé et téléchargé.');
    view.unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export');
  });

  it('cancels an active render through its AbortSignal', async () => {
    mocks.renderMp4.mockImplementation(({ signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
    }));
    const user = userEvent.setup();
    renderExport(<ExportScreen analysis={analysis} previewBackground="#05060b" settings={DEFAULT_EXPORT_SETTINGS} />);

    await user.click(screen.getByRole('button', { name: 'Exporter le MP4' }));
    await user.click(await screen.findByRole('button', { name: 'Annuler le rendu' }));

    await screen.findByText('Rendu annulé. Vous pouvez recommencer.');
    expect(mocks.renderMp4.mock.calls[0][0].signal.aborted).toBe(true);
  });

  it('reports unsupported and failed renders without changing the layout', async () => {
    const user = userEvent.setup();
    mocks.getSupportedMp4MimeType.mockReturnValueOnce(null);
    mocks.preflightExport.mockReturnValueOnce({
      ok: false,
      code: 'unsupported_codec',
      message: 'Unsupported codec',
    });
    const view = renderExport(<ExportScreen analysis={analysis} previewBackground="#05060b" settings={DEFAULT_EXPORT_SETTINGS} />);

    await user.click(screen.getByRole('button', { name: 'Exporter le MP4' }));
    expect(screen.getByText(/encodeur MP4 natif/)).toBeInTheDocument();

    view.unmount();
    mocks.renderMp4.mockRejectedValueOnce(new Error('Échec simulé.'));
    renderExport(<ExportScreen analysis={analysis} previewBackground="#05060b" settings={DEFAULT_EXPORT_SETTINGS} />);
    await user.click(screen.getByRole('button', { name: 'Exporter le MP4' }));

    await waitFor(() => expect(screen.getByText('Échec simulé.')).toBeInTheDocument());
  });

  it('applies real dimensions and encoding profile when a verified Pro user selects 1080p', async () => {
    const onSettingsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <EntitlementProvider snapshot={entitlementSnapshotFor('pro_active')}>
          <ExportScreen
            analysis={analysis}
            onSettingsChange={onSettingsChange}
            previewBackground="#05060b"
            settings={DEFAULT_EXPORT_SETTINGS}
          />
        </EntitlementProvider>
      </LocaleProvider>,
    );

    await user.click(screen.getByRole('button', { name: '1080p' }));
    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({
      width: 1920,
      height: 1080,
      frameRate: 30,
      videoBitRate: 12_000_000,
    }));
  });
});
