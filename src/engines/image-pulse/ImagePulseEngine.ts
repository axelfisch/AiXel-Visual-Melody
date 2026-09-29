import type { VisualEngine } from '../engine.types';
import { imagePulseDefaultConfig, imagePulseParameters, validateImagePulseConfig } from './imagePulse.config';
import { loadPulseImage } from './imagePulse.images';
import { renderImagePulse } from './imagePulse.renderer';
import type { ImagePulseConfig } from './imagePulse.types';

export const ImagePulseEngine: VisualEngine<ImagePulseConfig> = {
  id: 'image-pulse',
  name: 'Image Pulse',
  description: 'Uploaded image or cover art pulsing to the beat — pulse, glow, ripple, glitch and kaleido styles.',
  availability: 'implemented',
  defaultConfig: imagePulseDefaultConfig,
  parameters: imagePulseParameters,
  validateConfig: validateImagePulseConfig,
  render: renderImagePulse,
  async prepare(config) {
    if (config.imageSrc) await loadPulseImage(config.imageSrc);
  },
};
