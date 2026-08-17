import { AlertTriangle, Download, Film, Gauge, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatTime, type AudioAnalysis } from '../audio';
import { GlassPanel } from '../components/layout/GlassPanel';
import { useCapabilities } from '../entitlements';
import type { VisualEngine } from '../engines/engine.types';
import { MinimalAlbumArtEngine } from '../engines/minimal-album-art/MinimalAlbumArtEngine';
import { getSupportedMp4MimeType } from '../export/mediaRecorderSupport';
import { EXPORT_END_CARD_DURATION } from '../export/endCard';
import {
  EXPORT_ASPECT_RATIOS,
  EXPORT_END_CARD_MODES,
  EXPORT_RESOLUTIONS,
  exportGateReasons,
  frameLabel,
  isAspectRatioAllowed,
  isEndCardModeAllowed,
  isResolutionAllowed,
  resolutionOf,
} from '../export/exportFormats';
import { useLocale } from '../i18n/LocaleContext';
import { renderMp4 } from '../export/renderMp4';
import type { ExportSettings, ProjectEndCardMode } from '../project/project.types';

type ExportState = 'idle' | 'rendering' | 'completed' | 'cancelled' | 'unsupported' | 'failed';

type CompletedExport = {
  filename: string;
  url: string;
};

function downloadExport({ filename, url }: CompletedExport) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

