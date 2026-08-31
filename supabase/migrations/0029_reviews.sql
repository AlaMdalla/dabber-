-- Two-sided reputation: one review per participant per completed rental
-- request. Reviews are double-blind -- a review is only visible to anyone
-- other than its author once the counterpart review also exists, or 14 days
-- after the rental completed, whichever comes first -- so the first
-- reviewer can't see the other side's score before writing their own and
-- shade it in retaliation. This is enforced in RLS (below), not just the
-- UI: there is no public select policy on `reviews` at all, and the public
-- rating aggregate (`profile_reputation`) applies the same reveal rule, so
-- even the numeric average can't leak a pending review's rating early.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  rental_request_id uuid not null references public.rental_requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  tags text[] not null default '{}'
    check (array_position(tags, null) is null and tags <@ array[
      'item_matched_description', 'responsive', 'on_time',
      'returned_on_time', 'took_care_of_item', 'showed_up_as_agreed'
    ]::text[]),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint reviews_distinct_parties_check check (reviewer_id <> reviewee_id),
  constraint reviews_edited_at_check check (edited_at is null or edited_at >= created_at),
  unique (rental_request_id, reviewer_id)
);

create index reviews_reviewee_id_idx on public.reviews (reviewee_id);

alter table public.reviews enable row level security;

-- RLS policies cannot safely query their own table directly: doing so causes
-- "infinite recursion detected in policy". This helper performs the reveal
-- lookup as the table owner while still requiring the caller to be one of the
-- rental participants, so it cannot be used to probe strangers' reviews.
create or replace function public.can_view_revealed_review(
  p_rental_request_id uuid,
  p_review_id uuid
)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.rental_requests r
    where r.id = p_rental_request_id
      and auth.uid() in (r.renter_id, r.owner_id)
      and (
        exists (
          select 1 from public.reviews r2
          where r2.rental_request_id = p_rental_request_id
            and r2.id <> p_review_id
        )
        or now() > r.completed_at + interval '14 days'
      )
  );
$$;

revoke all on function public.can_view_revealed_review(uuid, uuid) from public;
grant execute on function public.can_view_revealed_review(uuid, uuid) to anon, authenticated;

create policy "Reviewer can view their own review"
  on public.reviews for select
  using (auth.uid() = reviewer_id);

create policy "Participants can view revealed reviews"
  on public.reviews for select
  using (public.can_view_revealed_review(rental_request_id, id));

create policy "Admins can view all reviews"
  on public.reviews for select
  using (public.is_admin());

-- No client insert/update/delete policy: every write goes through the RPCs
-- below, same pattern as rental_requests itself.

-- Public, identity-free aggregate -- a plain view (not a table), same
-- pattern as `listing_availability`: the view runs with its owner's
-- privileges, so it can read the RLS-restricted `reviews` rows underneath
-- while only ever exposing the aggregate, never a raw row's content or
-- reveal state.
create view public.profile_reputation as
select
  reviews.reviewee_id as user_id,
  round(avg(reviews.rating)::numeric, 2) as avg_rating,
  count(*) as review_count
from public.reviews
join public.rental_requests r on r.id = reviews.rental_request_id
where (
  exists (
    select 1 from public.reviews r2
    where r2.rental_request_id = reviews.rental_request_id
      and r2.id <> reviews.id
  )
  or now() > r.completed_at + interval '14 days'
)
group by reviews.reviewee_id;

grant select on public.profile_reputation to anon, authenticated;

-- Realtime applies the same SELECT policies, so an INSERT only becomes
-- visible to the counterpart once the reveal rule permits it.
alter publication supabase_realtime add table public.reviews;

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
    'rental_completed',
    'review_received',
    'reviews_revealed'
  ));

