import React, { useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { GlassPanel } from '../components/layout/GlassPanel';
import {
  IMAGE_PULSE_ACCEPT,
  IMAGE_PULSE_FRAMINGS,
  IMAGE_PULSE_STYLES,
  type ImagePulseFraming,
  type ImagePulseStyle,
} from '../engines/image-pulse/imagePulse.types';
import { ImagePulseUploadError } from '../engines/image-pulse/imagePulse.upload';
import { useLocale } from '../i18n/LocaleContext';
import type { EngineParameterValue, ProjectImage } from '../project/project.types';
import { PanelHeading } from './appVisuals';

const styleKeys: Record<ImagePulseStyle, string> = {
  pulse: 'pulseStylePulse',
  glow: 'pulseStyleGlow',
  ripple: 'pulseStyleRipple',
  glitch: 'pulseStyleGlitch',
  kaleido: 'pulseStyleKaleido',
};
const framingKeys: Record<ImagePulseFraming, string> = { fill: 'pulseFramingFill', card: 'pulseFramingCard' };

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ImagePulsePanel({
  image,
  engineParameters,
  onImageFile,
  onClearImage,
  onEngineParameter,
}: {
  image: ProjectImage | null;
  engineParameters: Record<string, EngineParameterValue>;
  onImageFile: (file: File) => Promise<void>;
  onClearImage: () => void;
  onEngineParameter: (parameterId: string, value: EngineParameterValue) => void;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const style = (IMAGE_PULSE_STYLES.includes(engineParameters.style as ImagePulseStyle)
    ? engineParameters.style : 'pulse') as ImagePulseStyle;
  const framing = (IMAGE_PULSE_FRAMINGS.includes(engineParameters.framing as ImagePulseFraming)
    ? engineParameters.framing : 'fill') as ImagePulseFraming;

  const accept = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await onImageFile(file);
    } catch (reason) {
      const code = reason instanceof ImagePulseUploadError ? reason.code : 'decode-failed';
      setError(code === 'unsupported-type' ? t('pulseErrorType') : code === 'too-large' ? t('pulseErrorSize') : t('pulseErrorDecode'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void accept(event.dataTransfer.files?.[0]);
  };

  return (
    <GlassPanel className="pulse-options">
      <PanelHeading icon={<Sparkles size={18} />} label={t('pulseOptions')} />
      <div
        className={`pulse-dropzone${dragging ? ' dragging' : ''}${image?.objectUrl ? ' has-image' : ''}`}
        data-testid="pulse-dropzone"
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {image?.objectUrl ? (
          <div className="pulse-image-row">
            <img className="pulse-thumb" src={image.objectUrl} alt={t('pulseImageAlt')} />
            <div className="pulse-image-meta">
              <strong>{image.fileName}</strong>
              <span className="muted">
                {image.width}×{image.height} · {formatSize(image.size)}
              </span>
              <div className="pulse-image-actions">
                <button type="button" className="secondary-action" disabled={busy} onClick={() => inputRef.current?.click()}>
                  <RefreshCw size={15} /> {t('pulseReplaceImage')}
                </button>
                <button type="button" className="secondary-action" disabled={busy} onClick={() => { setError(''); onClearImage(); }}>
                  <Trash2 size={15} /> {t('pulseRemoveImage')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pulse-empty">
            <ImagePlus size={26} />
            <strong>{t('pulseUploadTitle')}</strong>
            <p className="muted">{t('pulseUploadHelp')}</p>
            <button type="button" className="primary-action" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? t('pulseLoadingImage') : t('pulseChooseImage')}
            </button>
            <p className="muted pulse-no-image">{t('pulseNoImage')}</p>
          </div>
        )}
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept={IMAGE_PULSE_ACCEPT}
          aria-label={t('pulseChooseImage')}
          onChange={(event) => void accept(event.target.files?.[0])}
        />
      </div>
      {error ? <p className="pulse-error" role="alert">{error}</p> : null}
      <p className="muted pulse-style-help">{t('pulseStyleHelp')}</p>
      <div className="chips wrap" role="group" aria-label={t('pulseStyle')}>
        {IMAGE_PULSE_STYLES.map((item) => (
          <button className={style === item ? 'selected' : ''} key={item} onClick={() => onEngineParameter('style', item)}>
            {t(styleKeys[item])}
          </button>
        ))}
      </div>
      <div className="chips wrap pulse-framing" role="group" aria-label={t('pulseFraming')}>
        {IMAGE_PULSE_FRAMINGS.map((item) => (
          <button className={framing === item ? 'selected' : ''} key={item} onClick={() => onEngineParameter('framing', item)}>
            {t(framingKeys[item])}
          </button>
        ))}
      </div>
    </GlassPanel>
  );
}
