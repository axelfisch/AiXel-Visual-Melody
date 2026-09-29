import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext';
import { LyricCanvasPanel } from './LyricCanvasPanel';

function renderPanel(props: Partial<React.ComponentProps<typeof LyricCanvasPanel>> = {}) {
  const handlers = { onLyrics: vi.fn(), onEngineParameter: vi.fn(), onImageFile: vi.fn(async () => undefined), onClearImage: vi.fn() };
  render(
    <LocaleProvider>
      <LyricCanvasPanel
        lyrics={{ text: '', offset: 0 }}
        engineParameters={{ preset: 'karaoke', background: 'aurora' }}
        trackDuration={120}
        bpm={120}
        {...handlers}
        {...props}
      />
    </LocaleProvider>,
  );
  return handlers;
}

beforeEach(() => localStorage.setItem('aixel-visual-melody-locale', 'en'));
afterEach(() => cleanup());

describe('LyricCanvasPanel', () => {
  it('shows the empty state and forwards typed lyrics', () => {
    const handlers = renderPanel();
    expect(screen.getByRole('status')).toHaveTextContent('No lyrics yet');
    fireEvent.change(screen.getByLabelText('Lyrics'), { target: { value: 'Été ✨' } });
    expect(handlers.onLyrics).toHaveBeenCalledWith({ text: 'Été ✨' });
  });

  it('offers sample lyrics when empty', async () => {
    const handlers = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /Try sample lyrics/ }));
    expect(handlers.onLyrics).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('cœur') }));
  });

  it('summarizes auto timing and converts it to editable LRC', async () => {
    const handlers = renderPanel({ lyrics: { text: 'Un\nDeux\n\nTrois', offset: 0 } });
    expect(screen.getByRole('status')).toHaveTextContent('3 lines · 2 sections · auto-timed');
    await userEvent.click(screen.getByRole('button', { name: /Convert auto timing to LRC/ }));
    const calls = handlers.onLyrics.mock.calls;
    const call = calls[calls.length - 1]?.[0];
    expect(call.offset).toBe(0);
    expect(call.text).toMatch(/^\[\d\d:\d\d\.\d\d\]Un\n\[\d\d:\d\d\.\d\d\]Deux\n\n\[\d\d:\d\d\.\d\d\]Trois$/);
  });

  it('detects LRC timestamps', () => {
    renderPanel({ lyrics: { text: '[00:01.00]Un\n[00:03.00]Deux', offset: 0 } });
    expect(screen.getByRole('status')).toHaveTextContent('2 lines · LRC timestamps detected');
    expect(screen.queryByRole('button', { name: /Convert auto timing/ })).toBeNull();
  });

  it('switches preset and background, and nudges / resets the offset', async () => {
    const handlers = renderPanel({ lyrics: { text: 'Un', offset: 1.5 } });
    await userEvent.click(screen.getByRole('button', { name: 'Neon glow' }));
    await userEvent.click(screen.getByRole('button', { name: 'Starfield' }));
    expect(handlers.onEngineParameter).toHaveBeenCalledWith('preset', 'neon');
    expect(handlers.onEngineParameter).toHaveBeenCalledWith('background', 'particles');
    expect(screen.getByText('+1.5 s')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Timing offset'), { target: { value: '-2.3' } });
    expect(handlers.onLyrics).toHaveBeenCalledWith({ offset: -2.3 });
    await userEvent.click(screen.getByRole('button', { name: /Reset/ }));
    expect(handlers.onLyrics).toHaveBeenCalledWith({ offset: 0 });
  });

  it('lets the user pick a background image for the image background', async () => {
    const handlers = renderPanel({ engineParameters: { preset: 'karaoke', background: 'image' } });
    const file = new File(['png'], 'bg.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Choose image'), file);
    expect(handlers.onImageFile).toHaveBeenCalledWith(file);
    expect(handlers.onEngineParameter).toHaveBeenCalledWith('background', 'image');
  });
});
