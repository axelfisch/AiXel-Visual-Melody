create table public.account_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  plan text not null default 'free' check (plan in ('free', 'creator_pro')),
  entitlement text not null default 'free' check (entitlement in ('free', 'confirming', 'pro_active', 'pro_cancelling', 'pro_grace', 'pro_suspended', 'free_read_only')),
  cloud_save boolean not null default false,
  max_cloud_projects integer not null default 0 check (max_cloud_projects in (0, 25)),
  max_brand_presets integer not null default 0 check (max_brand_presets in (0, 3)),
  export_1080p boolean not null default false,
  social_ratios boolean not null default false,
  clean_end_card boolean not null default false,
  billing_interval text check (billing_interval in ('month', 'year')),
  paid_through timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_ends_at timestamptz,
  recovery_action text check (recovery_action in ('update_payment', 'new_checkout', 'contact_support')),
  suspension_reason text check (suspension_reason in ('payment_reversed', 'payment_disputed', 'account_suspended')),
  projection_version bigint not null default 1 check (projection_version > 0),
  as_of timestamptz not null default now(),
  constraint entitlement_capabilities_consistent check (
    (plan = 'free' and not cloud_save and max_cloud_projects = 0 and max_brand_presets = 0 and not export_1080p and not social_ratios and not clean_end_card)
    or
    (plan = 'creator_pro' and max_cloud_projects = 25 and max_brand_presets = 3)
  )
);

alter table public.account_entitlements enable row level security;
revoke all on table public.account_entitlements from public, anon, authenticated;
grant select on table public.account_entitlements to authenticated;
create policy "account_entitlements_select_own" on public.account_entitlements
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
  requested_locale text;
