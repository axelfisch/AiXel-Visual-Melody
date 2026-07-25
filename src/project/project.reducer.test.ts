import { describe, expect, it } from 'vitest';
import { createProject } from './project.defaults';
import { projectReducer } from './project.reducer';

const audio = {
  fileName: 'Naomi.wav',
  mimeType: 'audio/wav',
  size: 1024,
  duration: 42,
  objectUrl: 'blob:naomi',
};

describe('projectReducer', () => {
  it('creates a valid project with Minimal Album Art selected', () => {
    const project = createProject('Naomi');
    expect(project.name).toBe('Naomi');
    expect(project.engine.engineId).toBe('minimal-album-art');
    expect(project.engine.director.mood).toBe('More Emotional');
    expect(project.engine.director.values.fluidity).toBe(64);
    expect(project.schemaVersion).toBe(1);
  });

  it('applies Director state and engine parameters atomically', () => {
    const project = createProject();
    const values = { ...project.engine.director.values, fluidity: 91 };
    const next = projectReducer(project, {
      type: 'APPLY_DIRECTOR',
      mood: null,
      values,
      parameters: { rotationSpeed: 0.8, energyResponse: 1.2 },
    });
    expect(next.engine.director.mood).toBeNull();
    expect(next.engine.director.values.fluidity).toBe(91);
    expect(next.engine.parameters.rotationSpeed).toBe(0.8);
    expect(project.engine.director.values.fluidity).toBe(64);
  });

  it('invalidates the previous analysis when the audio source changes', () => {
    const analyzed = projectReducer(createProject(), {
      type: 'ANALYSIS_COMPLETED',
      analysis: { sampleRate: 48_000, bpm: 72, peak: 0.9, averageEnergy: 0.5, waveform: [50], energy: [0.5] },
    });
    const next = projectReducer(analyzed, { type: 'SET_AUDIO_SOURCE', audio });
    expect(next.analysis).toBeNull();
    expect(next.name).toBe('Naomi');
  });

  it('updates engine parameters without mutating the prior project', () => {
    const project = createProject();
    const next = projectReducer(project, { type: 'UPDATE_ENGINE_PARAMETER', parameterId: 'rotationSpeed', value: 0.4 });
    expect(next.engine.parameters.rotationSpeed).toBe(0.4);
    expect(project.engine.parameters.rotationSpeed).toBeUndefined();
  });

  it('applies a Color Palette by patching several engine parameters at once', () => {
    const project = createProject();
    const next = projectReducer(project, {
      type: 'UPDATE_ENGINE_PARAMETERS',
      parameters: { accentColor: '#ff5c8a', discColor: '#111111' },
    });
    expect(next.engine.parameters.accentColor).toBe('#ff5c8a');
    expect(next.engine.parameters.discColor).toBe('#111111');
    expect(project.engine.parameters.accentColor).toBeUndefined();
  });
});
