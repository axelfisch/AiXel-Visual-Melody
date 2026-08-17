import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { authorizedCapabilities, FREE_ENTITLEMENT_SNAPSHOT } from './capabilities';
import type { Capabilities, EntitlementSnapshot } from './entitlements.types';

const EntitlementContext = createContext<EntitlementSnapshot | null>(null);

/**
 * Supplies the active entitlement snapshot. There is no billing source yet, so
 * the provider serves the Free defaults; a later ticket replaces `snapshot`
 * with the server-derived projection without touching a single screen.
 */
export function EntitlementProvider({
  children,
  snapshot = FREE_ENTITLEMENT_SNAPSHOT,
}: {
  children: ReactNode;
  snapshot?: EntitlementSnapshot;
}) {
  const value = useMemo<EntitlementSnapshot>(() => ({ ...snapshot }), [snapshot]);
  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

/**
 * Readable without a provider on purpose: a missing provider must degrade to
 * Free rather than break the anonymous workflow.
 */
export function useEntitlement(): EntitlementSnapshot {
  return useContext(EntitlementContext) ?? FREE_ENTITLEMENT_SNAPSHOT;
}

export function useCapabilities(): Capabilities {
  return authorizedCapabilities(useEntitlement());
}
