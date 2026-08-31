-- Grouped rental requests: a renter can request several listings from the
-- same owner in one go. Each line item ("rental_request_items") owns exactly
-- one row in the existing `reservations` table, which stays the sole
-- inventory engine (stock trigger, overlap/blocked-date checks, the
-- inventory_restored double-restore guard) -- this table is purely a
-- grouping/snapshot wrapper around that machinery, not a second stock system.

create table if not exists public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  renter_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
  renter_message text check (renter_message is null or char_length(renter_message) <= 1000),
  fulfillment_method text not null default 'pickup'
    check (fulfillment_method in ('pickup', 'delivery')),
  delivery_address text,
  currency text not null default 'TND',
  estimated_total numeric,
  confirmed_total numeric,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  constraint rental_requests_distinct_parties_check check (renter_id <> owner_id),
  constraint rental_requests_delivery_address_check check (
    fulfillment_method <> 'delivery' or delivery_address is not null
  ),
  constraint rental_requests_idempotency_key_unique unique (renter_id, idempotency_key)
);

create index if not exists rental_requests_renter_id_idx on public.rental_requests (renter_id);
create index if not exists rental_requests_owner_id_idx on public.rental_requests (owner_id);
create index if not exists rental_requests_status_idx on public.rental_requests (status);
create index if not exists rental_requests_conversation_id_idx
  on public.rental_requests (conversation_id);

alter table public.rental_requests enable row level security;

-- No client insert/update/delete policy: every write goes through the
-- SECURITY DEFINER RPCs in 0025_rental_request_rpcs.sql, which run as the
-- table-owning role and so bypass RLS entirely -- the same mechanism
-- `start_conversation` already relies on for `conversations`. This is what
-- makes owner/status/total forgery from the client impossible.
create policy "Renter and owner can view a rental request"
  on public.rental_requests for select
  using (auth.uid() = renter_id or auth.uid() = owner_id);

create or replace function public.handle_rental_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_rental_request_updated on public.rental_requests;
create trigger on_rental_request_updated
  before update on public.rental_requests
  for each row execute function public.handle_rental_request_updated_at();

create table if not exists public.rental_request_items (
  id uuid primary key default gen_random_uuid(),
  rental_request_id uuid not null references public.rental_requests (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  quantity integer not null check (quantity >= 1),
  start_date date not null,
  end_date date not null,
  unit_price numeric,
  listing_title text not null,
  listing_image_url text,
  subtotal numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_request_items_date_range_check check (end_date >= start_date),
  constraint rental_request_items_reservation_id_unique unique (reservation_id)
);

create index if not exists rental_request_items_rental_request_id_idx
  on public.rental_request_items (rental_request_id);
create index if not exists rental_request_items_listing_id_idx
  on public.rental_request_items (listing_id);
create index if not exists rental_request_items_reservation_id_idx
  on public.rental_request_items (reservation_id);

alter table public.rental_request_items enable row level security;

create policy "Renter and owner can view rental request items"
  on public.rental_request_items for select
  using (
    exists (
      select 1 from public.rental_requests r
      where r.id = rental_request_items.rental_request_id
        and (auth.uid() = r.renter_id or auth.uid() = r.owner_id)
    )
  );

drop trigger if exists on_rental_request_item_updated on public.rental_request_items;
create trigger on_rental_request_item_updated
  before update on public.rental_request_items
  for each row execute function public.handle_rental_request_updated_at();
