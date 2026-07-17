import { describe, expect, it } from 'vitest';
import { createProject } from './project.defaults';
import { parseProject, serializeProject } from './project.serialization';

describe('project serialization', () => {
  it('does not persist temporary object URLs', () => {
    const project = createProject();
    project.audio = { fileName: 'track.mp3', mimeType: 'audio/mpeg', size: 20, duration: 10, objectUrl: 'blob:temporary' };
    expect(parseProject(serializeProject(project)).audio?.objectUrl).toBeNull();
  });

  it('rejects unknown schema versions', () => {
    expect(() => parseProject('{"schemaVersion":2}')).toThrow(/version/i);
  });

  it('migrates legacy Director mood parameters into structured state', () => {
    const project = createProject();
    const legacy = {
      ...project,
      engine: {
        engineId: project.engine.engineId,
        presetId: project.engine.presetId,
        parameters: { directorMood: 'More Dreamy' },
      },
    };
    const parsed = parseProject(JSON.stringify(legacy));
    expect(parsed.engine.director.mood).toBe('More Dreamy');
    expect(parsed.engine.director.values.space).toBe(88);
    expect(parsed.engine.parameters.directorMood).toBeUndefined();
  });
});
