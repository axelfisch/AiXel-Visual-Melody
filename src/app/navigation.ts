import { useCallback, useEffect, useState } from 'react';

export type Screen = 'home' | 'analyze' | 'create' | 'preview' | 'export' | 'settings' | 'design-system';

export const screens: Array<{ id: Screen; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'create', label: 'Create' },
  { id: 'preview', label: 'Preview' },
  { id: 'export', label: 'Export' },
  { id: 'settings', label: 'Settings' },
];

export function screenFromHash(): Screen {
  const hash = window.location.hash.replace('#', '') as Screen;
  return screens.some((screen) => screen.id === hash) || hash === 'design-system' ? hash : 'home';
}

export function useHashNavigation() {
  const [screen, setScreen] = useState<Screen>(() => screenFromHash());

  useEffect(() => {
    const onHash = () => setScreen(screenFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((next: Screen) => {
    window.location.hash = next;
    setScreen(next);
  }, []);

  return { screen, navigate };
}
