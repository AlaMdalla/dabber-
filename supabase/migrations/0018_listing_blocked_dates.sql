-- Lets a listing owner block specific dates on their own calendar directly
-- (e.g. they're using the item themselves that week), independent of any
-- renter request. Kept as its own table rather than a self-reservation:
-- 0010's insert policy deliberately forbids an owner "renting" their own
-- listing, and reusing the reservations table here would also spam the
-- reservation-notification system (0014/0015) with owner-to-owner
-- notifications for no reason.

create table if not exists public.listing_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint listing_blocked_dates_range_check check (end_date >= start_date)
);

create index if not exists listing_blocked_dates_listing_id_idx
  on public.listing_blocked_dates (listing_id);

alter table public.listing_blocked_dates enable row level security;

create policy "Owners can view blocks on their own listings"
  on public.listing_blocked_dates for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_blocked_dates.listing_id and l.owner_id = auth.uid()
    )
  );

create policy "Owners can block dates on their own listings"
  on public.listing_blocked_dates for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_blocked_dates.listing_id and l.owner_id = auth.uid()
    )
  );

create policy "Owners can remove blocks on their own listings"
  on public.listing_blocked_dates for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_blocked_dates.listing_id and l.owner_id = auth.uid()
    )
  );

-- Extend the public availability view so a blocked range renders exactly
-- like a confirmed reservation (red / unbookable) to anyone browsing the
-- listing. Renter identity stays out of this view either way.
create or replace view public.listing_availability as
select listing_id, start_date, end_date, status
from public.reservations
where status in ('pending', 'confirmed')
union all
select listing_id, start_date, end_date, 'confirmed' as status
from public.listing_blocked_dates;

-- A renter's request (or an owner's confirmation) must not be able to land
-- on dates the owner has already blocked themselves.
create or replace function public.check_reservation_confirmed_overlap()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.listing_id::text, 0)
  );

  if new.status in ('pending', 'confirmed') and exists (
    select 1 from public.reservations r
    where r.listing_id = new.listing_id
      and r.status = 'confirmed'
      and r.id <> new.id
      and daterange(r.start_date, r.end_date, '[]')
          && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'These dates are already booked for this listing';
  end if;

  if new.status in ('pending', 'confirmed') and exists (
    select 1 from public.listing_blocked_dates b
    where b.listing_id = new.listing_id
      and daterange(b.start_date, b.end_date, '[]')
          && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'These dates are blocked by the owner';
  end if;

  return new;
end;
$$;
