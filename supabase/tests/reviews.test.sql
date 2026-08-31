-- Run with `supabase test db`. Drives a rental request through to
-- `completed` (reusing the same RPCs as rental_handover.test.sql), then
-- covers review submission, the one-shot constraint, the double-blind
-- reveal (via both the reveal-by-both-reviews path and the 14-day-window
-- path), the public aggregate view, and RLS isolation for a stranger.
begin;
create extension if not exists pgtap;
select plan(24);

create or replace function public.rls_test_login(p_user_id uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

create or replace function public.rls_test_logout() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  reset role;
end;
$$;

insert into auth.users (id, email) values
  ('27000000-0000-0000-0000-000000000001', 'rv-owner@example.test'),
  ('27000000-0000-0000-0000-000000000002', 'rv-renter@example.test'),
  ('27000000-0000-0000-0000-000000000003', 'rv-stranger@example.test');

insert into public.listings (id, owner_id, slug, name, category_slug, governorate, price_per_day, total_quantity)
values ('27000000-0000-0000-0000-000000000010', '27000000-0000-0000-0000-000000000001', 'rv-drill', 'Perceuse', 'bricolage', 'Tunis', 5, 10);

-- Drive the rental to `completed`.
select public.rls_test_login('27000000-0000-0000-0000-000000000002');
select public.submit_rental_request(
  '27000000-0000-0000-0000-000000000001'::uuid,
  '[{"listing_id":"27000000-0000-0000-0000-000000000010","quantity":1,"start_date":"2026-09-10","end_date":"2026-09-12"}]'::jsonb,
  null, 'pickup', null, 'rv-key-1'
);
select public.rls_test_logout();

select public.rls_test_login('27000000-0000-0000-0000-000000000001');
select public.accept_rental_request((select id from public.rental_requests where idempotency_key = 'rv-key-1'));
select public.submit_handover_condition((select id from public.rental_requests where idempotency_key = 'rv-key-1'), null, array['rv-key-1/a.webp']);
select public.rls_test_logout();

select public.rls_test_login('27000000-0000-0000-0000-000000000002');
select public.confirm_handover_condition((select id from public.rental_requests where idempotency_key = 'rv-key-1'));
select public.rls_test_logout();

select public.rls_test_login('27000000-0000-0000-0000-000000000001');
select public.confirm_handover_code(
  (select id from public.rental_requests where idempotency_key = 'rv-key-1'),
  (select code from public.rental_handovers h join public.rental_requests r on r.id = h.rental_request_id where r.idempotency_key = 'rv-key-1')
);
select public.submit_return_condition((select id from public.rental_requests where idempotency_key = 'rv-key-1'), 'good', null);
select public.rls_test_logout();

select public.rls_test_login('27000000-0000-0000-0000-000000000002');
select public.confirm_return_code(
  (select id from public.rental_requests where idempotency_key = 'rv-key-1'),
  (select code from public.rental_returns ret join public.rental_requests r on r.id = ret.rental_request_id where r.idempotency_key = 'rv-key-1')
);
select public.rls_test_logout();

select is((select status from public.rental_requests where idempotency_key = 'rv-key-1'), 'completed', 'setup: rental is completed');

-- Renter reviews the owner first.
select public.rls_test_login('27000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.submit_review((select id from public.rental_requests where idempotency_key = 'rv-key-1'), 6, null, array[]::text[])$$,
  'P0001', 'Rating must be between 1 and 5',
  'an out-of-range rating is rejected'
);
select throws_ok(
  $$select public.submit_review((select id from public.rental_requests where idempotency_key = 'rv-key-1'), 5, null, array['returned_on_time'])$$,
  'P0001', 'Invalid tags for an owner review',
  'the server rejects tags for the wrong reviewee role'
);
select throws_ok(
  $$select public.submit_review((select id from public.rental_requests where idempotency_key = 'rv-key-1'), 5, null, array[null]::text[])$$,
  'P0001', 'Review tags cannot contain null values',
  'null tag elements cannot bypass the allow-list constraint'
);
select lives_ok(
  $$select public.submit_review((select id from public.rental_requests where idempotency_key = 'rv-key-1'), 5, 'Great owner', array['item_matched_description','responsive'])$$,
  'the renter can review the owner'
);
select throws_ok(
  $$select public.submit_review((select id from public.rental_requests where idempotency_key = 'rv-key-1'), 4, 'again', array[]::text[])$$,
  'P0001', 'You already reviewed this rental',
  'a second review from the same reviewer is rejected'
);
select public.rls_test_logout();

-- Before the owner has reviewed and before 14 days: the renter's own
-- review is visible to them; a stranger sees nothing.
select public.rls_test_login('27000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.reviews where rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1')), 1, 'the reviewer can see their own pending review');
select public.rls_test_logout();

