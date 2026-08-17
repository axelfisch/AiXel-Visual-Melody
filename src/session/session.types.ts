export type SessionStatus = 'loading' | 'anonymous' | 'authenticated' | 'error';

export type SessionUser = {
  id: string;
  email: string | null;
};

export type AuthSessionSnapshot = {
  user: SessionUser;
};

export type AuthAdapter = {
  getSession: () => Promise<{ session: AuthSessionSnapshot | null; error: Error | null }>;
  onAuthStateChange: (
    callback: (session: AuthSessionSnapshot | null) => void,
  ) => { unsubscribe: () => void };
  signInWithMagicLink: (email: string, redirectTo: string) => Promise<Error | null>;
  signInWithGoogle: (redirectTo: string) => Promise<Error | null>;
  signOut: () => Promise<Error | null>;
  reauthenticate: () => Promise<Error | null>;
};
