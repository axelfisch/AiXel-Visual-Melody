create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.product_controls (
  singleton boolean primary key default true check (singleton),
  output_matrix_approved boolean not null default false,
  upgrade_experience_approved boolean not null default false,
  purchase_enabled boolean not null default false,
  launch_offer_ends_at timestamptz not null default '2026-12-31T23:59:59Z',
  updated_at timestamptz not null default now(),
  constraint purchase_requires_evidence check (not purchase_enabled or (output_matrix_approved and upgrade_experience_approved))
);
insert into private.product_controls(singleton) values(true);

create table private.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null check (stripe_customer_id ~ '^cus_'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  catalog_key text not null check (catalog_key in ('creator_pro_monthly','creator_pro_annual','creator_pro_annual_launch')),
  status text not null check (status in ('creating','open','replacing','completed','expired','failed')),
  stripe_checkout_session_id text unique,
  stripe_checkout_url text,
  stripe_expires_at timestamptz,
  lease_owner uuid,
  lease_expires_at timestamptz,
  replaces_attempt_id uuid references private.checkout_attempts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index checkout_attempts_one_live_per_user on private.checkout_attempts(user_id) where status in ('creating','open','replacing');
create index checkout_attempts_user_created_idx on private.checkout_attempts(user_id,created_at desc);

create table private.launch_offer_redemptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null,
  checkout_attempt_id uuid unique references private.checkout_attempts(id)
);

revoke all on all tables in schema private from public,anon,authenticated;

create function public.reserve_checkout_attempt(requested_catalog_key text)
returns table(attempt_id uuid, action text, checkout_url text, stripe_session_id text, stripe_customer_id text, replaces_session_id text)
language plpgsql security definer set search_path=''
as $$
declare subject uuid:=auth.uid(); current_attempt private.checkout_attempts; replacement_id uuid; worker uuid:=gen_random_uuid(); controls private.product_controls;
begin
  if subject is null then raise exception using errcode='42501',message='authentication_required'; end if;
  if requested_catalog_key not in ('creator_pro_monthly','creator_pro_annual','creator_pro_annual_launch') then raise exception using errcode='22023',message='invalid_catalog_key'; end if;
  select * into controls from private.product_controls where singleton;
  if controls is null or not controls.purchase_enabled then raise exception using errcode='P0001',message='purchase_disabled'; end if;
  if requested_catalog_key='creator_pro_annual_launch' and (now()>controls.launch_offer_ends_at or exists(select 1 from private.launch_offer_redemptions where user_id=subject)) then raise exception using errcode='42501',message='launch_offer_ineligible'; end if;
  perform pg_advisory_xact_lock(hashtextextended(subject::text,501));
  if exists(select 1 from public.account_entitlements where user_id=subject and entitlement in ('pro_active','pro_cancelling','pro_grace')) then
    return query select null::uuid,'already_subscribed'::text,null::text,null::text,null::text,null::text; return;
  end if;
  select * into current_attempt from private.checkout_attempts where user_id=subject and status in ('creating','open','replacing') order by created_at desc limit 1 for update;
  if found and current_attempt.catalog_key=requested_catalog_key and current_attempt.status='open' and current_attempt.stripe_expires_at>now() then
    return query select current_attempt.id,'reuse'::text,current_attempt.stripe_checkout_url,current_attempt.stripe_checkout_session_id,current_attempt.stripe_customer_id,null::text; return;
  end if;
  if found and current_attempt.catalog_key=requested_catalog_key and current_attempt.status in ('creating','replacing') and current_attempt.lease_expires_at>now() then
    return query select current_attempt.id,'pending'::text,null::text,null::text,current_attempt.stripe_customer_id,null::text; return;
  end if;
  if found and current_attempt.catalog_key=requested_catalog_key then
    update private.checkout_attempts set lease_owner=worker,lease_expires_at=now()+interval '60 seconds',updated_at=now() where id=current_attempt.id;
    return query select current_attempt.id,'create'::text,null::text,null::text,current_attempt.stripe_customer_id,null::text; return;
  end if;
  if found then
    update private.checkout_attempts set status='expired',updated_at=now() where id=current_attempt.id;
    insert into private.checkout_attempts(user_id,catalog_key,status,lease_owner,lease_expires_at,replaces_attempt_id)
    values(subject,requested_catalog_key,'replacing',worker,now()+interval '60 seconds',current_attempt.id) returning id into replacement_id;
    return query select replacement_id,'replace'::text,null::text,null::text,(select sc.stripe_customer_id from private.stripe_customers sc where sc.user_id=subject),current_attempt.stripe_checkout_session_id; return;
  end if;
  insert into private.checkout_attempts(user_id,catalog_key,status,lease_owner,lease_expires_at)
  values(subject,requested_catalog_key,'creating',worker,now()+interval '60 seconds') returning id into replacement_id;
  return query select replacement_id,'create'::text,null::text,null::text,(select sc.stripe_customer_id from private.stripe_customers sc where sc.user_id=subject),null::text;
end;
$$;

create function public.attach_checkout_customer(attempt_id uuid, customer_id text)
returns void language plpgsql security definer set search_path=''
as $$
declare attempt private.checkout_attempts;
begin
  if current_user not in ('postgres','service_role') then raise exception using errcode='42501',message='service_role_required'; end if;
  if customer_id !~ '^cus_' then raise exception using errcode='22023',message='invalid_customer_id'; end if;
  select * into attempt from private.checkout_attempts where id=attempt_id for update;
  if not found then raise exception using errcode='P0002',message='attempt_not_found'; end if;
  insert into private.stripe_customers(user_id,stripe_customer_id) values(attempt.user_id,customer_id) on conflict(user_id) do update set updated_at=now();
  update private.checkout_attempts set stripe_customer_id=customer_id,updated_at=now() where id=attempt_id;
end;
$$;

create function public.finalize_checkout_attempt(attempt_id uuid, session_id text, session_url text, expires_at timestamptz)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if current_user not in ('postgres','service_role') then raise exception using errcode='42501',message='service_role_required'; end if;
  if session_id !~ '^cs_' or session_url !~ '^https://checkout\.stripe\.com/' or expires_at<=now() or expires_at>now()+interval '31 minutes' then raise exception using errcode='22023',message='invalid_checkout_session'; end if;
  update private.checkout_attempts set status='open',stripe_checkout_session_id=session_id,stripe_checkout_url=session_url,stripe_expires_at=expires_at,lease_owner=null,lease_expires_at=null,updated_at=now()
  where id=attempt_id and status in ('creating','replacing');
  if not found then raise exception using errcode='40001',message='attempt_not_finalizable'; end if;
end;
$$;

create function public.fail_checkout_attempt(attempt_id uuid)
returns void language plpgsql security definer set search_path=''
as $$ begin
  if current_user not in ('postgres','service_role') then raise exception using errcode='42501',message='service_role_required'; end if;
  update private.checkout_attempts set status='failed',lease_owner=null,lease_expires_at=null,updated_at=now() where id=attempt_id and status in ('creating','replacing');
end $$;

revoke all on function public.reserve_checkout_attempt(text) from public,anon;
grant execute on function public.reserve_checkout_attempt(text) to authenticated;
revoke all on function public.attach_checkout_customer(uuid,text),public.finalize_checkout_attempt(uuid,text,text,timestamptz),public.fail_checkout_attempt(uuid) from public,anon,authenticated;
grant execute on function public.attach_checkout_customer(uuid,text),public.finalize_checkout_attempt(uuid,text,text,timestamptz),public.fail_checkout_attempt(uuid) to service_role;
