export type DirectorDimension =
  | 'emotion'
  | 'space'
  | 'fluidity'
  | 'light'
  | 'dynamics'
  | 'particles'
  | 'colorEnergy'
  | 'motionComplexity';

export type DirectorState = Record<DirectorDimension, number>;

export type DirectorMood =
  | 'More Cinematic'
  | 'More Emotional'
  | 'More Dreamy'
  | 'More Powerful'
  | 'More Organic'
  | 'More Minimal';

export type DirectorEngineMapping = {
  supportedDimensions: DirectorDimension[];
  parameters: Record<string, number | string | boolean>;
};
