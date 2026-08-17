import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readPublicEnvironment } from '../config/environment';
import type { Database } from './database.types';

let cachedClient: SupabaseClient<Database> | null | undefined;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (cachedClient !== undefined) return cachedClient;
  const environment = readPublicEnvironment();
  if (!environment.supabase) {
    cachedClient = null;
    return cachedClient;
  }
  cachedClient = createClient<Database>(environment.supabase.url, environment.supabase.publishableKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  return cachedClient;
}

export function resetSupabaseClientForTests() {
  cachedClient = undefined;
}
