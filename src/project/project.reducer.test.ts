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
    expect(project.identity).toEqual({ title: 'Naomi', artist: 'Axel Fisch' });
    expect(project.engine.engineId).toBe('minimal-album-art');
    expect(project.engine.director.mood).toBe('More Emotional');
    expect(project.engine.director.values.fluidity).toBe(64);
    expect(project.schemaVersion).toBe(2);
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
    expect(next.identity.title).toBe('Naomi');
  });

  it('updates title and artist as one project identity', () => {
    const project = createProject('Naomi');
    const next = projectReducer(project, {
      type: 'UPDATE_PROJECT_IDENTITY',
      identity: { title: 'Golden Light', artist: 'AiXel Studio' },
    });
    expect(next.identity).toEqual({ title: 'Golden Light', artist: 'AiXel Studio' });
    expect(project.identity).toEqual({ title: 'Naomi', artist: 'Axel Fisch' });
  });

  it('updates engine parameters without mutating the prior project', () => {
    const project = createProject();
    const next = projectReducer(project, { type: 'UPDATE_ENGINE_PARAMETER', parameterId: 'rotationSpeed', value: 0.4 });
    expect(next.engine.parameters.rotationSpeed).toBe(0.4);
    expect(project.engine.parameters.rotationSpeed).toBeUndefined();
  });
});
