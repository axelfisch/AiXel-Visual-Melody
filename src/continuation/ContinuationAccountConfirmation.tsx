import { ShieldCheck } from 'lucide-react';
import { useLocale } from '../i18n/LocaleContext';

export function ContinuationAccountConfirmation({
  accountLabel,
  busy = false,
  onConfirm,
  onCancel,
  onClear,
}: {
  accountLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  const { t } = useLocale();
  return (
    <div aria-labelledby="continuation-account-title" aria-modal="true" className="continuation-backdrop" role="dialog">
      <div className="continuation-dialog">
        <ShieldCheck size={24} />
        <h2 id="continuation-account-title">{t('continuationAccountTitle')}</h2>
        <p>{t('continuationAccountBody')} <strong>{accountLabel}</strong></p>
        <div className="continuation-actions">
          <button className="primary-action" disabled={busy} onClick={onConfirm}>{t('continuationAccountConfirm')}</button>
          <button className="secondary-action" disabled={busy} onClick={onCancel}>{t('continuationCancel')}</button>
          <button className="ghost-action" disabled={busy} onClick={onClear}>{t('continuationClear')}</button>
        </div>
      </div>
    </div>
  );
}
