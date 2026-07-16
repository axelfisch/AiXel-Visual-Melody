import { Download, FileAudio, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { formatTime } from '../audio';
import { Waveform } from '../components/audio/Waveform';
import { GlassPanel } from '../components/layout/GlassPanel';
import { MinimalAlbumArtCanvas } from '../engines/minimal-album-art/MinimalAlbumArtCanvas';
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
  const { project } = useProject();
  const audioUrl = project.audio?.objectUrl ?? null;
  const duration = project.audio?.duration ?? 0;
  const playback = useSynchronizedPlayback({
    source: audioUrl,
    sourceDuration: duration,
    autoPlay,
    onAutoPlayHandled,
  });

  if (!canPreview(project) || !project.analysis || !project.audio) {
    return (
      <section className="screen preview-screen">
        <GlassPanel className="preview-empty">
          <FileAudio size={28} />
          <p className="eyebrow">Preview</p>
          <h1>La musique doit d’abord être analysée.</h1>
          <p>Importez une piste ou ouvrez le Golden Reference pour activer la Preview audio-réactive.</p>
          <button className="primary-action" onClick={() => onNavigate('analyze')}>Open Analyze</button>
        </GlassPanel>
      </section>
    );
  }

  return (
    <section className="screen preview-screen">
      <div className="cinema">
        <MinimalAlbumArtCanvas
          analysis={project.analysis}
          duration={duration}
          time={playback.currentTime}
          title={project.name}
        />
        <div className="cinema-overlay">
          <div>
            <p className="tiny-label">Minimal Album Art · Live Preview</p>
            <h1>{project.name}</h1>
            <p className="poetic">Le disque réagit à l’énergie réelle du signal.</p>
          </div>
          <button className="primary-action" onClick={() => onNavigate('export')}>
            Export
            <Download size={17} />
          </button>
        </div>
      </div>

      <GlassPanel className="transport">
        <div className="transport-main">
          <button
            className="icon-button"
            onClick={() => void playback.togglePlayback()}
            aria-label={playback.playing ? 'Pause preview' : 'Play preview'}
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
              aria-label={playback.muted ? 'Unmute preview' : 'Mute preview'}
            >
              {playback.muted || playback.volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <input
              aria-label="Preview volume"
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

        <div className="quality" aria-label="Preview quality">
          <button className="selected">1080p</button>
          <button disabled title="Disponible dans une future version">4K</button>
          <button disabled title="Disponible dans une future version">8K</button>
        </div>

        <audio ref={playback.audioRef} src={audioUrl ?? undefined} preload="metadata" />
      </GlassPanel>
    </section>
  );
}
