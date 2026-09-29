import { AlertTriangle, Crown, Download, Film, Gauge, Lock, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatTime, type AudioAnalysis } from '../audio';
import { GlassPanel } from '../components/layout/GlassPanel';
import type { VisualEngine } from '../engines/engine.types';
import { MinimalAlbumArtEngine } from '../engines/minimal-album-art/MinimalAlbumArtEngine';
import { getSupportedMp4MimeType } from '../export/mediaRecorderSupport';
import { EXPORT_END_CARD_DURATION } from '../export/endCard';
import { enforceExportEntitlements, isProPreset } from '../export/exportGates';
import { exportGateCopy } from '../export/exportGates.i18n';
import { EXPORT_PRESETS, exportSettingsFromPreset, getExportPreset, type ExportPreset, type ExportPresetId } from '../export/formats';
import { devPlanForcedByBuild, setDevPlan, useEntitlements } from '../entitlements';
import { useLocale } from '../i18n/LocaleContext';
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

const PRESET_LABELS: Record<ExportPresetId, string> = {
  '720p-widescreen': 'MP4 · 720p 16:9',
  '720p-vertical': 'MP4 · 720p 9:16',
  '1080p-widescreen': 'MP4 · 1080p 16:9',
  '1080p-vertical': 'MP4 · 1080p 9:16',
};

export function ExportScreen({
  analysis,
  engine = MinimalAlbumArtEngine,
  engineConfig,
  previewBackground,
  settings,
  onSettingsChange,
}: {
  analysis: AudioAnalysis | null;
  engine?: VisualEngine;
  engineConfig?: unknown;
  previewBackground: string;
  settings: ExportSettings;
  onSettingsChange?: (settings: ExportSettings) => void;
}) {
  const { t, locale } = useLocale();
  const copy = exportGateCopy[locale] ?? exportGateCopy.en;
  const entitlements = useEntitlements();
  const { capabilities } = entitlements;
  const isPro = entitlements.plan === 'creator_pro';
  const [upsellHighlighted, setUpsellHighlighted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [localSettings, setLocalSettings] = useState<ExportSettings>(settings);
  const [completedExport, setCompletedExport] = useState<CompletedExport | null>(null);
  const [progress, setProgress] = useState(0);
  const [renderedTime, setRenderedTime] = useState(0);
  const [renderDuration, setRenderDuration] = useState(0);
  const [state, setState] = useState<ExportState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const rendering = state === 'rendering';
  const requestedSettings = onSettingsChange ? settings : localSettings;
  // Same gate as the export pipeline, so what is shown is what gets rendered.
  const gate = useMemo(() => enforceExportEntitlements(requestedSettings, capabilities), [requestedSettings, capabilities]);
  const activeSettings = gate.settings;
  const presetId = activeSettings.presetId ?? '720p-widescreen';
  const activePreset = getExportPreset(presetId);
  const watermarkOn = activeSettings.watermark !== false;

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

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

  const updateSettings = (next: ExportSettings) => {
    setLocalSettings(next);
    onSettingsChange?.(next);
  };

  const presetLocked = (preset: ExportPreset) => isProPreset(preset) && !capabilities.export1080p;

  const selectPreset = (preset: ExportPreset) => {
    if (rendering) return;
    if (presetLocked(preset)) {
      setUpsellHighlighted(true);
      return;
    }
    setUpsellHighlighted(false);
    updateSettings(exportSettingsFromPreset(preset.id as ExportPresetId, watermarkOn));
  };

  const toggleWatermark = (checked: boolean) => {
    if (rendering) return;
    if (!capabilities.removeWatermark) {
      setUpsellHighlighted(true);
      return;
    }
    updateSettings({ ...activeSettings, watermark: checked });
  };

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
        settings: activeSettings,
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
        filename: `${analysis.name.replace(/[^a-z0-9_-]+/gi, '-') || 'visual-melody'}-${activePreset.suffix}.mp4`,
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
        <p>{copy.exportNote.replace('{resolution}', `${activeSettings.width}×${activeSettings.height}`)}</p>
      </div>
      <div className="export-grid">
        <GlassPanel className="span-2">
          <div className="panel-heading"><Film size={18} /><h2>{t('formatGrid')}</h2></div>
          <div className="plan-row">
            <span className="muted">{copy.planLabel}</span>
            <span className={`plan-chip${isPro ? ' pro' : ''}`} data-testid="plan-chip">
              {isPro ? <Crown size={14} /> : null}
              {isPro ? copy.planPro : copy.planFree}
              {entitlements.source === 'dev-override' ? <em>· {copy.devOverride}</em> : null}
            </span>
            {entitlements.source === 'dev-override' && !devPlanForcedByBuild() ? (
              <button onClick={() => setDevPlan(null)} type="button">{copy.disableDevOverride}</button>
            ) : null}
          </div>
          <div className="format-grid">
            {EXPORT_PRESETS.map((preset) => {
              const locked = presetLocked(preset);
              const classes = [presetId === preset.id ? 'selected' : '', locked ? 'locked' : ''].filter(Boolean).join(' ');
              return (
                <button
                  key={preset.id}
                  aria-disabled={locked || undefined}
                  aria-pressed={presetId === preset.id}
                  className={classes || undefined}
                  disabled={rendering}
                  onClick={() => selectPreset(preset)}
                  title={locked ? copy.lockedPreset : undefined}
                  type="button"
                >
                  {PRESET_LABELS[preset.id]}
                  {isProPreset(preset) ? (
                    <span className="pro-badge">{locked ? <Lock size={10} /> : null}{copy.proBadge}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <label className="watermark-toggle">
            <input
              checked={watermarkOn}
              disabled={rendering || !capabilities.removeWatermark}
              onChange={(event) => toggleWatermark(event.target.checked)}
              type="checkbox"
            />
            <span>{copy.watermarkLabel}</span>
            {!capabilities.removeWatermark ? <span className="pro-badge"><Lock size={10} />{copy.proBadge}</span> : null}
          </label>
          <p className="muted watermark-note">{capabilities.removeWatermark ? copy.watermarkPro : copy.watermarkFree}</p>
          {gate.downgraded ? <p className="muted" role="note">{copy.downgraded}</p> : null}
          {!isPro ? (
            <div className={`pro-upsell${upsellHighlighted ? ' highlight' : ''}`} role="status">
              <strong><Crown size={16} /> {copy.upsellTitle}</strong>
              {upsellHighlighted ? <p>{copy.lockedPreset}</p> : null}
              <p>{copy.upsellBody}</p>
              <p className="muted">{copy.upsellSoon}</p>
            </div>
          ) : null}
        </GlassPanel>
        <GlassPanel>
          <div className="panel-heading"><Gauge size={18} /><h2>{t('renderProgress')}</h2></div>
          <p className="export-focus-notice" role="note"><AlertTriangle size={17} />{t('keepTabActive')}</p>
          <canvas
            aria-label={t('renderedFrame')}
            className={`render-preview${activeSettings.height > activeSettings.width ? ' render-preview-vertical' : ''}`}
            ref={canvasRef}
            width={activeSettings.width}
            height={activeSettings.height}
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
