-- Harden reservation updates and booking overlap checks introduced in 0010.
-- This is a follow-up migration rather than an edit to 0010 so projects that
-- already applied that migration receive the fixes as well.

-- Permissive RLS policies are ORed together. The original owner policy only
-- checked the new status, which meant its WITH CHECK could accidentally let a
-- renter confirm their own pending request through the renter update policy.
drop policy if exists "Owners can confirm or decline reservation requests"
  on public.reservations;

create policy "Owners can confirm or decline reservation requests"
  on public.reservations for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = reservations.listing_id and l.owner_id = auth.uid()
    )
  )
  with check (
    status in ('confirmed', 'cancelled')
    and exists (
      select 1 from public.listings l
      where l.id = reservations.listing_id and l.owner_id = auth.uid()
    )
  );

-- Neither side may rewrite who/what/when a request belongs to during a status
-- update. Statuses only move forward; cancelled requests are terminal.
create or replace function public.enforce_reservation_update_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.listing_id <> old.listing_id
    or new.renter_id <> old.renter_id
    or new.start_date <> old.start_date
    or new.end_date <> old.end_date
    or new.created_at <> old.created_at
  then
    raise exception 'Reservation details cannot be changed after creation';
  end if;

  if new.status <> old.status and not (
    (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
    or (old.status = 'confirmed' and new.status = 'cancelled')
  ) then
    raise exception 'Invalid reservation status transition from % to %',
      old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists reservations_enforce_update_rules
  on public.reservations;
create trigger reservations_enforce_update_rules
  before update on public.reservations
  for each row execute function public.enforce_reservation_update_rules();

-- Serialize writes per listing before checking availability. Without this
-- lock, two concurrent confirmations can both observe no confirmed overlap.
-- Cancelled rows do not need an availability check.
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

  return new;
end;
$$;

-- Keep a database-level invariant as a second line of defence. The advisory
-- lock above also gives pending inserts the intended conflict behaviour,
-- while this constraint guarantees confirmed rows can never overlap.
create extension if not exists btree_gist;

alter table public.reservations
  add constraint reservations_no_confirmed_overlap
  exclude using gist (
    listing_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (status = 'confirmed');

