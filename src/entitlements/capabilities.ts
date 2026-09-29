import type { Capabilities, EntitlementSnapshot, EntitlementSource, PlanCode } from './entitlements.types';

/** Free is the default everywhere: anonymous use, unknown plans and errors all resolve here. */
export const FREE_CAPABILITIES: Readonly<Capabilities> = Object.freeze({
  export1080p: false,
  removeWatermark: false,
});

export const CREATOR_PRO_CAPABILITIES: Readonly<Capabilities> = Object.freeze({
  export1080p: true,
  removeWatermark: true,
});

export function isPlanCode(value: unknown): value is PlanCode {
  return value === 'free' || value === 'creator_pro';
}

export function capabilitiesFor(plan: PlanCode | string): Capabilities {
  return { ...(plan === 'creator_pro' ? CREATOR_PRO_CAPABILITIES : FREE_CAPABILITIES) };
}

export function snapshotFor(plan: PlanCode | string, source: EntitlementSource): EntitlementSnapshot {
  const known: PlanCode = isPlanCode(plan) ? plan : 'free';
  return { plan: known, capabilities: capabilitiesFor(known), source };
}

export const FREE_ENTITLEMENTS: Readonly<EntitlementSnapshot> = Object.freeze({
  plan: 'free',
  capabilities: FREE_CAPABILITIES,
  source: 'default',
});

/* Semantic gates: callers use these, never plan-name comparisons. */
export const canExport1080p = (capabilities: Capabilities) => capabilities.export1080p;
export const canRemoveWatermark = (capabilities: Capabilities) => capabilities.removeWatermark;
