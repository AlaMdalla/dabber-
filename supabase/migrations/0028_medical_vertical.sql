-- Refocuses the marketplace surface around home medical & mobility equipment
-- without touching the rental-request engine or RLS model: additive listing
-- fields for that category, weekly/monthly rates (any category, generic),
-- self-declared account type + admin-reviewable verification, and a
-- best-rate pricing helper used by submit_rental_request.

alter table public.listings
  add column if not exists condition_grade text
    check (condition_grade is null or condition_grade in ('neuf', 'bon_etat', 'use')),
  add column if not exists sanitized_at date,
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists delivery_available boolean not null default false,
  add column if not exists delivery_radius_km numeric
    check (delivery_radius_km is null or delivery_radius_km >= 0),
  add column if not exists price_per_week numeric
    check (price_per_week is null or price_per_week >= 0),
  add column if not exists price_per_month numeric
    check (price_per_month is null or price_per_month >= 0);

alter table public.profiles
  add column if not exists account_type text not null default 'individual'
    check (account_type in ('individual', 'pharmacy', 'clinic'));

-- Verification lives in its own admin-only-writable table, the same pattern
-- as admins/banned_users (0021), rather than a boolean column on profiles:
-- the existing "Users can update their own profile" policy has no
-- column-level restriction, so a plain column here would let a user
-- self-verify. Unlike admins/banned_users this one is publicly SELECTable —
-- it's a trust badge shown to visitors, not internal access-control state.
create table if not exists public.verified_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  verified_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.verified_accounts enable row level security;

create policy "Verification status is public"
  on public.verified_accounts for select
  using (true);

create policy "Admins can verify accounts"
  on public.verified_accounts for insert
  with check (public.is_admin());

create policy "Admins can revoke verification"
  on public.verified_accounts for delete
  using (public.is_admin());

-- Cheapest total across whichever of the three rates a listing has
-- configured, rounding the requested duration UP to the next whole
-- week/month (a partial week/month bills as a full one, standard equipment-
-- rental practice). Mirrored exactly by bestRateTotal() in
-- lib/rentalPricing.ts so the client preview and this server-computed
-- snapshot never diverge. Returns null when no rate at all is configured.
create or replace function public.best_rate_total(
  p_price_day numeric, p_price_week numeric, p_price_month numeric, p_days integer
)
returns numeric
language sql
immutable
as $$
  select min(total) from (
    select p_price_day * p_days as total where p_price_day is not null
    union all
    select p_price_week * ceil(p_days / 7.0) where p_price_week is not null
    union all
    select p_price_month * ceil(p_days / 30.0) where p_price_month is not null
  ) candidates;
$$;

-- Redefines submit_rental_request (0026, not yet applied to any database
-- this session) to price each item with best_rate_total instead of a flat
-- day rate. unit_price still snapshots price_per_day for display continuity
-- even when a week/month rate actually produced the cheaper subtotal.
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
  v_days integer;
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
    select id, name, image_url, price_per_day, price_per_week, price_per_month, owner_id
    into v_listing
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

    v_days := greatest(1, ((v_item->>'end_date')::date - (v_item->>'start_date')::date) + 1);
    v_unit_price := v_listing.price_per_day;
    v_subtotal := public.best_rate_total(
      v_listing.price_per_day, v_listing.price_per_week, v_listing.price_per_month, v_days
    );
    if v_subtotal is not null then
      v_subtotal := v_subtotal * (v_item->>'quantity')::integer;
    end if;
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
