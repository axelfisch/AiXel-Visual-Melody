import { useEffect, useRef } from 'react';
import { energyAt } from '../audio';
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
        bpm: analysis.bpm,
        title,
      },
      engine.validateConfig(config ?? engine.defaultConfig),
    );
  }, [analysis, config, duration, engine, time, title]);

  return <canvas className="real-preview-canvas" ref={canvasRef} width={1280} height={720} />;
}
