import type { VisualEngine } from '../engine.types';
import { danceAvatarsDefaultConfig, danceAvatarsParameters, validateDanceAvatarsConfig } from './danceAvatars.config';
import { renderDanceAvatars } from './danceAvatars.renderer';
import type { DanceAvatarsConfig } from './danceAvatars.types';

export const DanceAvatarsEngine: VisualEngine<DanceAvatarsConfig> = {
  id: 'dance-avatars',
  name: 'Dance Avatars',
  description: 'Full-body woman/man dancer silhouettes in five styles with beat-synced, complexity-driven choreography.',
  availability: 'implemented',
  defaultConfig: danceAvatarsDefaultConfig,
  parameters: danceAvatarsParameters,
  validateConfig: validateDanceAvatarsConfig,
  render: renderDanceAvatars,
};
