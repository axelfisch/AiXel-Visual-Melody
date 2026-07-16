import type { VisualMelodyProject } from './project.types';

export const hasAudio = (project: VisualMelodyProject) => project.audio !== null;
export const hasAnalysis = (project: VisualMelodyProject) => project.analysis !== null;
export const canPreview = (project: VisualMelodyProject) => hasAudio(project) && hasAnalysis(project);
export const canExport = canPreview;
export const getSelectedEngine = (project: VisualMelodyProject) => project.engine;
