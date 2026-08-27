-- Per-listing booking calendar. Renters request a date range on a listing
-- ("pending"); the owner then confirms or declines it. A confirmed
-- reservation blocks its dates for everyone else, while a pending one still
-- shows as bookable (other renters can compete for it) until the owner acts.

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  renter_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_date_range_check check (end_date >= start_date)
);

create index if not exists reservations_listing_id_idx on public.reservations (listing_id);
create index if not exists reservations_renter_id_idx on public.reservations (renter_id);
create index if not exists reservations_listing_status_idx
  on public.reservations (listing_id, status);

alter table public.reservations enable row level security;

create policy "Renters and owners can view a listing's reservations"
  on public.reservations for select
  using (
    auth.uid() = renter_id
    or exists (
      select 1 from public.listings l
      where l.id = reservations.listing_id and l.owner_id = auth.uid()
    )
  );

create policy "Renters can request a reservation"
  on public.reservations for insert
  with check (
    auth.uid() = renter_id
    and status = 'pending'
    and not exists (
      select 1 from public.listings l
      where l.id = reservations.listing_id and l.owner_id = auth.uid()
    )
  );

create policy "Owners can confirm or decline reservation requests"
  on public.reservations for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = reservations.listing_id and l.owner_id = auth.uid()
    )
  )
  with check (status in ('confirmed', 'cancelled'));

create policy "Renters can cancel their own pending request"
  on public.reservations for update
  using (auth.uid() = renter_id and status = 'pending')
  with check (auth.uid() = renter_id and status = 'cancelled');

create or replace function public.handle_reservation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_reservation_updated on public.reservations;
create trigger on_reservation_updated
  before update on public.reservations
  for each row execute function public.handle_reservation_updated_at();

-- Reject a pending request (insert) or a confirmation (update) that overlaps
-- dates already confirmed for the same listing. Runs as the table owner
-- (security definer) so it can see every confirmed row regardless of the
-- caller's own row-level access.
create or replace function public.check_reservation_confirmed_overlap()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (
    select 1 from public.reservations r
    where r.listing_id = new.listing_id
      and r.status = 'confirmed'
      and r.id <> new.id
      and daterange(r.start_date, r.end_date, '[]')
          && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'These dates are already booked for this listing';
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_check_confirmed_overlap on public.reservations;
create trigger reservations_check_confirmed_overlap
  before insert or update on public.reservations
  for each row execute function public.check_reservation_confirmed_overlap();

-- Public, renter-identity-free view of which dates are booked or pending, so
-- any visitor can see a listing's calendar colors without exposing who
-- requested what. Owned by the migration role, so (unlike the table) it is
-- not subject to the reservations RLS policies above.
create or replace view public.listing_availability as
select listing_id, start_date, end_date, status
from public.reservations
where status in ('pending', 'confirmed');

grant select on public.listing_availability to anon, authenticated;
