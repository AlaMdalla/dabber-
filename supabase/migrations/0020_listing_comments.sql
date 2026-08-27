-- Comments belong to both the listing and the author so they disappear when
-- either the post or the user's account is deleted.
create table if not exists public.listing_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_comments_listing_created_idx
  on public.listing_comments (listing_id, created_at);

alter table public.listing_comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.listing_comments for select
  using (true);

create policy "Users can add comments"
  on public.listing_comments for insert
  with check (auth.uid() = author_id);

create policy "Users can delete their own comments"
  on public.listing_comments for delete
  using (auth.uid() = author_id);

create or replace function public.handle_listing_comment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_listing_comment_updated on public.listing_comments;
create trigger on_listing_comment_updated
  before update on public.listing_comments
  for each row execute function public.handle_listing_comment_updated_at();