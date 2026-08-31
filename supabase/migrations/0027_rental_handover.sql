-- The physical-exchange trust layer on top of an accepted rental_request:
-- handover condition report -> renter confirmation -> handover code ->
-- active; then return condition -> return code -> completed. One record per
-- rental_request (not per item) -- see rental_request_items for per-item
-- detail if that's ever needed.
--
-- Code visibility note: RLS below lets both renter and owner select a
-- handover/return row, code column included -- Postgres RLS is row-, not
-- column-, granular. The app enforces "receiver shows the code, giver types
-- it" purely at the UI layer (the giver's screens never fetch the code).
-- This is a workflow-level proof of physical presence, not a cryptographic
-- guarantee, which matches the brief's "don't overengineer this / don't make
-- the security explanation intimidating" instruction.

alter table public.rental_requests
  add column if not exists active_at timestamptz,
  add column if not exists return_requested_at timestamptz;

alter table public.rental_requests drop constraint if exists rental_requests_status_check;
alter table public.rental_requests add constraint rental_requests_status_check
  check (status in (
    'pending', 'accepted', 'active', 'return_pending', 'completed',
    'rejected', 'cancelled', 'disputed'
  ));

create or replace function public.generate_short_code()
returns text
language sql
as $$
  select lpad(floor(random() * 10000)::text, 4, '0');
$$;

