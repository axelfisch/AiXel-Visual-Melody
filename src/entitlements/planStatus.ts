import type { AccountEntitlementRow } from '../supabase/database.types';
import { FREE_CAPABILITIES } from './capabilities';
import type { Capabilities, EntitlementSnapshot, EntitlementState, PlanCode } from './entitlements.types';

export const PLAN_STATUS_MAX_AGE_MS = 5 * 60 * 1000;
export type MyPlanStatusV1 = { schemaVersion: 1; plan: PlanCode; entitlement: EntitlementState; capabilities: Capabilities; billing: { interval: 'month' | 'year' | null; paidThrough: string | null; cancelAtPeriodEnd: boolean; graceEndsAt: string | null; recoveryAction: 'update_payment' | 'new_checkout' | 'contact_support' | null; suspensionReason: 'payment_reversed' | 'payment_disputed' | 'account_suspended' | null }; projectionVersion: number; asOf: string };
const plans = new Set<PlanCode>(['free', 'creator_pro']);
const entitlements = new Set<EntitlementState>(['free','confirming','pro_active','pro_cancelling','pro_grace','pro_suspended','free_read_only']);
const allowedOrNull = <T extends string>(value: string | null, allowed: ReadonlySet<string>): T | null => value !== null && allowed.has(value) ? value as T : null;

export function mapPlanStatus(row: AccountEntitlementRow): MyPlanStatusV1 {
  const conservative = !plans.has(row.plan as PlanCode) || !entitlements.has(row.entitlement as EntitlementState);
  return { schemaVersion: 1, plan: conservative ? 'free' : row.plan as PlanCode, entitlement: conservative ? 'free_read_only' : row.entitlement as EntitlementState, capabilities: conservative ? { ...FREE_CAPABILITIES } : { cloudSave: row.cloud_save, maxCloudProjects: row.max_cloud_projects, maxBrandPresets: row.max_brand_presets, export1080p: row.export_1080p, socialRatios: row.social_ratios, cleanEndCard: row.clean_end_card }, billing: { interval: allowedOrNull(row.billing_interval, new Set(['month','year'])), paidThrough: row.paid_through, cancelAtPeriodEnd: row.cancel_at_period_end, graceEndsAt: row.grace_ends_at, recoveryAction: conservative ? 'contact_support' : allowedOrNull(row.recovery_action, new Set(['update_payment','new_checkout','contact_support'])), suspensionReason: allowedOrNull(row.suspension_reason, new Set(['payment_reversed','payment_disputed','account_suspended'])) }, projectionVersion: row.projection_version, asOf: row.as_of };
}

export function planStatusSnapshot(status: MyPlanStatusV1, fetchedAt = Date.now(), now = Date.now()): EntitlementSnapshot {
  const projectionTime = Date.parse(status.asOf);
  const fresh = Number.isFinite(projectionTime) && projectionTime <= now + 60_000 && fetchedAt <= now && now - fetchedAt <= PLAN_STATUS_MAX_AGE_MS;
  return { plan: status.plan, entitlement: status.entitlement, capabilities: fresh ? { ...status.capabilities } : { ...FREE_CAPABILITIES }, verified: fresh };
}
