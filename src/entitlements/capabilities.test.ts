import { describe, expect, it } from 'vitest';
import {
  CREATOR_PRO_CAPABILITIES,
  FREE_CAPABILITIES,
  FREE_ENTITLEMENT_SNAPSHOT,
  canExport1080p,
  canRemoveAiXelEndCard,
  canSaveCloudProjects,
  canUseBrandPresets,
  canUseSocialRatios,
  authorizedCapabilities,
  capabilitiesFor,
  entitlementSnapshotFor,
  planFor,
} from './capabilities';
import type { EntitlementState } from './entitlements.types';

const FREE_STATES: EntitlementState[] = ['free', 'confirming', 'pro_suspended', 'free_read_only'];
const PRO_STATES: EntitlementState[] = ['pro_active', 'pro_cancelling', 'pro_grace'];

describe('capability model', () => {
  it('grants nothing paid by default', () => {
    expect(FREE_CAPABILITIES).toEqual({
      cloudSave: false,
      maxCloudProjects: 0,
      maxBrandPresets: 0,
      export1080p: false,
      socialRatios: false,
      cleanEndCard: false,
    });
    expect(FREE_ENTITLEMENT_SNAPSHOT.plan).toBe('free');
    expect(FREE_ENTITLEMENT_SNAPSHOT.verified).toBe(false);
    expect(FREE_ENTITLEMENT_SNAPSHOT.capabilities).toEqual(FREE_CAPABILITIES);
  });

  it.each(FREE_STATES)('reproduces Free behavior for the %s state', (state) => {
    expect(capabilitiesFor(state)).toEqual(FREE_CAPABILITIES);
    expect(planFor(state)).toBe('free');
  });

  it.each(PRO_STATES)('grants the paid capability set for the %s state', (state) => {
    expect(capabilitiesFor(state)).toEqual(CREATOR_PRO_CAPABILITIES);
    expect(planFor(state)).toBe('creator_pro');
  });

  it('falls back to Free for an unrecognized entitlement', () => {
    const snapshot = entitlementSnapshotFor('pro_super_admin');
    expect(snapshot.entitlement).toBe('free');
    expect(snapshot.plan).toBe('free');
    expect(snapshot.capabilities).toEqual(FREE_CAPABILITIES);
  });

  it('returns a copy so a caller cannot widen the shared defaults', () => {
    const capabilities = capabilitiesFor('free');
    capabilities.export1080p = true;
    expect(FREE_CAPABILITIES.export1080p).toBe(false);
    expect(capabilitiesFor('free').export1080p).toBe(false);
  });

  it('exposes the paid behaviors as named gates', () => {
    expect(canExport1080p(FREE_CAPABILITIES)).toBe(false);
    expect(canUseSocialRatios(FREE_CAPABILITIES)).toBe(false);
    expect(canRemoveAiXelEndCard(FREE_CAPABILITIES)).toBe(false);
    expect(canSaveCloudProjects(FREE_CAPABILITIES)).toBe(false);
    expect(canUseBrandPresets(FREE_CAPABILITIES)).toBe(false);

    expect(canExport1080p(CREATOR_PRO_CAPABILITIES)).toBe(true);
    expect(canUseSocialRatios(CREATOR_PRO_CAPABILITIES)).toBe(true);
    expect(canRemoveAiXelEndCard(CREATOR_PRO_CAPABILITIES)).toBe(true);
    expect(canSaveCloudProjects(CREATOR_PRO_CAPABILITIES)).toBe(true);
    expect(canUseBrandPresets(CREATOR_PRO_CAPABILITIES)).toBe(true);
  });

  it('keeps the launch allowances on the paid set', () => {
    expect(CREATOR_PRO_CAPABILITIES.maxCloudProjects).toBe(25);
    expect(CREATOR_PRO_CAPABILITIES.maxBrandPresets).toBe(3);
  });

  it('never authorizes paid behavior from an unverified snapshot', () => {
    const snapshot = {
      plan: 'creator_pro' as const,
      entitlement: 'pro_active' as const,
      capabilities: { ...CREATOR_PRO_CAPABILITIES },
      verified: false,
    };
    expect(authorizedCapabilities(snapshot)).toEqual(FREE_CAPABILITIES);
    expect(authorizedCapabilities({ ...snapshot, verified: true })).toEqual(CREATOR_PRO_CAPABILITIES);
  });
});
