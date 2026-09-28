export type ProjectToolId =
  | 'engine'
  | 'dance-avatar'
  | 'image-pulse'
  | 'lyric-canvas'
  | 'particle-sphere';

export type ToolAvailability = 'implemented' | 'coming-soon';

export type VisualTool = {
  id: ProjectToolId;
  name: string;
  description: string;
  availability: ToolAvailability;
  /** When set, selecting this tool also selects the matching visual engine. */
  engineId?: string;
};