select public.rls_test_login('27000000-0000-0000-0000-000000000003');
select lives_ok(
  $$select count(*) from public.reviews$$,
  'the review SELECT policy does not recurse into itself'
);
select is((select count(*)::int from public.reviews where rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1')), 0, 'a stranger cannot see an unrevealed review');
select is((select count(*)::int from public.profile_reputation where user_id = '27000000-0000-0000-0000-000000000001'), 0, 'the public aggregate excludes unrevealed reviews');
select public.rls_test_logout();

-- The owner cannot yet see the renter's review either (not revealed to
-- participants until both sides have reviewed, or 14 days pass).
select public.rls_test_login('27000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.reviews where rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1')), 0, 'the other participant cannot see the pending review before reveal');

-- Owner submits their review -- this is the 2nd review, which reveals both.
select lives_ok(
  $$select public.submit_review((select id from public.rental_requests where idempotency_key = 'rv-key-1'), 4, 'Good renter', array['showed_up_as_agreed'])$$,
  'the owner can review the renter'
);
select is((select count(*)::int from public.reviews where rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1')), 2, 'both reviews are now visible to a participant once both exist');
select public.rls_test_logout();

select is((select count(*)::int from public.rental_request_notifications n where n.rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1') and n.type = 'reviews_revealed'), 2, 'both parties notified that reviews are revealed');
select is((select count(*)::int from public.rental_request_notifications n where n.rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1') and n.type = 'review_received'), 2, 'each participant receives exactly one review notification');

select is((select avg_rating from public.profile_reputation where user_id = '27000000-0000-0000-0000-000000000001'), 5.00, 'owner aggregate rating reflects the revealed review');
select is((select review_count from public.profile_reputation where user_id = '27000000-0000-0000-0000-000000000002'), 1::bigint, 'renter aggregate review count reflects the revealed review');

-- A stranger can now see the public aggregate but never the raw rows.
select public.rls_test_login('27000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.reviews where rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1')), 0, 'a stranger still cannot select the raw review rows');
select is((select count(*)::int from public.profile_reputation where user_id = '27000000-0000-0000-0000-000000000001'), 1, 'a stranger can read the public aggregate');
select public.rls_test_logout();

-- Editing: only the reviewer, only within the 48h window (simulated by
-- backdating created_at directly, since we can't wait 48h in a test).
select public.rls_test_login('27000000-0000-0000-0000-000000000001');
select throws_ok(
  $$select public.edit_review((select id from public.reviews where rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1') and reviewer_id = '27000000-0000-0000-0000-000000000002'), 1, 'nope', array[]::text[])$$,
  'P0001', 'Only the reviewer can edit this review',
  'only the original reviewer can edit their review'
);
select public.rls_test_logout();

select public.rls_test_login('27000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.edit_review((select id from public.reviews where rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1') and reviewer_id = '27000000-0000-0000-0000-000000000002'), 3, 'retaliatory edit', array[]::text[])$$,
  'P0001', 'A revealed review can no longer be edited',
  'reviews cannot be edited after both sides are revealed'
);
select public.rls_test_logout();

update public.reviews set created_at = now() - interval '49 hours'
where rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1')
  and reviewer_id = '27000000-0000-0000-0000-000000000002';

select public.rls_test_login('27000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.edit_review((select id from public.reviews where rental_request_id = (select id from public.rental_requests where idempotency_key = 'rv-key-1') and reviewer_id = '27000000-0000-0000-0000-000000000002'), 3, 'changed my mind', array[]::text[])$$,
  'P0001', 'This review can no longer be edited',
  'a review cannot be edited after 48 hours'
);
select public.rls_test_logout();

-- Independent 14-day reveal path: one review becomes visible to the other
-- participant and enters the aggregate even without a counterpart review.
insert into public.rental_requests (
  id, renter_id, owner_id, status, conversation_id, idempotency_key, completed_at
) select
  '27000000-0000-0000-0000-000000000020',
  '27000000-0000-0000-0000-000000000002',
  '27000000-0000-0000-0000-000000000001',
  'completed', conversation_id, 'rv-key-aged', now() - interval '15 days'
from public.rental_requests where idempotency_key = 'rv-key-1';
insert into public.reviews (rental_request_id, reviewer_id, reviewee_id, rating, comment)
values (
  '27000000-0000-0000-0000-000000000020',
  '27000000-0000-0000-0000-000000000002',
  '27000000-0000-0000-0000-000000000001', 3, 'Aged reveal'
);

select public.rls_test_login('27000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.reviews where rental_request_id = '27000000-0000-0000-0000-000000000020'), 1, 'a lone review is revealed to the counterpart after 14 days');
select public.rls_test_logout();
select is((select review_count from public.profile_reputation where user_id = '27000000-0000-0000-0000-000000000001'), 2::bigint, 'the aggregate includes a review revealed by age');

select * from finish();
rollback;