export function ExportScreen({
  analysis,
  engine = MinimalAlbumArtEngine,
  engineConfig,
  previewBackground,
  settings,
}: {
  analysis: AudioAnalysis | null;
  engine?: VisualEngine;
  engineConfig?: unknown;
  previewBackground: string;
  settings: ExportSettings;
}) {
  const { t } = useLocale();
  const capabilities = useCapabilities();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [completedExport, setCompletedExport] = useState<CompletedExport | null>(null);
  const [progress, setProgress] = useState(0);
  const [renderedTime, setRenderedTime] = useState(0);
  const [renderDuration, setRenderDuration] = useState(0);
  const [state, setState] = useState<ExportState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const rendering = state === 'rendering';

  useEffect(() => () => {
    if (completedExport) URL.revokeObjectURL(completedExport.url);
  }, [completedExport]);

  // The single authority for "may this export run", shared with the button and
  // the status line so they can never disagree.
  const blockers = useMemo(() => exportGateReasons(settings, capabilities), [settings, capabilities]);
  const gated = blockers.length > 0;
  const endCardLabels: Record<ProjectEndCardMode, string> = {
    aixel: t('endCardAixel'),
    artist: t('endCardArtist'),
    clean: t('endCardClean'),
  };

  const status = (() => {
    if (!analysis) return t('noTrackExport');
    if (gated && state === 'idle') return t('proExportBlocked');
    switch (state) {
      case 'rendering':
        return `Rendu ${formatTime(renderedTime)} / ${formatTime(renderDuration)} · ${Math.round(progress * 100)}%`;
      case 'completed':
        return t('completeDownload');
      case 'cancelled':
        return t('cancelled');
      case 'unsupported':
        return t('unsupportedMp4');
      case 'failed':
        return errorMessage || t('failedExport');
      default:
        return `${formatTime(analysis.duration)} + ${t('aixelCredits')} ${EXPORT_END_CARD_DURATION} s`;
    }
  })();

  const exportMp4 = async () => {
    if (!analysis || rendering || gated) return;
    const canvas = canvasRef.current;
    if (!canvas) {
      setErrorMessage("Le canevas d’export n’est pas disponible.");
      setState('failed');
      return;
    }

    const mimeType = getSupportedMp4MimeType();
    if (!mimeType) {
      setState('unsupported');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProgress(0);
    setRenderedTime(0);
    setRenderDuration(analysis.duration + EXPORT_END_CARD_DURATION);
    setErrorMessage('');
    setState('rendering');

    try {
      const blob = await renderMp4({
        analysis,
        engine,
        engineConfig,
        settings,
        mimeType,
        canvas,
        signal: controller.signal,
        onProgress: ({ progress: value, renderedTime: time, duration }) => {
          setProgress(value);
          setRenderedTime(time);
          setRenderDuration(duration);
        },
      });
      const url = URL.createObjectURL(blob);
      const completedExport = {
        filename: `${analysis.name.replace(/[^a-z0-9_-]+/gi, '-') || 'visual-melody'}.mp4`,
        url,
      };
      setCompletedExport(completedExport);
      downloadExport(completedExport);
      setProgress(1);
      setRenderedTime(analysis.duration + EXPORT_END_CARD_DURATION);
      setState('completed');
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') {
        setState('cancelled');
      } else {
        setErrorMessage(reason instanceof Error ? reason.message : "L’export a échoué.");
        setState('failed');
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const cancelExport = () => abortControllerRef.current?.abort();

  return (
    <section className="screen export-layout">
      <div className="screen-title">
        <p className="eyebrow">Export</p>
        <h1>{t('exportTitle')}</h1>
        <p>{t('exportNote')}</p>
      </div>
      <div className="export-grid">
        <GlassPanel className="span-2">
          <div className="panel-heading"><Film size={18} /><h2>{t('formatGrid')}</h2></div>
          <div className="format-grid">
            <button className="selected">
              MP4 · {settings.width} × {settings.height} · {settings.frameRate} fps
            </button>
          </div>
          <OutputOptions
            label={t('outputResolution')}
            options={EXPORT_RESOLUTIONS.map((resolution) => ({
              id: resolution,
              label: resolution,
              selected: resolution === resolutionOf(settings),
              allowed: isResolutionAllowed(resolution, capabilities),
            }))}
            proLabel={t('proTag')}
            proTitle={t('creatorProOnly')}
          />
          <OutputOptions
            label={t('outputAspectRatio')}
            options={EXPORT_ASPECT_RATIOS.map((aspectRatio) => ({
              id: aspectRatio,
              label: aspectRatio,
              selected: aspectRatio === settings.aspectRatio,
              allowed: isAspectRatioAllowed(aspectRatio, capabilities),
            }))}
            proLabel={t('proTag')}
            proTitle={t('creatorProOnly')}
          />
          <OutputOptions
            label={t('outputEndCard')}
            options={EXPORT_END_CARD_MODES.map((mode) => ({
              id: mode,
              label: endCardLabels[mode],
              selected: mode === settings.endCardMode,
              allowed: isEndCardModeAllowed(mode, capabilities),
            }))}
            proLabel={t('proTag')}
            proTitle={t('creatorProOnly')}
          />
          <p className="muted">{t('currentOutput')} {frameLabel(settings)} · {settings.aspectRatio} · {endCardLabels[settings.endCardMode]}</p>
        </GlassPanel>
        <GlassPanel>
          <div className="panel-heading"><Gauge size={18} /><h2>{t('renderProgress')}</h2></div>
          <p className="export-focus-notice" role="note"><AlertTriangle size={17} />{t('keepTabActive')}</p>
          <canvas
            aria-label={t('renderedFrame')}
            className="render-preview"
            ref={canvasRef}
            width={settings.width}
            height={settings.height}
            style={{ background: previewBackground }}
          />
          <div
            aria-label={t('renderProgressLabel')}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progress * 100)}
            className="progress-track"
            role="progressbar"
          >
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <p aria-live="polite" className="muted">{status}</p>
          {state === 'completed' && completedExport ? (
            <a className="primary-action full" download={completedExport.filename} href={completedExport.url}>
              <Download size={17} /> {t('exportAgain')}
            </a>
          ) : (
            <button
              className={`${rendering ? 'secondary-action' : 'primary-action'} full`}
              disabled={!analysis || (gated && !rendering)}
              onClick={rendering ? cancelExport : () => void exportMp4()}
            >
              {rendering ? <><X size={17} /> {t('cancelRender')}</> : <><Download size={17} /> {t('exportMp4')}</>}
            </button>
          )}
        </GlassPanel>
      </div>
    </section>
  );
}

type OutputOption = {
  id: string;
  label: string;
  selected: boolean;
  allowed: boolean;
};

/**
 * Renders one row of output choices. Creator Pro options stay visible and
 * labelled — the user must be able to see what the paid plan offers — but they
 * are not selectable until the capability grants them.
 */
function OutputOptions({
  label,
  options,
  proLabel,
  proTitle,
}: {
  label: string;
  options: OutputOption[];
  proLabel: string;
  proTitle: string;
}) {
  return (
    <div className="output-options" role="group" aria-label={label}>
      <span className="tiny-label">{label}</span>
      <div className="chips wrap">
        {options.map((option) => (
          <button
            aria-pressed={option.selected}
            className={option.selected ? 'selected' : ''}
            disabled={!option.allowed}
            key={option.id}
            title={option.allowed ? option.label : proTitle}
          >
            {option.label}
            {option.allowed ? null : <em className="pro-tag">{proLabel}</em>}
          </button>
        ))}
      </div>
    </div>
  );
}
