import { useEffect, useMemo, useRef } from 'react';
import type { ProjectAnalysis } from '../project/project.types';
import { liveFrameAt } from './engine.liveClock';
import type { VisualEngine } from './engine.types';

/** Longest backing-store side; keeps the Create preview cheap on 4K / high-DPR screens. */
const MAX_BACKING_SIDE = 1600;
/** Time shown when motion is reduced (a mid-move pose rather than the rest pose). */
const REDUCED_MOTION_TIME = 2.6;

type LiveState = {
  engine: VisualEngine;
  config: unknown;
  analysis: ProjectAnalysis | null;
  duration: number | null;
  syntheticDuration?: number;
  title: string;
};

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Runs a real engine renderer in a requestAnimationFrame loop — the exact
 * `engine.render` used by Preview (EngineCanvas) and Export (renderMp4) — so the
 * Create screen shows the true look. Sized to its container × devicePixelRatio,
 * capped at `maxFps`, paused while offscreen or unmounted. Config/analysis
 * changes are picked up on the next frame (and drawn immediately).
 */
export function LiveEngineCanvas({
  engine,
  config,
  analysis = null,
  duration = null,
  syntheticDuration,
  title = '',
  maxFps = 30,
  className = 'live-engine-canvas',
}: {
  engine: VisualEngine;
  config?: unknown;
  analysis?: ProjectAnalysis | null;
  duration?: number | null;
  syntheticDuration?: number;
  title?: string;
  maxFps?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const validated = useMemo(() => engine.validateConfig(config ?? engine.defaultConfig), [config, engine]);
  const stateRef = useRef<LiveState>({ engine, config: validated, analysis, duration, syntheticDuration, title });
  stateRef.current = { engine, config: validated, analysis, duration, syntheticDuration, title };
  const drawRef = useRef<() => void>(() => undefined);

  // Engines with external media (Image Pulse, Lyric Canvas fonts/backdrop) decode first, then redraw.
  useEffect(() => {
    if (!engine.prepare) return undefined;
    let active = true;
    void engine.prepare(validated).then(() => {
      if (active) drawRef.current();
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [engine, validated]);

  // Any change (gender, style, colors, faders, image, lyrics, audio) is drawn right away,
  // even while the loop is paused offscreen or motion is reduced.
  useEffect(() => {
    drawRef.current();
  }, [engine, validated, analysis, duration, syntheticDuration, title]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const reduced = prefersReducedMotion();
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const minInterval = 1000 / Math.max(1, maxFps);
    let elapsed = reduced ? REDUCED_MOTION_TIME : 0;
    let raf = 0;
    let lastDraw = -Infinity;
    let visible = true;
    let failed = false;

    const draw = () => {
      const state = stateRef.current;
      const frame = liveFrameAt({
        elapsed,
        analysis: state.analysis,
        duration: state.duration,
        syntheticDuration: state.syntheticDuration,
        title: state.title,
      });
      try {
        state.engine.render(
          { context, width: canvas.width, height: canvas.height, pixelRatio: window.devicePixelRatio || 1 },
          frame,
          state.config as never,
        );
      } catch (error) {
        if (!failed) console.error('Live preview render failed', error);
        failed = true;
      }
    };
    drawRef.current = draw;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return; // not laid out (tests / hidden): keep 1280×720
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      let width = Math.round(rect.width * ratio);
      let height = Math.round(rect.height * ratio);
      const longest = Math.max(width, height);
      if (longest > MAX_BACKING_SIDE) {
        const scale = MAX_BACKING_SIDE / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        draw();
      }
    };

    const tick = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (now - lastDraw >= minInterval - 1) {
        lastDraw = now;
        elapsed = (now - start) / 1000;
        draw();
      }
      raf = window.requestAnimationFrame(tick);
    };
    const play = () => {
      if (reduced || raf || !visible || typeof window.requestAnimationFrame !== 'function') return;
      raf = window.requestAnimationFrame(tick);
    };
    const pause = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    draw();
    play();

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    const intersectionObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? true;
          if (visible) play();
          else pause();
        })
      : null;
    intersectionObserver?.observe(canvas);

    return () => {
      pause();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      drawRef.current = () => undefined;
    };
  }, [maxFps]);

  return (
    <canvas
      className={className}
      ref={canvasRef}
      width={1280}
      height={720}
      role="img"
      aria-label={`${engine.name} — live preview`}
      data-engine={engine.id}
      data-testid="live-engine-preview"
    />
  );
}
