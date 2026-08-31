-- RPCs backing the grouped rental-request lifecycle. The frontend
-- (CartView.tsx, RentalRequestCard.tsx) already calls these by name; this
-- fills them in. Every write to rental_requests / rental_request_items /
-- reservations goes through here (security definer), matching the
-- start_conversation / transition_reservation pattern already used
-- elsewhere -- auth checks live in the function body, and the tables have
-- no client insert/update policy for these columns.

create or replace function public.submit_rental_request(
  p_owner_id uuid,
  p_items jsonb,
  p_message text,
  p_fulfillment_method text,
  p_delivery_address text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_existing_id uuid;
  v_request_id uuid;
  v_conversation_id uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_item jsonb;
  v_listing record;
  v_reservation_id uuid;
  v_unit_price numeric;
  v_subtotal numeric;
  v_estimated_total numeric := 0;
  v_item_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if auth.uid() = p_owner_id then
    raise exception 'Cannot request your own listing';
  end if;
  if p_fulfillment_method not in ('pickup', 'delivery') then
    raise exception 'Invalid fulfillment method';
  end if;
  if p_fulfillment_method = 'delivery' and coalesce(trim(p_delivery_address), '') = '' then
    raise exception 'Delivery address is required';
  end if;

  select id into v_existing_id
  from public.rental_requests
  where renter_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    return v_existing_id;
  end if;

  v_user_a := least(auth.uid(), p_owner_id);
  v_user_b := greatest(auth.uid(), p_owner_id);
  insert into public.conversations (user_a_id, user_b_id)
  values (v_user_a, v_user_b)
  on conflict (user_a_id, user_b_id) do nothing;
  select id into v_conversation_id from public.conversations
  where user_a_id = v_user_a and user_b_id = v_user_b;

  insert into public.rental_requests (
    renter_id, owner_id, renter_message, fulfillment_method, delivery_address,
    conversation_id, idempotency_key, estimated_total
  ) values (
    auth.uid(), p_owner_id, nullif(trim(p_message), ''), p_fulfillment_method,
    case when p_fulfillment_method = 'delivery' then trim(p_delivery_address) else null end,
    v_conversation_id, p_idempotency_key, 0
  ) returning id into v_request_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, name, image_url, price_per_day, owner_id into v_listing
    from public.listings
    where id = (v_item->>'listing_id')::uuid;

    if not found then
      raise exception 'Listing not found';
    end if;
    if v_listing.owner_id <> p_owner_id then
      raise exception 'All items in one rental request must belong to the same owner';
    end if;

    insert into public.reservations (listing_id, renter_id, start_date, end_date, quantity)
    values (
      v_listing.id, auth.uid(),
      (v_item->>'start_date')::date, (v_item->>'end_date')::date,
      (v_item->>'quantity')::integer
    ) returning id into v_reservation_id;

    v_unit_price := v_listing.price_per_day;
    v_subtotal := case when v_unit_price is null then null
      else v_unit_price * (v_item->>'quantity')::integer *
        greatest(1, ((v_item->>'end_date')::date - (v_item->>'start_date')::date) + 1)
      end;
    v_estimated_total := v_estimated_total + coalesce(v_subtotal, 0);
    v_item_count := v_item_count + 1;

    insert into public.rental_request_items (
      rental_request_id, listing_id, reservation_id, quantity, start_date, end_date,
      unit_price, listing_title, listing_image_url, subtotal
    ) values (
      v_request_id, v_listing.id, v_reservation_id, (v_item->>'quantity')::integer,
      (v_item->>'start_date')::date, (v_item->>'end_date')::date,
      v_unit_price, v_listing.name, v_listing.image_url, v_subtotal
    );
  end loop;

  if v_item_count = 0 then
    raise exception 'A rental request needs at least one item';
  end if;

  update public.rental_requests set estimated_total = v_estimated_total where id = v_request_id;

  insert into public.messages (conversation_id, sender_id, body, message_type, rental_request_id)
  values (v_conversation_id, auth.uid(), 'Nouvelle demande de location.', 'rental_request', v_request_id);

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (p_owner_id, auth.uid(), v_request_id, 'rental_request_submitted');

  return v_request_id;
end;
$$;

revoke all on function public.submit_rental_request(uuid, jsonb, text, text, text, text) from public;
grant execute on function public.submit_rental_request(uuid, jsonb, text, text, text, text) to authenticated;

create or replace function public.accept_rental_request(p_request_id uuid)
returns public.rental_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.rental_requests;
  v_item public.rental_request_items;
  v_group record;
  v_available integer;
  v_listing_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_request from public.rental_requests where id = p_request_id for update;
  if not found then raise exception 'Rental request not found'; end if;
  if auth.uid() <> v_request.owner_id then
    raise exception 'Only the owner can accept this request';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This request can no longer be accepted';
  end if;

  -- A request can hold several items against the same listing (different
  -- date ranges). available_quantity is a single global counter, not
  -- date-partitioned, so it's the COMBINED quantity per listing that must
  -- fit -- checking each item independently would let two items that
  -- individually fit still jointly oversell. Locking each distinct listing
  -- row (in a stable order, to avoid deadlocking against a concurrent
  -- accept touching the same listings in a different request) also
  -- serializes concurrent accept_rental_request calls racing for the same
  -- stock: the loser sees the loser's own accurate, already-decremented
  -- available_quantity once the winner commits.
  for v_group in
    select listing_id, sum(quantity) as required_quantity
    from public.rental_request_items
    where rental_request_id = p_request_id
    group by listing_id
    order by listing_id
  loop
    select available_quantity, name into v_available, v_listing_name
    from public.listings where id = v_group.listing_id for update;

    if v_available < v_group.required_quantity then
      raise exception 'Not enough availability for %: % requested, only % available',
        v_listing_name, v_group.required_quantity, v_available;
    end if;
  end loop;

  for v_item in select * from public.rental_request_items where rental_request_id = p_request_id
  loop
    update public.reservations set status = 'confirmed' where id = v_item.reservation_id;
  end loop;

  update public.rental_requests
  set status = 'accepted', accepted_at = now(), confirmed_total = estimated_total
  where id = p_request_id
  returning * into v_request;

  insert into public.messages (conversation_id, sender_id, body, message_type, rental_request_id, status_event_type)
  values (v_request.conversation_id, auth.uid(), 'Demande de location acceptée.', 'status_event', p_request_id, 'accepted');

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (v_request.renter_id, auth.uid(), p_request_id, 'rental_request_accepted');

  return v_request;
end;
$$;

revoke all on function public.accept_rental_request(uuid) from public;
grant execute on function public.accept_rental_request(uuid) to authenticated;

create or replace function public.reject_rental_request(p_request_id uuid)
returns public.rental_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.rental_requests;
  v_item public.rental_request_items;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_request from public.rental_requests where id = p_request_id for update;
  if not found then raise exception 'Rental request not found'; end if;
  if auth.uid() <> v_request.owner_id then
    raise exception 'Only the owner can reject this request';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This request can no longer be rejected';
  end if;

  for v_item in select * from public.rental_request_items where rental_request_id = p_request_id
  loop
    update public.reservations set status = 'declined' where id = v_item.reservation_id;
  end loop;

  update public.rental_requests
  set status = 'rejected', rejected_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into public.messages (conversation_id, sender_id, body, message_type, rental_request_id, status_event_type)
  values (v_request.conversation_id, auth.uid(), 'Demande de location refusée.', 'status_event', p_request_id, 'rejected');

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (v_request.renter_id, auth.uid(), p_request_id, 'rental_request_rejected');

  return v_request;
end;
$$;

revoke all on function public.reject_rental_request(uuid) from public;
grant execute on function public.reject_rental_request(uuid) to authenticated;

-- Renter may cancel a pending or accepted request (accepted keeps the same
-- 3-day-before-start cutoff reservations already use). Owner may only cancel
-- once accepted -- a pending request must be explicitly rejected, not
-- cancelled, so the renter always sees a real decision. Neither party can
-- cancel once the rental is active or beyond: that's what return/dispute
-- are for.
create or replace function public.cancel_rental_request(p_request_id uuid)
returns public.rental_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.rental_requests;
  v_item public.rental_request_items;
  v_min_start date;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_request from public.rental_requests where id = p_request_id for update;
  if not found then raise exception 'Rental request not found'; end if;
  if auth.uid() not in (v_request.renter_id, v_request.owner_id) then
    raise exception 'You cannot cancel this request';
  end if;
  if v_request.status not in ('pending', 'accepted') then
    raise exception 'This request can no longer be cancelled';
  end if;
  if v_request.status = 'pending' and auth.uid() <> v_request.renter_id then
    raise exception 'Owners must decline pending requests, not cancel them';
  end if;

  if v_request.status = 'accepted' and auth.uid() = v_request.renter_id then
    select min(start_date) into v_min_start
    from public.rental_request_items where rental_request_id = p_request_id;
    if v_min_start < current_date + 3 then
      raise exception 'Online cancellation closes three days before the start date';
    end if;
  end if;

  for v_item in select * from public.rental_request_items where rental_request_id = p_request_id
  loop
    update public.reservations set status = 'cancelled' where id = v_item.reservation_id;
  end loop;

  update public.rental_requests
  set status = 'cancelled', cancelled_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into public.messages (conversation_id, sender_id, body, message_type, rental_request_id, status_event_type)
  values (v_request.conversation_id, auth.uid(), 'Demande de location annulée.', 'status_event', p_request_id, 'cancelled');

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (
    case when auth.uid() = v_request.renter_id then v_request.owner_id else v_request.renter_id end,
    auth.uid(), p_request_id, 'rental_request_cancelled'
  );

  return v_request;
end;
$$;

revoke all on function public.cancel_rental_request(uuid) from public;
grant execute on function public.cancel_rental_request(uuid) to authenticated;
