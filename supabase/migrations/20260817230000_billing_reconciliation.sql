create table private.subscriptions (
  stripe_subscription_id text primary key check(stripe_subscription_id~'^sub_'),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  price_id text not null check(price_id~'^price_'),
  stripe_created_at timestamptz not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  latest_invoice_id text,
  is_canonical boolean not null default false,
  duplicate_remediation_status text not null default 'none' check(duplicate_remediation_status in ('none','pending','cancelled_refunded','ambiguous')),
  last_stripe_updated_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index subscriptions_user_state_idx on private.subscriptions(user_id,is_canonical,status);

create table private.invoices (
  stripe_invoice_id text primary key check(stripe_invoice_id~'^in_'),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text,
  billing_reason text,
  status text not null,
  paid boolean not null default false,
  period_start timestamptz,
  period_end timestamptz,
  amount_due integer not null default 0,
  amount_paid integer not null default 0,
  amount_refunded integer not null default 0,
  payment_intent_id text,
  has_open_dispute boolean not null default false,
  first_recovery_required_at timestamptz,
  grace_ends_at timestamptz,
  last_reconciled_at timestamptz not null default now()
);
create index invoices_user_period_idx on private.invoices(user_id,period_end desc);

create table private.stripe_webhook_events (
  stripe_event_id text primary key check(stripe_event_id~'^evt_'),
  event_type text not null check(char_length(event_type) between 1 and 120),
  stripe_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null check(processing_status in ('processing','processed','failed')),
  attempt_count integer not null default 1,
  lease_expires_at timestamptz not null,
  last_error_code text
);

revoke all on private.subscriptions,private.invoices,private.stripe_webhook_events from public,anon,authenticated;

create function public.claim_stripe_event(event_id text,event_type text,event_created_at timestamptz)
returns boolean language plpgsql security definer set search_path=''
as $$
declare claimed boolean:=false;
begin
  insert into private.stripe_webhook_events(stripe_event_id,event_type,stripe_created_at,processing_status,lease_expires_at)
  values(event_id,event_type,event_created_at,'processing',now()+interval '55 seconds')
  on conflict(stripe_event_id) do update set processing_status='processing',attempt_count=private.stripe_webhook_events.attempt_count+1,lease_expires_at=now()+interval '55 seconds',last_error_code=null
  where private.stripe_webhook_events.processing_status='failed' or private.stripe_webhook_events.lease_expires_at<now()
  returning true into claimed;
  return coalesce(claimed,false);
end $$;

create function public.finish_stripe_event(event_id text,error_code text default null)
returns void language plpgsql security definer set search_path=''
as $$ begin
  update private.stripe_webhook_events set processing_status=case when error_code is null then 'processed' else 'failed' end,processed_at=case when error_code is null then now() else null end,last_error_code=left(error_code,80),lease_expires_at=now() where stripe_event_id=event_id;
end $$;

create function public.apply_billing_snapshot(event_id text,customer_id text,subscription_snapshot jsonb,invoice_snapshot jsonb)
returns void language plpgsql security definer set search_path=''
as $$
declare subject uuid; subscription_id text; invoice_id text; canonical_id text; grace_deadline timestamptz; paid_coverage boolean; disputed boolean; fully_refunded boolean; entitlement_value text; plan_value text; recovery text; suspension text;
begin
  select user_id into subject from private.stripe_customers where stripe_customer_id=customer_id;
  if subject is null then raise exception using errcode='P0002',message='customer_not_mapped'; end if;
  subscription_id:=subscription_snapshot->>'id'; invoice_id:=invoice_snapshot->>'id';
  if subscription_id !~ '^sub_' or invoice_id !~ '^in_' then raise exception using errcode='22023',message='invalid_stripe_snapshot'; end if;
  perform pg_advisory_xact_lock(hashtextextended(subject::text,601));
  insert into private.subscriptions(stripe_subscription_id,user_id,status,price_id,stripe_created_at,current_period_start,current_period_end,cancel_at_period_end,latest_invoice_id,last_stripe_updated_at)
  values(subscription_id,subject,subscription_snapshot->>'status',subscription_snapshot->>'priceId',to_timestamp((subscription_snapshot->>'created')::double precision),to_timestamp((subscription_snapshot->>'currentPeriodStart')::double precision),to_timestamp((subscription_snapshot->>'currentPeriodEnd')::double precision),coalesce((subscription_snapshot->>'cancelAtPeriodEnd')::boolean,false),invoice_id,to_timestamp((subscription_snapshot->>'updated')::double precision))
  on conflict(stripe_subscription_id) do update set status=excluded.status,price_id=excluded.price_id,current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,latest_invoice_id=excluded.latest_invoice_id,last_stripe_updated_at=excluded.last_stripe_updated_at,updated_at=now()
  where excluded.last_stripe_updated_at>=private.subscriptions.last_stripe_updated_at;
  select stripe_subscription_id into canonical_id from private.subscriptions where user_id=subject order by case when status in('active','trialing','past_due','unpaid','paused') then 0 else 1 end,stripe_created_at,stripe_subscription_id limit 1;
  update private.subscriptions set is_canonical=(stripe_subscription_id=canonical_id),duplicate_remediation_status=case when stripe_subscription_id<>canonical_id and status in('active','trialing','past_due','unpaid','paused') and duplicate_remediation_status='none' then 'pending' else duplicate_remediation_status end where user_id=subject;

  select exists(select 1 from private.invoices where user_id=subject and paid and period_end<=to_timestamp((invoice_snapshot->>'periodStart')::double precision)) into paid_coverage;
  insert into private.invoices(stripe_invoice_id,user_id,stripe_subscription_id,billing_reason,status,paid,period_start,period_end,amount_due,amount_paid,amount_refunded,payment_intent_id,has_open_dispute,first_recovery_required_at,grace_ends_at,last_reconciled_at)
  values(invoice_id,subject,subscription_id,invoice_snapshot->>'billingReason',invoice_snapshot->>'status',coalesce((invoice_snapshot->>'paid')::boolean,false),to_timestamp((invoice_snapshot->>'periodStart')::double precision),to_timestamp((invoice_snapshot->>'periodEnd')::double precision),coalesce((invoice_snapshot->>'amountDue')::integer,0),coalesce((invoice_snapshot->>'amountPaid')::integer,0),coalesce((invoice_snapshot->>'amountRefunded')::integer,0),invoice_snapshot->>'paymentIntentId',coalesce((invoice_snapshot->>'hasOpenDispute')::boolean,false),case when invoice_snapshot->>'billingReason'='subscription_cycle' and not coalesce((invoice_snapshot->>'paid')::boolean,false) and paid_coverage then coalesce((select first_recovery_required_at from private.invoices where stripe_invoice_id=invoice_id),now()) end,case when invoice_snapshot->>'billingReason'='subscription_cycle' and not coalesce((invoice_snapshot->>'paid')::boolean,false) and paid_coverage then coalesce((select grace_ends_at from private.invoices where stripe_invoice_id=invoice_id),now()+interval '7 days') end,now())
  on conflict(stripe_invoice_id) do update set status=excluded.status,paid=excluded.paid,amount_paid=excluded.amount_paid,amount_refunded=excluded.amount_refunded,has_open_dispute=excluded.has_open_dispute,first_recovery_required_at=case when excluded.paid then null else coalesce(private.invoices.first_recovery_required_at,excluded.first_recovery_required_at) end,grace_ends_at=case when excluded.paid then null else coalesce(private.invoices.grace_ends_at,excluded.grace_ends_at) end,last_reconciled_at=now();

  select i.grace_ends_at,i.has_open_dispute,(i.amount_paid>0 and i.amount_refunded>=i.amount_paid) into grace_deadline,disputed,fully_refunded from private.invoices i where i.stripe_invoice_id=invoice_id;
  if disputed or fully_refunded then entitlement_value:='pro_suspended';plan_value:='free';recovery:='contact_support';suspension:=case when disputed then 'payment_disputed' else 'payment_reversed' end;
  elsif grace_deadline is not null and grace_deadline>now() then entitlement_value:='pro_grace';plan_value:='creator_pro';recovery:='update_payment';suspension:=null;
  elsif coalesce((invoice_snapshot->>'paid')::boolean,false) and to_timestamp((subscription_snapshot->>'currentPeriodEnd')::double precision)>now() then entitlement_value:=case when coalesce((subscription_snapshot->>'cancelAtPeriodEnd')::boolean,false) then 'pro_cancelling' else 'pro_active' end;plan_value:='creator_pro';recovery:=null;suspension:=null;
  else entitlement_value:='free_read_only';plan_value:='free';recovery:='new_checkout';suspension:=null; end if;
  update public.account_entitlements set plan=plan_value,entitlement=entitlement_value,cloud_save=(plan_value='creator_pro'),max_cloud_projects=case when plan_value='creator_pro' then 25 else 0 end,max_brand_presets=case when plan_value='creator_pro' then 3 else 0 end,export_1080p=(plan_value='creator_pro'),social_ratios=(plan_value='creator_pro'),clean_end_card=(plan_value='creator_pro'),billing_interval=case when subscription_snapshot->>'interval' in('month','year') then subscription_snapshot->>'interval' end,paid_through=case when plan_value='creator_pro' then to_timestamp((subscription_snapshot->>'currentPeriodEnd')::double precision) end,cancel_at_period_end=coalesce((subscription_snapshot->>'cancelAtPeriodEnd')::boolean,false),grace_ends_at=grace_deadline,recovery_action=recovery,suspension_reason=suspension,projection_version=projection_version+1,as_of=now() where user_id=subject;
  perform public.finish_stripe_event(event_id,null);
end $$;

revoke all on function public.claim_stripe_event(text,text,timestamptz),public.finish_stripe_event(text,text),public.apply_billing_snapshot(text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.claim_stripe_event(text,text,timestamptz),public.finish_stripe_event(text,text),public.apply_billing_snapshot(text,text,jsonb,jsonb) to service_role;

create function public.list_duplicate_remediations()
returns table(stripe_customer_id text,stripe_subscription_id text)
language sql security definer set search_path=''
as $$ select c.stripe_customer_id,s.stripe_subscription_id from private.subscriptions s join private.stripe_customers c using(user_id) where s.duplicate_remediation_status='pending' order by s.updated_at limit 25 $$;
create function public.finish_duplicate_remediation(subscription_id text,outcome text)
returns void language plpgsql security definer set search_path=''
as $$ begin
  if outcome not in('cancelled_refunded','ambiguous') then raise exception using errcode='22023',message='invalid_remediation_outcome'; end if;
  update private.subscriptions set duplicate_remediation_status=outcome,updated_at=now() where stripe_subscription_id=subscription_id and duplicate_remediation_status='pending';
end $$;
revoke all on function public.list_duplicate_remediations(),public.finish_duplicate_remediation(text,text) from public,anon,authenticated;
grant execute on function public.list_duplicate_remediations(),public.finish_duplicate_remediation(text,text) to service_role;

create function public.list_billing_reconciliations()
returns table(stripe_customer_id text,stripe_subscription_id text)
language sql security definer set search_path=''
as $$
  select c.stripe_customer_id,s.stripe_subscription_id
  from private.subscriptions s join private.stripe_customers c using(user_id) join public.account_entitlements e using(user_id)
  where s.is_canonical and (e.entitlement in('confirming','pro_grace') or s.status in('past_due','unpaid','paused') or s.updated_at>now()-interval '2 days')
  order by s.updated_at limit 50
$$;
revoke all on function public.list_billing_reconciliations() from public,anon,authenticated;
grant execute on function public.list_billing_reconciliations() to service_role;
