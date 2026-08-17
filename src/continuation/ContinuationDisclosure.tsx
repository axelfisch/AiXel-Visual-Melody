import { ShieldCheck, Trash2, X } from 'lucide-react';
import { useLocale } from '../i18n/LocaleContext';

export function ContinuationDisclosure({
  busy = false,
  onContinue,
  onCancel,
  onClear,
}: {
  busy?: boolean;
  onContinue: () => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  const { t } = useLocale();
  return (
    <div aria-labelledby="continuation-title" aria-modal="true" className="continuation-backdrop" role="dialog">
      <div className="continuation-dialog">
        <button aria-label={t('continuationCancel')} className="icon-action continuation-close" onClick={onCancel}>
          <X size={18} />
        </button>
        <ShieldCheck size={24} />
        <h2 id="continuation-title">{t('continuationTitle')}</h2>
        <p>{t('continuationDisclosure')}</p>
        <p className="muted">{t('continuationPrivacy')}</p>
        <div className="continuation-actions">
          <button className="primary-action" disabled={busy} onClick={onContinue}>
            {t('continuationContinue')}
          </button>
          <button className="secondary-action" disabled={busy} onClick={onCancel}>
            {t('continuationCancel')}
          </button>
          <button className="ghost-action" disabled={busy} onClick={onClear}>
            <Trash2 size={16} /> {t('continuationClear')}
          </button>
        </div>
      </div>
    </div>
  );
}
