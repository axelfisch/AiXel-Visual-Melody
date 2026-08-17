begin;
select plan(16);
select has_table('private','product_controls','server purchase control exists');
select has_table('private','stripe_customers','private Stripe customer mapping exists');
select has_table('private','checkout_attempts','private checkout attempts exist');
select has_index('private','checkout_attempts','checkout_attempts_one_live_per_user','one-live-attempt unique index exists');
select results_eq($$select purchase_enabled from private.product_controls$$,array[false],'purchase defaults off');
select throws_ok($$update private.product_controls set purchase_enabled=true$$,'23514',null,'purchase cannot enable without both recorded prerequisites');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
values('55555555-5555-4555-8555-555555555555','00000000-0000-0000-0000-000000000000','authenticated','authenticated','checkout@example.test','',now(),'{}','{}',now(),now());
update private.product_controls set output_matrix_approved=true,upgrade_experience_approved=true,purchase_enabled=true;

set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
select set_config('request.jwt.claim.role','authenticated',true);
select results_eq($$select action from public.reserve_checkout_attempt('creator_pro_monthly')$$,array['create'::text],'first request owns creation lease');
select results_eq($$select action from public.reserve_checkout_attempt('creator_pro_monthly')$$,array['pending'::text],'concurrent same-plan request converges');
select results_eq($$select count(*)::integer from public.reserve_checkout_attempt('creator_pro_monthly')$$,array[1],'reservation returns one stable attempt');
select throws_ok($$select public.attach_checkout_customer((select id from private.checkout_attempts limit 1),'cus_injected')$$,'42501','permission denied for function attach_checkout_customer','browser cannot finalize private checkout state');

reset role;
update private.checkout_attempts set status='open',stripe_checkout_session_id='cs_test_old',stripe_checkout_url='https://checkout.stripe.com/c/pay/test',stripe_expires_at=now()+interval '20 minutes',lease_owner=null,lease_expires_at=null;
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
select results_eq($$select action from public.reserve_checkout_attempt('creator_pro_monthly')$$,array['reuse'::text],'compatible live Session is reused');
select results_eq($$select action from public.reserve_checkout_attempt('creator_pro_annual')$$,array['replace'::text],'different cadence creates one explicit replacement');

reset role;
select results_eq($$select count(*)::integer from private.checkout_attempts where status in ('creating','open','replacing')$$,array[1],'replacement leaves one live database attempt');
update private.checkout_attempts set lease_expires_at=now()-interval '1 second' where status='replacing';
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
select results_eq($$select action from public.reserve_checkout_attempt('creator_pro_annual')$$,array['create'::text],'expired lease recovers the same durable attempt');

reset role;
update public.account_entitlements set plan='creator_pro',entitlement='pro_active',cloud_save=true,max_cloud_projects=25,max_brand_presets=3,export_1080p=true,social_ratios=true,clean_end_card=true where user_id='55555555-5555-4555-8555-555555555555';
set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
select results_eq($$select action from public.reserve_checkout_attempt('creator_pro_annual')$$,array['already_subscribed'::text],'current payable entitlement blocks new checkout');
select throws_ok($$select * from private.checkout_attempts$$,'42501','permission denied for schema private','browser cannot read private billing state');

select * from finish();
rollback;
