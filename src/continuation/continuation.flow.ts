import type { ProjectRuntime, VisualMelodyProject } from '../project/project.types';
import { ContinuationRepository } from './continuation.repository';
import type { ContinuationReturnIntent } from './continuation.types';

const CONTINUATION_PARAM = 'continuation';

export async function prepareContinuation({
  repository,
  project,
  runtime,
  returnIntent,
  origin = window.location.origin,
}: {
  repository: ContinuationRepository;
  project: VisualMelodyProject;
  runtime: ProjectRuntime;
  returnIntent: ContinuationReturnIntent;
  origin?: string;
}) {
  const storage = navigator.storage;
  let storageEstimate: StorageEstimate | null = null;
  let persistenceRequested = false;
  try {
    storageEstimate = (await storage?.estimate?.()) ?? null;
    persistenceRequested = (await storage?.persist?.()) ?? false;
  } catch {
    // Storage estimates and persistence grants are hints, never prerequisites.
  }

  const result = await repository.saveDraft({
    project,
    sourceFile: runtime.sourceFile,
    returnIntent,
    origin,
  });
  return { ...result, storageEstimate, persistenceRequested };
}

export function continuationReturnUrl(baseUrl: string, draftId: string): string {
  if (!/^[0-9a-f]{48}$/.test(draftId)) throw new Error('Invalid continuation draft identifier.');
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set(CONTINUATION_PARAM, draftId);
  return url.toString();
}

export function continuationDraftId(url: string): string | null {
  const value = new URL(url).searchParams.get(CONTINUATION_PARAM);
  return value && /^[0-9a-f]{48}$/.test(value) ? value : null;
}
