// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createProject } from '../project/project.defaults';
import { settingsForOutput } from './outputProfiles';
import { estimateExportWorkingBytes, preflightExport } from './preflight';

const supported = {
  AudioContext: class {},
  MediaRecorder: class {},
  canvasCaptureSupported: true,
  mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
};

describe('export preflight', () => {
  it('accepts the declared 1080p profile with real 1920 × 1080 pixels', () => {
    const settings = settingsForOutput(createProject().export, '1080p', '16:9');
    expect(settings).toMatchObject({ width: 1920, height: 1080, frameRate: 30, videoBitRate: 12_000_000 });
    expect(preflightExport(settings, 180, supported)).toEqual({
      ok: true,
      estimatedWorkingBytes: estimateExportWorkingBytes(settings),
    });
  });

  it('rejects unsupported codec, memory, duration, and made-up encoding profiles before rendering', () => {
    const settings = settingsForOutput(createProject().export, '1080p', '9:16');
    expect(preflightExport(settings, 180, { ...supported, mimeType: null })).toMatchObject({ code: 'unsupported_codec' });
    expect(preflightExport(settings, 180, { ...supported, maxWorkingBytes: 1 })).toMatchObject({ code: 'memory_limit' });
    expect(preflightExport(settings, 901, supported)).toMatchObject({ code: 'duration_limit' });
    expect(preflightExport({ ...settings, frameRate: 60 }, 180, supported)).toMatchObject({ code: 'unsupported_profile' });
  });

  it('rejects missing browser capture primitives regardless of paid status', () => {
    const settings = createProject().export;
    expect(preflightExport(settings, 180, { ...supported, canvasCaptureSupported: false }))
      .toMatchObject({ code: 'missing_canvas_capture' });
    expect(preflightExport(settings, 180, { ...supported, MediaRecorder: undefined }))
      .toMatchObject({ code: 'missing_media_recorder' });
  });
});
