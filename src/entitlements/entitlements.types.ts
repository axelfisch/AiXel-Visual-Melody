/**
 * Product-facing plan and entitlement vocabulary.
 *
 * These names come from the Creator Pro data model. They are deliberately *not*
 * Stripe statuses: nothing outside the future billing projection mapper is
 * allowed to reason about Stripe. Screens ask about capabilities only.
 */
export type PlanCode = 'free' | 'creator_pro';

export type EntitlementState =
  | 'free'
  | 'confirming'
  | 'pro_active'
  | 'pro_cancelling'
  | 'pro_grace'
  | 'pro_suspended'
  | 'free_read_only';

/**
 * The complete set of semantic gates. Adding a paid behavior means adding a
 * capability here, never a plan-name conditional inside a screen.
 */
export type Capabilities = {
  cloudSave: boolean;
  maxCloudProjects: number;
  maxBrandPresets: number;
  export1080p: boolean;
  socialRatios: boolean;
  cleanEndCard: boolean;
};

export type EntitlementSnapshot = {
  plan: PlanCode;
  entitlement: EntitlementState;
  capabilities: Capabilities;
  /**
   * `false` while no server projection has been observed. Anonymous Free use is
   * fully functional without one; only paid actions require a verified snapshot.
   */
  verified: boolean;
};
