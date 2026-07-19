import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext';
import { ProjectProvider } from '../project/project.context';
import { PreviewScreen } from './PreviewScreen';

describe('PreviewScreen', () => {
  beforeEach(() => localStorage.setItem('aixel-visual-melody-locale', 'fr'));

  it('guides an empty project back to Analyze', () => {
    const navigate = vi.fn();
    render(
      <LocaleProvider>
        <ProjectProvider>
          <PreviewScreen onNavigate={navigate} autoPlay={false} onAutoPlayHandled={() => undefined} />
        </ProjectProvider>
      </LocaleProvider>,
    );
    expect(screen.getByText(/doit d’abord être analysée/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir Analyser' }));
    expect(navigate).toHaveBeenCalledWith('analyze');
  });
});
