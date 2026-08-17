import { describe, expect, it } from 'vitest';
import { CREATOR_PRO_CAPABILITIES, FREE_CAPABILITIES } from '../entitlements';
import { createProject } from '../project/project.defaults';
import {
  dimensionsFor,
  exportGateReasons,
  resolutionOf,
} from './exportFormats';

describe('export format boundaries', () => {
  it('recognizes only exact supported frames', () => {
    expect(resolutionOf(dimensionsFor('720p', '16:9'))).toBe('720p');
    expect(resolutionOf(dimensionsFor('1080p', '9:16'))).toBe('1080p');
    expect(resolutionOf({ width: 1920, height: 720 })).toBeNull();
    expect(resolutionOf({ width: 720, height: 720 })).toBe('720p');
  });

  it('requires capabilities and consistent pixel geometry', () => {
    const settings = {
      ...createProject().export,
      ...dimensionsFor('1080p', '9:16'),
      aspectRatio: '9:16' as const,
      endCardMode: 'clean' as const,
    };
    expect(exportGateReasons(settings, FREE_CAPABILITIES)).toEqual([
      'resolution',
      'aspectRatio',
      'endCard',
    ]);
    expect(exportGateReasons(settings, CREATOR_PRO_CAPABILITIES)).toEqual([]);
    expect(
      exportGateReasons({ ...settings, aspectRatio: '16:9' }, CREATOR_PRO_CAPABILITIES),
    ).toEqual(['aspectRatio']);
  });
});
