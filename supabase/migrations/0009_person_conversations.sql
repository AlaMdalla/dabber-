-- Restructures conversations to be per person-pair instead of per listing, so
-- the inbox shows one thread per person even when they discuss several
-- listings. Individual messages can now optionally reference the listing
-- being discussed, so the app can render it inline as a shared post instead
-- of relying on the conversation as a whole to carry that context.

-- 1. Messages can reference the listing being discussed at the time they were sent.
alter table public.messages
  add column if not exists listing_id uuid references public.listings (id) on delete set null;

create index if not exists messages_listing_id_idx on public.messages (listing_id);

-- 2. Introduce canonical, order-independent participant columns on conversations.
alter table public.conversations
  add column if not exists user_a_id uuid references public.profiles (id) on delete cascade,
  add column if not exists user_b_id uuid references public.profiles (id) on delete cascade;

update public.conversations
set user_a_id = least(buyer_id, seller_id),
    user_b_id = greatest(buyer_id, seller_id)
where user_a_id is null;

alter table public.conversations
  alter column user_a_id set not null,
  alter column user_b_id set not null;

-- 3. Preserve each old conversation's listing context by stamping it onto
--    that conversation's first message, before conversations get merged by
--    participant pair below.
with first_message as (
  select distinct on (conversation_id) id, conversation_id
  from public.messages
  order by conversation_id, created_at asc
)
update public.messages m
set listing_id = c.listing_id
from first_message fm
join public.conversations c on c.id = fm.conversation_id
where m.id = fm.id
  and m.listing_id is null;

-- 4. Merge conversations that share the same participant pair into a single
--    survivor conversation (the oldest one), moving all of their messages over.
with survivors as (
  select distinct on (user_a_id, user_b_id) id, user_a_id, user_b_id
  from public.conversations
  order by user_a_id, user_b_id, created_at asc
)
update public.messages m
set conversation_id = s.id
from public.conversations old
join survivors s on s.user_a_id = old.user_a_id and s.user_b_id = old.user_b_id
where m.conversation_id = old.id
  and old.id <> s.id;

with survivors as (
  select distinct on (user_a_id, user_b_id) id
  from public.conversations
  order by user_a_id, user_b_id, created_at asc
)
delete from public.conversations c
where c.id not in (select id from survivors);

-- 5. Drop policies that reference the old buyer/seller columns before those
--    columns disappear.
drop policy if exists "Participants can view their conversations" on public.conversations;
drop policy if exists "Buyers can start a conversation" on public.conversations;
drop policy if exists "Participants can view messages in their conversations" on public.messages;
drop policy if exists "Participants can send messages in their conversations" on public.messages;

-- 6. Drop the old per-listing shape and enforce one conversation per pair.
alter table public.conversations
  drop column if exists listing_id,
  drop column if exists buyer_id,
  drop column if exists seller_id;

drop index if exists conversations_buyer_id_idx;
drop index if exists conversations_seller_id_idx;

alter table public.conversations
  add constraint conversations_distinct_participants_check check (user_a_id <> user_b_id),
  add constraint conversations_participant_order_check check (user_a_id < user_b_id),
  add constraint conversations_participants_unique unique (user_a_id, user_b_id);

create index if not exists conversations_user_a_id_idx on public.conversations (user_a_id);
create index if not exists conversations_user_b_id_idx on public.conversations (user_b_id);

-- 7. Recreate access policies against the pair-based participant columns.
-- Conversations (and their first message) are now created together through
-- start_conversation() below, so there is no standalone conversations insert
-- policy for clients.
create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "Participants can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create policy "Participants can send messages in their conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

-- 8. Recompute recipient_id from the pair-based participant columns.
create or replace function public.set_message_recipient()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  participant_a uuid;
  participant_b uuid;
begin
  select user_a_id, user_b_id
  into participant_a, participant_b
  from public.conversations
  where id = new.conversation_id;

  if new.sender_id = participant_a then
    new.recipient_id = participant_b;
  elsif new.sender_id = participant_b then
    new.recipient_id = participant_a;
  else
    raise exception 'Message sender is not a conversation participant';
  end if;

  new.read_at = null;
  return new;
end;
$$;

-- 9. mark_conversation_read now checks the pair-based participant columns.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  ) then
    raise exception 'Conversation not found or access denied';
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and recipient_id = auth.uid()
    and read_at is null;
end;
$$;

-- 10. Atomically find-or-create the conversation with another user and post a
--     message into it, optionally sharing a listing as that message's
--     context. Doing this server-side avoids the race and multi-round-trip
--     dance the client previously needed to look up/create a conversation by
--     hand, and lets the same flow both start a new thread and continue an
--     existing one when contacting someone about a different listing.
create or replace function public.start_conversation(
  p_other_user_id uuid,
  p_body text,
  p_listing_id uuid default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
begin
  if p_other_user_id = auth.uid() then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  v_user_a := least(auth.uid(), p_other_user_id);
  v_user_b := greatest(auth.uid(), p_other_user_id);

  insert into public.conversations (user_a_id, user_b_id)
  values (v_user_a, v_user_b)
  on conflict (user_a_id, user_b_id) do nothing;

  select id into v_conversation_id
  from public.conversations
  where user_a_id = v_user_a and user_b_id = v_user_b;

  insert into public.messages (conversation_id, sender_id, body, listing_id)
  values (v_conversation_id, auth.uid(), p_body, p_listing_id);

  return v_conversation_id;
end;
$$;

revoke all on function public.start_conversation(uuid, text, uuid) from public;
grant execute on function public.start_conversation(uuid, text, uuid) to authenticated;
