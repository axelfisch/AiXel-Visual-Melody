import { AlertTriangle, Download, Film, Gauge, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatTime, type AudioAnalysis } from '../audio';
import { GlassPanel } from '../components/layout/GlassPanel';
import type { VisualEngine } from '../engines/engine.types';
import { MinimalAlbumArtEngine } from '../engines/minimal-album-art/MinimalAlbumArtEngine';
import { getSupportedMp4MimeType } from '../export/mediaRecorderSupport';
import { EXPORT_END_CARD_DURATION } from '../export/endCard';
import { useLocale } from '../i18n/LocaleContext';
import { renderMp4 } from '../export/renderMp4';
import type { ExportSettings, ProjectIdentity } from '../project/project.types';

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
  identity,
}: {
  analysis: AudioAnalysis | null;
  engine?: VisualEngine;
  engineConfig?: unknown;
  previewBackground: string;
  settings: ExportSettings;
  identity: ProjectIdentity;
}) {
  const { t } = useLocale();
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

  const status = (() => {
    if (!analysis) return t('noTrackExport');
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
    if (!analysis || rendering) return;
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
        title: identity.title.trim() || analysis.name,
        endCardCredits: {
          trackTitle: identity.title.trim() || analysis.name,
          artistName: identity.artist.trim() || 'Axel Fisch',
        },
        onProgress: ({ progress: value, renderedTime: time, duration }) => {
          setProgress(value);
          setRenderedTime(time);
          setRenderDuration(duration);
        },
      });
      const url = URL.createObjectURL(blob);
      const completedExport = {
        filename: `${(identity.title.trim() || analysis.name).replace(/[^a-z0-9_-]+/gi, '-') || 'visual-melody'}.mp4`,
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
            <button className="selected">MP4 · 1280 × 720</button>
          </div>
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
              disabled={!analysis}
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
