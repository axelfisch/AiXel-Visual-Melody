export type DirectorPaletteId = 'auroraViolet' | 'solarGold' | 'emeraldTide' | 'crimsonVelvet' | 'glacierMono';

export type DirectorPalette = {
  id: DirectorPaletteId;
  /** Five hex colors, most prominent first. Engines apply as many as they have accent slots for. */
  colors: [string, string, string, string, string];
};

export const directorPalettes: DirectorPalette[] = [
  { id: 'auroraViolet', colors: ['#7fe0ff', '#8a6bff', '#e750b4', '#5fd0ff', '#c9aaff'] },
  { id: 'solarGold', colors: ['#e7c977', '#ffb347', '#ff7b54', '#fff1c2', '#d98a3d'] },
  { id: 'emeraldTide', colors: ['#3ddc97', '#28a99e', '#7cf29c', '#1f6f6b', '#a8f0d1'] },
  { id: 'crimsonVelvet', colors: ['#ff5c8a', '#c9184a', '#ff8fab', '#7c1034', '#ffd6e0'] },
  { id: 'glacierMono', colors: ['#d9e8ff', '#a9c4f5', '#5f7fb0', '#eef4ff', '#33456b'] },
];
