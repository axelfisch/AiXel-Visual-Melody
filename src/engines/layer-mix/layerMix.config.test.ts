import { describe, expect, it } from 'vitest';
import {
  autoLayerDefaults,
  blendModeToComposite,
  DEFAULT_LAYER_MIX,
  isLayerMixActive,
  MAX_BACKGROUND_DIM,
  overlayRejection,
  validateBlendSettings,
  validateLayerMix,
} from './layerMix.config';
import { LAYER_BLEND_MODES } from './layerMix.types';

describe('layer mix config', () => {
  it('defaults to a single engine (no layer 2)', () => {
    expect(DEFAULT_LAYER_MIX.overlay).toBeNull();
    expect(DEFAULT_LAYER_MIX.blendMode).toBe('normal');
    expect(DEFAULT_LAYER_MIX.opacity).toBe(0.85);
    expect(DEFAULT_LAYER_MIX.backgroundDim).toBe(0);
    expect(isLayerMixActive(DEFAULT_LAYER_MIX, 'jazz-geometry')).toBe(false);
  });

  it('is backwards compatible: missing / garbage mix falls back to the single-engine default', () => {
    for (const legacy of [undefined, null, 42, 'mix', []]) {
      expect(validateLayerMix(legacy, 'minimal-album-art')).toEqual(DEFAULT_LAYER_MIX);
    }
  });

  it('maps every blend mode to a canvas composite operation', () => {
    expect(LAYER_BLEND_MODES.map(blendModeToComposite)).toEqual(['source-over', 'screen', 'lighten', 'lighter', 'overlay']);
  });

  it('rejects the same engine on both layers and unknown engines', () => {
    expect(overlayRejection('jazz-geometry', 'jazz-geometry')).toBe('same-engine');
    expect(overlayRejection('jazz-geometry', 'warp-drive')).toBe('unknown-engine');
    expect(overlayRejection('jazz-geometry', 'dance-avatars')).toBeNull();
    expect(overlayRejection('neon-velvet', 'liquid-colors')).toBeNull();
    expect(validateLayerMix({ overlay: { engineId: 'jazz-geometry', parameters: {} } }, 'jazz-geometry').overlay).toBeNull();
    expect(validateLayerMix({ overlay: { engineId: 'warp-drive' } }, 'jazz-geometry').overlay).toBeNull();
    expect(isLayerMixActive({ ...DEFAULT_LAYER_MIX, overlay: { engineId: 'cosmic-waves', parameters: {} } }, 'cosmic-waves')).toBe(false);
  });

  it('accepts classic + Pro and classic + classic pairs and sanitises parameters', () => {
    const mix = validateLayerMix({
      overlay: { engineId: 'dance-avatars', parameters: { gender: 'female', style: 'hologram', bad: { nested: true }, nan: Number.NaN } },
      opacity: 0.85,
      blendMode: 'screen',
      backgroundDim: 0.25,
    }, 'jazz-geometry');
    expect(mix.overlay).toEqual({ engineId: 'dance-avatars', parameters: { gender: 'female', style: 'hologram' } });
    expect(isLayerMixActive(mix, 'jazz-geometry')).toBe(true);
    expect(validateLayerMix({ overlay: { engineId: 'liquid-colors' } }, 'neon-velvet').overlay?.engineId).toBe('liquid-colors');
  });

  it('clamps opacity 0..1, dim 0..60 % and rejects unknown blend modes', () => {
    expect(validateBlendSettings({ opacity: 3, backgroundDim: 0.95, blendMode: 'multiply' })).toEqual({
      opacity: 1,
      blendMode: 'normal',
      backgroundDim: MAX_BACKGROUND_DIM,
    });
    expect(validateBlendSettings({ opacity: -1, backgroundDim: -1, blendMode: 'add' })).toEqual({ opacity: 0, blendMode: 'add', backgroundDim: 0 });
    expect(validateBlendSettings({ opacity: 0.4567 }).opacity).toBe(0.46);
  });

  it('picks sensible auto defaults per pair', () => {
    expect(autoLayerDefaults('jazz-geometry', 'dance-avatars')).toEqual({ opacity: 0.85, blendMode: 'normal', backgroundDim: 0.25 });
    expect(autoLayerDefaults('cosmic-waves', 'lyric-canvas').blendMode).toBe('normal');
    expect(autoLayerDefaults('frequency-city', 'particle-sphere').opacity).toBe(0.85);
    expect(autoLayerDefaults('neon-velvet', 'liquid-colors')).toEqual({ opacity: 0.5, blendMode: 'screen', backgroundDim: 0 });
    expect(autoLayerDefaults('cosmic-waves', 'image-pulse').blendMode).toBe('screen');
  });
});
