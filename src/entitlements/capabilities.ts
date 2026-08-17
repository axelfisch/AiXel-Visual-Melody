import type {
  Capabilities,
  EntitlementSnapshot,
  EntitlementState,
  PlanCode,
} from './entitlements.types';

/**
 * Free is the default everywhere. Anonymous, signed-in Free, confirming,
 * suspended, and downgraded accounts all resolve to exactly this object, so the
 * anonymous workflow is the behavior the whole application falls back to.
 */
export const FREE_CAPABILITIES: Readonly<Capabilities> = Object.freeze({
  cloudSave: false,
  maxCloudProjects: 0,
  maxBrandPresets: 0,
  export1080p: false,
  socialRatios: false,
  cleanEndCard: false,
});

export const CREATOR_PRO_CAPABILITIES: Readonly<Capabilities> = Object.freeze({
  cloudSave: true,
  maxCloudProjects: 25,
  maxBrandPresets: 3,
  export1080p: true,
  socialRatios: true,
  cleanEndCard: true,
});

/**
 * Entitlement states that grant the paid capability set. Everything else — known
 * or unknown — is Free. The list is exhaustive on purpose: a new state added
 * later is conservatively Free until it is deliberately added here.
 */
const PRO_ENTITLEMENT_STATES: ReadonlySet<string> = new Set<EntitlementState>([
  'pro_active',
  'pro_cancelling',
  'pro_grace',
]);

export function capabilitiesFor(entitlement: EntitlementState | string): Capabilities {
  return { ...(PRO_ENTITLEMENT_STATES.has(entitlement) ? CREATOR_PRO_CAPABILITIES : FREE_CAPABILITIES) };
}

export function planFor(entitlement: EntitlementState | string): PlanCode {
  return PRO_ENTITLEMENT_STATES.has(entitlement) ? 'creator_pro' : 'free';
}

/** The snapshot used before any billing projection exists. */
export const FREE_ENTITLEMENT_SNAPSHOT: Readonly<EntitlementSnapshot> = Object.freeze({
  plan: 'free',
  entitlement: 'free',
  capabilities: FREE_CAPABILITIES,
  verified: false,
});

const KNOWN_ENTITLEMENTS: ReadonlySet<string> = new Set<EntitlementState>([
  'free',
  'confirming',
  'pro_active',
  'pro_cancelling',
  'pro_grace',
  'pro_suspended',
  'free_read_only',
]);

export function isKnownEntitlement(entitlement: string): entitlement is EntitlementState {
  return KNOWN_ENTITLEMENTS.has(entitlement);
}

/** An unrecognized entitlement collapses to Free rather than being carried around. */
export function entitlementSnapshotFor(
  entitlement: EntitlementState | string,
  verified = true,
): EntitlementSnapshot {
  const known: EntitlementState = isKnownEntitlement(entitlement) ? entitlement : 'free';
  return {
    plan: planFor(known),
    entitlement: known,
    capabilities: capabilitiesFor(known),
    verified,
  };
}

/** Paid behavior requires a server-verified entitlement projection. */
export function authorizedCapabilities(snapshot: EntitlementSnapshot): Capabilities {
  return snapshot.verified ? { ...snapshot.capabilities } : { ...FREE_CAPABILITIES };
}

/*
 * Semantic gates. Screens call these; they never compare plan names.
 */
export const canExport1080p = (capabilities: Capabilities) => capabilities.export1080p;
export const canUseSocialRatios = (capabilities: Capabilities) => capabilities.socialRatios;
export const canRemoveAiXelEndCard = (capabilities: Capabilities) => capabilities.cleanEndCard;
export const canSaveCloudProjects = (capabilities: Capabilities) =>
  capabilities.cloudSave && capabilities.maxCloudProjects > 0;
export const canUseBrandPresets = (capabilities: Capabilities) => capabilities.maxBrandPresets > 0;
