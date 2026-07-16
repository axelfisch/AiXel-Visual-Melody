import { useCallback, useEffect, useRef, useState } from 'react';

const VOLUME_STORAGE_KEY = 'aixel-preview-volume';
const DEFAULT_VOLUME = 0.8;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function readStoredVolume() {
  try {
    const rawValue = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    if (rawValue === null) return DEFAULT_VOLUME;
    const stored = Number(rawValue);
    return Number.isFinite(stored) ? clamp(stored, 0, 1) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function useSynchronizedPlayback({
  source,
  sourceDuration,
  autoPlay = false,
  onAutoPlayHandled,
}: {
  source: string | null;
  sourceDuration: number;
  autoPlay?: boolean;
  onAutoPlayHandled?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(readStoredVolume);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // Preview remains functional when storage is unavailable.
    }
  }, [muted, volume]);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
  }, [source]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(sourceDuration);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [source, sourceDuration]);

  useEffect(() => {
    if (!playing) return;
    let animationFrame = 0;
    let previousUpdate = 0;
    const update = (timestamp: number) => {
      if (timestamp - previousUpdate >= 33) {
        setCurrentTime(audioRef.current?.currentTime ?? 0);
        previousUpdate = timestamp;
      }
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [playing]);

  useEffect(() => {
    if (!autoPlay || !source) return;
    const animationFrame = requestAnimationFrame(() => {
      void audioRef.current?.play().catch(() => undefined);
      onAutoPlayHandled?.();
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [autoPlay, onAutoPlayHandled, source]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !source) return;
    if (audio.paused) await audio.play();
    else audio.pause();
  }, [source]);

  const seek = useCallback((time: number) => {
    const nextTime = clamp(time, 0, sourceDuration);
    if (audioRef.current) audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [sourceDuration]);

  const setVolume = useCallback((nextVolume: number) => {
    const next = clamp(nextVolume, 0, 1);
    setVolumeState(next);
    if (next > 0) setMuted(false);
  }, []);

  const toggleMuted = useCallback(() => setMuted((value) => !value), []);

  return {
    audioRef,
    playing,
    currentTime,
    duration: sourceDuration,
    volume,
    muted,
    togglePlayback,
    seek,
    setVolume,
    toggleMuted,
  };
}
