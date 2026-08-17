import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from './SessionContext';
import type { AuthAdapter, AuthSessionSnapshot } from './session.types';

afterEach(cleanup);

function SessionProbe() {
  const session = useSession();
  return (
    <div>
      <span data-testid="status">{session.status}</span>
      <span data-testid="user">{session.user?.id ?? 'none'}</span>
      <span data-testid="available">{String(session.available)}</span>
      <span data-testid="error">{session.error}</span>
    </div>
  );
}

function adapterWith(
  getSession: AuthAdapter['getSession'],
  onChange: (callback: (session: AuthSessionSnapshot | null) => void) => void = () => undefined,
): AuthAdapter {
  return {
    getSession,
    onAuthStateChange(callback) {
      onChange(callback);
      return { unsubscribe: vi.fn() };
    },
    signInWithMagicLink: vi.fn(async () => null),
    signInWithGoogle: vi.fn(async () => null),
    signOut: vi.fn(async () => null),
    reauthenticate: vi.fn(async () => null),
  };
}

describe('SessionProvider', () => {
  it('keeps anonymous mode fully available when authentication is not configured', () => {
    render(<SessionProvider adapter={null}><SessionProbe /></SessionProvider>);
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('available')).toHaveTextContent('false');
  });

  it('exposes loading until the initial session is known, then authenticates', async () => {
    let resolveSession!: (value: Awaited<ReturnType<AuthAdapter['getSession']>>) => void;
    const pending = new Promise<Awaited<ReturnType<AuthAdapter['getSession']>>>((resolve) => {
      resolveSession = resolve;
    });
    render(<SessionProvider adapter={adapterWith(() => pending)}><SessionProbe /></SessionProvider>);
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    expect(screen.getByTestId('user')).toHaveTextContent('none');

    await act(async () => resolveSession({
      session: { user: { id: 'user-a', email: 'artist@example.test' } },
      error: null,
    }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('user-a');
  });

  it('moves to a stable error state when session restoration fails', async () => {
    render(
      <SessionProvider adapter={adapterWith(async () => ({ session: null, error: new Error('offline') }))}>
        <SessionProbe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('error')).toHaveTextContent('offline');
  });
});
