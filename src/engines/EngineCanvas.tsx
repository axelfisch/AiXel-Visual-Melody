import { useEffect, useMemo, useRef, useState } from 'react';
import { energyAt, onsetAt } from '../audio';
import type { ProjectAnalysis } from '../project/project.types';
import type { VisualEngine } from './engine.types';

export function EngineCanvas({
  analysis,
  config,
  duration,
  engine,
  time,
  title,
}: {
  analysis: ProjectAnalysis;
  config?: unknown;
  duration: number;
  engine: VisualEngine;
  time: number;
  title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preparedVersion, setPreparedVersion] = useState(0);
  const validated = useMemo(() => engine.validateConfig(config ?? engine.defaultConfig), [config, engine]);

  // Engines with external media (Image Pulse) redraw once their assets are decoded.
  useEffect(() => {
    if (!engine.prepare) return undefined;
    let active = true;
    void engine.prepare(validated).then(() => {
      if (active) setPreparedVersion((version) => version + 1);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [engine, validated]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    engine.render(
      { context, width: canvas.width, height: canvas.height, pixelRatio: window.devicePixelRatio || 1 },
      {
        time,
        duration,
        progress: duration > 0 ? time / duration : 0,
        energy: energyAt(analysis, time),
        onset: onsetAt(analysis, time),
        bpm: analysis.bpm,
        title,
      },
      validated,
    );
  }, [analysis, validated, duration, engine, time, title, preparedVersion]);

  return <canvas className="real-preview-canvas" ref={canvasRef} width={1280} height={720} />;
}