begin
  requested_name := nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 120), '');
  requested_locale := case when new.raw_user_meta_data ->> 'locale' in ('en', 'fr') then new.raw_user_meta_data ->> 'locale' else 'en' end;
  insert into public.profiles (user_id, display_name, locale)
  values (new.id, requested_name, requested_locale)
  on conflict (user_id) do nothing;
  insert into public.account_entitlements (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

insert into public.account_entitlements (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  artist_name text check (artist_name is null or char_length(artist_name) between 1 and 120),
  schema_version integer not null check (schema_version = 1),
  revision bigint not null default 1 check (revision > 0),
  analysis jsonb,
  creative_configuration jsonb not null,
  source_hint jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_analysis_object check (analysis is null or jsonb_typeof(analysis) = 'object'),
  constraint projects_configuration_object check (jsonb_typeof(creative_configuration) = 'object'),
  constraint projects_source_hint_object check (source_hint is null or jsonb_typeof(source_hint) = 'object')
);
create index projects_user_updated_idx on public.projects (user_id, updated_at desc);
alter table public.projects enable row level security;
revoke all on table public.projects from public, anon, authenticated;
grant select on table public.projects to authenticated;
create policy "projects_select_own" on public.projects
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create table public.brand_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  revision bigint not null default 1 check (revision > 0),
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brand_presets_user_updated_idx on public.brand_presets (user_id, updated_at desc);
alter table public.brand_presets enable row level security;
revoke all on table public.brand_presets from public, anon, authenticated;
grant select on table public.brand_presets to authenticated;
create policy "brand_presets_select_own" on public.brand_presets
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create function public.jsonb_has_exact_keys(value jsonb, allowed text[])
returns boolean language sql immutable strict set search_path = ''
as $$
  select value is not null
    and jsonb_typeof(value) = 'object'
    and (select count(*) from jsonb_object_keys(value)) = cardinality(allowed)
    and not exists (
      select 1 from jsonb_object_keys(value) key where not (key = any(allowed))
    )
$$;
revoke all on function public.jsonb_has_exact_keys(jsonb, text[]) from public, anon, authenticated;

create function public.valid_numeric_array(value jsonb, maximum_length integer, minimum numeric, maximum numeric)
returns boolean language sql immutable strict set search_path = ''
as $$
  select jsonb_typeof(value) = 'array'
    and jsonb_array_length(value) between 1 and maximum_length
    and not exists (
      select 1 from jsonb_array_elements(value) item
      where jsonb_typeof(item) <> 'number' or (item #>> '{}')::numeric < minimum or (item #>> '{}')::numeric > maximum
    )
$$;
revoke all on function public.valid_numeric_array(jsonb, integer, numeric, numeric) from public, anon, authenticated;

create function public.validate_cloud_project_payload(payload jsonb)
returns void language plpgsql immutable set search_path = ''
as $$
declare analysis_value jsonb; config_value jsonb; engine_value jsonb; export_value jsonb; source_value jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 1048576 then raise exception using errcode = '22023', message = 'invalid_project_payload'; end if;
  if not public.jsonb_has_exact_keys(payload, array['name','artistName','schemaVersion','analysis','creativeConfiguration','sourceHint']) then raise exception using errcode = '22023', message = 'invalid_project_keys'; end if;
  if jsonb_typeof(payload->'name') <> 'string' or char_length(payload->>'name') not between 1 and 160 then raise exception using errcode = '22023', message = 'invalid_project_name'; end if;
  if payload->'artistName' <> 'null'::jsonb and (jsonb_typeof(payload->'artistName') <> 'string' or char_length(payload->>'artistName') not between 1 and 120) then raise exception using errcode = '22023', message = 'invalid_artist_name'; end if;
  if payload->>'schemaVersion' <> '1' then raise exception using errcode = '22023', message = 'unsupported_cloud_schema'; end if;

  analysis_value := payload->'analysis';
  if analysis_value <> 'null'::jsonb then
    if not public.jsonb_has_exact_keys(analysis_value, array['sampleRate','bpm','peak','averageEnergy','waveform','energy']) then raise exception using errcode = '22023', message = 'invalid_analysis_keys'; end if;
    if jsonb_typeof(analysis_value->'sampleRate') <> 'number' or (analysis_value->>'sampleRate')::numeric not between 8000 and 384000 then raise exception using errcode = '22023', message = 'invalid_sample_rate'; end if;
    if jsonb_typeof(analysis_value->'bpm') <> 'number' or (analysis_value->>'bpm')::numeric not between 20 and 400 then raise exception using errcode = '22023', message = 'invalid_bpm'; end if;
    if jsonb_typeof(analysis_value->'peak') <> 'number' or (analysis_value->>'peak')::numeric not between 0 and 1 then raise exception using errcode = '22023', message = 'invalid_peak'; end if;
    if jsonb_typeof(analysis_value->'averageEnergy') <> 'number' or (analysis_value->>'averageEnergy')::numeric not between 0 and 1 then raise exception using errcode = '22023', message = 'invalid_average_energy'; end if;
    if not public.valid_numeric_array(analysis_value->'waveform', 4096, 0, 100) or not public.valid_numeric_array(analysis_value->'energy', 65536, 0, 1) then raise exception using errcode = '22023', message = 'invalid_analysis_arrays'; end if;
  end if;

  config_value := payload->'creativeConfiguration';
  if not public.jsonb_has_exact_keys(config_value, array['engine','export']) then raise exception using errcode = '22023', message = 'invalid_configuration_keys'; end if;
  engine_value := config_value->'engine';
  if not public.jsonb_has_exact_keys(engine_value, array['engineId','presetId','parameters','director']) then raise exception using errcode = '22023', message = 'invalid_engine_keys'; end if;
  if engine_value->>'engineId' not in ('cosmic-waves','jazz-geometry','liquid-colors','frequency-city','minimal-album-art','neon-velvet') then raise exception using errcode = '22023', message = 'invalid_engine_id'; end if;
  if engine_value->'presetId' <> 'null'::jsonb and (jsonb_typeof(engine_value->'presetId') <> 'string' or char_length(engine_value->>'presetId') > 80) then raise exception using errcode = '22023', message = 'invalid_preset_id'; end if;
  if jsonb_typeof(engine_value->'parameters') <> 'object' or jsonb_typeof(engine_value->'director') <> 'object' then raise exception using errcode = '22023', message = 'invalid_engine_configuration'; end if;
  if not public.jsonb_has_exact_keys(engine_value->'director', array['mood','values']) or jsonb_typeof(engine_value->'director'->'values') <> 'object' then raise exception using errcode = '22023', message = 'invalid_director'; end if;
  if exists (select 1 from jsonb_each(engine_value->'parameters') item where item.key in ('__proto__','prototype','constructor') or jsonb_typeof(item.value) not in ('number','string','boolean')) then raise exception using errcode = '22023', message = 'invalid_engine_parameter'; end if;
  if exists (select 1 from jsonb_each(engine_value->'director'->'values') item where item.key in ('__proto__','prototype','constructor') or jsonb_typeof(item.value) <> 'number' or (item.value #>> '{}')::numeric not between 0 and 1) then raise exception using errcode = '22023', message = 'invalid_director_value'; end if;

  export_value := config_value->'export';
  if not public.jsonb_has_exact_keys(export_value, array['format','width','height','frameRate','videoBitRate','aspectRatio','endCardMode']) then raise exception using errcode = '22023', message = 'invalid_export_keys'; end if;
  if export_value->>'format' <> 'mp4' or export_value->>'aspectRatio' not in ('16:9','9:16','1:1') or export_value->>'endCardMode' not in ('aixel','artist','clean') then raise exception using errcode = '22023', message = 'invalid_export_enum'; end if;
  if (export_value->>'frameRate')::integer <> 30 or (export_value->>'videoBitRate')::integer not in (6000000,12000000) then raise exception using errcode = '22023', message = 'invalid_export_profile'; end if;
  if not (((export_value->>'width')::integer, (export_value->>'height')::integer) in ((1280,720),(720,1280),(720,720),(1920,1080),(1080,1920),(1080,1080))) then raise exception using errcode = '22023', message = 'invalid_export_dimensions'; end if;
  if not (
    (export_value->>'aspectRatio' = '16:9' and ((export_value->>'width')::integer, (export_value->>'height')::integer) in ((1280,720),(1920,1080)))
    or (export_value->>'aspectRatio' = '9:16' and ((export_value->>'width')::integer, (export_value->>'height')::integer) in ((720,1280),(1080,1920)))
    or (export_value->>'aspectRatio' = '1:1' and ((export_value->>'width')::integer, (export_value->>'height')::integer) in ((720,720),(1080,1080)))
  ) then raise exception using errcode = '22023', message = 'inconsistent_export_geometry'; end if;

  source_value := payload->'sourceHint';
  if source_value <> 'null'::jsonb then
    if not public.jsonb_has_exact_keys(source_value, array['fileName','mimeType','size','duration','sha256']) then raise exception using errcode = '22023', message = 'invalid_source_hint_keys'; end if;
    if jsonb_typeof(source_value->'fileName') <> 'string' or char_length(source_value->>'fileName') not between 1 and 255 or jsonb_typeof(source_value->'mimeType') <> 'string' or char_length(source_value->>'mimeType') > 100 then raise exception using errcode = '22023', message = 'invalid_source_hint'; end if;
    if jsonb_typeof(source_value->'size') <> 'number' or (source_value->>'size')::numeric not between 1 and 157286400 or jsonb_typeof(source_value->'duration') <> 'number' or (source_value->>'duration')::numeric not between 0.01 and 900 then raise exception using errcode = '22023', message = 'invalid_source_bounds'; end if;
    if source_value->'sha256' <> 'null'::jsonb and (jsonb_typeof(source_value->'sha256') <> 'string' or source_value->>'sha256' !~ '^[0-9a-f]{64}$') then raise exception using errcode = '22023', message = 'invalid_source_hash'; end if;
  end if;
end;
$$;
revoke all on function public.validate_cloud_project_payload(jsonb) from public, anon, authenticated;

create function public.has_cloud_write_access(subject uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.account_entitlements
    where user_id = subject and cloud_save and entitlement in ('pro_active','pro_cancelling','pro_grace') and max_cloud_projects = 25
  )
$$;
revoke all on function public.has_cloud_write_access(uuid) from public, anon, authenticated;

create function public.create_cloud_project(payload jsonb)
returns table (id uuid, revision bigint, name text, artist_name text, schema_version integer, analysis jsonb, creative_configuration jsonb, source_hint jsonb, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare subject uuid := auth.uid(); created public.projects;
begin
  if subject is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  perform public.validate_cloud_project_payload(payload);
  perform pg_advisory_xact_lock(hashtextextended(subject::text, 401));
  if not public.has_cloud_write_access(subject) then raise exception using errcode = '42501', message = 'cloud_write_not_entitled'; end if;
  if (select count(*) from public.projects where user_id = subject) >= 25 then raise exception using errcode = 'P0001', message = 'project_limit_reached'; end if;
  insert into public.projects (user_id,name,artist_name,schema_version,analysis,creative_configuration,source_hint)
  values (subject,payload->>'name',nullif(payload->>'artistName',''),1,nullif(payload->'analysis','null'::jsonb),payload->'creativeConfiguration',nullif(payload->'sourceHint','null'::jsonb)) returning * into created;
  return query select created.id,created.revision,created.name,created.artist_name,created.schema_version,created.analysis,created.creative_configuration,created.source_hint,created.created_at,created.updated_at;
end;
$$;

create function public.update_cloud_project(project_id uuid, expected_revision bigint, payload jsonb)
returns table (id uuid, revision bigint, name text, artist_name text, schema_version integer, analysis jsonb, creative_configuration jsonb, source_hint jsonb, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare subject uuid := auth.uid(); current_row public.projects; changed public.projects;
begin
  if subject is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  perform public.validate_cloud_project_payload(payload);
  if not public.has_cloud_write_access(subject) then raise exception using errcode = '42501', message = 'cloud_write_not_entitled'; end if;
  select * into current_row from public.projects where projects.id = project_id and user_id = subject for update;
  if not found then raise exception using errcode = 'P0002', message = 'project_not_found'; end if;
  if current_row.revision <> expected_revision then raise exception using errcode = '40001', message = format('revision_conflict:%s:%s',current_row.revision,current_row.updated_at); end if;
  update public.projects set name=payload->>'name',artist_name=nullif(payload->>'artistName',''),analysis=nullif(payload->'analysis','null'::jsonb),creative_configuration=payload->'creativeConfiguration',source_hint=nullif(payload->'sourceHint','null'::jsonb),revision=revision+1,updated_at=now()
  where projects.id=project_id and user_id=subject and revision=expected_revision returning * into changed;
  return query select changed.id,changed.revision,changed.name,changed.artist_name,changed.schema_version,changed.analysis,changed.creative_configuration,changed.source_hint,changed.created_at,changed.updated_at;
end;
$$;

create function public.delete_cloud_project(project_id uuid, expected_revision bigint)
returns void language plpgsql security definer set search_path = ''
as $$
declare subject uuid := auth.uid(); current_row public.projects;
begin
  if subject is null then raise exception using errcode = '42501', message = 'authentication_required'; end if;
  select * into current_row from public.projects where projects.id=project_id and user_id=subject for update;
  if not found then raise exception using errcode = 'P0002', message = 'project_not_found'; end if;
  if current_row.revision <> expected_revision then raise exception using errcode = '40001', message = format('revision_conflict:%s:%s',current_row.revision,current_row.updated_at); end if;
  delete from public.projects where projects.id=project_id and user_id=subject;
end;
$$;

create function public.validate_brand_preset_payload(payload jsonb)
returns void language plpgsql immutable set search_path = ''
as $$
declare config jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 65536 or not public.jsonb_has_exact_keys(payload,array['name','configuration']) then raise exception using errcode='22023',message='invalid_preset_payload'; end if;
  if jsonb_typeof(payload->'name') <> 'string' or char_length(payload->>'name') not between 1 and 120 then raise exception using errcode='22023',message='invalid_preset_name'; end if;
  config := payload->'configuration';
  if not public.jsonb_has_exact_keys(config,array['artistName','typography','palette','endCardMode']) then raise exception using errcode='22023',message='invalid_preset_keys'; end if;
  if jsonb_typeof(config->'artistName') <> 'string' or char_length(config->>'artistName') not between 1 and 120 or config->>'typography' not in ('inter','georgia','system') or config->>'endCardMode' not in ('artist','clean') then raise exception using errcode='22023',message='invalid_preset_configuration'; end if;
  if jsonb_typeof(config->'palette') <> 'array' or jsonb_array_length(config->'palette') not between 1 and 5 or exists (select 1 from jsonb_array_elements_text(config->'palette') color where color !~ '^#[0-9A-Fa-f]{6}$') then raise exception using errcode='22023',message='invalid_preset_palette'; end if;
end;
$$;
revoke all on function public.validate_brand_preset_payload(jsonb) from public, anon, authenticated;

create function public.create_brand_preset(payload jsonb)
returns table (id uuid, revision bigint, name text, configuration jsonb, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare subject uuid := auth.uid(); created public.brand_presets;
begin
  if subject is null then raise exception using errcode='42501',message='authentication_required'; end if;
  perform public.validate_brand_preset_payload(payload); perform pg_advisory_xact_lock(hashtextextended(subject::text,402));
  if not public.has_cloud_write_access(subject) or not exists (select 1 from public.account_entitlements where user_id=subject and max_brand_presets=3) then raise exception using errcode='42501',message='preset_write_not_entitled'; end if;
  if (select count(*) from public.brand_presets where user_id=subject) >= 3 then raise exception using errcode='P0001',message='preset_limit_reached'; end if;
  insert into public.brand_presets(user_id,name,configuration) values(subject,payload->>'name',payload->'configuration') returning * into created;
  return query select created.id,created.revision,created.name,created.configuration,created.created_at,created.updated_at;
end;
$$;

create function public.update_brand_preset(preset_id uuid, expected_revision bigint, payload jsonb)
returns table (id uuid, revision bigint, name text, configuration jsonb, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare subject uuid:=auth.uid(); current_row public.brand_presets; changed public.brand_presets;
begin
  if subject is null then raise exception using errcode='42501',message='authentication_required'; end if;
  perform public.validate_brand_preset_payload(payload);
  if not public.has_cloud_write_access(subject) then raise exception using errcode='42501',message='preset_write_not_entitled'; end if;
  select * into current_row from public.brand_presets where brand_presets.id=preset_id and user_id=subject for update;
  if not found then raise exception using errcode='P0002',message='preset_not_found'; end if;
  if current_row.revision<>expected_revision then raise exception using errcode='40001',message=format('revision_conflict:%s:%s',current_row.revision,current_row.updated_at); end if;
  update public.brand_presets set name=payload->>'name',configuration=payload->'configuration',revision=revision+1,updated_at=now() where brand_presets.id=preset_id and user_id=subject returning * into changed;
  return query select changed.id,changed.revision,changed.name,changed.configuration,changed.created_at,changed.updated_at;
end;
$$;

create function public.delete_brand_preset(preset_id uuid, expected_revision bigint)
returns void language plpgsql security definer set search_path = ''
as $$
declare subject uuid:=auth.uid(); current_row public.brand_presets;
begin
  if subject is null then raise exception using errcode='42501',message='authentication_required'; end if;
  select * into current_row from public.brand_presets where brand_presets.id=preset_id and user_id=subject for update;
  if not found then raise exception using errcode='P0002',message='preset_not_found'; end if;
  if current_row.revision<>expected_revision then raise exception using errcode='40001',message=format('revision_conflict:%s:%s',current_row.revision,current_row.updated_at); end if;
  delete from public.brand_presets where brand_presets.id=preset_id and user_id=subject;
end;
$$;

revoke all on function public.create_cloud_project(jsonb),public.update_cloud_project(uuid,bigint,jsonb),public.delete_cloud_project(uuid,bigint),public.create_brand_preset(jsonb),public.update_brand_preset(uuid,bigint,jsonb),public.delete_brand_preset(uuid,bigint) from public,anon;
grant execute on function public.create_cloud_project(jsonb),public.update_cloud_project(uuid,bigint,jsonb),public.delete_cloud_project(uuid,bigint),public.create_brand_preset(jsonb),public.update_brand_preset(uuid,bigint,jsonb),public.delete_brand_preset(uuid,bigint) to authenticated;
