/**
 * Product-facing plan vocabulary (same names as the Creator Pro billing backlog,
 * PRs #19-#25). Screens and the export pipeline ask about capabilities only,
 * never about plan names or payment-provider states.
 */
export type PlanCode = 'free' | 'creator_pro';

/** Semantic gates. Adding a paid behavior means adding a capability here. */
export type Capabilities = {
  /** 1080p exports (1920×1080 and 1080×1920). Free is capped at 720p. */
  export1080p: boolean;
  /** Exports without the AiXel Visual Melody watermark. */
  removeWatermark: boolean;
};

/**
 * Where the active entitlement comes from:
 * - `default`: nothing known, Free.
 * - `verified`: a server-verified projection (future billing integration).
 * - `dev-override`: the owner's dev / preview switch (never a real purchase).
 */
export type EntitlementSource = 'default' | 'verified' | 'dev-override';

export type EntitlementSnapshot = {
  plan: PlanCode;
  capabilities: Capabilities;
  source: EntitlementSource;
};
