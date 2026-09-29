import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioAnalysis } from '../audio';
import { CosmicWavesEngine } from '../engines/cosmic-waves/CosmicWavesEngine';
import { setDevPlan } from '../entitlements';
import { LocaleProvider } from '../i18n/LocaleContext';
import { DEFAULT_EXPORT_SETTINGS } from '../project/project.defaults';
import { ExportScreen } from './ExportScreen';

const mocks = vi.hoisted(() => ({
  getSupportedMp4MimeType: vi.fn(),
  renderMp4: vi.fn(),
}));

vi.mock('../export/mediaRecorderSupport', () => ({
  getSupportedMp4MimeType: mocks.getSupportedMp4MimeType,
}));

vi.mock('../export/renderMp4', () => ({
  renderMp4: mocks.renderMp4,
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
  mocks.getSupportedMp4MimeType.mockReturnValue('video/mp4');
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:export') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setDevPlan(null);
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
    expect(exportAgain).toHaveAttribute('download', 'In-the-Spirit-of-Naomi-720p.mp4');
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
    const view = renderExport(<ExportScreen analysis={analysis} previewBackground="#05060b" settings={DEFAULT_EXPORT_SETTINGS} />);

    await user.click(screen.getByRole('button', { name: 'Exporter le MP4' }));
    expect(screen.getByText(/encodeur MP4 natif/)).toBeInTheDocument();

    view.unmount();
    mocks.renderMp4.mockRejectedValueOnce(new Error('Échec simulé.'));
    renderExport(<ExportScreen analysis={analysis} previewBackground="#05060b" settings={DEFAULT_EXPORT_SETTINGS} />);
    await user.click(screen.getByRole('button', { name: 'Exporter le MP4' }));

    await waitFor(() => expect(screen.getByText('Échec simulé.')).toBeInTheDocument());
  });

  describe('Creator Pro gates', () => {
    it('Free: 1080p presets are locked with a Pro badge and the watermark cannot be removed', async () => {
      mocks.renderMp4.mockResolvedValue(new Blob(['mp4'], { type: 'video/mp4' }));
      const user = userEvent.setup();
      renderExport(<ExportScreen analysis={analysis} previewBackground="#05060b" settings={DEFAULT_EXPORT_SETTINGS} />);

      expect(screen.getByTestId('plan-chip')).toHaveTextContent('Gratuite');
      const locked = screen.getByRole('button', { name: /1080p 16:9/ });
      expect(locked).toHaveAttribute('aria-disabled', 'true');
      expect(locked).toHaveTextContent('Pro');
      await user.click(locked);
      expect(locked).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /720p 16:9/ })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getAllByText('Le 1080p est une fonction Creator Pro.').length).toBeGreaterThan(0);

      const watermark = screen.getByRole('checkbox', { name: /Filigrane AiXel/ });
      expect(watermark).toBeChecked();
      expect(watermark).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Exporter le MP4' }));
      await screen.findByText('MP4 terminé et téléchargé.');
      expect(mocks.renderMp4).toHaveBeenCalledWith(expect.objectContaining({
        settings: expect.objectContaining({ width: 1280, height: 720, watermark: true }),
      }));
    });

    it('Free: a project saved with 1080p settings is shown and exported at 720p', () => {
      renderExport(
        <ExportScreen
          analysis={analysis}
          previewBackground="#05060b"
          settings={{ ...DEFAULT_EXPORT_SETTINGS, presetId: '1080p-vertical', width: 1080, height: 1920, watermark: false }}
        />,
      );
      expect(screen.getByRole('button', { name: /720p 9:16/ })).toHaveAttribute('aria-pressed', 'true');
      const canvas = screen.getByLabelText('Image vidéo actuellement rendue');
      expect(canvas).toHaveAttribute('width', '720');
      expect(canvas).toHaveAttribute('height', '1280');
      expect(screen.getByRole('checkbox', { name: /Filigrane AiXel/ })).toBeChecked();
    });

    it('Creator Pro: picks 1080p 9:16, turns the watermark off and exports that', async () => {
      setDevPlan('creator_pro');
      mocks.renderMp4.mockResolvedValue(new Blob(['mp4'], { type: 'video/mp4' }));
      const user = userEvent.setup();
      renderExport(<ExportScreen analysis={analysis} previewBackground="#05060b" settings={DEFAULT_EXPORT_SETTINGS} />);

      expect(screen.getByTestId('plan-chip')).toHaveTextContent('Creator Pro');
      expect(screen.getByTestId('plan-chip')).toHaveTextContent('mode dev');
      await user.click(screen.getByRole('button', { name: /1080p 9:16/ }));
      const watermark = screen.getByRole('checkbox', { name: /Filigrane AiXel/ });
      expect(watermark).toBeEnabled();
      await user.click(watermark);
      expect(watermark).not.toBeChecked();

      await user.click(screen.getByRole('button', { name: 'Exporter le MP4' }));
      await screen.findByText('MP4 terminé et téléchargé.');
      expect(mocks.renderMp4).toHaveBeenCalledWith(expect.objectContaining({
        settings: expect.objectContaining({ presetId: '1080p-vertical', width: 1080, height: 1920, watermark: false }),
      }));
      expect(screen.getByRole('link', { name: 'Télécharger de nouveau' })).toHaveAttribute('download', 'In-the-Spirit-of-Naomi-1080p-9x16.mp4');
    });

    it('turning the dev override off returns to Free', async () => {
      setDevPlan('creator_pro');
      const user = userEvent.setup();
      renderExport(<ExportScreen analysis={analysis} previewBackground="#05060b" settings={DEFAULT_EXPORT_SETTINGS} />);
      await user.click(screen.getByRole('button', { name: 'Désactiver' }));
      expect(screen.getByTestId('plan-chip')).toHaveTextContent('Gratuite');
      expect(screen.getByRole('checkbox', { name: /Filigrane AiXel/ })).toBeDisabled();
    });
  });
});
