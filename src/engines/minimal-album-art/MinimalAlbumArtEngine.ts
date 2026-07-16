import type { VisualEngine } from '../engine.types';
import { minimalAlbumArtDefaultConfig, minimalAlbumArtParameters, validateMinimalAlbumArtConfig } from './minimalAlbumArt.config';
import { renderMinimalAlbumArt } from './minimalAlbumArt.renderer';
import type { MinimalAlbumArtConfig } from './minimalAlbumArt.types';

export const MinimalAlbumArtEngine: VisualEngine<MinimalAlbumArtConfig> = {
  id: 'minimal-album-art',
  name: 'Minimal Album Art',
  description: 'Graphite vinyl, restrained motion and a single gold accent.',
  availability: 'implemented',
  defaultConfig: minimalAlbumArtDefaultConfig,
  parameters: minimalAlbumArtParameters,
  validateConfig: validateMinimalAlbumArtConfig,
  render: renderMinimalAlbumArt,
};
