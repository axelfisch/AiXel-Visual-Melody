import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Database } from '../../src/supabase/database.types';
import { checkoutReturnUrls, parseCheckoutInput, type CheckoutCatalogKey } from './_shared/checkoutInput';

const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const requiredEnv = (name: string) => { const value = Netlify.env.get(name); if (!value) throw new Error(`missing_${name.toLowerCase()}`); return value; };
const priceFor = (catalogKey: CheckoutCatalogKey) => {
  const names: Record<CheckoutCatalogKey,string> = { creator_pro_monthly:'STRIPE_PRICE_CREATOR_PRO_MONTHLY', creator_pro_annual:'STRIPE_PRICE_CREATOR_PRO_ANNUAL', creator_pro_annual_launch:'STRIPE_PRICE_CREATOR_PRO_ANNUAL_LAUNCH' };
  const value = requiredEnv(names[catalogKey]);
  if (!/^price_[A-Za-z0-9]+$/.test(value)) throw new Error('invalid_server_catalog');
  return value;
};
const payableStatuses = new Set(['trialing','active','past_due','unpaid','paused']);

export default async (request: Request, _context: Context) => {
  if (request.method !== 'POST') return json(405, { code:'method_not_allowed' });
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json(401, { code:'authentication_required' });
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const publishableKey = requiredEnv('SUPABASE_PUBLISHABLE_KEY');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const allowedOrigins = new Set(requiredEnv('APP_ALLOWED_ORIGINS').split(',').map((value) => new URL(value.trim()).origin));
    const input = parseCheckoutInput(await request.json(), allowedOrigins);
    const userClient = createClient<Database>(supabaseUrl, publishableKey, { global: { headers: { Authorization:`Bearer ${token}` } }, auth: { persistSession:false,autoRefreshToken:false } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json(401, { code:'authentication_required' });
    const { data: reservations, error: reservationError } = await userClient.rpc('reserve_checkout_attempt', { requested_catalog_key:input.catalogKey });
    if (reservationError) return json(reservationError.message.includes('purchase_disabled') ? 503 : 409, { code:reservationError.message.includes('purchase_disabled') ? 'purchase_disabled' : 'checkout_unavailable' });
    const reservation = reservations?.[0];
    if (!reservation) return json(503, { code:'checkout_unavailable' });
    if (reservation.action === 'already_subscribed') return json(409, { code:'already_subscribed' });
    if (reservation.action === 'reuse' && reservation.checkout_url) return json(200, { status:'ready',url:reservation.checkout_url });
    if (reservation.action === 'pending') return json(202, { status:'pending',retryAfterMs:750 });
    if (!reservation.attempt_id) return json(503, { code:'checkout_unavailable' });

    const stripe = new Stripe(requiredEnv('STRIPE_SECRET_KEY'));
    const admin = createClient<Database>(supabaseUrl, serviceRoleKey, { auth:{ persistSession:false,autoRefreshToken:false } });
    let customerId = reservation.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email:userData.user.email, metadata:{ aixel_checkout_attempt:reservation.attempt_id } }, { idempotencyKey:`aixel-customer-${userData.user.id}` });
      customerId = customer.id;
      const { error } = await admin.rpc('attach_checkout_customer', { attempt_id:reservation.attempt_id,customer_id:customerId });
      if (error) throw error;
    }

    const current = await stripe.subscriptions.list({ customer:customerId,status:'all',limit:20 });
    if (current.data.some((subscription) => payableStatuses.has(subscription.status))) {
      await admin.rpc('fail_checkout_attempt', { attempt_id:reservation.attempt_id });
      return json(409, { code:'already_subscribed' });
    }
    if (reservation.replaces_session_id) {
      try { await stripe.checkout.sessions.expire(reservation.replaces_session_id); }
      catch {
        const afterRace = await stripe.subscriptions.list({ customer:customerId,status:'all',limit:20 });
        if (afterRace.data.some((subscription) => payableStatuses.has(subscription.status))) {
          await admin.rpc('fail_checkout_attempt', { attempt_id:reservation.attempt_id });
          return json(409, { code:'already_subscribed' });
        }
      }
    }
    const urls = checkoutReturnUrls(input);
    const expiresAt = Math.floor(Date.now()/1000)+30*60;
    const session = await stripe.checkout.sessions.create({ mode:'subscription',customer:customerId,line_items:[{ price:priceFor(input.catalogKey),quantity:1 }],payment_method_types:['card'],payment_method_collection:'always',success_url:urls.successUrl,cancel_url:urls.cancelUrl,expires_at:expiresAt,client_reference_id:reservation.attempt_id,metadata:{ checkout_attempt_id:reservation.attempt_id } }, { idempotencyKey:reservation.attempt_id });
    if (!session.url) throw new Error('stripe_session_missing_url');
    const { error:finalizeError } = await admin.rpc('finalize_checkout_attempt', { attempt_id:reservation.attempt_id,session_id:session.id,session_url:session.url,expires_at:new Date(expiresAt*1000).toISOString() });
    if (finalizeError) throw finalizeError;
    return json(200, { status:'ready',url:session.url });
  } catch {
    return json(503, { code:'checkout_unavailable' });
  }
};

export const config: Config = { path:'/api/create-checkout',method:['POST'] };
