import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { approvedAuthReturnUrl, readPublicEnvironment } from '../config/environment';
import { ContinuationRepository } from '../continuation';
import { getSupabaseClient } from '../supabase/client';
import { createSupabaseAuthAdapter } from './supabaseAuthAdapter';
import type { AuthAdapter, SessionStatus, SessionUser } from './session.types';

type SessionContextValue = {
  status: SessionStatus;
  user: SessionUser | null;
  available: boolean;
  error: string;
  signInWithMagicLink: (email: string, draftId?: string | null) => Promise<void>;
  signInWithGoogle: (draftId?: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  requestReauthentication: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function defaultAdapter(): { adapter: AuthAdapter | null; error: string } {
  try {
    const client = getSupabaseClient();
    return { adapter: client ? createSupabaseAuthAdapter(client) : null, error: '' };
  } catch (reason) {
    return { adapter: null, error: reason instanceof Error ? reason.message : 'Authentication configuration failed.' };
  }
}

export function SessionProvider({ children, adapter }: { children: ReactNode; adapter?: AuthAdapter | null }) {
  const [initial] = useState(() => adapter === undefined ? defaultAdapter() : { adapter, error: '' });
  const resolvedAdapter = initial.adapter;
  const [status, setStatus] = useState<SessionStatus>(initial.error ? 'error' : resolvedAdapter ? 'loading' : 'anonymous');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState(initial.error);

  useEffect(() => {
    if (!resolvedAdapter) return;
    let active = true;
    const subscription = resolvedAdapter.onAuthStateChange((session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
      setError('');
    });
    void resolvedAdapter.getSession()
      .then(({ session, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setStatus('error');
          setError(sessionError.message);
          return;
        }
        setUser(session?.user ?? null);
        setStatus(session ? 'authenticated' : 'anonymous');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setStatus('error');
        setError(reason instanceof Error ? reason.message : 'Authentication failed.');
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [resolvedAdapter]);

  const run = async (operation: () => Promise<Error | null>) => {
    setError('');
    const operationError = await operation();
    if (operationError) {
      setError(operationError.message);
      throw operationError;
    }
  };

  const value = useMemo<SessionContextValue>(() => ({
    status,
    user,
    available: resolvedAdapter !== null,
    error,
    async signInWithMagicLink(email, draftId = null) {
      if (!resolvedAdapter) throw new Error('Authentication is not configured.');
      const redirectTo = approvedAuthReturnUrl(readPublicEnvironment(), { draftId });
      await run(() => resolvedAdapter.signInWithMagicLink(email.trim(), redirectTo));
    },
    async signInWithGoogle(draftId = null) {
      if (!resolvedAdapter) throw new Error('Authentication is not configured.');
      const redirectTo = approvedAuthReturnUrl(readPublicEnvironment(), { draftId });
      await run(() => resolvedAdapter.signInWithGoogle(redirectTo));
    },
    async signOut() {
      if (!resolvedAdapter) return;
      const signingOutUser = user;
      await run(() => resolvedAdapter.signOut());
      if (signingOutUser && globalThis.indexedDB) {
        try {
          await new ContinuationRepository().releaseUserBindings(signingOutUser.id);
        } catch {
          // The server session is already signed out; local cleanup retries on later access.
        }
      }
    },
    async requestReauthentication() {
      if (!resolvedAdapter || !user) throw new Error('A signed-in account is required.');
      await run(() => resolvedAdapter.reauthenticate());
    },
  }), [error, resolvedAdapter, status, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider.');
  return context;
}
