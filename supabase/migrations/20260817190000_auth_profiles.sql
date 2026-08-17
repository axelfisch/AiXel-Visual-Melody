create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 120),
  constraint profiles_locale_allowed check (locale in ('en', 'fr'))
);

comment on table public.profiles is 'User-owned non-billing profile data provisioned from Auth.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select (user_id, display_name, locale, created_at, updated_at) on table public.profiles to authenticated;
grant update (display_name, locale) on table public.profiles to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create function public.handle_new_user()
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
  requested_locale := case
    when new.raw_user_meta_data ->> 'locale' in ('en', 'fr') then new.raw_user_meta_data ->> 'locale'
    else 'en'
  end;

  insert into public.profiles (user_id, display_name, locale)
  values (new.id, requested_name, requested_locale)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();
