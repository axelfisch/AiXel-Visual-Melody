import { Download, Film, Gauge, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatTime, type AudioAnalysis } from '../audio';
import { GlassPanel } from '../components/layout/GlassPanel';
import { MinimalAlbumArtEngine } from '../engines/minimal-album-art/MinimalAlbumArtEngine';
import { getSupportedMp4MimeType } from '../export/mediaRecorderSupport';
import { renderMp4 } from '../export/renderMp4';
import type { ExportSettings } from '../project/project.types';

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
  previewBackground,
  settings,
}: {
  analysis: AudioAnalysis | null;
  previewBackground: string;
  settings: ExportSettings;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [completedExport, setCompletedExport] = useState<CompletedExport | null>(null);
  const [progress, setProgress] = useState(0);
  const [renderedTime, setRenderedTime] = useState(0);
  const [state, setState] = useState<ExportState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const rendering = state === 'rendering';

  useEffect(() => () => {
    if (completedExport) URL.revokeObjectURL(completedExport.url);
  }, [completedExport]);

  const status = (() => {
    if (!analysis) return 'Importez d’abord un morceau dans Analyze.';
    switch (state) {
      case 'rendering':
        return `Rendu ${formatTime(renderedTime)} / ${formatTime(analysis.duration)} · ${Math.round(progress * 100)}%`;
      case 'completed':
        return 'MP4 terminé et téléchargé.';
      case 'cancelled':
        return 'Rendu annulé. Vous pouvez recommencer.';
      case 'unsupported':
        return "Ce navigateur ne propose pas d’encodeur MP4 natif. Essayez Safari récent pour cet export MVP.";
      case 'failed':
        return errorMessage || "L’export a échoué.";
      default:
        return `${formatTime(analysis.duration)} à rendre`;
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
    setErrorMessage('');
    setState('rendering');

    try {
      const blob = await renderMp4({
        analysis,
        engine: MinimalAlbumArtEngine,
        settings,
        mimeType,
        canvas,
        signal: controller.signal,
        onProgress: ({ progress: value, renderedTime: time }) => {
          setProgress(value);
          setRenderedTime(time);
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
      setRenderedTime(analysis.duration);
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
        <h1>Render a synchronized MP4</h1>
        <p>Le rendu 720p est produit localement et conserve la piste audio originale décodée.</p>
      </div>
      <div className="export-grid">
        <GlassPanel className="span-2">
          <div className="panel-heading"><Film size={18} /><h2>Format Grid</h2></div>
          <div className="format-grid">
            <button className="selected">MP4 · 1280 × 720</button>
          </div>
        </GlassPanel>
        <GlassPanel>
          <div className="panel-heading"><Gauge size={18} /><h2>Render Progress</h2></div>
          <canvas
            aria-label="Image vidéo actuellement rendue"
            className="render-preview"
            ref={canvasRef}
            width={settings.width}
            height={settings.height}
            style={{ background: previewBackground }}
          />
          <div
            aria-label="Progression du rendu"
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
              <Download size={17} /> Exporter de nouveau
            </a>
          ) : (
            <button
              className={`${rendering ? 'secondary-action' : 'primary-action'} full`}
              disabled={!analysis}
              onClick={rendering ? cancelExport : () => void exportMp4()}
            >
              {rendering ? <><X size={17} /> Annuler le rendu</> : <><Download size={17} /> Exporter le MP4</>}
            </button>
          )}
        </GlassPanel>
      </div>
    </section>
  );
}
