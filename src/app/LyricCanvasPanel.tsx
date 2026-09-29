import React, { useMemo, useRef, useState } from 'react';
import { ImagePlus, ListMusic, RotateCcw, Timer, Trash2, Type } from 'lucide-react';
import { GlassPanel } from '../components/layout/GlassPanel';
import { IMAGE_PULSE_ACCEPT } from '../engines/image-pulse/imagePulse.types';
import { ImagePulseUploadError } from '../engines/image-pulse/imagePulse.upload';
import { LYRIC_SAMPLE } from '../engines/lyric-canvas/lyricCanvas.i18n';
import { buildLyricTimeline, summarizeLyrics, timelineToLrc } from '../engines/lyric-canvas/lyricCanvas.timing';
import {
  LYRIC_CANVAS_BACKGROUNDS,
  LYRIC_CANVAS_PRESETS,
  type LyricCanvasBackground,
  type LyricCanvasPreset,
} from '../engines/lyric-canvas/lyricCanvas.types';
import { useLocale } from '../i18n/LocaleContext';
import type { EngineParameterValue, ProjectImage, ProjectLyrics } from '../project/project.types';
import { PanelHeading } from './appVisuals';

const presetKeys: Record<LyricCanvasPreset, string> = {
  karaoke: 'lyricsPresetKaraoke',
  kinetic: 'lyricsPresetKinetic',
  neon: 'lyricsPresetNeon',
  typewriter: 'lyricsPresetTypewriter',
  cinematic: 'lyricsPresetCinematic',
};
const backgroundKeys: Record<LyricCanvasBackground, string> = {
  aurora: 'lyricsBackgroundAurora',
  particles: 'lyricsBackgroundParticles',
  image: 'lyricsBackgroundImage',
};

const OFFSET_UI_LIMIT = 10;

