import type { Screen } from '../app/navigation';
import type { VisualMelodyProject } from '../project/project.types';

export const CONTINUATION_SCHEMA_VERSION = 1 as const;
export const CONTINUATION_TTL_MS = 24 * 60 * 60 * 1_000;

export type ContinuationAction =
  | 'resume_preview'
  | 'confirm_export'
  | 'save_project'
  | 'save_brand_preset'
  | 'open_project';

export type ContinuationReturnIntent = {
  screen: Screen;
  action: ContinuationAction;
};

export type ContinuationBinding =
  | { kind: 'anonymous'; nonce: string }
  | { kind: 'user'; userId: string };

export type ContinuationAudioState = 'available' | 'missing';

export type ContinuationDraftRecord = {
  schemaVersion: typeof CONTINUATION_SCHEMA_VERSION;
  id: string;
  origin: string;
  binding: ContinuationBinding;
  returnIntent: ContinuationReturnIntent;
  serializedProject: string;
  audioState: ContinuationAudioState;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
};

export type ContinuationAudioRecord = {
  draftId: string;
  sourceBlob: Blob;
  fileName: string;
  mimeType: string;
  lastModified: number;
};

export type ContinuationDraft = {
  id: string;
  project: VisualMelodyProject;
  sourceFile: File | null;
  returnIntent: ContinuationReturnIntent;
  binding: ContinuationBinding;
  expiresAt: string;
};

export type ContinuationResolution =
  | { status: 'ready'; draft: ContinuationDraft }
  | { status: 'confirmation_required'; draftId: string; returnIntent: ContinuationReturnIntent }
  | { status: 'account_mismatch'; draftId: string }
  | { status: 'missing' };
