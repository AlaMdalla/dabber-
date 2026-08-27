-- Notify listing owners when a renter submits a new reservation request.

alter table public.reservation_notifications
  drop constraint if exists reservation_notifications_type_check;

alter table public.reservation_notifications
  add constraint reservation_notifications_type_check
  check (
    type in (
      'reservation_requested',
      'reservation_confirmed',
      'reservation_declined',
      'reservation_cancelled'
    )
  );

create or replace function public.create_reservation_status_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  listing_owner_id uuid;
  notification_recipient uuid;
  notification_type text;
begin
  select owner_id into listing_owner_id
  from public.listings
  where id = new.listing_id;

  if tg_op = 'INSERT' then
    notification_recipient := listing_owner_id;
    notification_type := 'reservation_requested';
  elsif new.status = old.status then
    return new;
  elsif new.status = 'confirmed' then
    notification_recipient := new.renter_id;
    notification_type := 'reservation_confirmed';
  elsif new.status = 'declined' then
    notification_recipient := new.renter_id;
    notification_type := 'reservation_declined';
  elsif new.status = 'cancelled' then
    if auth.uid() = new.renter_id then
      notification_recipient := listing_owner_id;
    else
      notification_recipient := new.renter_id;
    end if;
    notification_type := 'reservation_cancelled';
  else
    return new;
  end if;

  if notification_recipient is not null then
    insert into public.reservation_notifications (
      recipient_id,
      actor_id,
      reservation_id,
      type
    ) values (
      notification_recipient,
      auth.uid(),
      new.id,
      notification_type
    )
    on conflict (reservation_id, recipient_id, type) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists reservation_status_notification on public.reservations;
create trigger reservation_status_notification
  after insert or update of status on public.reservations
  for each row execute function public.create_reservation_status_notification();

