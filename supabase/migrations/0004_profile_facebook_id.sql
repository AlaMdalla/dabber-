-- Stores the poster's Facebook user id so buyers can be sent straight to
-- a Messenger chat with them (m.me/<facebook_id>) from a listing page.

alter table public.profiles add column if not exists facebook_id text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, facebook_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'provider_id', new.raw_user_meta_data ->> 'sub')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill for profiles created before this column existed.
update public.profiles p
set facebook_id = coalesce(u.raw_user_meta_data ->> 'provider_id', u.raw_user_meta_data ->> 'sub')
from auth.users u
where u.id = p.id and p.facebook_id is null;
