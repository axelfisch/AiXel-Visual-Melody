import { LogIn, LogOut, Mail, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useSession } from './SessionContext';

export function AccountControl() {
  const { t } = useLocale();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!session.available && session.status === 'anonymous') return null;

  const submitMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await session.signInWithMagicLink(email);
      setMessage(t('authMagicSent'));
    } catch {
      // The provider exposes one stable, user-safe error surface below.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-control">
      <button
        aria-expanded={open}
        aria-label={session.user?.email ?? t('authOpen')}
        className="icon-button"
        onClick={() => setOpen((value) => !value)}
      >
        <UserRound size={17} />
      </button>
      {open && (
        <div className="account-popover">
          {session.status === 'loading' ? (
            <p>{t('authLoading')}</p>
          ) : session.status === 'authenticated' && session.user ? (
            <>
              <p className="tiny-label">{t('authSignedIn')}</p>
              <strong>{session.user.email ?? t('authAccount')}</strong>
              <button className="secondary-action full" disabled={busy} onClick={() => void session.signOut().catch(() => undefined)}>
                <LogOut size={16} /> {t('authSignOut')}
              </button>
            </>
          ) : (
            <>
              <h2>{t('authSignIn')}</h2>
              <p className="muted">{t('authOptional')}</p>
              <form onSubmit={(event) => void submitMagicLink(event)}>
                <label htmlFor="auth-email">{t('authEmail')}</label>
                <input
                  autoComplete="email"
                  id="auth-email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
                <button className="primary-action full" disabled={busy} type="submit">
                  <Mail size={16} /> {t('authMagicLink')}
                </button>
              </form>
              <button
                className="secondary-action full"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void session.signInWithGoogle().catch(() => undefined).finally(() => setBusy(false));
                }}
              >
                <LogIn size={16} /> {t('authGoogle')}
              </button>
            </>
          )}
          {(session.error || message) && (
            <p className={session.error ? 'error-message' : 'success-message'} role="status">
              {session.error || message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
