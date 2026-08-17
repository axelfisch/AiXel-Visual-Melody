export {
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
  isKnownEntitlement,
  planFor,
} from './capabilities';
export { EntitlementProvider, useCapabilities, useEntitlement } from './entitlements.context';
export type {
  Capabilities,
  EntitlementSnapshot,
  EntitlementState,
  PlanCode,
} from './entitlements.types';
