// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { creatorProPurchaseOutputReady, OUTPUT_MATRIX_PREREQUISITE } from './purchasePrerequisites';

describe('Creator Pro purchase output prerequisite', () => {
  it('stays unsatisfied until physical browser benchmarks and visual approval exist', () => {
    expect(OUTPUT_MATRIX_PREREQUISITE.evidence.automatedEngineAspectFixtures).toBe(true);
    expect(OUTPUT_MATRIX_PREREQUISITE.evidence.physicalBrowserBenchmarks).toBe(false);
    expect(OUTPUT_MATRIX_PREREQUISITE.evidence.approvedVisualReview).toBe(false);
    expect(creatorProPurchaseOutputReady()).toBe(false);
  });
});
