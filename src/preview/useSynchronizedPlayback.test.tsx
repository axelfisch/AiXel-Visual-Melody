import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSynchronizedPlayback } from './useSynchronizedPlayback';

function PlaybackHarness({ source = 'blob:track', duration = 120 }: { source?: string | null; duration?: number }) {
  const playback = useSynchronizedPlayback({ source, sourceDuration: duration });
  return (
    <div>
      <audio data-testid="audio" ref={playback.audioRef} src={source ?? undefined} />
      <output data-testid="time">{playback.currentTime}</output>
      <output data-testid="volume">{playback.volume}</output>
      <output data-testid="muted">{String(playback.muted)}</output>
      <button onClick={playback.toggleMuted}>mute</button>
      <input
        aria-label="volume"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={playback.volume}
        onChange={(event) => playback.setVolume(Number(event.target.value))}
      />
      <button onClick={() => playback.seek(48)}>seek</button>
    </div>
  );
}

describe('useSynchronizedPlayback', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('starts at a useful listening volume and remembers changes', () => {
    render(<PlaybackHarness />);
    expect(screen.getByTestId('volume')).toHaveTextContent('0.8');
    fireEvent.change(screen.getByLabelText('volume'), { target: { value: '0.35' } });
    expect(screen.getByTestId('volume')).toHaveTextContent('0.35');
    expect(window.localStorage.getItem('aixel-preview-volume')).toBe('0.35');
  });

  it('supports mute and seek without changing the source audio', () => {
    render(<PlaybackHarness />);
    fireEvent.click(screen.getByText('mute'));
    expect(screen.getByTestId('muted')).toHaveTextContent('true');
    fireEvent.click(screen.getByText('seek'));
    expect(screen.getByTestId('time')).toHaveTextContent('48');
    expect((screen.getByTestId('audio') as HTMLAudioElement).currentTime).toBe(48);
  });

  it('resets playback position when the source changes', () => {
    const { rerender } = render(<PlaybackHarness source="blob:first" />);
    fireEvent.click(screen.getByText('seek'));
    rerender(<PlaybackHarness source="blob:second" />);
    expect(screen.getByTestId('time')).toHaveTextContent('0');
  });
});
