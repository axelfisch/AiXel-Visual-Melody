import type { ProjectToolId, VisualTool } from './tool.types';

const tools: VisualTool[] = [
  {
    id: 'engine',
    name: 'Visual Engines',
    description: 'The classic six AiXel visual worlds.',
    availability: 'implemented',
  },
  {
    id: 'particle-sphere',
    name: 'Particle Sphere',
    description: 'Luminous particle sphere with orbit ribbons and audio pulse.',
    availability: 'implemented',
    engineId: 'particle-sphere',
  },
  {
    id: 'dance-avatar',
    name: 'Dance Avatars',
    description: 'Five styled avatars that dance to the beat.',
    availability: 'coming-soon',
  },
  {
    id: 'image-pulse',
    name: 'Image Pulse',
    description: 'Uploaded cover art animated to the rhythm.',
    availability: 'coming-soon',
  },
  {
    id: 'lyric-canvas',
    name: 'Lyric Canvas',
    description: 'Cinematic synchronized lyrics.',
    availability: 'coming-soon',
  },
];

const byId = new Map(tools.map((tool) => [tool.id, tool]));

export function listTools(): VisualTool[] {
  return [...tools];
}

export function listProTools(): VisualTool[] {
  return tools.filter((tool) => tool.id !== 'engine');
}

export function getTool(id: ProjectToolId): VisualTool {
  const tool = byId.get(id);
  if (!tool) throw new Error(`Outil AiXel inconnu: ${id}`);
  return tool;
}

export function getToolOrDefault(id: string): VisualTool {
  return byId.get(id as ProjectToolId) ?? tools[0];
}

export function isProjectToolId(value: unknown): value is ProjectToolId {
  return typeof value === 'string' && byId.has(value as ProjectToolId);
}
