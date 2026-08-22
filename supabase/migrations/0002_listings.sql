-- Rental listings ("products"), owned by the authenticated user who
-- posted them. Publicly readable; only the owner can write.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  category_slug text not null,
  governorate text not null,
  price_per_day numeric,
  availability text not null default 'disponible'
    check (availability in ('disponible', 'a-confirmer')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_owner_id_idx on public.listings (owner_id);
create index if not exists listings_category_slug_idx on public.listings (category_slug);
create index if not exists listings_governorate_idx on public.listings (governorate);

alter table public.listings enable row level security;

create policy "Listings are viewable by everyone"
  on public.listings for select
  using (true);

create policy "Users can insert their own listings"
  on public.listings for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own listings"
  on public.listings for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own listings"
  on public.listings for delete
  using (auth.uid() = owner_id);

create or replace function public.handle_listing_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_listing_updated on public.listings;
create trigger on_listing_updated
  before update on public.listings
  for each row execute function public.handle_listing_updated_at();

-- Storage bucket for listing photos, one folder per owner (<owner_id>/<file>).
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "Listing images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Users can upload their own listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own listing images"
  on storage.objects for update
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own listing images"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
