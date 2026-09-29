import { FREE_ENTITLEMENTS, snapshotFor } from './capabilities';
import type { EntitlementSnapshot, PlanCode } from './entitlements.types';

/*
 * Single source of truth for the active plan.
 *
 * There is no payment integration yet, so the app is Free unless:
 *   1. a verified snapshot is provided through `setVerifiedEntitlements()`
 *      (the seam the future billing projection will call), or
 *   2. the owner enables the DEV / PREVIEW override:
 *        - build time: `VITE_AIXEL_DEV_PLAN=creator_pro`
 *        - runtime:    open the app with `?aixel-plan=pro` (persisted in
 *                      localStorage `aixel-dev-plan`), `?aixel-plan=free` to reset.
 *      Set `VITE_AIXEL_DISABLE_DEV_PLAN=true` to ignore the runtime override once
 *      real billing is wired. The override is a testing switch, not a purchase.
 */

export const DEV_PLAN_STORAGE_KEY = 'aixel-dev-plan';
export const DEV_PLAN_QUERY_PARAM = 'aixel-plan';

type Env = Record<string, string | boolean | undefined>;

let envOverride: Env | null = null;

function env(): Env {
  if (envOverride) return envOverride;
  try {
    return (import.meta as ImportMeta & { env?: Env }).env ?? {};
  } catch {
    return {};
  }
}

/** Test hook: replaces the Vite env for the entitlement source. */
export function __setEntitlementEnvForTests(value: Env | null) {
  envOverride = value;
  notify();
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function parsePlan(value: unknown): PlanCode | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['pro', 'creator_pro', 'creator-pro', '1', 'true', 'on'].includes(normalized)) return 'creator_pro';
  if (['free', '0', 'false', 'off'].includes(normalized)) return 'free';
  return null;
}

export function runtimeOverrideAllowed(): boolean {
  return String(env().VITE_AIXEL_DISABLE_DEV_PLAN ?? '').toLowerCase() !== 'true';
}

/** Reads `?aixel-plan=pro|free` once per URL and persists it for the session's origin. */
let lastAppliedSearch: string | null = null;
function applyQueryOverride() {
  if (typeof window === 'undefined' || !window.location) return;
  const search = window.location.search ?? '';
  if (search === lastAppliedSearch) return;
  lastAppliedSearch = search;
  const requested = parsePlan(new URLSearchParams(search).get(DEV_PLAN_QUERY_PARAM));
  if (!requested) return;
  const store = storage();
  if (!store) return;
  if (requested === 'creator_pro') store.setItem(DEV_PLAN_STORAGE_KEY, 'creator_pro');
  else store.removeItem(DEV_PLAN_STORAGE_KEY);
}

/** True when the Pro override comes from the build env (cannot be switched off from the UI). */
export function devPlanForcedByBuild(): boolean {
  return parsePlan(env().VITE_AIXEL_DEV_PLAN) === 'creator_pro';
}

/** The owner's dev / preview override, if any (`creator_pro` only; Free is the default anyway). */
export function readDevPlanOverride(): PlanCode | null {
  if (devPlanForcedByBuild()) return 'creator_pro';
  if (!runtimeOverrideAllowed()) return null;
  applyQueryOverride();
  return parsePlan(storage()?.getItem(DEV_PLAN_STORAGE_KEY)) === 'creator_pro' ? 'creator_pro' : null;
}

let verified: EntitlementSnapshot | null = null;
const listeners = new Set<() => void>();
let cached: EntitlementSnapshot = FREE_ENTITLEMENTS;

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Current entitlements. Everything that gates a paid behavior (UI and the export
 * pipeline) reads this function, so there is exactly one place to wire billing.
 * Returns a stable object while nothing changes (safe for useSyncExternalStore).
 */
export function getEntitlements(): EntitlementSnapshot {
  const next = readDevPlanOverride() === 'creator_pro'
    ? snapshotFor('creator_pro', 'dev-override')
    : verified ?? FREE_ENTITLEMENTS;
  if (next.plan !== cached.plan || next.source !== cached.source) cached = next;
  return cached;
}

/** Seam for the future billing projection (server-verified). `null` returns to Free. */
export function setVerifiedEntitlements(plan: PlanCode | null) {
  verified = plan ? snapshotFor(plan, 'verified') : null;
  notify();
}

/** Turns the dev / preview override on (`creator_pro`) or off (`null`). */
export function setDevPlan(plan: PlanCode | null) {
  const store = storage();
  if (store) {
    if (plan === 'creator_pro') store.setItem(DEV_PLAN_STORAGE_KEY, 'creator_pro');
    else store.removeItem(DEV_PLAN_STORAGE_KEY);
  }
  notify();
}

export function subscribeEntitlements(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DEV_PLAN_STORAGE_KEY) listener();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
