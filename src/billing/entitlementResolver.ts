export const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export type BillingFacts = {
  now: number;
  priorPaidCoverage: boolean;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  latestInvoicePaid: boolean;
  initialPaymentFailed: boolean;
  renewalFailureAt: number | null;
  existingGraceEndsAt: number | null;
  fullyRefundedCurrentPeriod: boolean;
  canonicalPaymentDisputed: boolean;
  administrativelySuspended: boolean;
  reconciliationAvailable: boolean;
};

export type BillingDecision = {
  entitlement: 'free_read_only' | 'pro_active' | 'pro_cancelling' | 'pro_grace' | 'pro_suspended';
  graceEndsAt: number | null;
  preserveProjection: boolean;
};

export function resolveBillingEntitlement(facts: BillingFacts): BillingDecision {
  if (facts.administrativelySuspended || facts.canonicalPaymentDisputed || facts.fullyRefundedCurrentPeriod) {
    return { entitlement:'pro_suspended',graceEndsAt:null,preserveProjection:false };
  }
  const graceEndsAt = facts.existingGraceEndsAt ?? (facts.priorPaidCoverage && facts.renewalFailureAt ? facts.renewalFailureAt + GRACE_PERIOD_MS : null);
  if (graceEndsAt && facts.now < graceEndsAt) return { entitlement:'pro_grace',graceEndsAt,preserveProjection:false };
  if (graceEndsAt && facts.now >= graceEndsAt && !facts.reconciliationAvailable) return { entitlement:'pro_grace',graceEndsAt,preserveProjection:true };
  if (facts.latestInvoicePaid && facts.currentPeriodEnd !== null && facts.currentPeriodEnd > facts.now) {
    return { entitlement:facts.cancelAtPeriodEnd ? 'pro_cancelling' : 'pro_active',graceEndsAt:null,preserveProjection:false };
  }
  return { entitlement:'free_read_only',graceEndsAt:null,preserveProjection:false };
}
