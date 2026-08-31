-- In-app notifications for grouped rental request lifecycle events. Mirrors
-- reservation_notifications (0014/0015) exactly, just keyed off
-- rental_requests instead of a single reservation.

create table if not exists public.rental_request_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  rental_request_id uuid not null references public.rental_requests (id) on delete cascade,
  type text not null check (
    type in (
      'rental_request_submitted',
      'rental_request_accepted',
      'rental_request_rejected',
      'rental_request_cancelled',
      'rental_request_completed'
    )
  ),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (rental_request_id, recipient_id, type)
);

create index if not exists rental_request_notifications_recipient_idx
  on public.rental_request_notifications (recipient_id, created_at desc);

create index if not exists rental_request_notifications_unread_recipient_idx
  on public.rental_request_notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.rental_request_notifications enable row level security;

create policy "Users can view their rental request notifications"
  on public.rental_request_notifications for select
  using (auth.uid() = recipient_id);

-- No client insert policy: rows are only ever created by the SECURITY
-- DEFINER RPCs in 0026_rental_request_rpcs.sql.

create or replace function public.mark_rental_request_notifications_read()
returns void
language sql
security definer set search_path = public
as $$
  update public.rental_request_notifications
  set read_at = now()
  where recipient_id = auth.uid()
    and read_at is null;
$$;

revoke all on function public.mark_rental_request_notifications_read() from public;
grant execute on function public.mark_rental_request_notifications_read() to authenticated;

alter publication supabase_realtime add table public.rental_request_notifications;
alter publication supabase_realtime add table public.rental_requests;
alter publication supabase_realtime add table public.rental_request_items;
