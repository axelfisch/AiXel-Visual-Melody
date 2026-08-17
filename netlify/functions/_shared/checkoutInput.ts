export const CHECKOUT_CATALOG_KEYS = ['creator_pro_monthly','creator_pro_annual','creator_pro_annual_launch'] as const;
export type CheckoutCatalogKey = typeof CHECKOUT_CATALOG_KEYS[number];
export type CheckoutInput = { catalogKey: CheckoutCatalogKey; returnOrigin: string; continuationId: string | null };

export function parseCheckoutInput(value: unknown, allowedOrigins: ReadonlySet<string>): CheckoutInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_request');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !['catalogKey','returnOrigin','continuationId'].includes(key))) throw new Error('invalid_request');
  if (!CHECKOUT_CATALOG_KEYS.includes(record.catalogKey as CheckoutCatalogKey)) throw new Error('invalid_catalog_key');
  if (typeof record.returnOrigin !== 'string') throw new Error('invalid_return_origin');
  const origin = new URL(record.returnOrigin).origin;
  if (origin !== record.returnOrigin || !allowedOrigins.has(origin)) throw new Error('invalid_return_origin');
  const continuationId = record.continuationId ?? null;
  if (continuationId !== null && (typeof continuationId !== 'string' || !/^[0-9a-f]{48}$/.test(continuationId))) throw new Error('invalid_continuation');
  return { catalogKey: record.catalogKey as CheckoutCatalogKey, returnOrigin: origin, continuationId };
}

export function checkoutReturnUrls(input: CheckoutInput): { successUrl: string; cancelUrl: string } {
  const success = new URL('/', input.returnOrigin);
  success.searchParams.set('checkout', 'return');
  const cancel = new URL('/', input.returnOrigin);
  cancel.searchParams.set('checkout', 'cancelled');
  if (input.continuationId) {
    success.searchParams.set('continuation', input.continuationId);
    cancel.searchParams.set('continuation', input.continuationId);
  }
  return { successUrl: success.toString(), cancelUrl: cancel.toString() };
}
