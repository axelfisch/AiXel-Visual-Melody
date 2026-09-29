export type DanceAvatarGender = 'male' | 'female';

export type DanceAvatarStyle =
  | 'shadow'
  | 'particle'
  | 'neon'
  | 'humanoid'
  | 'hologram';

export type DanceAvatarsConfig = {
  danceSpeed: number;
  energyResponse: number;
  limbExpressiveness: number;
  glowIntensity: number;
  spaceScale: number;
  colorSaturation: number;
  sparkleDensity: number;
  warmth: number;
  primaryColor: string;
  accentColor: string;
  gender: DanceAvatarGender;
  style: DanceAvatarStyle;
  showTitle: boolean;
};

export const DANCE_AVATAR_GENDERS: DanceAvatarGender[] = ['male', 'female'];
export const DANCE_AVATAR_STYLES: DanceAvatarStyle[] = [
  'shadow',
  'particle',
  'neon',
  'humanoid',
  'hologram',
];
