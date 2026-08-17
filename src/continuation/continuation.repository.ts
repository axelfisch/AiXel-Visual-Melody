import { parseProject, serializeProject } from '../project/project.serialization';
import type { VisualMelodyProject } from '../project/project.types';
import {
  CONTINUATION_SCHEMA_VERSION,
  CONTINUATION_TTL_MS,
  type ContinuationAudioRecord,
  type ContinuationBinding,
  type ContinuationDraft,
  type ContinuationDraftRecord,
  type ContinuationResolution,
  type ContinuationReturnIntent,
} from './continuation.types';

const DATABASE_NAME = 'aixel-visual-melody-continuation';
const DATABASE_VERSION = 1;
const DRAFT_STORE = 'drafts';
const AUDIO_STORE = 'audio';

const RETURN_ACTIONS = new Set([
  'resume_preview',
  'confirm_export',
  'save_project',
  'save_brand_preset',
  'open_project',
]);
const RETURN_SCREENS = new Set([
  'home',
  'analyze',
  'create',
  'preview',
  'export',
  'settings',
  'design-system',
]);

type RepositoryOptions = {
  indexedDB?: IDBFactory;
  now?: () => number;
  randomBytes?: (length: number) => Uint8Array;
  databaseName?: string;
};

type SaveDraftInput = {
  project: VisualMelodyProject;
  sourceFile: File | null;
  returnIntent: ContinuationReturnIntent;
  origin: string;
};

type ResolveDraftInput = {
  origin: string;
  userId: string | null;
  confirmAnonymousBinding?: boolean;
};

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });

function defaultRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function opaqueId(randomBytes: (length: number) => Uint8Array): string {
  return [...randomBytes(24)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function isReturnIntent(value: unknown): value is ContinuationReturnIntent {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.screen === 'string' &&
    RETURN_SCREENS.has(record.screen) &&
    typeof record.action === 'string' &&
    RETURN_ACTIONS.has(record.action) &&
    Object.keys(record).every((key) => key === 'screen' || key === 'action')
  );
}

function isBinding(value: unknown): value is ContinuationBinding {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.kind === 'anonymous') {
    return typeof record.nonce === 'string' && /^[0-9a-f]{48}$/.test(record.nonce);
  }
  return record.kind === 'user' && typeof record.userId === 'string' && record.userId.length > 0;
}

function isDraftRecord(value: unknown): value is ContinuationDraftRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === CONTINUATION_SCHEMA_VERSION &&
    typeof record.id === 'string' &&
    /^[0-9a-f]{48}$/.test(record.id) &&
    typeof record.origin === 'string' &&
    isBinding(record.binding) &&
    isReturnIntent(record.returnIntent) &&
    typeof record.serializedProject === 'string' &&
    (record.audioState === 'available' || record.audioState === 'missing') &&
    typeof record.createdAt === 'string' &&
    typeof record.lastAccessedAt === 'string' &&
    typeof record.expiresAt === 'string'
  );
}

export class ContinuationRepository {
  private readonly factory: IDBFactory;
  private readonly now: () => number;
  private readonly randomBytes: (length: number) => Uint8Array;
  private readonly databaseName: string;

