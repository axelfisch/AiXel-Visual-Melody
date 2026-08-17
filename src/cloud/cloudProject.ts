import { parseProject } from '../project/project.serialization';
import type { VisualMelodyProject } from '../project/project.types';
import type { Json } from '../supabase/database.types';

export type CloudProjectMutationV1 = {
  name: string; artistName: string | null; schemaVersion: 1;
  analysis: VisualMelodyProject['analysis'];
  creativeConfiguration: { engine: VisualMelodyProject['engine']; export: VisualMelodyProject['export'] };
  sourceHint: VisualMelodyProject['sourceHint'];
};
export type CloudProjectV1 = CloudProjectMutationV1 & { id: string; revision: number; createdAt: string; updatedAt: string };

export function toCloudProjectMutation(project: VisualMelodyProject): CloudProjectMutationV1 {
  return {
    name: project.name,
    artistName: project.artistName,
    schemaVersion: 1,
    analysis: project.analysis ? { ...project.analysis, waveform: [...project.analysis.waveform], energy: [...project.analysis.energy] } : null,
    creativeConfiguration: { engine: { ...project.engine, parameters: { ...project.engine.parameters }, director: { mood: project.engine.director.mood, values: { ...project.engine.director.values } } }, export: { ...project.export } },
    sourceHint: project.sourceHint ? { ...project.sourceHint } : null,
  };
}

export function fromCloudProject(project: CloudProjectV1): VisualMelodyProject {
  return parseProject(JSON.stringify({
    schemaVersion: 2,
    id: project.id,
    name: project.name,
    artistName: project.artistName,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    sourceHint: project.sourceHint,
    analysis: project.analysis,
    engine: project.creativeConfiguration.engine,
    export: project.creativeConfiguration.export,
  }));
}

export function cloudMutationJson(project: VisualMelodyProject): Json {
  return toCloudProjectMutation(project) as unknown as Json;
}

export type CloudSyncState = { cloudId: string | null; revision: number | null; dirty: boolean; conflict: { currentRevision: number; updatedAt: string } | null };
export const cleanCloudSyncState = (project?: CloudProjectV1): CloudSyncState => ({ cloudId: project?.id ?? null, revision: project?.revision ?? null, dirty: false, conflict: null });
export const markCloudDirty = (state: CloudSyncState): CloudSyncState => ({ ...state, dirty: true });
export function retainConflict(state: CloudSyncState, errorMessage: string): CloudSyncState {
  const match = /^revision_conflict:(\d+):(.+)$/.exec(errorMessage);
  return match ? { ...state, dirty: true, conflict: { currentRevision: Number(match[1]), updatedAt: match[2] } } : state;
}
