import { describe, expect, it } from 'vitest';
import { CREATOR_PRO_CAPABILITIES, FREE_CAPABILITIES } from '../entitlements';
import { createProject } from './project.defaults';
import {
  canExport,
  canPreview,
  exportBlockers,
  hasAnalysis,
  hasAudio,
  hasUnauthorizedProSettings,
  isRenderable,
} from './project.selectors';
import type { ProjectRuntime, VisualMelodyProject } from './project.types';

const readyProject = (): VisualMelodyProject => ({
  ...createProject(),
  sourceHint: { fileName: 'naomi.wav', mimeType: 'audio/wav', size: 2048, duration: 42, sha256: null },
  analysis: { sampleRate: 48_000, bpm: 88, peak: 0.9, averageEnergy: 0.4, waveform: [50], energy: [0.5] },
});

const readyRuntime = (): ProjectRuntime => ({
  sourceFile: new File(['audio'], 'naomi.wav', { type: 'audio/wav' }),
  decodedAudio: {} as AudioBuffer,
  objectUrl: 'blob:http://localhost/naomi',
});

describe('project selectors', () => {
  it('blocks preview and export until audio and analysis are both ready', () => {
    const empty = createProject();
    expect(hasAudio(readyRuntime())).toBe(true);
    expect(hasAudio({ sourceFile: null, decodedAudio: null, objectUrl: null })).toBe(false);
    expect(hasAnalysis(empty)).toBe(false);
    expect(canPreview(empty, readyRuntime())).toBe(false);
    expect(canExport(empty, readyRuntime(), FREE_CAPABILITIES)).toBe(false);
  });

  it('requires runtime audio after loading configuration-only project data', () => {
    const project = readyProject();
    const detached: ProjectRuntime = { sourceFile: null, decodedAudio: null, objectUrl: null };
    expect(canPreview(project, detached)).toBe(false);
    expect(canExport(project, detached, FREE_CAPABILITIES)).toBe(false);
  });

  it('lets Free defaults export the default project', () => {
    const project = readyProject();
    expect(isRenderable(project, readyRuntime())).toBe(true);
    expect(exportBlockers(project, FREE_CAPABILITIES)).toEqual([]);
    expect(canExport(project, readyRuntime(), FREE_CAPABILITIES)).toBe(true);
  });

  it('names every Creator Pro setting a Free user cannot render', () => {
    const project = readyProject();
    project.export = {
      ...project.export,
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      endCardMode: 'clean',
    };

    expect(exportBlockers(project, FREE_CAPABILITIES)).toEqual(['resolution', 'aspectRatio', 'endCard']);
    expect(hasUnauthorizedProSettings(project, FREE_CAPABILITIES)).toBe(true);
    expect(canExport(project, readyRuntime(), FREE_CAPABILITIES)).toBe(false);

    // The same stored configuration is authorized once the capability exists;
    // nothing about the project changed.
    expect(exportBlockers(project, CREATOR_PRO_CAPABILITIES)).toEqual([]);
    expect(canExport(project, readyRuntime(), CREATOR_PRO_CAPABILITIES)).toBe(true);
  });

  it('refuses a frame that matches no supported resolution', () => {
    const project = readyProject();
    project.export = { ...project.export, width: 640, height: 360 };
    expect(exportBlockers(project, CREATOR_PRO_CAPABILITIES)).toEqual(['resolution']);
  });

  it('cannot disguise an oversized or mismatched frame as Free 720p', () => {
    const project = readyProject();
    project.export = { ...project.export, width: 1920, height: 720 };
    expect(exportBlockers(project, FREE_CAPABILITIES)).toEqual(['resolution', 'aspectRatio']);

    project.export = { ...project.export, width: 720, height: 1280, aspectRatio: '16:9' };
    expect(exportBlockers(project, FREE_CAPABILITIES)).toEqual(['aspectRatio']);
  });
});