create table if not exists public.rental_handovers (
  id uuid primary key default gen_random_uuid(),
  rental_request_id uuid not null unique references public.rental_requests (id) on delete cascade,
  code text not null,
  condition_note text check (condition_note is null or char_length(condition_note) <= 500),
  owner_submitted_at timestamptz,
  renter_confirmed_at timestamptz,
  code_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rental_handovers enable row level security;

create policy "Renter and owner can view the handover record"
  on public.rental_handovers for select
  using (
    exists (
      select 1 from public.rental_requests r
      where r.id = rental_handovers.rental_request_id
        and (auth.uid() = r.renter_id or auth.uid() = r.owner_id)
    )
  );

create table if not exists public.rental_handover_photos (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references public.rental_handovers (id) on delete cascade,
  storage_path text not null,
  position smallint not null check (position between 0 and 4),
  created_at timestamptz not null default now(),
  unique (handover_id, position)
);

create index if not exists rental_handover_photos_handover_id_idx
  on public.rental_handover_photos (handover_id);

alter table public.rental_handover_photos enable row level security;

create policy "Renter and owner can view handover photos"
  on public.rental_handover_photos for select
  using (
    exists (
      select 1 from public.rental_handovers h
      join public.rental_requests r on r.id = h.rental_request_id
      where h.id = rental_handover_photos.handover_id
        and (auth.uid() = r.renter_id or auth.uid() = r.owner_id)
    )
  );

create table if not exists public.rental_returns (
  id uuid primary key default gen_random_uuid(),
  rental_request_id uuid not null unique references public.rental_requests (id) on delete cascade,
  code text not null,
  condition_status text check (condition_status in ('good', 'issue')),
  note text check (note is null or char_length(note) <= 500),
  owner_submitted_at timestamptz,
  code_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rental_returns enable row level security;

create policy "Renter and owner can view the return record"
  on public.rental_returns for select
  using (
    exists (
      select 1 from public.rental_requests r
      where r.id = rental_returns.rental_request_id
        and (auth.uid() = r.renter_id or auth.uid() = r.owner_id)
    )
  );

-- No client insert/update policy on any of the three tables above: every
-- write goes through the security definer RPCs below, same pattern as
-- rental_requests itself.

alter table public.messages drop constraint if exists messages_status_event_type_check;
alter table public.messages add constraint messages_status_event_type_check
  check (status_event_type in ('accepted', 'rejected', 'cancelled', 'completed', 'active'));

alter table public.rental_request_notifications drop constraint if exists rental_request_notifications_type_check;
alter table public.rental_request_notifications add constraint rental_request_notifications_type_check
  check (type in (
    'rental_request_submitted',
    'rental_request_accepted',
    'rental_request_rejected',
    'rental_request_cancelled',
    'handover_condition_submitted',
    'handover_confirmed',
    'rental_active',
    'return_condition_submitted',
    'rental_completed'
  ));

-- Owner records the item's condition (photos + optional note) before
-- meeting the renter. Safe to resubmit (e.g. adding a photo) before the
-- renter has confirmed; resubmitting after clears the renter's prior
-- confirmation since it applied to the old report.
create or replace function public.submit_handover_condition(
  p_request_id uuid,
  p_note text,
  p_photo_paths text[]
)
returns public.rental_handovers
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.rental_requests;
  v_handover public.rental_handovers;
  v_path text;
  v_position smallint := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_request from public.rental_requests where id = p_request_id for update;
  if not found then raise exception 'Rental request not found'; end if;
  if auth.uid() <> v_request.owner_id then
    raise exception 'Only the owner can record the handover condition';
  end if;
  if v_request.status <> 'accepted' then
    raise exception 'This rental is not ready for handover';
  end if;
  if p_photo_paths is null or array_length(p_photo_paths, 1) is null then
    raise exception 'Add at least one photo';
  end if;
  if array_length(p_photo_paths, 1) > 5 then
    raise exception 'Add at most 5 photos';
  end if;

  insert into public.rental_handovers (rental_request_id, code, condition_note, owner_submitted_at)
  values (p_request_id, public.generate_short_code(), nullif(trim(p_note), ''), now())
  on conflict (rental_request_id) do update
    set condition_note = excluded.condition_note,
        owner_submitted_at = now(),
        renter_confirmed_at = null,
        code_confirmed_at = null
  returning * into v_handover;

  delete from public.rental_handover_photos where handover_id = v_handover.id;
  foreach v_path in array p_photo_paths loop
    insert into public.rental_handover_photos (handover_id, storage_path, position)
    values (v_handover.id, v_path, v_position);
    v_position := v_position + 1;
  end loop;

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (v_request.renter_id, auth.uid(), p_request_id, 'handover_condition_submitted')
  on conflict (rental_request_id, recipient_id, type) do nothing;

  return v_handover;
end;
$$;

revoke all on function public.submit_handover_condition(uuid, text, text[]) from public;
grant execute on function public.submit_handover_condition(uuid, text, text[]) to authenticated;

-- Renter acknowledges the condition report reflects reality. Can happen
-- before the physical meetup (reviewing photos remotely); the handover code
-- below is the separate, in-person proof.
create or replace function public.confirm_handover_condition(p_request_id uuid)
returns public.rental_handovers
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.rental_requests;
  v_handover public.rental_handovers;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_request from public.rental_requests where id = p_request_id;
  if not found then raise exception 'Rental request not found'; end if;
  if auth.uid() <> v_request.renter_id then
    raise exception 'Only the renter can confirm this';
  end if;

  select * into v_handover from public.rental_handovers where rental_request_id = p_request_id for update;
  if not found or v_handover.owner_submitted_at is null then
    raise exception 'The owner has not recorded the item condition yet';
  end if;
  if v_handover.renter_confirmed_at is not null then
    return v_handover;
  end if;

  update public.rental_handovers set renter_confirmed_at = now()
  where rental_request_id = p_request_id
  returning * into v_handover;

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (v_request.owner_id, auth.uid(), p_request_id, 'handover_confirmed')
  on conflict (rental_request_id, recipient_id, type) do nothing;

  return v_handover;
end;
$$;

revoke all on function public.confirm_handover_condition(uuid) from public;
grant execute on function public.confirm_handover_condition(uuid) to authenticated;

-- The renter's app shows the code; the owner types what the renter reads
-- out, proving they're physically together. Starts the rental.
create or replace function public.confirm_handover_code(p_request_id uuid, p_code text)
returns public.rental_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.rental_requests;
  v_handover public.rental_handovers;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_request from public.rental_requests where id = p_request_id for update;
  if not found then raise exception 'Rental request not found'; end if;
  if auth.uid() <> v_request.owner_id then
    raise exception 'Only the owner can confirm the handover';
  end if;
  if v_request.status <> 'accepted' then
    raise exception 'This rental is not ready to start';
  end if;

  select * into v_handover from public.rental_handovers where rental_request_id = p_request_id;
  if not found or v_handover.renter_confirmed_at is null then
    raise exception 'The renter has not confirmed the item condition yet';
  end if;
  if trim(p_code) <> v_handover.code then
    raise exception 'Incorrect code';
  end if;

  update public.rental_handovers set code_confirmed_at = now() where rental_request_id = p_request_id;

  update public.rental_requests set status = 'active', active_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into public.messages (conversation_id, sender_id, body, message_type, rental_request_id, status_event_type)
  values (v_request.conversation_id, auth.uid(), 'Location démarrée.', 'status_event', p_request_id, 'active');

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (v_request.renter_id, auth.uid(), p_request_id, 'rental_active')
  on conflict (rental_request_id, recipient_id, type) do nothing;

  return v_request;
end;
$$;

revoke all on function public.confirm_handover_code(uuid, text) from public;
grant execute on function public.confirm_handover_code(uuid, text) to authenticated;

-- Owner records the item's condition on return. Recording an issue doesn't
-- block completion -- it's still the same code-confirmed handoff, just
-- flagged; disputing it further is a separate "report a problem" action.
create or replace function public.submit_return_condition(
  p_request_id uuid,
  p_status text,
  p_note text
)
returns public.rental_returns
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.rental_requests;
  v_return public.rental_returns;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_status not in ('good', 'issue') then raise exception 'Invalid condition status'; end if;
  select * into v_request from public.rental_requests where id = p_request_id for update;
  if not found then raise exception 'Rental request not found'; end if;
  if auth.uid() <> v_request.owner_id then
    raise exception 'Only the owner can record the return';
  end if;
  if v_request.status <> 'active' then
    raise exception 'This rental is not active';
  end if;

  insert into public.rental_returns (rental_request_id, code, condition_status, note, owner_submitted_at)
  values (p_request_id, public.generate_short_code(), p_status, nullif(trim(p_note), ''), now())
  on conflict (rental_request_id) do update
    set condition_status = excluded.condition_status,
        note = excluded.note,
        owner_submitted_at = now(),
        code_confirmed_at = null
  returning * into v_return;

  update public.rental_requests set status = 'return_pending', return_requested_at = now()
  where id = p_request_id;

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (v_request.renter_id, auth.uid(), p_request_id, 'return_condition_submitted')
  on conflict (rental_request_id, recipient_id, type) do nothing;

  return v_return;
end;
$$;

revoke all on function public.submit_return_condition(uuid, text, text) from public;
grant execute on function public.submit_return_condition(uuid, text, text) to authenticated;

-- The owner's app shows the code; the renter types what the owner reads
-- out, proving the item physically changed hands back. Completes the
-- rental and restores inventory via the existing reservations trigger.
create or replace function public.confirm_return_code(p_request_id uuid, p_code text)
returns public.rental_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.rental_requests;
  v_return public.rental_returns;
  v_item public.rental_request_items;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_request from public.rental_requests where id = p_request_id for update;
  if not found then raise exception 'Rental request not found'; end if;
  if auth.uid() <> v_request.renter_id then
    raise exception 'Only the renter can confirm the return';
  end if;
  if v_request.status <> 'return_pending' then
    raise exception 'This rental has no return to confirm';
  end if;

  select * into v_return from public.rental_returns where rental_request_id = p_request_id;
  if not found then raise exception 'No return record found'; end if;
  if trim(p_code) <> v_return.code then raise exception 'Incorrect code'; end if;

  update public.rental_returns set code_confirmed_at = now() where rental_request_id = p_request_id;

  for v_item in select * from public.rental_request_items where rental_request_id = p_request_id
  loop
    update public.reservations set status = 'returned' where id = v_item.reservation_id;
  end loop;

  update public.rental_requests set status = 'completed', completed_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into public.messages (conversation_id, sender_id, body, message_type, rental_request_id, status_event_type)
  values (v_request.conversation_id, auth.uid(), 'Location terminée.', 'status_event', p_request_id, 'completed');

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (v_request.owner_id, auth.uid(), p_request_id, 'rental_completed')
  on conflict (rental_request_id, recipient_id, type) do nothing;

  return v_request;
end;
$$;

revoke all on function public.confirm_return_code(uuid, text) from public;
grant execute on function public.confirm_return_code(uuid, text) to authenticated;

-- Private evidence bucket: unlike listing/avatar images, condition photos
-- are only meaningful (and only visible) to the two people in this rental.
insert into storage.buckets (id, name, public)
values ('rental-condition-images', 'rental-condition-images', false)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'rental-condition-images';

create policy "Renter and owner can view rental condition images"
  on storage.objects for select
  using (
    bucket_id = 'rental-condition-images'
    and exists (
      select 1 from public.rental_requests r
      where r.id::text = (storage.foldername(name))[1]
        and (auth.uid() = r.renter_id or auth.uid() = r.owner_id)
    )
  );

create policy "Owners can upload rental condition images"
  on storage.objects for insert
  with check (
    bucket_id = 'rental-condition-images'
    and exists (
      select 1 from public.rental_requests r
      where r.id::text = (storage.foldername(name))[1]
        and auth.uid() = r.owner_id
        and r.status = 'accepted'
    )
  );

create policy "Owners can delete their own rental condition images"
  on storage.objects for delete
  using (
    bucket_id = 'rental-condition-images'
    and exists (
      select 1 from public.rental_requests r
      where r.id::text = (storage.foldername(name))[1]
        and auth.uid() = r.owner_id
    )
  );

alter publication supabase_realtime add table public.rental_handovers;
alter publication supabase_realtime add table public.rental_returns;
