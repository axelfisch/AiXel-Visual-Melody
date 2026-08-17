// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { AccountEntitlementRow } from '../supabase/database.types';
import { mapPlanStatus, planStatusSnapshot } from './planStatus';

const row = (overrides: Partial<AccountEntitlementRow> = {}): AccountEntitlementRow => ({ user_id:'user-a',schema_version:1,plan:'creator_pro',entitlement:'pro_active',cloud_save:true,max_cloud_projects:25,max_brand_presets:3,export_1080p:true,social_ratios:true,clean_end_card:true,billing_interval:'year',paid_through:null,cancel_at_period_end:false,grace_ends_at:null,recovery_action:null,suspension_reason:null,projection_version:2,as_of:'2026-08-17T12:00:00.000Z',...overrides });

describe('MyPlanStatusV1', () => {
  it('maps only the safe projection and authorizes a fresh known state', () => {
    const snapshot = planStatusSnapshot(mapPlanStatus(row()), Date.parse('2026-08-17T12:03:00.000Z'), Date.parse('2026-08-17T12:04:00.000Z'));
    expect(snapshot.verified).toBe(true);
    expect(snapshot.capabilities.export1080p).toBe(true);
  });
  it('keeps labels but removes authorization when stale', () => {
    const snapshot = planStatusSnapshot(mapPlanStatus(row()), Date.parse('2026-08-17T12:00:00.000Z'), Date.parse('2026-08-17T12:06:00.000Z'));
    expect(snapshot.plan).toBe('creator_pro');
    expect(snapshot.verified).toBe(false);
    expect(snapshot.capabilities.export1080p).toBe(false);
  });
  it('maps unknown server state conservatively', () => {
    const status = mapPlanStatus(row({ plan:'enterprise', entitlement:'mystery', cloud_save:true }));
    expect(status).toMatchObject({ plan:'free', entitlement:'free_read_only', capabilities:{ cloudSave:false }, billing:{ recoveryAction:'contact_support' } });
  });
});
