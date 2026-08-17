// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { approvedAuthReturnUrl, EnvironmentConfigurationError, readPublicEnvironment } from './environment';

describe('public environment', () => {
  it('keeps authentication optional for the anonymous Free workflow', () => {
    const environment = readPublicEnvironment({}, 'https://visualmelody.netlify.app');
    expect(environment.supabase).toBeNull();
    expect(environment.appOrigin).toBe('https://visualmelody.netlify.app');
  });

  it('rejects partial credentials, browser secrets, and insecure hosted origins', () => {
    expect(() => readPublicEnvironment({ VITE_SUPABASE_URL: 'https://project.supabase.co' }, 'https://app.test'))
      .toThrow(EnvironmentConfigurationError);
    expect(() => readPublicEnvironment({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role_secret',
    }, 'https://app.test')).toThrow(EnvironmentConfigurationError);
    expect(() => readPublicEnvironment({}, 'http://visualmelody.example')).toThrow(EnvironmentConfigurationError);
  });

  it('allows only exact approved origins and opaque continuation identifiers', () => {
    const environment = readPublicEnvironment({
      VITE_APP_ORIGIN: 'https://visualmelody.netlify.app',
      VITE_ALLOWED_AUTH_ORIGINS: 'http://localhost:5173',
    }, 'https://visualmelody.netlify.app');
    const draftId = 'a'.repeat(48);
    expect(approvedAuthReturnUrl(environment, { origin: 'http://localhost:5173', draftId }))
      .toBe(`http://localhost:5173/?continuation=${draftId}`);
    expect(() => approvedAuthReturnUrl(environment, { origin: 'https://evil.example' }))
      .toThrow(EnvironmentConfigurationError);
    expect(() => approvedAuthReturnUrl(environment, {
      origin: 'https://visualmelody.netlify.app',
      draftId: 'project-name',
    }))
      .toThrow(EnvironmentConfigurationError);
  });
});
