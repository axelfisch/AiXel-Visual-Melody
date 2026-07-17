import type { VisualEngine } from '../engine.types';
import { frequencyCityDefaultConfig, frequencyCityParameters, validateFrequencyCityConfig } from './frequencyCity.config';
import { renderFrequencyCity } from './frequencyCity.renderer';
import type { FrequencyCityConfig } from './frequencyCity.types';

export const FrequencyCityEngine: VisualEngine<FrequencyCityConfig> = {
  id: 'frequency-city',
  name: 'Frequency City',
  description: 'An architectural skyline built from independent spectrum pulses.',
  availability: 'implemented',
  defaultConfig: frequencyCityDefaultConfig,
  parameters: frequencyCityParameters,
  validateConfig: validateFrequencyCityConfig,
  render: renderFrequencyCity,
};
