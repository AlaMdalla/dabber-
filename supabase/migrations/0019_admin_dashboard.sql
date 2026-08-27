-- Admin moderation dashboard: a small allowlist table plus a SECURITY
-- DEFINER helper so RLS policies (and the app) can cheaply check whether the
-- current user is an admin, without exposing an `is_admin` flag on the
-- publicly-readable `profiles` table.

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- No SELECT/INSERT/UPDATE/DELETE policy for clients at all: only the
-- SECURITY DEFINER function below (and the DB owner) can read this table.

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Seed the first admin.
insert into public.admins (user_id)
select id from auth.users where email = 'ilyes.essid01@gmail.com'
on conflict do nothing;

-- Admin bypass policies. `profiles` and `listing_images` are already
-- `select using (true)`, so no new policy is needed there for admins to
-- browse everything; deleting a listing cascades to its images at the DB
-- level regardless of RLS.

create policy "Admins can delete any listing"
  on public.listings for delete
  using (public.is_admin());

create policy "Admins can view all reservations"
  on public.reservations for select
  using (public.is_admin());

-- Permissive policies OR together, so the WITH CHECK must independently
-- re-verify admin status (same discipline as the owner policy hardened in
-- 0011_harden_reservations.sql) rather than relying on USING alone.
create policy "Admins can cancel any reservation"
  on public.reservations for update
  using (public.is_admin())
  with check (status = 'cancelled' and public.is_admin());
