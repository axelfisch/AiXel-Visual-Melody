import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CREATOR_PRO_CAPABILITIES,
  DEV_PLAN_STORAGE_KEY,
  FREE_CAPABILITIES,
  getEntitlements,
  setDevPlan,
  setVerifiedEntitlements,
  subscribeEntitlements,
} from './index';
import { __setEntitlementEnvForTests } from './entitlements.source';

afterEach(() => {
  setDevPlan(null);
  setVerifiedEntitlements(null);
  __setEntitlementEnvForTests(null);
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

describe('entitlements source', () => {
  it('defaults to Free: 720p only, watermark required', () => {
    const snapshot = getEntitlements();
    expect(snapshot.plan).toBe('free');
    expect(snapshot.source).toBe('default');
    expect(snapshot.capabilities).toEqual(FREE_CAPABILITIES);
    expect(FREE_CAPABILITIES).toEqual({ export1080p: false, removeWatermark: false });
  });

  it('enables Creator Pro through the dev override and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeEntitlements(listener);
    setDevPlan('creator_pro');
    expect(listener).toHaveBeenCalled();
    expect(localStorage.getItem(DEV_PLAN_STORAGE_KEY)).toBe('creator_pro');
    expect(getEntitlements()).toMatchObject({ plan: 'creator_pro', source: 'dev-override', capabilities: CREATOR_PRO_CAPABILITIES });
    setDevPlan(null);
    expect(getEntitlements().plan).toBe('free');
    unsubscribe();
  });

  it('returns a stable snapshot while nothing changes', () => {
    expect(getEntitlements()).toBe(getEntitlements());
    setDevPlan('creator_pro');
    expect(getEntitlements()).toBe(getEntitlements());
  });

  it('reads ?aixel-plan=pro once and persists it, ?aixel-plan=free resets', () => {
    window.history.replaceState(null, '', '/?aixel-plan=pro');
    expect(getEntitlements().plan).toBe('creator_pro');
    window.history.replaceState(null, '', '/');
    expect(getEntitlements().plan).toBe('creator_pro');
    window.history.replaceState(null, '', '/?aixel-plan=free');
    expect(getEntitlements().plan).toBe('free');
    expect(localStorage.getItem(DEV_PLAN_STORAGE_KEY)).toBeNull();
  });

  it('supports a build-time override and a kill switch for the runtime one', () => {
    __setEntitlementEnvForTests({ VITE_AIXEL_DEV_PLAN: 'creator_pro' });
    expect(getEntitlements().plan).toBe('creator_pro');
    __setEntitlementEnvForTests({ VITE_AIXEL_DISABLE_DEV_PLAN: 'true' });
    localStorage.setItem(DEV_PLAN_STORAGE_KEY, 'creator_pro');
    expect(getEntitlements().plan).toBe('free');
  });

  it('accepts a verified plan from the future billing projection', () => {
    setVerifiedEntitlements('creator_pro');
    expect(getEntitlements()).toMatchObject({ plan: 'creator_pro', source: 'verified' });
    setVerifiedEntitlements(null);
    expect(getEntitlements().source).toBe('default');
  });

  it('ignores unknown stored values', () => {
    localStorage.setItem(DEV_PLAN_STORAGE_KEY, 'enterprise');
    expect(getEntitlements().plan).toBe('free');
  });
});
