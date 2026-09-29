import { describe, expect, it } from 'vitest';
import { getEngine } from '../engines/engine.registry';
import { createProject } from './project.defaults';
import { projectReducer, toolIdForEngine } from './project.reducer';
import { resolveOverlayParameters, resolveProjectRender } from './project.render';
import { parseProject, serializeProject } from './project.serialization';

const jazz = () => projectReducer(createProject('Naomi'), { type: 'SELECT_ENGINE', engineId: 'jazz-geometry', parameters: { rotationSpeed: 0.2 } });

describe('project two-layer mix state', () => {
  it('new projects are single-engine and render exactly the layer-1 engine + parameters', () => {
    const project = jazz();
    expect(project.mix.overlay).toBeNull();
    const render = resolveProjectRender(project);
    expect(render.engine).toBe(getEngine('jazz-geometry'));
    expect(render.config).toBe(project.engine.parameters);
    expect(render.overlayEngine).toBeNull();
  });

  it('sets layer 2 with auto blend defaults (Pro over classic → normal 85 %, classic over classic → screen 50 %)', () => {
    const withAvatar = projectReducer(jazz(), { type: 'SET_LAYER_OVERLAY', engineId: 'dance-avatars' });
    expect(withAvatar.mix).toMatchObject({ overlay: { engineId: 'dance-avatars', parameters: {} }, opacity: 0.85, blendMode: 'normal', backgroundDim: 0.25 });
    const neon = projectReducer(createProject(), { type: 'SELECT_ENGINE', engineId: 'neon-velvet' });
    const classic = projectReducer(neon, { type: 'SET_LAYER_OVERLAY', engineId: 'liquid-colors' });
    expect(classic.mix).toMatchObject({ overlay: { engineId: 'liquid-colors' }, opacity: 0.5, blendMode: 'screen', backgroundDim: 0 });
  });

  it('refuses the same engine on both layers and unknown engines', () => {
    const project = jazz();
    expect(projectReducer(project, { type: 'SET_LAYER_OVERLAY', engineId: 'jazz-geometry' })).toBe(project);
    expect(projectReducer(project, { type: 'SET_LAYER_OVERLAY', engineId: 'warp-drive' })).toBe(project);
  });

  it('drops layer 2 when layer 1 switches to the same engine (engine or Pro tool)', () => {
    const mixed = projectReducer(jazz(), { type: 'SET_LAYER_OVERLAY', engineId: 'cosmic-waves' });
    expect(projectReducer(mixed, { type: 'SELECT_ENGINE', engineId: 'cosmic-waves' }).mix.overlay).toBeNull();
    expect(projectReducer(mixed, { type: 'SELECT_ENGINE', engineId: 'neon-velvet' }).mix.overlay?.engineId).toBe('cosmic-waves');
    const avatars = projectReducer(jazz(), { type: 'SET_LAYER_OVERLAY', engineId: 'dance-avatars' });
    expect(projectReducer(avatars, { type: 'SELECT_TOOL', tool: 'dance-avatar', engineId: 'dance-avatars' }).mix.overlay).toBeNull();
  });

  it("'Aucune' clears layer 2 but keeps the blend for next time", () => {
    const mixed = projectReducer(jazz(), { type: 'SET_LAYER_OVERLAY', engineId: 'dance-avatars' });
    const cleared = projectReducer(mixed, { type: 'SET_LAYER_OVERLAY', engineId: null });
    expect(cleared.mix.overlay).toBeNull();
    expect(resolveProjectRender(cleared).engine).toBe(getEngine('jazz-geometry'));
  });

  it('updates the blend with clamping and layer-2 parameters', () => {
    let project = projectReducer(jazz(), { type: 'SET_LAYER_OVERLAY', engineId: 'dance-avatars' });
    project = projectReducer(project, { type: 'UPDATE_LAYER_BLEND', settings: { opacity: 1.4, blendMode: 'add', backgroundDim: 0.9 } });
    expect(project.mix).toMatchObject({ opacity: 1, blendMode: 'add', backgroundDim: 0.6 });
    project = projectReducer(project, { type: 'UPDATE_OVERLAY_PARAMETER', parameterId: 'style', value: 'hologram' });
    project = projectReducer(project, { type: 'UPDATE_OVERLAY_PARAMETERS', parameters: { gender: 'female' } });
    expect(project.mix.overlay?.parameters).toEqual({ style: 'hologram', gender: 'female' });
  });

  it('swaps layers (tool follows the new layer 1)', () => {
    const mixed = projectReducer(jazz(), { type: 'SET_LAYER_OVERLAY', engineId: 'dance-avatars' });
    const swapped = projectReducer(mixed, { type: 'SWAP_LAYERS', baseParameters: { gender: 'male' }, overlayParameters: { rotationSpeed: 0.2 } });
    expect(swapped.engine.engineId).toBe('dance-avatars');
    expect(swapped.tool).toBe('dance-avatar');
    expect(swapped.mix.overlay).toEqual({ engineId: 'jazz-geometry', parameters: { rotationSpeed: 0.2 } });
    expect(toolIdForEngine('neon-velvet')).toBe('engine');
  });

  it('resolves one composite engine with shared Director faders and Creator colors, title owned by layer 1', () => {
    let project = projectReducer(jazz(), { type: 'UPDATE_CREATOR', creator: { primaryColor: '#ff0088', accentColor: '#00ffaa' } });
    project = projectReducer(project, { type: 'SET_LAYER_OVERLAY', engineId: 'dance-avatars' });
    project = projectReducer(project, { type: 'UPDATE_OVERLAY_PARAMETERS', parameters: { gender: 'female', style: 'hologram' } });
    const render = resolveProjectRender(project);
    expect(render.engine.id).toBe('mix:jazz-geometry+dance-avatars');
    expect(render.overlayEngine?.id).toBe('dance-avatars');
    const config = render.config as { base: unknown; overlay: Record<string, unknown>; opacity: number; blendMode: string; backgroundDim: number };
    expect(config.base).toBe(project.engine.parameters);
    expect(config.overlay).toMatchObject({ gender: 'female', style: 'hologram', primaryColor: '#ff0088', accentColor: '#00ffaa', showTitle: false });
    expect(config).toMatchObject({ opacity: 0.85, blendMode: 'normal', backgroundDim: 0.25 });

    const calmer = projectReducer(project, {
      type: 'APPLY_DIRECTOR', mood: null, values: { ...project.engine.director.values, fluidity: 0 }, parameters: project.engine.parameters,
    });
    const slow = resolveOverlayParameters(calmer) as Record<string, number>;
    const fast = resolveOverlayParameters(project) as Record<string, number>;
    expect(slow.danceSpeed).toBeLessThan(fast.danceSpeed);
  });

  it('feeds the project lyrics / image to a Lyric Canvas layer 2', () => {
    let project = projectReducer(createProject(), { type: 'SELECT_ENGINE', engineId: 'cosmic-waves' });
    project = projectReducer(project, { type: 'SET_LYRICS', lyrics: { text: 'Every note\nbecomes light', offset: 0.5 } });
    project = projectReducer(project, { type: 'SET_LAYER_OVERLAY', engineId: 'lyric-canvas' });
    expect(resolveOverlayParameters(project)).toMatchObject({ lyrics: 'Every note\nbecomes light', lyricsOffset: 0.5, imageSrc: '' });
  });

  it('persists the layer config and stays compatible with projects saved before mixes', () => {
    let project = projectReducer(jazz(), { type: 'SET_LAYER_OVERLAY', engineId: 'image-pulse' });
    project = projectReducer(project, { type: 'UPDATE_OVERLAY_PARAMETERS', parameters: { imageSrc: 'blob:temp', style: 'glow' } });
    const parsed = parseProject(serializeProject(project));
    expect(parsed.mix).toEqual({ ...project.mix, overlay: { engineId: 'image-pulse', parameters: { imageSrc: '', style: 'glow' } } });

    const { mix: _mix, ...legacy } = createProject();
    const migrated = parseProject(JSON.stringify(legacy));
    expect(migrated.mix).toEqual({ overlay: null, opacity: 0.85, blendMode: 'normal', backgroundDim: 0 });

    const tampered = parseProject(JSON.stringify({ ...jazz(), mix: { overlay: { engineId: 'jazz-geometry' }, opacity: 9 } }));
    expect(tampered.mix.overlay).toBeNull();
    expect(tampered.mix.opacity).toBe(1);
  });
});
