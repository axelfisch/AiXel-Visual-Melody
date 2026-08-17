import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import type { AuthAdapter, AuthSessionSnapshot } from './session.types';

const snapshot = (session: { user: { id: string; email?: string } } | null): AuthSessionSnapshot | null =>
  session ? { user: { id: session.user.id, email: session.user.email ?? null } } : null;

export function createSupabaseAuthAdapter(client: SupabaseClient<Database>): AuthAdapter {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      return { session: snapshot(data.session), error };
    },
    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => callback(snapshot(session)));
      return { unsubscribe: () => data.subscription.unsubscribe() };
    },
    async signInWithMagicLink(email, redirectTo) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      return error;
    },
    async signInWithGoogle(redirectTo) {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      return error;
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      return error;
    },
    async reauthenticate() {
      const { error } = await client.auth.reauthenticate();
      return error;
    },
  };
}
