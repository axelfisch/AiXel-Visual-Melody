// @vitest-environment node

import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../project/project.defaults';
import { continuationDraftId, continuationReturnUrl } from './continuation.flow';
import { ContinuationRepository } from './continuation.repository';
import { CONTINUATION_TTL_MS } from './continuation.types';

let counter = 0;
const randomBytes = (length: number) => {
  counter += 1;
  return new Uint8Array(length).fill(counter);
};

function projectWithSource(file: File) {
  const project = createProject('Naomi');
  project.sourceHint = {
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    duration: 42,
    sha256: null,
  };
  project.analysis = {
    sampleRate: 48_000,
    bpm: 88,
    peak: 0.9,
    averageEnergy: 0.4,
    waveform: [50],
    energy: [0.5],
  };
  return project;
}

describe('ContinuationRepository', () => {
  let factory: IDBFactory;
  let now: number;
  let databaseName: string;

  beforeEach(() => {
    factory = new IDBFactory();
    now = Date.parse('2026-08-17T12:00:00.000Z');
    counter = 0;
    databaseName = `continuation-${Math.random()}`;
  });

  const repository = () => new ContinuationRepository({
    indexedDB: factory,
    now: () => now,
    randomBytes,
    databaseName,
  });

  it('restores configuration, source file, and return intent after a new repository instance', async () => {
    const file = new File(['audio'], 'naomi.wav', { type: 'audio/wav' });
    const saved = await repository().saveDraft({
      project: projectWithSource(file),
      sourceFile: file,
      returnIntent: { screen: 'export', action: 'confirm_export' },
      origin: 'https://visualmelody.example',
    });
    expect(saved.audioStored).toBe(true);

    const resolved = await repository().resolveDraft(saved.draftId, {
      origin: 'https://visualmelody.example',
      userId: null,
    });
    expect(resolved.status).toBe('ready');
    if (resolved.status !== 'ready') return;
    expect(resolved.draft.project.name).toBe('Naomi');
    expect(resolved.draft.sourceFile?.name).toBe('naomi.wav');
    expect(resolved.draft.returnIntent).toEqual({ screen: 'export', action: 'confirm_export' });
  });

  it('keeps configuration when the source write cannot be cloned', async () => {
    const file = new File(['audio'], 'naomi.wav', { type: 'audio/wav' });
    const saved = await repository().saveDraft({
      project: projectWithSource(file),
      sourceFile: (() => undefined) as unknown as File,
      returnIntent: { screen: 'preview', action: 'resume_preview' },
      origin: 'https://visualmelody.example',
    });
    expect(saved.audioStored).toBe(false);
    const resolved = await repository().resolveDraft(saved.draftId, {
      origin: 'https://visualmelody.example',
      userId: null,
    });
    expect(resolved.status).toBe('ready');
    if (resolved.status === 'ready') expect(resolved.draft.sourceFile).toBeNull();
  });

  it('requires confirmation before binding anonymous work and rejects account switching', async () => {
    const file = new File(['audio'], 'naomi.wav', { type: 'audio/wav' });
    const saved = await repository().saveDraft({
      project: projectWithSource(file),
      sourceFile: null,
      returnIntent: { screen: 'export', action: 'confirm_export' },
      origin: 'https://visualmelody.example',
    });
    expect((await repository().resolveDraft(saved.draftId, {
      origin: 'https://visualmelody.example',
      userId: 'user-a',
    })).status).toBe('confirmation_required');
    expect((await repository().resolveDraft(saved.draftId, {
      origin: 'https://visualmelody.example',
      userId: 'user-a',
      confirmAnonymousBinding: true,
    })).status).toBe('ready');
    expect((await repository().resolveDraft(saved.draftId, {
      origin: 'https://visualmelody.example',
      userId: 'user-b',
    })).status).toBe('account_mismatch');
  });

  it('releases account-bound drafts on sign-out without deleting anonymous work', async () => {
    const file = new File(['audio'], 'naomi.wav', { type: 'audio/wav' });
    const saved = await repository().saveDraft({
      project: projectWithSource(file),
      sourceFile: null,
      returnIntent: { screen: 'export', action: 'confirm_export' },
      origin: 'https://visualmelody.example',
    });
    await repository().resolveDraft(saved.draftId, {
      origin: 'https://visualmelody.example',
      userId: 'user-a',
      confirmAnonymousBinding: true,
    });

    expect(await repository().releaseUserBindings('user-b')).toBe(0);
    expect(await repository().releaseUserBindings('user-a')).toBe(1);
    expect((await repository().resolveDraft(saved.draftId, {
      origin: 'https://visualmelody.example',
      userId: null,
    })).status).toBe('ready');
  });

  it('logically rejects and physically purges expired drafts', async () => {
    const file = new File(['audio'], 'naomi.wav', { type: 'audio/wav' });
    const saved = await repository().saveDraft({
      project: projectWithSource(file),
      sourceFile: file,
      returnIntent: { screen: 'export', action: 'confirm_export' },
      origin: 'https://visualmelody.example',
    });
    now += CONTINUATION_TTL_MS + 1;
    expect((await repository().resolveDraft(saved.draftId, {
      origin: 'https://visualmelody.example',
      userId: null,
    })).status).toBe('missing');
    expect(await repository().purgeExpired()).toBe(0);
  });

  it('rejects a different origin and exposes only an opaque identifier in return URLs', async () => {
    const file = new File(['secret audio'], 'private-song.wav', { type: 'audio/wav' });
    const saved = await repository().saveDraft({
      project: projectWithSource(file),
      sourceFile: null,
      returnIntent: { screen: 'export', action: 'confirm_export' },
      origin: 'https://visualmelody.example',
    });
    expect((await repository().resolveDraft(saved.draftId, {
      origin: 'https://evil.example',
      userId: null,
    })).status).toBe('missing');
    const url = continuationReturnUrl('https://visualmelody.example/auth/callback?code=secret#export', saved.draftId);
    expect(url).toBe(`https://visualmelody.example/auth/callback?continuation=${saved.draftId}`);
    expect(url).not.toMatch(/private-song|secret audio|Naomi|confirm_export/);
    expect(continuationDraftId(url)).toBe(saved.draftId);
  });

  it('purges a corrupted or unsupported stored project instead of partially hydrating it', async () => {
    const file = new File(['audio'], 'naomi.wav', { type: 'audio/wav' });
    const saved = await repository().saveDraft({
      project: projectWithSource(file),
      sourceFile: file,
      returnIntent: { screen: 'preview', action: 'resume_preview' },
      origin: 'https://visualmelody.example',
    });

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(databaseName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('drafts', 'readwrite');
    const store = transaction.objectStore('drafts');
    const current = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = store.get(saved.draftId);
      request.onsuccess = () => resolve(request.result as Record<string, unknown>);
      request.onerror = () => reject(request.error);
    });
    store.put({ ...current, serializedProject: '{"schemaVersion":999}' });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();

    expect((await repository().resolveDraft(saved.draftId, {
      origin: 'https://visualmelody.example',
      userId: null,
    })).status).toBe('missing');
  });
});
