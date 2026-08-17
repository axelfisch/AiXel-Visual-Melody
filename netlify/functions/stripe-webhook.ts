import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Database, Json } from '../../src/supabase/database.types';

const response = (status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const env=(name:string)=>{const value=Netlify.env.get(name);if(!value)throw new Error(`missing_${name.toLowerCase()}`);return value;};
const idOf=(value:unknown):string|null=>typeof value==='string'?value:value&&typeof value==='object'&&'id' in value&&typeof (value as {id?:unknown}).id==='string'?(value as {id:string}).id:null;

export default async (request:Request,_context:Context)=>{
  if(request.method!=='POST')return response(405,{code:'method_not_allowed'});
  const signature=request.headers.get('stripe-signature');
  if(!signature)return response(400,{code:'invalid_signature'});
  const stripe=new Stripe(env('STRIPE_SECRET_KEY'));
  let event:Stripe.Event;
  try{event=stripe.webhooks.constructEvent(await request.text(),signature,env('STRIPE_WEBHOOK_SECRET'));}
  catch{return response(400,{code:'invalid_signature'});}
  const admin=createClient<Database>(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:claimed,error:claimError}=await admin.rpc('claim_stripe_event',{event_id:event.id,event_type:event.type,event_created_at:new Date(event.created*1000).toISOString()});
  if(claimError)return response(503,{code:'event_claim_failed'});
  if(!claimed)return response(200,{received:true,duplicate:true});
  try{
    const object=event.data.object as unknown as Record<string,unknown>;
    let customerId=idOf(object.customer);
    let subscriptionId=event.type.startsWith('customer.subscription.')?idOf(object):idOf(object.subscription);
    let invoiceId=event.type.startsWith('invoice.')?idOf(object):idOf(object.invoice);
    if(!customerId&&subscriptionId){const subscription=await stripe.subscriptions.retrieve(subscriptionId);customerId=idOf(subscription.customer);}
    if(!customerId)throw new Error('customer_unavailable');
    const subscriptions=await stripe.subscriptions.list({customer:customerId,status:'all',limit:20});
    const subscription=subscriptionId?subscriptions.data.find((item)=>item.id===subscriptionId)??subscriptions.data[0]:subscriptions.data[0];
    if(!subscription)throw new Error('subscription_unavailable');
    subscriptionId=subscription.id;
    invoiceId=invoiceId??idOf(subscription.latest_invoice);
    if(!invoiceId)throw new Error('invoice_unavailable');
    const invoice=await stripe.invoices.retrieve(invoiceId,{expand:['payments.data.payment.payment_intent.latest_charge']});
    const invoiceValue=invoice as unknown as Record<string,any>;
    const subscriptionValue=subscription as unknown as Record<string,any>;
    const line=subscription.items.data[0];
    const charge=invoiceValue.payments?.data?.map((payment:any)=>payment.payment?.payment_intent?.latest_charge).find(Boolean);
    const subscriptionSnapshot={id:subscription.id,status:subscription.status,priceId:line?.price?.id,interval:line?.price?.recurring?.interval,created:subscription.created,currentPeriodStart:subscriptionValue.current_period_start??line?.current_period_start,currentPeriodEnd:subscriptionValue.current_period_end??line?.current_period_end,cancelAtPeriodEnd:subscription.cancel_at_period_end,latestInvoiceId:invoice.id,updated:event.created};
    const invoiceSnapshot={id:invoice.id,billingReason:invoice.billing_reason,status:invoice.status,paid:invoice.status==='paid',periodStart:invoice.period_start,periodEnd:invoice.period_end,amountDue:invoice.amount_due,amountPaid:invoice.amount_paid,amountRefunded:charge?.amount_refunded??0,paymentIntentId:idOf(invoiceValue.payment_intent),hasOpenDispute:charge?.disputed===true};
    const {error}=await admin.rpc('apply_billing_snapshot',{event_id:event.id,customer_id:customerId,subscription_snapshot:subscriptionSnapshot as unknown as Json,invoice_snapshot:invoiceSnapshot as unknown as Json});
    if(error)throw error;
    return response(200,{received:true});
  }catch(reason){
    const code=reason instanceof Error?reason.message.split(':')[0].slice(0,80):'reconciliation_failed';
    await admin.rpc('finish_stripe_event',{event_id:event.id,error_code:code});
    return response(503,{code:'reconciliation_pending'});
  }
};

export const config:Config={path:'/api/stripe-webhook',method:['POST']};
