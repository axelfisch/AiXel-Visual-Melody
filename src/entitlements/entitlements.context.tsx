import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authorizedCapabilities, FREE_ENTITLEMENT_SNAPSHOT } from './capabilities';
import type { Capabilities, EntitlementSnapshot } from './entitlements.types';
import { mapPlanStatus, planStatusSnapshot, PLAN_STATUS_MAX_AGE_MS, type MyPlanStatusV1 } from './planStatus';
import { useOptionalSession } from '../session';
import { getSupabaseClient } from '../supabase/client';

const EntitlementContext = createContext<EntitlementSnapshot | null>(null);

/**
 * Supplies the active entitlement snapshot. There is no billing source yet, so
 * the provider serves the Free defaults; a later ticket replaces `snapshot`
 * with the server-derived projection without touching a single screen.
 */
export function EntitlementProvider({
  children,
  snapshot,
}: {
  children: ReactNode;
  snapshot?: EntitlementSnapshot;
}) {
  const session = useOptionalSession();
  const [remote, setRemote] = useState<{ status: MyPlanStatusV1; fetchedAt: number } | null>(null);
  const fetching = useRef(false);
  const refresh = useCallback(async () => {
    if (snapshot || !session.user || fetching.current) return;
    fetching.current = true;
    try {
      const client = getSupabaseClient();
      if (!client) return;
      const { data, error } = await client.from('account_entitlements').select('*').eq('user_id', session.user.id).single();
      if (error) throw error;
      setRemote({ status: mapPlanStatus(data), fetchedAt: Date.now() });
    } catch {
      setRemote((current) => current ? { ...current, fetchedAt: 0 } : null);
    } finally {
      fetching.current = false;
    }
  }, [session.user, snapshot]);

  useEffect(() => {
    if (snapshot) return;
    if (!session.user) { setRemote(null); return; }
    void refresh();
  }, [refresh, session.user, snapshot]);

  useEffect(() => {
    if (snapshot) return;
    const visible = () => {
      if (document.visibilityState === 'visible' && (!remote || Date.now() - remote.fetchedAt > PLAN_STATUS_MAX_AGE_MS)) void refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => document.removeEventListener('visibilitychange', visible);
  }, [refresh, remote, snapshot]);

  const value = useMemo<EntitlementSnapshot>(() => {
    if (snapshot) return { ...snapshot };
    return remote ? planStatusSnapshot(remote.status, remote.fetchedAt) : { ...FREE_ENTITLEMENT_SNAPSHOT };
  }, [remote, snapshot]);
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
