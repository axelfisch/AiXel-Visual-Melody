begin;
select plan(21);

select has_table('public','account_entitlements','safe entitlement projection exists');
select has_table('public','projects','cloud projects table exists');
select has_table('public','brand_presets','brand presets table exists');
select ok((select relrowsecurity from pg_class where oid='public.account_entitlements'::regclass),'entitlements have RLS');
select ok((select relrowsecurity from pg_class where oid='public.projects'::regclass),'projects have RLS');
select ok((select relrowsecurity from pg_class where oid='public.brand_presets'::regclass),'presets have RLS');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@example.test','',now(),'{}','{}',now(),now()),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@example.test','',now(),'{}','{}',now(),now());

select results_eq($$select plan from public.account_entitlements where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,array['free'::text],'new users receive Free projection');

set local role anon;
select throws_ok($$select * from public.account_entitlements$$,'42501','permission denied for table account_entitlements','anonymous entitlement reads fail');
reset role;

update public.account_entitlements set plan='creator_pro',entitlement='pro_active',cloud_save=true,max_cloud_projects=25,max_brand_presets=3,export_1080p=true,social_ratios=true,clean_end_card=true,projection_version=2,as_of=now()
where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
insert into public.projects(user_id,name,schema_version,analysis,creative_configuration,source_hint)
values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Other',1,null,'{}',null);

set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select set_config('request.jwt.claim.role','authenticated',true);
select results_eq($$select count(*)::integer from public.account_entitlements$$,array[1],'owner sees only their projection');
select is_empty($$select id from public.projects$$,'owner cannot see another project');
select throws_ok($$insert into public.projects(user_id,name,schema_version,creative_configuration) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Bypass',1,'{}')$$,'42501','permission denied for table projects','direct project insert is denied');

select lives_ok($create$
  select public.create_cloud_project($json${
    "name":"New Light","artistName":"Naomi","schemaVersion":1,"analysis":null,
    "creativeConfiguration":{"engine":{"engineId":"cosmic-waves","presetId":null,"parameters":{},"director":{"mood":null,"values":{"emotion":0.5,"space":0.5,"fluidity":0.5,"light":0.5,"dynamics":0.5}}},"export":{"format":"mp4","width":1920,"height":1080,"frameRate":30,"videoBitRate":12000000,"aspectRatio":"16:9","endCardMode":"clean"}},
    "sourceHint":null
  }$json$::jsonb)
$create$,'entitled owner creates through the narrow RPC');
select results_eq($$select count(*)::integer from public.projects$$,array[1],'owner reads the created project');
select throws_ok($$select public.create_cloud_project('{"name":"Missing fields"}'::jsonb)$$,'22023','invalid_project_keys','missing required project keys fail validation');

reset role;
update public.account_entitlements set plan='free',entitlement='free_read_only',cloud_save=false,max_cloud_projects=0,max_brand_presets=0,export_1080p=false,social_ratios=false,clean_end_card=false,projection_version=3,as_of=now()
where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select throws_ok($$select public.update_cloud_project(id,revision,jsonb_build_object('name',name,'artistName',artist_name,'schemaVersion',schema_version,'analysis',analysis,'creativeConfiguration',creative_configuration,'sourceHint',source_hint)) from public.projects limit 1$$,'42501','cloud_write_not_entitled','downgraded users cannot update');
select lives_ok($$select public.delete_cloud_project((select id from public.projects limit 1),1)$$,'downgraded users retain delete');
select is_empty($$select id from public.projects$$,'deleted owner project is gone');
select matches(pg_get_functiondef('public.create_cloud_project(jsonb)'::regprocedure),'.*pg_advisory_xact_lock.*','project creates use a transaction lock');
select throws_ok($$update public.account_entitlements set cloud_save=true$$,'42501','permission denied for table account_entitlements','browser cannot mutate entitlement projection');

reset role;
update public.account_entitlements set plan='creator_pro',entitlement='pro_active',cloud_save=true,max_cloud_projects=25,max_brand_presets=3,export_1080p=true,social_ratios=true,clean_end_card=true where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
insert into public.brand_presets(user_id,name,configuration) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','One','{}'),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Two','{}'),('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Three','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select throws_ok($$select public.create_brand_preset('{"name":"Four","configuration":{"artistName":"Naomi","typography":"inter","palette":["#112233"],"endCardMode":"artist"}}'::jsonb)$$,'P0001','preset_limit_reached','preset count never exceeds three');
select results_eq($$select count(*)::integer from public.brand_presets$$,array[3],'owner retains three presets');

select * from finish();
rollback;
