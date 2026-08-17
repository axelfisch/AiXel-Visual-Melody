import { Download, FileAudio, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { formatTime } from '../audio';
import { Waveform } from '../components/audio/Waveform';
import { GlassPanel } from '../components/layout/GlassPanel';
import { EngineCanvas, PREVIEW_FRAME } from '../engines/EngineCanvas';
import { getEngineOrDefault } from '../engines/engine.registry';
import { useCapabilities } from '../entitlements';
import { EXPORT_RESOLUTIONS, frameLabel, isResolutionAllowed, resolutionOf } from '../export/exportFormats';
import { useLocale } from '../i18n/LocaleContext';
import { useSynchronizedPlayback } from '../preview/useSynchronizedPlayback';
import { useProject } from '../project/project.context';
import { canPreview } from '../project/project.selectors';
import type { Screen } from '../app/navigation';

export function PreviewScreen({
  onNavigate,
  autoPlay,
  onAutoPlayHandled,
}: {
  onNavigate: (screen: Screen) => void;
  autoPlay: boolean;
  onAutoPlayHandled: () => void;
}) {
  const { locale, t } = useLocale();
  const { project, runtime } = useProject();
  const capabilities = useCapabilities();
  const engine = getEngineOrDefault(project.engine.engineId);
  const audioUrl = runtime.objectUrl;
  const duration = project.sourceHint?.duration ?? 0;
  // The label must describe the canvas that is actually on screen.
  const previewResolution = resolutionOf(PREVIEW_FRAME);
  const playback = useSynchronizedPlayback({
    source: audioUrl,
    sourceDuration: duration,
    autoPlay,
    onAutoPlayHandled,
  });
  const poeticLine = locale === 'fr' ? (engine.id === 'cosmic-waves'
    ? 'Les vagues de lumière respirent avec l’énergie réelle du signal.'
    : engine.id === 'jazz-geometry'
      ? 'Les cercles harmoniques dessinent la géométrie vivante du morceau.'
      : engine.id === 'liquid-colors'
        ? 'L’encre lumineuse se replie et respire avec la musique.'
        : engine.id === 'frequency-city'
          ? 'La ville s’élève et pulse dans l’architecture du spectre.'
          : engine.id === 'neon-velvet'
            ? 'La lumière glisse comme du velours électrique dans la nuit.'
            : 'Le disque réagit à l’énergie réelle du signal.') : (engine.id === 'cosmic-waves'
    ? 'Waves of light breathe with the real energy of the signal.'
    : engine.id === 'jazz-geometry'
      ? 'Harmonic circles draw the living geometry of the track.'
      : engine.id === 'liquid-colors'
        ? 'Luminous ink folds and breathes with the music.'
        : engine.id === 'frequency-city'
          ? 'The city rises and pulses through the architecture of the spectrum.'
          : engine.id === 'neon-velvet'
            ? 'Light glides like electric velvet through the night.'
            : 'The record reacts to the real energy of the signal.');

  if (!canPreview(project, runtime) || !project.analysis || !project.sourceHint) {
    return (
      <section className="screen preview-screen">
        <GlassPanel className="preview-empty">
          <FileAudio size={28} />
          <p className="eyebrow">{t('preview')}</p>
          <h1>{t('previewNeedsAnalysis')}</h1>
          <p>{t('previewEmptyHelp')}</p>
          <button className="primary-action" onClick={() => onNavigate('analyze')}>{t('openAnalyze')}</button>
        </GlassPanel>
      </section>
    );
  }

  return (
    <section className="screen preview-screen">
      <div className="cinema">
        <EngineCanvas
          analysis={project.analysis}
          config={project.engine.parameters}
          duration={duration}
          engine={engine}
          time={playback.currentTime}
          title={project.name}
        />
        <div className="cinema-overlay">
          <div>
            <p className="tiny-label">{engine.name} · {t('livePreview')}</p>
            <h1>{project.name}</h1>
            <p className="poetic">{poeticLine}</p>
          </div>
          <button className="primary-action" onClick={() => onNavigate('export')}>
            {t('export')}
            <Download size={17} />
          </button>
        </div>
      </div>

      <GlassPanel className="transport">
        <div className="transport-main">
          <button
            className="icon-button"
            onClick={() => void playback.togglePlayback()}
            aria-label={playback.playing ? t('pausePreview') : t('playPreview')}
          >
            {playback.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>

          <div className="timeline-control">
            <Waveform bars={project.analysis.waveform.slice(0, 64)} />
            <input
              aria-label="Position"
              type="range"
              min="0"
              max={duration || 1}
              step="0.01"
              value={playback.currentTime}
              onChange={(event) => playback.seek(Number(event.target.value))}
            />
          </div>

          <span className="transport-time">
            {formatTime(playback.currentTime)} / {formatTime(duration)}
          </span>

          <div className="volume-control">
            <button
              className="icon-button"
              onClick={playback.toggleMuted}
              aria-label={playback.muted ? t('unmutePreview') : t('mutePreview')}
            >
              {playback.muted || playback.volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <input
              aria-label={t('previewVolume')}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={playback.volume}
              onChange={(event) => playback.setVolume(Number(event.target.value))}
            />
            <span>{playback.muted ? 0 : Math.round(playback.volume * 100)}%</span>
          </div>
        </div>

        <div className="quality" aria-label={t('previewQuality')}>
          {EXPORT_RESOLUTIONS.map((resolution) => {
            const active = resolution === previewResolution;
            const allowed = isResolutionAllowed(resolution, capabilities);
            return (
              <button
                className={active ? 'selected' : ''}
                key={resolution}
                disabled={!active}
                title={active ? frameLabel(PREVIEW_FRAME) : allowed ? t('futureVersion') : t('creatorProOnly')}
              >
                {resolution}
                {!allowed && <em className="pro-tag">{t('proTag')}</em>}
              </button>
            );
          })}
          <button disabled title={t('futureVersion')}>4K</button>
          <button disabled title={t('futureVersion')}>8K</button>
        </div>

        <audio ref={playback.audioRef} src={audioUrl ?? undefined} preload="metadata" />
      </GlassPanel>
    </section>
  );
}
