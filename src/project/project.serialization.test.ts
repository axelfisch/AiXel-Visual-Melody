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
    expect(() => parseProject('{"schemaVersion":3}')).toThrow(/version/i);
  });

  it('migrates schema V1 projects to the default identity safely', () => {
    const project = createProject('Legacy Song');
    const { identity: _identity, ...legacy } = project;
    const parsed = parseProject(JSON.stringify({ ...legacy, schemaVersion: 1 }));

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.identity).toEqual({ title: 'Legacy Song', artist: 'Axel Fisch' });
  });

  it('preserves a customized project identity through serialization', () => {
    const project = createProject('Naomi');
    project.identity = { title: 'In the Spirit of Naomi', artist: 'AiXel Studio' };
    expect(parseProject(serializeProject(project)).identity).toEqual(project.identity);
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
