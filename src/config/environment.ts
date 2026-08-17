export type PublicEnvironment = {
  supabase: { url: string; publishableKey: string } | null;
  appOrigin: string;
  allowedAuthOrigins: ReadonlySet<string>;
};

export class EnvironmentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentConfigurationError';
  }
}

function normalizedOrigin(value: string, field: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EnvironmentConfigurationError(`${field} must be an absolute URL.`);
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new EnvironmentConfigurationError(`${field} must use HTTPS outside local development.`);
  }
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new EnvironmentConfigurationError(`${field} must contain an origin only.`);
  }
  return url.origin;
}

export function readPublicEnvironment(
  source: Record<string, string | boolean | undefined> = import.meta.env,
  currentOrigin = window.location.origin,
): PublicEnvironment {
  const supabaseUrl = typeof source.VITE_SUPABASE_URL === 'string' ? source.VITE_SUPABASE_URL.trim() : '';
  const publishableKey = typeof source.VITE_SUPABASE_PUBLISHABLE_KEY === 'string'
    ? source.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
    : '';
  const appOriginValue = typeof source.VITE_APP_ORIGIN === 'string' && source.VITE_APP_ORIGIN.trim()
    ? source.VITE_APP_ORIGIN.trim()
    : currentOrigin;
  const appOrigin = normalizedOrigin(appOriginValue, 'VITE_APP_ORIGIN');

  const configuredOrigins = typeof source.VITE_ALLOWED_AUTH_ORIGINS === 'string'
    ? source.VITE_ALLOWED_AUTH_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)
    : [];
  const allowedAuthOrigins = new Set<string>([
    appOrigin,
    ...configuredOrigins.map((value) => normalizedOrigin(value, 'VITE_ALLOWED_AUTH_ORIGINS')),
  ]);

  if (!supabaseUrl && !publishableKey) return { supabase: null, appOrigin, allowedAuthOrigins };
  if (!supabaseUrl || !publishableKey) {
    throw new EnvironmentConfigurationError('Supabase URL and publishable key must be configured together.');
  }
  const parsedSupabaseUrl = normalizedOrigin(supabaseUrl, 'VITE_SUPABASE_URL');
  if (!publishableKey.startsWith('sb_publishable_') && !publishableKey.startsWith('eyJ')) {
    throw new EnvironmentConfigurationError('VITE_SUPABASE_PUBLISHABLE_KEY is not a browser publishable key.');
  }
  if (/service[_-]?role|secret/i.test(publishableKey)) {
    throw new EnvironmentConfigurationError('A server secret cannot be used in the browser bundle.');
  }
  return {
    supabase: { url: parsedSupabaseUrl, publishableKey },
    appOrigin,
    allowedAuthOrigins,
  };
}

export function approvedAuthReturnUrl(
  environment: PublicEnvironment,
  { origin = window.location.origin, draftId }: { origin?: string; draftId?: string | null } = {},
): string {
  const normalized = normalizedOrigin(origin, 'Auth return origin');
  if (!environment.allowedAuthOrigins.has(normalized)) {
    throw new EnvironmentConfigurationError('This origin is not approved for authentication returns.');
  }
  const url = new URL('/', normalized);
  if (draftId) {
    if (!/^[0-9a-f]{48}$/.test(draftId)) throw new EnvironmentConfigurationError('Invalid continuation identifier.');
    url.searchParams.set('continuation', draftId);
  }
  return url.toString();
}
