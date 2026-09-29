import type { VisualEngine } from '../engine.types';
import { danceAvatarsDefaultConfig, danceAvatarsParameters, validateDanceAvatarsConfig } from './danceAvatars.config';
import { renderDanceAvatars } from './danceAvatars.renderer';
import type { DanceAvatarsConfig } from './danceAvatars.types';

export const DanceAvatarsEngine: VisualEngine<DanceAvatarsConfig> = {
  id: 'dance-avatars',
  name: 'Dance Avatars',
  description: 'Five styled dance avatars with gender toggle and audio-reactive motion.',
  availability: 'implemented',
  defaultConfig: danceAvatarsDefaultConfig,
  parameters: danceAvatarsParameters,
  validateConfig: validateDanceAvatarsConfig,
  render: renderDanceAvatars,
};
