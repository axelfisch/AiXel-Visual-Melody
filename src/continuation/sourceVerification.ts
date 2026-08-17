import type { ProjectSourceHint } from '../project/project.types';

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function verifyContinuationSource(
  file: File,
  hint: ProjectSourceHint,
  decodedDuration: number,
): Promise<boolean> {
  if (file.name !== hint.fileName || file.size !== hint.size) return false;
  if (hint.mimeType && file.type && file.type !== hint.mimeType) return false;
  const durationTolerance = Math.max(0.25, hint.duration * 0.005);
  if (!Number.isFinite(decodedDuration) || Math.abs(decodedDuration - hint.duration) > durationTolerance) return false;
  if (hint.sha256 && (await sha256(file)) !== hint.sha256) return false;
  return true;
}