function fill(template: string, values: Record<string, number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

export function LyricCanvasPanel({
  lyrics,
  engineParameters,
  image = null,
  trackDuration = null,
  bpm = null,
  onLyrics,
  onEngineParameter,
  onImageFile = async () => undefined,
  onClearImage = () => undefined,
}: {
  lyrics: ProjectLyrics;
  engineParameters: Record<string, EngineParameterValue>;
  image?: ProjectImage | null;
  trackDuration?: number | null;
  bpm?: number | null;
  onLyrics: (lyrics: Partial<ProjectLyrics>) => void;
  onEngineParameter: (parameterId: string, value: EngineParameterValue) => void;
  onImageFile?: (file: File) => Promise<void>;
  onClearImage?: () => void;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');
  const preset = (LYRIC_CANVAS_PRESETS.includes(engineParameters.preset as LyricCanvasPreset)
    ? engineParameters.preset : 'karaoke') as LyricCanvasPreset;
  const background = (LYRIC_CANVAS_BACKGROUNDS.includes(engineParameters.background as LyricCanvasBackground)
    ? engineParameters.background : 'aurora') as LyricCanvasBackground;
  const summary = useMemo(() => summarizeLyrics(lyrics.text), [lyrics.text]);
  const offset = Math.max(-OFFSET_UI_LIMIT, Math.min(OFFSET_UI_LIMIT, lyrics.offset));

  const status = summary.lines === 0
    ? t('lyricsEmpty')
    : fill(t(summary.timed ? 'lyricsStatsTimed' : 'lyricsStatsAuto'), { lines: summary.lines, sections: summary.sections });

  const convertToLrc = () => {
    const timeline = buildLyricTimeline(lyrics.text, trackDuration ?? 0, bpm ?? 120, lyrics.offset);
    onLyrics({ text: timelineToLrc(timeline), offset: 0 });
  };

  const acceptImage = async (file: File | undefined) => {
    if (!file) return;
    setImageError('');
    try {
      await onImageFile(file);
      onEngineParameter('background', 'image');
    } catch (reason) {
      const code = reason instanceof ImagePulseUploadError ? reason.code : 'decode-failed';
      setImageError(code === 'unsupported-type' ? t('pulseErrorType') : code === 'too-large' ? t('pulseErrorSize') : t('pulseErrorDecode'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <GlassPanel className="lyrics-options">
      <PanelHeading icon={<ListMusic size={18} />} label={t('lyricsOptions')} />
      <label className="lyrics-field">
        <span className="tiny-label">{t('lyricsLabel')}</span>
        <textarea
          aria-label={t('lyricsLabel')}
          rows={9}
          spellCheck={false}
          value={lyrics.text}
          placeholder={t('lyricsPlaceholder')}
          onChange={(event) => onLyrics({ text: event.target.value })}
        />
      </label>
      <p className="muted lyrics-help">{t('lyricsHelp')}</p>
      <p className="lyrics-status" role="status">{status}</p>
      {!trackDuration && summary.lines > 0 && !summary.timed ? <p className="muted lyrics-note">{t('lyricsNoTrack')}</p> : null}
      <div className="lyrics-actions">
        {summary.lines === 0 ? (
          <button type="button" className="secondary-action" onClick={() => onLyrics({ text: LYRIC_SAMPLE, offset: 0 })}>
            <Type size={15} /> {t('lyricsSample')}
          </button>
        ) : null}
        {summary.lines > 0 && !summary.timed ? (
          <button type="button" className="secondary-action" title={t('lyricsToLrcHelp')} onClick={convertToLrc}>
            <Timer size={15} /> {t('lyricsToLrc')}
          </button>
        ) : null}
      </div>

      <p className="muted lyrics-subhead">{t('lyricsPresetHelp')}</p>
      <div className="chips wrap" role="group" aria-label={t('lyricsPreset')}>
        {LYRIC_CANVAS_PRESETS.map((item) => (
          <button className={preset === item ? 'selected' : ''} key={item} onClick={() => onEngineParameter('preset', item)}>
            {t(presetKeys[item])}
          </button>
        ))}
      </div>

      <div className="chips wrap lyrics-background" role="group" aria-label={t('lyricsBackground')}>
        {LYRIC_CANVAS_BACKGROUNDS.map((item) => (
          <button className={background === item ? 'selected' : ''} key={item} onClick={() => onEngineParameter('background', item)}>
            {t(backgroundKeys[item])}
          </button>
        ))}
      </div>
      {background === 'image' ? (
        <div className="lyrics-image-row">
          {image?.objectUrl ? <img className="lyrics-thumb" src={image.objectUrl} alt="" /> : null}
          <p className="muted">{t('lyricsImageHint')}</p>
          <button type="button" className="secondary-action" onClick={() => inputRef.current?.click()}>
            <ImagePlus size={15} /> {t('lyricsChooseImage')}
          </button>
          {image?.objectUrl ? (
            <button type="button" className="secondary-action" onClick={onClearImage}>
              <Trash2 size={15} /> {t('lyricsRemoveImage')}
            </button>
          ) : null}
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept={IMAGE_PULSE_ACCEPT}
            aria-label={t('lyricsChooseImage')}
            onChange={(event) => void acceptImage(event.target.files?.[0])}
          />
        </div>
      ) : null}
      {imageError ? <p className="pulse-error" role="alert">{imageError}</p> : null}

      <div className="lyrics-offset">
        <label>
          <span>
            {t('lyricsOffset')}
            <em>{offset > 0 ? '+' : ''}{offset.toFixed(1)} s</em>
          </span>
          <input
            aria-label={t('lyricsOffset')}
            type="range"
            min={-OFFSET_UI_LIMIT}
            max={OFFSET_UI_LIMIT}
            step={0.1}
            value={offset}
            onChange={(event) => onLyrics({ offset: Number(event.target.value) })}
          />
        </label>
        <button type="button" className="secondary-action" disabled={lyrics.offset === 0} onClick={() => onLyrics({ offset: 0 })}>
          <RotateCcw size={15} /> {t('lyricsOffsetReset')}
        </button>
      </div>
      <p className="muted lyrics-note">{t('lyricsOffsetHelp')}</p>
    </GlassPanel>
  );
}