-- Either participant of a completed rental reviews the other. One-shot:
-- resubmitting raises rather than overwriting (see edit_review for the
-- narrow 48h edit window instead). Once both sides have reviewed, both are
-- notified that the reviews are now visible.
create or replace function public.submit_review(
  p_rental_request_id uuid,
  p_rating smallint,
  p_comment text,
  p_tags text[]
)
returns public.reviews
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.rental_requests;
  v_reviewee_id uuid;
  v_review public.reviews;
  v_review_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if p_tags is not null and array_position(p_tags, null) is not null then
    raise exception 'Review tags cannot contain null values';
  end if;

  -- Serialize both participants' submissions. Without this lock, two first
  -- reviews can commit concurrently and both observe a count of one, causing
  -- the reveal notifications to be skipped.
  select * into v_request from public.rental_requests
  where id = p_rental_request_id for update;
  if not found then raise exception 'Rental request not found'; end if;
  if v_request.status <> 'completed' then
    raise exception 'You can only review a completed rental';
  end if;

  if auth.uid() = v_request.renter_id then
    v_reviewee_id := v_request.owner_id;
    if not coalesce(p_tags, '{}') <@ array['item_matched_description', 'responsive', 'on_time']::text[] then
      raise exception 'Invalid tags for an owner review';
    end if;
  elsif auth.uid() = v_request.owner_id then
    v_reviewee_id := v_request.renter_id;
    if not coalesce(p_tags, '{}') <@ array['returned_on_time', 'took_care_of_item', 'showed_up_as_agreed']::text[] then
      raise exception 'Invalid tags for a renter review';
    end if;
  else
    raise exception 'You were not part of this rental';
  end if;

  insert into public.reviews (rental_request_id, reviewer_id, reviewee_id, rating, comment, tags)
  values (p_rental_request_id, auth.uid(), v_reviewee_id, p_rating, nullif(trim(p_comment), ''), coalesce(p_tags, '{}'))
  on conflict (rental_request_id, reviewer_id) do nothing
  returning * into v_review;

  if v_review.id is null then
    raise exception 'You already reviewed this rental';
  end if;

  insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
  values (v_reviewee_id, auth.uid(), p_rental_request_id, 'review_received')
  on conflict (rental_request_id, recipient_id, type) do nothing;

  select count(*) into v_review_count from public.reviews where rental_request_id = p_rental_request_id;
  if v_review_count = 2 then
    insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
    values (v_request.renter_id, auth.uid(), p_rental_request_id, 'reviews_revealed')
    on conflict (rental_request_id, recipient_id, type) do nothing;
    insert into public.rental_request_notifications (recipient_id, actor_id, rental_request_id, type)
    values (v_request.owner_id, auth.uid(), p_rental_request_id, 'reviews_revealed')
    on conflict (rental_request_id, recipient_id, type) do nothing;
  end if;

  return v_review;
end;
$$;

revoke all on function public.submit_review(uuid, smallint, text, text[]) from public;
grant execute on function public.submit_review(uuid, smallint, text, text[]) to authenticated;

-- A short grace window to fix a typo or a hasty rating -- not open-ended,
-- so it can't be used to retaliate once the other side's review is
-- revealed and known.
create or replace function public.edit_review(
  p_review_id uuid,
  p_rating smallint,
  p_comment text,
  p_tags text[]
)
returns public.reviews
language plpgsql
security definer set search_path = public
as $$
declare
  v_review public.reviews;
  v_request public.rental_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if p_tags is not null and array_position(p_tags, null) is not null then
    raise exception 'Review tags cannot contain null values';
  end if;

  select * into v_review from public.reviews where id = p_review_id for update;
  if not found then raise exception 'Review not found'; end if;
  if auth.uid() <> v_review.reviewer_id then
    raise exception 'Only the reviewer can edit this review';
  end if;
  if now() > v_review.created_at + interval '48 hours' then
    raise exception 'This review can no longer be edited';
  end if;

  select * into v_request from public.rental_requests
  where id = v_review.rental_request_id for update;
  if exists (
    select 1 from public.reviews r2
    where r2.rental_request_id = v_review.rental_request_id
      and r2.id <> v_review.id
  ) or now() > v_request.completed_at + interval '14 days' then
    raise exception 'A revealed review can no longer be edited';
  end if;

  if auth.uid() = v_request.renter_id then
    if not coalesce(p_tags, '{}') <@ array['item_matched_description', 'responsive', 'on_time']::text[] then
      raise exception 'Invalid tags for an owner review';
    end if;
  elsif auth.uid() = v_request.owner_id then
    if not coalesce(p_tags, '{}') <@ array['returned_on_time', 'took_care_of_item', 'showed_up_as_agreed']::text[] then
      raise exception 'Invalid tags for a renter review';
    end if;
  else
    raise exception 'You were not part of this rental';
  end if;

  update public.reviews
  set rating = p_rating,
      comment = nullif(trim(p_comment), ''),
      tags = coalesce(p_tags, '{}'),
      edited_at = now()
  where id = p_review_id
  returning * into v_review;

  return v_review;
end;
$$;

revoke all on function public.edit_review(uuid, smallint, text, text[]) from public;
grant execute on function public.edit_review(uuid, smallint, text, text[]) to authenticated;

alter publication supabase_realtime add table public.reviews;
