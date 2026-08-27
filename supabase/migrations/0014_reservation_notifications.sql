-- In-app notifications for reservation decisions and cancellations.

create table if not exists public.reservation_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  type text not null check (
    type in ('reservation_confirmed', 'reservation_declined', 'reservation_cancelled')
  ),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (reservation_id, recipient_id, type)
);

create index if not exists reservation_notifications_recipient_idx
  on public.reservation_notifications (recipient_id, created_at desc);

create index if not exists reservation_notifications_unread_recipient_idx
  on public.reservation_notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.reservation_notifications enable row level security;

create policy "Users can view their reservation notifications"
  on public.reservation_notifications for select
  using (auth.uid() = recipient_id);

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
  if new.status = old.status then
    return new;
  end if;

  select owner_id into listing_owner_id
  from public.listings
  where id = new.listing_id;

  if new.status = 'confirmed' then
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
  after update of status on public.reservations
  for each row execute function public.create_reservation_status_notification();

create or replace function public.mark_reservation_notifications_read()
returns void
language sql
security definer set search_path = public
as $$
  update public.reservation_notifications
  set read_at = now()
  where recipient_id = auth.uid()
    and read_at is null;
$$;

revoke all on function public.mark_reservation_notifications_read() from public;
grant execute on function public.mark_reservation_notifications_read() to authenticated;

alter publication supabase_realtime add table public.reservation_notifications;

