export const OUTPUT_MATRIX_PREREQUISITE = {
  schemaVersion: 1,
  id: 'creator-pro-output-matrix',
  satisfied: false,
  engineCount: 6,
  aspectRatios: ['16:9', '9:16', '1:1'],
  resolutions: ['720p', '1080p'],
  requiredBrowsers: ['safari', 'chrome', 'edge', 'firefox'],
  evidence: {
    automatedEngineAspectFixtures: true,
    previewExportRendererParity: true,
    physicalBrowserBenchmarks: false,
    approvedVisualReview: false,
  },
  blockers: ['physical_browser_benchmarks', 'approved_visual_review'],
} as const;

export function creatorProPurchaseOutputReady(): boolean {
  return OUTPUT_MATRIX_PREREQUISITE.satisfied;
}
