import { useSyncExternalStore } from 'react';
import { getEntitlements, subscribeEntitlements } from './entitlements.source';
import type { Capabilities, EntitlementSnapshot, PlanCode } from './entitlements.types';

/** Live entitlement snapshot (re-renders when the plan or the dev override changes). */
export function useEntitlements(): EntitlementSnapshot {
  return useSyncExternalStore(subscribeEntitlements, getEntitlements, getEntitlements);
}

export function usePlan(): PlanCode {
  return useEntitlements().plan;
}

export function useCapabilities(): Capabilities {
  return useEntitlements().capabilities;
}
