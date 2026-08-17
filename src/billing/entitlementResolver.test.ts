// @vitest-environment node
import { describe,expect,it } from 'vitest';
import { GRACE_PERIOD_MS,resolveBillingEntitlement,type BillingFacts } from './entitlementResolver';
const now=Date.parse('2026-08-17T12:00:00Z');
const facts=(overrides:Partial<BillingFacts>={}):BillingFacts=>({now,priorPaidCoverage:false,currentPeriodEnd:null,cancelAtPeriodEnd:false,latestInvoicePaid:false,initialPaymentFailed:false,renewalFailureAt:null,existingGraceEndsAt:null,fullyRefundedCurrentPeriod:false,canonicalPaymentDisputed:false,administrativelySuspended:false,reconciliationAvailable:true,...overrides});
describe('billing entitlement resolver',()=>{
  it('never grants Pro or grace for initial payment failure',()=>expect(resolveBillingEntitlement(facts({initialPaymentFailed:true,renewalFailureAt:now})).entitlement).toBe('free_read_only'));
  it('starts exactly one seven-day grace for a renewal after paid coverage',()=>{ const decision=resolveBillingEntitlement(facts({priorPaidCoverage:true,renewalFailureAt:now})); expect(decision).toMatchObject({entitlement:'pro_grace',graceEndsAt:now+GRACE_PERIOD_MS}); });
  it('does not shorten an immutable grace deadline after an early terminal state',()=>{ const deadline=now+2*24*60*60*1000; expect(resolveBillingEntitlement(facts({existingGraceEndsAt:deadline,currentPeriodEnd:null}))).toMatchObject({entitlement:'pro_grace',graceEndsAt:deadline}); });
  it('preserves grace at expiry when Stripe reconciliation is unavailable',()=>expect(resolveBillingEntitlement(facts({existingGraceEndsAt:now,reconciliationAvailable:false}))).toMatchObject({entitlement:'pro_grace',preserveProjection:true}));
  it('requires a paid invoice for activation or recovery',()=>{ expect(resolveBillingEntitlement(facts({currentPeriodEnd:now+1000,latestInvoicePaid:false})).entitlement).toBe('free_read_only'); expect(resolveBillingEntitlement(facts({currentPeriodEnd:now+1000,latestInvoicePaid:true,cancelAtPeriodEnd:true})).entitlement).toBe('pro_cancelling'); });
  it('suspends canonical disputes and full current-period refunds before grace',()=>{ expect(resolveBillingEntitlement(facts({existingGraceEndsAt:now+1000,canonicalPaymentDisputed:true})).entitlement).toBe('pro_suspended'); expect(resolveBillingEntitlement(facts({fullyRefundedCurrentPeriod:true})).entitlement).toBe('pro_suspended'); });
});
