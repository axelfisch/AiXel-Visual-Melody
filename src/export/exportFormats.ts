import {
  PROJECT_ASPECT_RATIOS,
  PROJECT_END_CARD_MODES,
  type ExportSettings,
  type ProjectAspectRatio,
  type ProjectEndCardMode,
} from '../project/project.types';
import type { Capabilities } from '../entitlements/entitlements.types';

export const EXPORT_RESOLUTIONS = ['720p', '1080p'] as const;
export type ExportResolution = (typeof EXPORT_RESOLUTIONS)[number];

/** Vertical size of the 16:9 frame; the square and vertical formats reuse it as the short edge. */
const SHORT_EDGE: Record<ExportResolution, number> = { '720p': 720, '1080p': 1080 };

const ASPECT_FACTORS: Record<ProjectAspectRatio, { long: number; short: number }> = {
  '16:9': { long: 16, short: 9 },
  '9:16': { long: 16, short: 9 },
  '1:1': { long: 1, short: 1 },
};

export type FrameSize = { width: number; height: number };

export function dimensionsFor(resolution: ExportResolution, aspectRatio: ProjectAspectRatio): FrameSize {
  const shortEdge = SHORT_EDGE[resolution];
  const factors = ASPECT_FACTORS[aspectRatio];
  const longEdge = Math.round((shortEdge / factors.short) * factors.long);
  if (aspectRatio === '9:16') return { width: shortEdge, height: longEdge };
  if (aspectRatio === '1:1') return { width: shortEdge, height: shortEdge };
  return { width: longEdge, height: shortEdge };
}

/** Resolution implied by real pixels, or `null` when the frame matches no known preset. */
export function resolutionOf({ width, height }: FrameSize): ExportResolution | null {
  return (
    EXPORT_RESOLUTIONS.find((resolution) =>
      PROJECT_ASPECT_RATIOS.some((aspectRatio) => {
        const candidate = dimensionsFor(resolution, aspectRatio);
        return candidate.width === width && candidate.height === height;
      }),
    ) ?? null
  );
}

export function aspectRatioOf({ width, height }: FrameSize): ProjectAspectRatio | null {
  if (width <= 0 || height <= 0) return null;
  return (
    PROJECT_ASPECT_RATIOS.find((aspectRatio) => {
      const candidate = dimensionsFor('720p', aspectRatio);
      return Math.abs(candidate.width / candidate.height - width / height) < 0.001;
    }) ?? null
  );
}

/**
 * A label that always describes the real frame. When the pixels match no preset
 * the raw dimensions are shown rather than a flattering name.
 */
export function frameLabel(size: FrameSize): string {
  return resolutionOf(size) ?? `${size.width} × ${size.height}`;
}

/*
 * Capability gates. Each option knows which capability grants it, so the whole
 * Free/Pro split for output lives in this table instead of in the screens.
 */

export const requiresProResolution = (resolution: ExportResolution) => resolution !== '720p';
export const requiresProAspectRatio = (aspectRatio: ProjectAspectRatio) => aspectRatio !== '16:9';
export const requiresProEndCardMode = (mode: ProjectEndCardMode) => mode !== 'aixel';

export const isResolutionAllowed = (resolution: ExportResolution, capabilities: Capabilities) =>
  !requiresProResolution(resolution) || capabilities.export1080p;

export const isAspectRatioAllowed = (aspectRatio: ProjectAspectRatio, capabilities: Capabilities) =>
  !requiresProAspectRatio(aspectRatio) || capabilities.socialRatios;

export const isEndCardModeAllowed = (mode: ProjectEndCardMode, capabilities: Capabilities) =>
  !requiresProEndCardMode(mode) || capabilities.cleanEndCard;

export type ExportGateReason = 'resolution' | 'aspectRatio' | 'endCard';

/**
 * Every reason the current settings are not authorized. Empty means the export
 * may proceed. Settings are never rewritten here: a downgraded user keeps their
 * Pro configuration, they simply cannot render it.
 */
export function exportGateReasons(settings: ExportSettings, capabilities: Capabilities): ExportGateReason[] {
  const reasons: ExportGateReason[] = [];
  const resolution = resolutionOf(settings);
  if (resolution === null || !isResolutionAllowed(resolution, capabilities)) reasons.push('resolution');
  if (
    aspectRatioOf(settings) !== settings.aspectRatio ||
    !isAspectRatioAllowed(settings.aspectRatio, capabilities)
  ) reasons.push('aspectRatio');
  if (!isEndCardModeAllowed(settings.endCardMode, capabilities)) reasons.push('endCard');
  return reasons;
}

export const isExportAuthorized = (settings: ExportSettings, capabilities: Capabilities) =>
  exportGateReasons(settings, capabilities).length === 0;

/**
 * The Free-compatible equivalent of the given settings, used to offer "continue
 * with Free export" without discarding the project. It returns a new object and
 * never mutates the stored configuration.
 */
export function toFreeCompatibleSettings(settings: ExportSettings): ExportSettings {
  const { width, height } = dimensionsFor('720p', '16:9');
  return { ...settings, width, height, aspectRatio: '16:9', endCardMode: 'aixel' };
}

export const EXPORT_END_CARD_MODES = PROJECT_END_CARD_MODES;
export const EXPORT_ASPECT_RATIOS = PROJECT_ASPECT_RATIOS;