  constructor(options: RepositoryOptions = {}) {
    if (!options.indexedDB && !globalThis.indexedDB) throw new Error('IndexedDB is unavailable.');
    this.factory = options.indexedDB ?? globalThis.indexedDB;
    this.now = options.now ?? Date.now;
    this.randomBytes = options.randomBytes ?? defaultRandomBytes;
    this.databaseName = options.databaseName ?? DATABASE_NAME;
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = this.factory.open(this.databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(DRAFT_STORE)) {
          database.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(AUDIO_STORE)) {
          database.createObjectStore(AUDIO_STORE, { keyPath: 'draftId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'));
      request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked.'));
    });
  }

  async saveDraft(input: SaveDraftInput): Promise<{ draftId: string; audioStored: boolean }> {
    const database = await this.open();
    const now = this.now();
    const draftId = opaqueId(this.randomBytes);
    const nonce = opaqueId(this.randomBytes);
    const timestamp = new Date(now).toISOString();
    const record: ContinuationDraftRecord = {
      schemaVersion: CONTINUATION_SCHEMA_VERSION,
      id: draftId,
      origin: input.origin,
      binding: { kind: 'anonymous', nonce },
      returnIntent: input.returnIntent,
      serializedProject: serializeProject(input.project),
      audioState: 'missing',
      createdAt: timestamp,
      lastAccessedAt: timestamp,
      expiresAt: new Date(now + CONTINUATION_TTL_MS).toISOString(),
    };

    try {
      const configTransaction = database.transaction(DRAFT_STORE, 'readwrite');
      configTransaction.objectStore(DRAFT_STORE).put(record);
      await transactionDone(configTransaction);

      if (!input.sourceFile) return { draftId, audioStored: false };

      try {
        const audioTransaction = database.transaction(AUDIO_STORE, 'readwrite');
        audioTransaction.objectStore(AUDIO_STORE).put({
          draftId,
          sourceBlob: input.sourceFile,
          fileName: input.sourceFile.name,
          mimeType: input.sourceFile.type,
          lastModified: input.sourceFile.lastModified,
        } satisfies ContinuationAudioRecord);
        await transactionDone(audioTransaction);

        record.audioState = 'available';
        const markTransaction = database.transaction(DRAFT_STORE, 'readwrite');
        markTransaction.objectStore(DRAFT_STORE).put(record);
        await transactionDone(markTransaction);
        return { draftId, audioStored: true };
      } catch {
        return { draftId, audioStored: false };
      }
    } finally {
      database.close();
    }
  }

  async resolveDraft(draftId: string, input: ResolveDraftInput): Promise<ContinuationResolution> {
    await this.purgeExpired();
    const database = await this.open();
    try {
      const transaction = database.transaction([DRAFT_STORE, AUDIO_STORE], 'readonly');
      const rawDraft = await requestResult(transaction.objectStore(DRAFT_STORE).get(draftId));
      if (!isDraftRecord(rawDraft) || rawDraft.origin !== input.origin) return { status: 'missing' };

      let project: VisualMelodyProject;
      try {
        project = parseProject(rawDraft.serializedProject);
      } catch {
        await transactionDone(transaction);
        const cleanup = database.transaction([DRAFT_STORE, AUDIO_STORE], 'readwrite');
        cleanup.objectStore(DRAFT_STORE).delete(draftId);
        cleanup.objectStore(AUDIO_STORE).delete(draftId);
        await transactionDone(cleanup);
        return { status: 'missing' };
      }

      if (rawDraft.binding.kind === 'user' && rawDraft.binding.userId !== input.userId) {
        return { status: 'account_mismatch', draftId };
      }
      if (rawDraft.binding.kind === 'anonymous' && input.userId && !input.confirmAnonymousBinding) {
        return { status: 'confirmation_required', draftId, returnIntent: rawDraft.returnIntent };
      }

      if (rawDraft.binding.kind === 'anonymous' && input.userId) {
        rawDraft.binding = { kind: 'user', userId: input.userId };
      }
      rawDraft.lastAccessedAt = new Date(this.now()).toISOString();

      let sourceFile: File | null = null;
      if (rawDraft.audioState === 'available') {
        const rawAudio = await requestResult(transaction.objectStore(AUDIO_STORE).get(draftId));
        if (rawAudio && typeof rawAudio === 'object') {
          const audio = rawAudio as Partial<ContinuationAudioRecord>;
          if (
            audio.sourceBlob instanceof Blob &&
            typeof audio.fileName === 'string' &&
            typeof audio.mimeType === 'string' &&
            typeof audio.lastModified === 'number'
          ) {
            sourceFile = new File([audio.sourceBlob], audio.fileName, {
              type: audio.mimeType,
              lastModified: audio.lastModified,
            });
          }
        }
      }
      await transactionDone(transaction);

      const update = database.transaction([DRAFT_STORE, AUDIO_STORE], 'readwrite');
      update.objectStore(DRAFT_STORE).put({
        ...rawDraft,
        audioState: sourceFile ? 'available' : 'missing',
      });
      if (!sourceFile) update.objectStore(AUDIO_STORE).delete(draftId);
      await transactionDone(update);

      const draft: ContinuationDraft = {
        id: rawDraft.id,
        project,
        sourceFile,
        returnIntent: rawDraft.returnIntent,
        binding: rawDraft.binding,
        expiresAt: rawDraft.expiresAt,
      };
      return { status: 'ready', draft };
    } finally {
      database.close();
    }
  }

  async purgeExpired(): Promise<number> {
    const database = await this.open();
    try {
      const transaction = database.transaction([DRAFT_STORE, AUDIO_STORE], 'readwrite');
      const draftStore = transaction.objectStore(DRAFT_STORE);
      const audioStore = transaction.objectStore(AUDIO_STORE);
      const drafts = await requestResult(draftStore.getAll());
      const now = this.now();
      let purged = 0;
      for (const rawDraft of drafts) {
        if (!isDraftRecord(rawDraft) || Date.parse(rawDraft.expiresAt) <= now) {
          const id = rawDraft && typeof rawDraft === 'object' ? (rawDraft as { id?: unknown }).id : null;
          if (typeof id === 'string') {
            draftStore.delete(id);
            audioStore.delete(id);
          }
          purged += 1;
        }
      }
      await transactionDone(transaction);
      return purged;
    } finally {
      database.close();
    }
  }

  async clearDraft(draftId: string): Promise<void> {
    const database = await this.open();
    try {
      const transaction = database.transaction([DRAFT_STORE, AUDIO_STORE], 'readwrite');
      transaction.objectStore(DRAFT_STORE).delete(draftId);
      transaction.objectStore(AUDIO_STORE).delete(draftId);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async clearAll(): Promise<void> {
    const database = await this.open();
    try {
      const transaction = database.transaction([DRAFT_STORE, AUDIO_STORE], 'readwrite');
      transaction.objectStore(DRAFT_STORE).clear();
      transaction.objectStore(AUDIO_STORE).clear();
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }
}
