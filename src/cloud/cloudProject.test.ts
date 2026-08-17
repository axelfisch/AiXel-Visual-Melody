// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createProject } from '../project/project.defaults';
import { fromCloudProject, markCloudDirty, retainConflict, toCloudProjectMutation } from './cloudProject';

describe('cloud project adapters', () => {
  it('extracts configuration without runtime or duplicated server-owned fields', () => {
    const project = createProject('New Light');
    project.artistName = 'Naomi';
    const mutation = toCloudProjectMutation(project);
    expect(mutation).not.toHaveProperty('id');
    expect(mutation).not.toHaveProperty('createdAt');
    expect(mutation).not.toHaveProperty('updatedAt');
    expect(JSON.stringify(mutation)).not.toMatch(/objectUrl|decodedAudio|sourceFile|user_id|revision/);
  });

  it('hydrates authoritative relational identity as a configuration-only project', () => {
    const mutation = toCloudProjectMutation(createProject('Local'));
    const restored = fromCloudProject({ ...mutation, id: 'cloud-id', name: 'Cloud title', revision: 4, createdAt: '2026-08-17T10:00:00.000Z', updatedAt: '2026-08-17T11:00:00.000Z' });
    expect(restored.id).toBe('cloud-id');
    expect(restored.name).toBe('Cloud title');
  });

  it('retains dirty local work and exposes an optimistic conflict', () => {
    const state = retainConflict(markCloudDirty({ cloudId: 'a', revision: 2, dirty: false, conflict: null }), 'revision_conflict:3:2026-08-17 12:00:00+00');
    expect(state).toMatchObject({ dirty: true, conflict: { currentRevision: 3 } });
  });
});
