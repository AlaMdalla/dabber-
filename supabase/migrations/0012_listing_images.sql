-- Ordered gallery images for listings. Keep listings.image_url as the cover
-- image so existing cards and integrations remain backwards compatible.

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  image_url text not null,
  storage_path text unique,
  position smallint not null check (position between 0 and 4),
  created_at timestamptz not null default now(),
  unique (listing_id, position)
);

create index if not exists listing_images_listing_id_idx
  on public.listing_images (listing_id);

alter table public.listing_images enable row level security;

create policy "Listing images are viewable by everyone"
  on public.listing_images for select
  using (true);

create policy "Owners can add images to their listings"
  on public.listing_images for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.owner_id = auth.uid()
    )
  );

create policy "Owners can update their listing images"
  on public.listing_images for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.owner_id = auth.uid()
    )
  );

create policy "Owners can delete their listing images"
  on public.listing_images for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id and l.owner_id = auth.uid()
    )
  );

-- Give existing single-image listings an initial gallery row. Their exact
-- Storage path was not stored historically, so storage_path remains null.
insert into public.listing_images (listing_id, image_url, position)
select id, image_url, 0
from public.listings
where image_url is not null
on conflict (listing_id, position) do nothing;

-- Reject oversized/unexpected originals at Storage as a second line of
-- defence. The client compresses images further before upload.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'listing-images';

