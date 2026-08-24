-- Tracks the recipient and read state of each message so clients can show
-- secure, realtime unread notifications.

alter table public.messages
  add column if not exists recipient_id uuid references public.profiles (id) on delete cascade,
  add column if not exists read_at timestamptz;

update public.messages m
set recipient_id = case
  when m.sender_id = c.buyer_id then c.seller_id
  else c.buyer_id
end
from public.conversations c
where c.id = m.conversation_id
  and m.recipient_id is null;

alter table public.messages
  alter column recipient_id set not null;

create index if not exists messages_unread_recipient_idx
  on public.messages (recipient_id, created_at desc)
  where read_at is null;

create or replace function public.set_message_recipient()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  conversation_buyer uuid;
  conversation_seller uuid;
begin
  select buyer_id, seller_id
  into conversation_buyer, conversation_seller
  from public.conversations
  where id = new.conversation_id;

  if new.sender_id = conversation_buyer then
    new.recipient_id = conversation_seller;
  elsif new.sender_id = conversation_seller then
    new.recipient_id = conversation_buyer;
  else
    raise exception 'Message sender is not a conversation participant';
  end if;

  new.read_at = null;
  return new;
end;
$$;

drop trigger if exists set_message_recipient_before_insert on public.messages;
create trigger set_message_recipient_before_insert
  before insert on public.messages
  for each row execute function public.set_message_recipient();

-- Exposes only the read operation clients need. Direct message updates remain
-- blocked by RLS, preventing recipients from editing message content.
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
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
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

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
