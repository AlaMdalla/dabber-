-- Quantity-aware rental inventory. Existing listings and reservations remain
-- single-item records. Stock transitions live here so every caller (including
-- legacy table updates and admin actions) gets the same locking and safeguards.

alter table public.listings
  add column if not exists total_quantity integer not null default 1,
  add column if not exists available_quantity integer not null default 1;

alter table public.listings
  add constraint listings_total_quantity_check check (total_quantity >= 1),
  add constraint listings_available_quantity_check check (available_quantity >= 0),
  add constraint listings_quantity_bounds_check check (available_quantity <= total_quantity);

alter table public.reservations
  add column if not exists quantity integer not null default 1,
  add column if not exists inventory_restored boolean not null default false;

alter table public.reservations
  add constraint reservations_quantity_check check (quantity >= 1);

-- Confirmed reservations may overlap for listings with multiple units. Stock,
-- rather than an exclusion constraint, is now the authoritative capacity rule.
alter table public.reservations
  drop constraint if exists reservations_no_confirmed_overlap;

create or replace function public.enforce_listing_quantity_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_rented integer;
begin
  if tg_op = 'INSERT' then
    new.available_quantity := new.total_quantity;
    return new;
  end if;

  if new.total_quantity <> old.total_quantity then
    v_rented := old.total_quantity - old.available_quantity;
    if new.total_quantity < v_rented then
      raise exception 'Total quantity cannot be lower than the % item(s) currently rented', v_rented;
    end if;
    new.available_quantity := new.total_quantity - v_rented;
  elsif new.available_quantity <> old.available_quantity and pg_trigger_depth() = 1 then
    raise exception 'Available quantity is managed by the rental workflow';
  end if;

  if new.available_quantity = 0 then
    new.availability := 'a-confirmer';
  elsif old.available_quantity = 0 and new.available_quantity > 0 then
    new.availability := 'disponible';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_enforce_quantity_rules on public.listings;
create trigger listings_enforce_quantity_rules
  before insert or update on public.listings
  for each row execute function public.enforce_listing_quantity_rules();

-- Request creation is validated against current server-side stock. Pending
-- requests do not reserve stock; availability is checked again on acceptance.
create or replace function public.validate_reservation_quantity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_available integer;
begin
  select available_quantity into v_available
  from public.listings where id = new.listing_id;
  if not found then
    raise exception 'Listing not found';
  end if;
  if new.quantity > v_available then
    raise exception 'Only % item(s) are currently available', v_available;
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_validate_quantity on public.reservations;
create trigger reservations_validate_quantity
  before insert on public.reservations
  for each row execute function public.validate_reservation_quantity();

create or replace function public.enforce_reservation_update_rules()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_available integer;
begin
  if new.listing_id <> old.listing_id
    or new.renter_id <> old.renter_id
    or new.start_date <> old.start_date
    or new.end_date <> old.end_date
    or new.quantity <> old.quantity
    or new.inventory_restored <> old.inventory_restored
    or new.created_at <> old.created_at
  then
    raise exception 'Reservation details cannot be changed after creation';
  end if;

  if new.status <> old.status and not (
    (old.status = 'pending' and new.status in ('confirmed', 'declined', 'cancelled'))
    or (old.status = 'confirmed' and new.status in ('cancelled', 'returned'))
  ) then
    raise exception 'Invalid reservation status transition from % to %', old.status, new.status;
  end if;

  if old.status = 'pending' and new.status = 'cancelled'
    and auth.uid() <> old.renter_id and not public.is_admin()
  then
    raise exception 'Owners must decline pending reservation requests';
  end if;

  if old.status = 'pending' and new.status = 'confirmed' then
    select available_quantity into v_available
    from public.listings where id = old.listing_id for update;
    if v_available < old.quantity then
      raise exception 'Insufficient availability: requested %, only % available', old.quantity, v_available;
    end if;
    update public.listings
      set available_quantity = available_quantity - old.quantity
      where id = old.listing_id;
    new.inventory_restored := false;
  elsif old.status = 'confirmed'
    and new.status in ('cancelled', 'returned')
    and not old.inventory_restored
  then
    perform 1 from public.listings where id = old.listing_id for update;
    update public.listings
      set available_quantity = available_quantity + old.quantity
      where id = old.listing_id;
    new.inventory_restored := true;
  else
    new.inventory_restored := old.inventory_restored;
  end if;
  return new;
end;
$$;

alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations add constraint reservations_status_check
  check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'returned'));

-- Retain date blocks, but no longer reject another reservation merely because
-- an identical unit is booked for the same dates.
create or replace function public.check_reservation_confirmed_overlap()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status in ('pending', 'confirmed') and exists (
    select 1 from public.listing_blocked_dates b
    where b.listing_id = new.listing_id
      and daterange(b.start_date, b.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'These dates are blocked by the owner';
  end if;
  return new;
end;
$$;

drop policy if exists "Owners can confirm or decline reservation requests" on public.reservations;
create policy "Owners can manage reservation requests"
  on public.reservations for update
  using (exists (select 1 from public.listings l where l.id = reservations.listing_id and l.owner_id = auth.uid()))
  with check (
    status in ('confirmed', 'declined', 'cancelled', 'returned')
    and exists (select 1 from public.listings l where l.id = reservations.listing_id and l.owner_id = auth.uid())
  );

create or replace function public.transition_reservation(p_reservation_id uuid, p_status text)
returns public.reservations
language plpgsql
security definer set search_path = public
as $$
declare
  v_reservation public.reservations;
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_status not in ('confirmed', 'declined', 'cancelled', 'returned') then
    raise exception 'Unsupported reservation status';
  end if;

  select r.* into v_reservation
  from public.reservations r
  where r.id = p_reservation_id for update of r;
  if not found then raise exception 'Reservation not found'; end if;

  select l.owner_id into v_owner
  from public.listings l where l.id = v_reservation.listing_id;

  if p_status in ('confirmed', 'declined', 'returned') and auth.uid() <> v_owner then
    raise exception 'Only the listing owner can perform this action';
  end if;
  if p_status = 'cancelled' and auth.uid() not in (v_owner, v_reservation.renter_id)
    and not public.is_admin() then
    raise exception 'You cannot cancel this reservation';
  end if;
  if p_status = 'cancelled' and auth.uid() = v_reservation.renter_id
    and v_reservation.status = 'confirmed'
    and v_reservation.start_date < current_date + 3 then
    raise exception 'Online cancellation closes three days before the start date';
  end if;

  update public.reservations set status = p_status
  where id = p_reservation_id returning * into v_reservation;
  return v_reservation;
end;
$$;

revoke all on function public.transition_reservation(uuid, text) from public;
grant execute on function public.transition_reservation(uuid, text) to authenticated;

-- Public view remains identity-free. Confirmed ranges are fully booked only
-- when the listing has no units left; owner-blocked ranges are always blocked.
create or replace view public.listing_availability as
select r.listing_id, r.start_date, r.end_date,
  case when r.status = 'confirmed' and l.available_quantity > 0 then 'pending' else r.status end as status
from public.reservations r join public.listings l on l.id = r.listing_id
where r.status in ('pending', 'confirmed')
union all
select listing_id, start_date, end_date, 'confirmed' as status
from public.listing_blocked_dates;

grant select on public.listing_availability to anon, authenticated;
