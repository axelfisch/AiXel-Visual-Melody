import { ContinuationRepository } from './continuation.repository';

/** Best-effort startup purge. Free use must still work when storage is unavailable. */
export async function purgeContinuationOnStartup(): Promise<void> {
  if (!globalThis.indexedDB) return;
  try {
    await new ContinuationRepository().purgeExpired();
  } catch {
    // Private browsing and denied storage are recoverable product states.
  }
}
