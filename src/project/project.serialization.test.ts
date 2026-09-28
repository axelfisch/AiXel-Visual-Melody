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

  it('migrates missing tool and creator fields safely', () => {
    const project = createProject();
    const { tool: _tool, creator: _creator, ...legacy } = project;
    const parsed = parseProject(JSON.stringify(legacy));
    expect(parsed.tool).toBe('engine');
    expect(parsed.creator.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(parsed.creator.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('preserves Particle Sphere tool selection through serialize/parse', () => {
    const project = createProject();
    project.tool = 'particle-sphere';
    project.engine.engineId = 'particle-sphere';
    project.creator = { primaryColor: '#ff5c8a', accentColor: '#8a6bff' };
    const parsed = parseProject(serializeProject(project));
    expect(parsed.tool).toBe('particle-sphere');
    expect(parsed.engine.engineId).toBe('particle-sphere');
    expect(parsed.creator.primaryColor).toBe('#ff5c8a');
  });
