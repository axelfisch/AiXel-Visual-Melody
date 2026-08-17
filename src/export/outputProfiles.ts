import type { ExportSettings, ProjectAspectRatio } from '../project/project.types';
import { dimensionsFor, type ExportResolution } from './exportFormats';

export const OUTPUT_PROFILES: Record<ExportResolution, { frameRate: 30; videoBitRate: number }> = {
  '720p': { frameRate: 30, videoBitRate: 6_000_000 },
  '1080p': { frameRate: 30, videoBitRate: 12_000_000 },
};

export function settingsForOutput(
  settings: ExportSettings,
  resolution: ExportResolution,
  aspectRatio: ProjectAspectRatio,
): ExportSettings {
  return {
    ...settings,
    ...dimensionsFor(resolution, aspectRatio),
    ...OUTPUT_PROFILES[resolution],
    aspectRatio,
  };
}
