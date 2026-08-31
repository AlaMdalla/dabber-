-- Extends messages with a structured "type" so a rental request (and its
-- status changes) can render as a typed system card instead of a plain-text
-- message. Real rental data always lives in rental_requests /
-- rental_request_items; these columns only ever reference it.

alter table public.messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'rental_request', 'status_event')),
  add column if not exists rental_request_id uuid
    references public.rental_requests (id) on delete cascade,
  add column if not exists status_event_type text
    check (status_event_type in ('accepted', 'rejected', 'cancelled', 'completed'));

alter table public.messages
  add constraint messages_type_shape_check check (
    (message_type = 'text' and rental_request_id is null and status_event_type is null)
    or (message_type = 'rental_request' and rental_request_id is not null and status_event_type is null)
    or (message_type = 'status_event' and rental_request_id is not null and status_event_type is not null)
  );

create index if not exists messages_rental_request_id_idx
  on public.messages (rental_request_id) where rental_request_id is not null;

-- Clients may only ever send plain text messages. `rental_request` and
-- `status_event` rows are inserted exclusively by the SECURITY DEFINER RPCs
-- in 0025_rental_request_rpcs.sql, which run as the table-owning role and so
-- are not subject to this policy at all -- it only constrains ordinary
-- client inserts.
drop policy if exists "Participants can send messages in their conversations" on public.messages;
create policy "Participants can send messages in their conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and message_type = 'text'
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );
