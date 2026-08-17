import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../supabase/database.types';
import type { CloudProjectMutationV1, CloudProjectV1 } from './cloudProject';

export class CloudConflictError extends Error {
  constructor(public readonly currentRevision: number, public readonly updatedAt: string) {
    super(`revision_conflict:${currentRevision}:${updatedAt}`);
    this.name = 'CloudConflictError';
  }
}

function projectFromRow(row: Record<string, unknown>): CloudProjectV1 {
  const value = {
    id: row.id, revision: row.revision, name: row.name, artistName: row.artist_name,
    schemaVersion: row.schema_version, analysis: row.analysis,
    creativeConfiguration: row.creative_configuration, sourceHint: row.source_hint,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
  if (typeof value.id !== 'string' || typeof value.revision !== 'number' || typeof value.name !== 'string' || value.schemaVersion !== 1 || typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') throw new Error('invalid_cloud_project');
  return value as CloudProjectV1;
}

function throwCloudError(error: { message: string } | null): never {
  const match = /revision_conflict:(\d+):(.+)/.exec(error?.message ?? '');
  if (match) throw new CloudConflictError(Number(match[1]), match[2]);
  throw new Error(error?.message || 'cloud_operation_failed');
}

export class CloudProjectRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(): Promise<CloudProjectV1[]> {
    const { data, error } = await this.client.from('projects').select('*').order('updated_at', { ascending: false });
    if (error) throwCloudError(error);
    return (data ?? []).map((row) => projectFromRow(row));
  }

  async create(payload: CloudProjectMutationV1): Promise<CloudProjectV1> {
    const { data, error } = await this.client.rpc('create_cloud_project', { payload: payload as unknown as Json });
    if (error || !data?.[0]) throwCloudError(error);
    return projectFromRow(data[0]);
  }

  async update(id: string, expectedRevision: number, payload: CloudProjectMutationV1): Promise<CloudProjectV1> {
    const { data, error } = await this.client.rpc('update_cloud_project', { project_id: id, expected_revision: expectedRevision, payload: payload as unknown as Json });
    if (error || !data?.[0]) throwCloudError(error);
    return projectFromRow(data[0]);
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    const { error } = await this.client.rpc('delete_cloud_project', { project_id: id, expected_revision: expectedRevision });
    if (error) throwCloudError(error);
  }
}
