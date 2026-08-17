import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Database } from '../../src/supabase/database.types';

const env=(name:string)=>{const value=Netlify.env.get(name);if(!value)throw new Error(`missing_${name.toLowerCase()}`);return value;};
const idOf=(value:unknown):string|null=>typeof value==='string'?value:value&&typeof value==='object'&&'id' in value&&typeof (value as {id?:unknown}).id==='string'?(value as {id:string}).id:null;

export default async()=>{
  const admin=createClient<Database>(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const stripe=new Stripe(env('STRIPE_SECRET_KEY'));
  const {data:duplicates,error}=await admin.rpc('list_duplicate_remediations',{});
  if(error)throw error;
  for(const duplicate of duplicates??[]){
    let outcome='ambiguous';
    try{
      const subscription=await stripe.subscriptions.retrieve(duplicate.stripe_subscription_id,{expand:['latest_invoice.payments.data.payment.payment_intent.latest_charge']});
      await stripe.subscriptions.cancel(subscription.id);
      const invoice=subscription.latest_invoice as unknown as Record<string,any>|null;
      const charge=invoice?.payments?.data?.map((payment:any)=>payment.payment?.payment_intent?.latest_charge).find(Boolean);
      const chargeId=idOf(charge);
      if(chargeId&&typeof charge.amount==='number'){
        await stripe.refunds.create({charge:chargeId,amount:charge.amount},{idempotencyKey:`aixel-duplicate-refund-${subscription.id}`});
        outcome='cancelled_refunded';
      }
    }catch{outcome='ambiguous';}
    await admin.rpc('finish_duplicate_remediation',{subscription_id:duplicate.stripe_subscription_id,outcome});
  }
  const {data:subjects,error:queueError}=await admin.rpc('list_billing_reconciliations',{});
  if(queueError)throw queueError;
  for(const subject of subjects??[]){
    const eventId=`evt_reconcile_${subject.stripe_subscription_id}_${Math.floor(Date.now()/3600000)}`;
    const {data:claimed}=await admin.rpc('claim_stripe_event',{event_id:eventId,event_type:'aixel.scheduled_reconciliation',event_created_at:new Date().toISOString()});
    if(!claimed)continue;
    try{
      const subscription=await stripe.subscriptions.retrieve(subject.stripe_subscription_id);
      const invoiceId=idOf(subscription.latest_invoice);
      if(!invoiceId)throw new Error('invoice_unavailable');
      const invoice=await stripe.invoices.retrieve(invoiceId,{expand:['payments.data.payment.payment_intent.latest_charge']});
      const invoiceValue=invoice as unknown as Record<string,any>;
      const subscriptionValue=subscription as unknown as Record<string,any>;
      const line=subscription.items.data[0];
      const charge=invoiceValue.payments?.data?.map((payment:any)=>payment.payment?.payment_intent?.latest_charge).find(Boolean);
      const subscriptionSnapshot={id:subscription.id,status:subscription.status,priceId:line?.price?.id,interval:line?.price?.recurring?.interval,created:subscription.created,currentPeriodStart:subscriptionValue.current_period_start??line?.current_period_start,currentPeriodEnd:subscriptionValue.current_period_end??line?.current_period_end,cancelAtPeriodEnd:subscription.cancel_at_period_end,latestInvoiceId:invoice.id,updated:Math.floor(Date.now()/1000)};
      const invoiceSnapshot={id:invoice.id,billingReason:invoice.billing_reason,status:invoice.status,paid:invoice.status==='paid',periodStart:invoice.period_start,periodEnd:invoice.period_end,amountDue:invoice.amount_due,amountPaid:invoice.amount_paid,amountRefunded:charge?.amount_refunded??0,paymentIntentId:idOf(invoiceValue.payment_intent),hasOpenDispute:charge?.disputed===true};
      const {error:applyError}=await admin.rpc('apply_billing_snapshot',{event_id:eventId,customer_id:subject.stripe_customer_id,subscription_snapshot:subscriptionSnapshot as any,invoice_snapshot:invoiceSnapshot as any});
      if(applyError)throw applyError;
    }catch(reason){await admin.rpc('finish_stripe_event',{event_id:eventId,error_code:reason instanceof Error?reason.message.slice(0,80):'scheduled_reconciliation_failed'});}
  }
  return new Response(null,{status:204});
};

export const config:Config={schedule:'@hourly'};
