import { describe, expect, it } from 'vitest';
import { createProject } from './project.defaults';
import { canExport, canPreview, hasAnalysis, hasAudio } from './project.selectors';

describe('project selectors', () => {
  it('blocks preview and export until audio and analysis are both ready', () => {
    const empty = createProject();
    expect(hasAudio(empty)).toBe(false);
    expect(hasAnalysis(empty)).toBe(false);
    expect(canPreview(empty)).toBe(false);
    expect(canExport(empty)).toBe(false);
  });
});
