import cosmicWavesThumbnail from '../assets/engine-thumbnails/cosmic-waves.jpg';
import frequencyCityThumbnail from '../assets/engine-thumbnails/frequency-city.jpg';
import jazzGeometryThumbnail from '../assets/engine-thumbnails/jazz-geometry.jpg';
import liquidColorsThumbnail from '../assets/engine-thumbnails/liquid-colors.jpg';
import minimalAlbumArtThumbnail from '../assets/engine-thumbnails/minimal-album-art.jpg';
import neonVelvetThumbnail from '../assets/engine-thumbnails/neon-velvet.jpg';

export type EngineKey = 'cosmic' | 'geometry' | 'liquid' | 'city' | 'album' | 'neon' | 'sphere' | 'avatar' | 'pulse';

/** Pro Tool engines never appear in the classic engine tabs / home grid. */
export const PRO_ENGINE_KEYS: EngineKey[] = ['sphere', 'avatar', 'pulse'];

export type Engine = {
  id: string;
  key: EngineKey;
  number: string;
  name: string;
  character: string;
  motion: string;
  accentFrom: string;
  accentTo: string;
  preview: string;
  thumbnail: string;
  radius: number;
  mood: string;
};

export const engines: Engine[] = [
  {
    id: 'cosmic-waves',
    key: 'cosmic',
    number: '01',
    name: 'Cosmic Waves',
    character: 'Nebulas, soft particles, deep space.',
    motion: 'Slow drift and breathing opacity.',
    accentFrom: '#7fe0ff',
    accentTo: '#8a6bff',
    preview: 'radial-gradient(circle at 30% 25%, #3a6bd8 0%, #1a2a66 42%, #05060b 100%)',
    thumbnail: cosmicWavesThumbnail,
    radius: 22,
    mood: 'The light breathes, nebulas drifting slowly like held breath.',
  },
  {
    id: 'jazz-geometry',
    key: 'geometry',
    number: '02',
    name: 'Jazz Geometry',
    character: 'Concentric circles and harmonic rings.',
    motion: 'Independent slow rotation.',
    accentFrom: '#e7c977',
    accentTo: '#f4e3b0',
    preview: 'radial-gradient(circle at 55% 40%, #2a2f4a 0%, #10121e 65%, #05060b 100%)',
    thumbnail: jazzGeometryThumbnail,
    radius: 14,
    mood: 'Everything becomes geometric, circles moving in quiet harmony.',
  },
  {
    id: 'liquid-colors',
    key: 'liquid',
    number: '03',
    name: 'Liquid Colors',
    character: 'Ink-like gradients and organic blur.',
    motion: 'Continuous liquid gradient shift.',
    accentFrom: '#e08a4a',
    accentTo: '#a24fc9',
    preview: 'linear-gradient(120deg, #c9682f, #7a2f8a, #1a2a66)',
    thumbnail: liquidColorsThumbnail,
    radius: 34,
    mood: 'The interface turns liquid, ink folding into ink.',
  },
  {
    id: 'frequency-city',
    key: 'city',
    number: '04',
    name: 'Frequency City',
    character: 'Architectural skyline of spectrum bars.',
    motion: 'Independent bar pulse per building.',
    accentFrom: '#e750b4',
    accentTo: '#5fd0ff',
    preview: 'linear-gradient(0deg, #05060b 0%, #1a1030 42%, #2a1040 100%)',
    thumbnail: frequencyCityThumbnail,
    radius: 12,
    mood: 'A skyline of sound, architecture built from spectrum.',
  },
  {
    id: 'minimal-album-art',
    key: 'album',
    number: '05',
    name: 'Minimal Album Art',
    character: 'Graphite vinyl and one gold accent.',
    motion: 'Constant slow rotation.',
    accentFrom: '#e7c977',
    accentTo: '#ffffff',
    preview: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #060606 65%, #05060b 100%)',
    thumbnail: minimalAlbumArtThumbnail,
    radius: 20,
    mood: 'Minimal and monochrome, the record spinning in silence.',
  },
  {
    id: 'neon-velvet',
    key: 'neon',
    number: '06',
    name: 'Neon Velvet',
    character: 'Synthwave light trails on deep purple.',
    motion: 'Traveling neon trail animation.',
    accentFrom: '#5fd0ff',
    accentTo: '#8a6bff',
    preview: 'linear-gradient(135deg, #150a2e 0%, #2a0a4a 52%, #05060b 100%)',
    thumbnail: neonVelvetThumbnail,
    radius: 22,
    mood: 'Lights turn to velvet, synthwave trails in the dark.',
  },
  {
    id: 'particle-sphere',
    key: 'sphere',
    number: '07',
    name: 'Particle Sphere',
    character: 'Luminous particle sphere with orbit ribbons.',
    motion: 'Orbital pulse driven by audio energy.',
    accentFrom: '#9eeaff',
    accentTo: '#8a6bff',
    preview: 'radial-gradient(circle at 50% 48%, #1a2a66 0%, #0a1028 48%, #05060b 100%)',
    thumbnail: cosmicWavesThumbnail,
    radius: 24,
    mood: 'A sphere of light orbits in the dark, ribbons breathing with the beat.',
  },
  {
    id: 'dance-avatars',
    key: 'avatar',
    number: '08',
    name: 'Dance Avatars',
    character: 'Five styled avatars that dance to the beat.',
    motion: 'Audio-reactive dance with gender and style.',
    accentFrom: '#9eeaff',
    accentTo: '#c77dff',
    preview: 'radial-gradient(circle at 50% 42%, #2a1a55 0%, #0c1024 50%, #05060b 100%)',
    thumbnail: neonVelvetThumbnail,
    radius: 22,
    mood: 'A luminous dancer moves with the beat — silhouette, neon, hologram.',
  },
  {
    id: 'image-pulse',
    key: 'pulse',
    number: '09',
    name: 'Image Pulse',
    character: 'Your image or cover art, pulsing to the beat.',
    motion: 'Beat zoom, transient glow, ripple, glitch and kaleido.',
    accentFrom: '#ffb86b',
    accentTo: '#8a6bff',
    preview: 'radial-gradient(circle at 50% 45%, #3a1f4f 0%, #120c24 52%, #05060b 100%)',
    thumbnail: liquidColorsThumbnail,
    radius: 20,
    mood: 'Your image breathes with the track, pulsing in your Creator colors.',
  },
];


export const classicEngineKeys: EngineKey[] = ['cosmic', 'geometry', 'liquid', 'city', 'album', 'neon'];
