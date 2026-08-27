-- Make owner declines distinguishable from cancellations and allow renters to
-- cancel confirmed bookings only at least three calendar days before start.

alter table public.reservations
  drop constraint if exists reservations_status_check;

alter table public.reservations
  add constraint reservations_status_check
  check (status in ('pending', 'confirmed', 'declined', 'cancelled'));

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
    status in ('confirmed', 'declined', 'cancelled')
    and exists (
      select 1 from public.listings l
      where l.id = reservations.listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "Renters can cancel their own pending request"
  on public.reservations;

create policy "Renters can cancel eligible reservations"
  on public.reservations for update
  using (
    auth.uid() = renter_id
    and (
      status = 'pending'
      or (status = 'confirmed' and start_date >= current_date + 3)
    )
  )
  with check (auth.uid() = renter_id and status = 'cancelled');

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
    (old.status = 'pending' and new.status in ('confirmed', 'declined', 'cancelled'))
    or (old.status = 'confirmed' and new.status = 'cancelled')
  ) then
    raise exception 'Invalid reservation status transition from % to %',
      old.status, new.status;
  end if;

  -- Owners decline pending requests; "cancelled" is reserved for a renter
  -- withdrawing their own pending request.
  if old.status = 'pending'
    and new.status = 'cancelled'
    and auth.uid() <> old.renter_id
  then
    raise exception 'Owners must decline pending reservation requests';
  end if;

  return new;
end;
$$;

