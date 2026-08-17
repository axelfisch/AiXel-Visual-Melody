begin;
select plan(9);

select has_table('public', 'profiles', 'profiles table exists');
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select has_function('public', 'handle_new_user', array[]::text[], 'trusted provisioning function exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.test', '', now(), '{"display_name":"Owner","locale":"fr"}', '{}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@example.test', '', now(), '{"display_name":"Other","locale":"en"}', '{}', now(), now());

select results_eq(
  $$ select display_name from public.profiles where user_id = '11111111-1111-4111-8111-111111111111' $$,
  array['Owner'::text],
  'Auth trigger provisions the profile'
);

set local role anon;
select is_empty($$ select * from public.profiles $$, 'anonymous users cannot read profiles');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select user_id from public.profiles order by user_id $$,
  array['11111111-1111-4111-8111-111111111111'::uuid],
  'owner can read only their profile'
);

select lives_ok(
  $$ update public.profiles set display_name = 'Updated', locale = 'en' where user_id = '11111111-1111-4111-8111-111111111111' $$,
  'owner can update documented fields'
);

select is_empty(
  $$ update public.profiles set display_name = 'Stolen' where user_id = '22222222-2222-4222-8222-222222222222' returning user_id $$,
  'owner cannot update another profile'
);

select throws_ok(
  $$ insert into public.profiles (user_id, display_name) values ('33333333-3333-4333-8333-333333333333', 'Injected') $$,
  '42501',
  null,
  'authenticated clients cannot insert profiles directly'
);

select throws_ok(
  $$ update public.profiles set locale = 'de' where user_id = '11111111-1111-4111-8111-111111111111' $$,
  '23514',
  null,
  'profile locale is bounded'
);

select * from finish();
rollback;
