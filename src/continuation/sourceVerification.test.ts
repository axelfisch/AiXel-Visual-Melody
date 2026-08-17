import { describe, expect, it } from 'vitest';
import { verifyContinuationSource } from './sourceVerification';

describe('verifyContinuationSource', () => {
  const file = new File(['audio'], 'naomi.wav', { type: 'audio/wav' });
  const hint = { fileName: file.name, mimeType: file.type, size: file.size, duration: 42, sha256: null };

  it('accepts matching metadata and a small decode-duration variance', async () => {
    await expect(verifyContinuationSource(file, hint, 42.1)).resolves.toBe(true);
  });

  it('rejects a substituted file or duration', async () => {
    const other = new File(['different'], 'naomi.wav', { type: 'audio/wav' });
    await expect(verifyContinuationSource(other, hint, 42)).resolves.toBe(false);
    await expect(verifyContinuationSource(file, hint, 50)).resolves.toBe(false);
  });
});
