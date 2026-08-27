-- Lets admins promote other users to admin and ban abusive users in-app.
-- Bans never touch Supabase Auth (no service-role key exists in this
-- project) — a banned user can still sign in, but is blocked at the RLS
-- layer from creating new listings, reservations, or messages.

create table public.banned_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  banned_by uuid references auth.users (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.banned_users enable row level security;
-- No default client policies, same as `admins` — locked to the
-- SECURITY DEFINER function below until the admin-only policies further
-- down grant explicit access.

create or replace function public.is_banned()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.banned_users where user_id = auth.uid());
$$;

revoke all on function public.is_banned() from public;
grant execute on function public.is_banned() to authenticated;

-- Admin-only management of both allowlist tables.
create policy "Admins can view admins"
  on public.admins for select
  using (public.is_admin());

create policy "Admins can add admins"
  on public.admins for insert
  with check (public.is_admin());

create policy "Admins can remove admins"
  on public.admins for delete
  using (public.is_admin());

create policy "Admins can view banned users"
  on public.banned_users for select
  using (public.is_admin());

create policy "Admins can ban users"
  on public.banned_users for insert
  with check (public.is_admin());

create policy "Admins can unban users"
  on public.banned_users for delete
  using (public.is_admin());

-- Safety rails: an admin can't strip their own access, and nobody can ban
-- themselves or another admin (ban/promote first, demote before banning).
create or replace function public.prevent_self_admin_removal()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.user_id = auth.uid() then
    raise exception 'You cannot remove your own admin access';
  end if;
  return old;
end;
$$;

drop trigger if exists admins_prevent_self_removal on public.admins;
create trigger admins_prevent_self_removal
  before delete on public.admins
  for each row execute function public.prevent_self_admin_removal();

create or replace function public.prevent_banning_admins_or_self()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id = auth.uid() then
    raise exception 'You cannot ban yourself';
  end if;
  if exists (select 1 from public.admins where user_id = new.user_id) then
    raise exception 'Cannot ban another admin';
  end if;
  return new;
end;
$$;

drop trigger if exists banned_users_prevent_admin_ban on public.banned_users;
create trigger banned_users_prevent_admin_ban
  before insert on public.banned_users
  for each row execute function public.prevent_banning_admins_or_self();

-- Ban enforcement: block new listings, reservation requests, and messages
-- (both continuing a conversation and starting a new one).

drop policy if exists "Users can insert their own listings" on public.listings;
create policy "Users can insert their own listings"
  on public.listings for insert
  with check (auth.uid() = owner_id and not public.is_banned());

drop policy if exists "Renters can request a reservation" on public.reservations;
create policy "Renters can request a reservation"
  on public.reservations for insert
  with check (
    auth.uid() = renter_id
    and status = 'pending'
    and not public.is_banned()
    and not exists (
      select 1 from public.listings l
      where l.id = reservations.listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "Participants can send messages in their conversations" on public.messages;
create policy "Participants can send messages in their conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and not public.is_banned()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

-- start_conversation() is SECURITY DEFINER, so it bypasses RLS entirely —
-- the ban check has to live inside the function body itself.
create or replace function public.start_conversation(
  p_other_user_id uuid,
  p_body text,
  p_listing_id uuid default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
begin
  if public.is_banned() then
    raise exception 'Your account is restricted';
  end if;

  if p_other_user_id = auth.uid() then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  v_user_a := least(auth.uid(), p_other_user_id);
  v_user_b := greatest(auth.uid(), p_other_user_id);

  insert into public.conversations (user_a_id, user_b_id)
  values (v_user_a, v_user_b)
  on conflict (user_a_id, user_b_id) do nothing;

  select id into v_conversation_id
  from public.conversations
  where user_a_id = v_user_a and user_b_id = v_user_b;

  insert into public.messages (conversation_id, sender_id, body, listing_id)
  values (v_conversation_id, auth.uid(), p_body, p_listing_id);

  return v_conversation_id;
end;
$$;
