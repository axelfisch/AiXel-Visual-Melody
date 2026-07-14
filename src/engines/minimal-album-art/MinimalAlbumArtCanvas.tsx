import { useEffect, useRef } from 'react';
import { energyAt } from '../../audio';
import type { ProjectAnalysis } from '../../project/project.types';
import { MinimalAlbumArtEngine } from './MinimalAlbumArtEngine';

export function MinimalAlbumArtCanvas({
  analysis,
  duration,
  time,
  title,
}: {
  analysis: ProjectAnalysis;
  duration: number;
  time: number;
  title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    MinimalAlbumArtEngine.render(
      { context, width: canvas.width, height: canvas.height, pixelRatio: window.devicePixelRatio || 1 },
      {
        time,
        duration,
        progress: duration > 0 ? time / duration : 0,
        energy: energyAt(analysis, time),
        bpm: analysis.bpm,
        title,
      },
      MinimalAlbumArtEngine.defaultConfig,
    );
  }, [analysis, duration, time, title]);

  return <canvas className="real-preview-canvas" ref={canvasRef} width={1280} height={720} />;
}
