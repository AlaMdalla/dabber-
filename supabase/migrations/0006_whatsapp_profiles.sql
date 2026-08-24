-- Lets listing owners publish a WhatsApp contact number while keeping the
-- existing in-app messaging flow available.

alter table public.profiles
  add column if not exists whatsapp_number text;

alter table public.profiles
  drop constraint if exists profiles_whatsapp_number_format;

alter table public.profiles
  add constraint profiles_whatsapp_number_format
  check (
    whatsapp_number is null
    or whatsapp_number ~ '^\+[1-9][0-9]{7,14}$'
  );

comment on column public.profiles.whatsapp_number is
  'Public WhatsApp number in E.164 format, for example +21620123456.';

-- New email/password accounts provide their name as signup metadata. Keep
-- compatibility with profiles that were originally created through OAuth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
