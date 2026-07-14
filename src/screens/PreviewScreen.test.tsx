import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../project/project.context';
import { PreviewScreen } from './PreviewScreen';

describe('PreviewScreen', () => {
  it('guides an empty project back to Analyze', () => {
    const navigate = vi.fn();
    render(
      <ProjectProvider>
        <PreviewScreen onNavigate={navigate} autoPlay={false} onAutoPlayHandled={() => undefined} />
      </ProjectProvider>,
    );
    expect(screen.getByText(/doit d’abord être analysée/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Analyze' }));
    expect(navigate).toHaveBeenCalledWith('analyze');
  });
});
