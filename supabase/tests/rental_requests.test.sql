-- Run with `supabase test db`. Covers the grouped rental request flow:
-- submission (with snapshots + idempotency), cross-owner/availability
-- rejection, RLS isolation, and the accept/reject/cancel lifecycle. What
-- happens to an accepted request (handover, active, return, completion)
-- is covered separately in rental_handover.test.sql.
begin;
create extension if not exists pgtap;
select plan(34);

-- Sets both the legacy per-claim and current JSON-blob JWT GUCs (auth.uid()
-- reads whichever is present) and switches to the `authenticated` role so
-- RLS is actually enforced for the assertions below, mirroring how
-- PostgREST executes a real request.
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
  ('24000000-0000-0000-0000-000000000001', 'rr-owner-a@example.test'),
  ('24000000-0000-0000-0000-000000000002', 'rr-renter@example.test'),
  ('24000000-0000-0000-0000-000000000003', 'rr-owner-b@example.test'),
  ('24000000-0000-0000-0000-000000000004', 'rr-stranger@example.test');

insert into public.listings (id, owner_id, slug, name, category_slug, governorate, price_per_day, total_quantity)
values
  ('24000000-0000-0000-0000-000000000010', '24000000-0000-0000-0000-000000000001', 'rr-chairs', 'White chairs', 'evenementiel', 'Tunis', 2, 25),
  ('24000000-0000-0000-0000-000000000011', '24000000-0000-0000-0000-000000000001', 'rr-tables', 'Tables', 'evenementiel', 'Tunis', 10, 6),
  ('24000000-0000-0000-0000-000000000012', '24000000-0000-0000-0000-000000000003', 'rr-other-owner', 'Other owner item', 'evenementiel', 'Tunis', 5, 2);

-- Submission as the renter, two items from owner A.
select public.rls_test_login('24000000-0000-0000-0000-000000000002');

select lives_ok(
  $$select public.submit_rental_request(
    '24000000-0000-0000-0000-000000000001'::uuid,
    '[
      {"listing_id":"24000000-0000-0000-0000-000000000010","quantity":20,"start_date":"2026-09-10","end_date":"2026-09-12"},
      {"listing_id":"24000000-0000-0000-0000-000000000011","quantity":4,"start_date":"2026-09-10","end_date":"2026-09-12"}
    ]'::jsonb,
    'Please deliver before 4pm',
    'delivery',
    '12 rue de la Paix',
    'idem-key-1'
  )$$,
  'submitting a grouped request from one owner succeeds'
);

select public.rls_test_logout();

select is((select count(*)::int from public.rental_requests where idempotency_key = 'idem-key-1'), 1, 'exactly one rental request created');
select is((select status from public.rental_requests where idempotency_key = 'idem-key-1'), 'pending', 'new request is pending');
select is((select renter_id from public.rental_requests where idempotency_key = 'idem-key-1'), '24000000-0000-0000-0000-000000000002', 'renter recorded correctly');
select is((select owner_id from public.rental_requests where idempotency_key = 'idem-key-1'), '24000000-0000-0000-0000-000000000001', 'owner recorded correctly');
select is((select estimated_total from public.rental_requests where idempotency_key = 'idem-key-1'), 240::numeric, 'estimated total computed server-side (20*2*3 + 4*10*3)');
select is((select count(*)::int from public.rental_request_items i join public.rental_requests r on r.id = i.rental_request_id where r.idempotency_key = 'idem-key-1'), 2, 'two line items created');
select is((select count(*)::int from public.reservations r join public.rental_request_items i on i.reservation_id = r.id join public.rental_requests rr on rr.id = i.rental_request_id where rr.idempotency_key = 'idem-key-1' and r.status = 'pending'), 2, 'two backing pending reservations created');
select is((select count(*)::int from public.messages m join public.rental_requests r on r.id = m.rental_request_id where r.idempotency_key = 'idem-key-1' and m.message_type = 'rental_request'), 1, 'exactly one structured rental_request message created');
select is((select count(*)::int from public.conversations c join public.rental_requests r on r.conversation_id = c.id where r.idempotency_key = 'idem-key-1'), 1, 'a conversation exists between renter and owner');
select is((select count(*)::int from public.rental_request_notifications n join public.rental_requests r on r.id = n.rental_request_id where r.idempotency_key = 'idem-key-1' and n.type = 'rental_request_submitted' and n.recipient_id = '24000000-0000-0000-0000-000000000001'), 1, 'owner gets a submission notification');

-- Snapshots survive a later listing edit.
update public.listings set name = 'Renamed chairs', price_per_day = 999 where id = '24000000-0000-0000-0000-000000000010';
select is((select listing_title from public.rental_request_items i join public.rental_requests r on r.id = i.rental_request_id where r.idempotency_key = 'idem-key-1' and i.listing_id = '24000000-0000-0000-0000-000000000010'), 'White chairs', 'listing title snapshot is immune to later renames');
select is((select unit_price from public.rental_request_items i join public.rental_requests r on r.id = i.rental_request_id where r.idempotency_key = 'idem-key-1' and i.listing_id = '24000000-0000-0000-0000-000000000010'), 2::numeric, 'unit price snapshot is immune to later price changes');

-- Idempotent resubmission: same key returns the same request, no duplicates.
select public.rls_test_login('24000000-0000-0000-0000-000000000002');
select is(
  (select public.submit_rental_request(
    '24000000-0000-0000-0000-000000000001'::uuid,
    '[{"listing_id":"24000000-0000-0000-0000-000000000010","quantity":1,"start_date":"2026-09-10","end_date":"2026-09-12"}]'::jsonb,
    null, 'pickup', null, 'idem-key-1'
  ))::uuid,
  (select id from public.rental_requests where idempotency_key = 'idem-key-1'),
  'resubmitting the same idempotency key returns the existing request'
);
select public.rls_test_logout();
select is((select count(*)::int from public.rental_requests where idempotency_key = 'idem-key-1'), 1, 'idempotent retry created no duplicate request');
select is((select count(*)::int from public.rental_request_items i join public.rental_requests r on r.id = i.rental_request_id where r.idempotency_key = 'idem-key-1'), 2, 'idempotent retry created no duplicate items');
select is((select count(*)::int from public.messages m join public.rental_requests r on r.id = m.rental_request_id where r.idempotency_key = 'idem-key-1' and m.message_type = 'rental_request'), 1, 'idempotent retry created no duplicate structured message');

-- Cross-owner cart is rejected, and nothing from it is persisted.
select public.rls_test_login('24000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.submit_rental_request(
    '24000000-0000-0000-0000-000000000001'::uuid,
    '[{"listing_id":"24000000-0000-0000-0000-000000000012","quantity":1,"start_date":"2026-09-10","end_date":"2026-09-12"}]'::jsonb,
    null, 'pickup', null, 'idem-key-cross-owner'
  )$$,
  'P0001', 'All items in one rental request must belong to the same owner',
  'a listing belonging to a different owner is rejected'
);
select public.rls_test_logout();
select is((select count(*)::int from public.rental_requests where idempotency_key = 'idem-key-cross-owner'), 0, 'rejected cross-owner submission left no rental request behind');

-- An unavailable quantity aborts the entire submission, not just that item.
select public.rls_test_login('24000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.submit_rental_request(
    '24000000-0000-0000-0000-000000000001'::uuid,
    '[
      {"listing_id":"24000000-0000-0000-0000-000000000011","quantity":1,"start_date":"2026-10-01","end_date":"2026-10-02"},
      {"listing_id":"24000000-0000-0000-0000-000000000010","quantity":999,"start_date":"2026-10-01","end_date":"2026-10-02"}
    ]'::jsonb,
    null, 'pickup', null, 'idem-key-unavailable'
  )$$,
  'P0001', null,
  'an unavailable item aborts the whole submission'
);
select public.rls_test_logout();
select is((select count(*)::int from public.rental_requests where idempotency_key = 'idem-key-unavailable'), 0, 'nothing was persisted from the aborted submission (no partial items)');
select is((select count(*)::int from public.reservations where listing_id = '24000000-0000-0000-0000-000000000011' and start_date = '2026-10-01'), 0, 'no orphan reservation from the aborted submission either');

-- RLS: an unrelated third party cannot see the request or its items.
select public.rls_test_login('24000000-0000-0000-0000-000000000004');
select is((select count(*)::int from public.rental_requests where idempotency_key = 'idem-key-1'), 0, 'a stranger cannot select the rental request');
select is((select count(*)::int from public.rental_request_items i join public.rental_requests r on r.id = i.rental_request_id where r.idempotency_key = 'idem-key-1'), 0, 'a stranger cannot select the rental request items');
select public.rls_test_logout();

-- Full lifecycle: reject a second request, accept+complete a third.
insert into public.listings (id, owner_id, slug, name, category_slug, governorate, price_per_day, total_quantity)
values ('24000000-0000-0000-0000-000000000013', '24000000-0000-0000-0000-000000000001', 'rr-speakers', 'Speakers', 'evenementiel', 'Tunis', 15, 4);

select public.rls_test_login('24000000-0000-0000-0000-000000000002');
select public.submit_rental_request(
  '24000000-0000-0000-0000-000000000001'::uuid,
  '[{"listing_id":"24000000-0000-0000-0000-000000000013","quantity":1,"start_date":"2026-09-15","end_date":"2026-09-16"}]'::jsonb,
  null, 'pickup', null, 'idem-key-reject'
);
select public.submit_rental_request(
  '24000000-0000-0000-0000-000000000001'::uuid,
  '[{"listing_id":"24000000-0000-0000-0000-000000000013","quantity":2,"start_date":"2026-09-20","end_date":"2026-09-21"}]'::jsonb,
  null, 'pickup', null, 'idem-key-accept'
);
select public.rls_test_logout();

-- Only the owner can reject/accept; the renter is rejected by the RPC.
select public.rls_test_login('24000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.reject_rental_request((select id from public.rental_requests where idempotency_key = 'idem-key-reject'))$$,
  'P0001', 'Only the owner can reject this request',
  'the renter cannot reject their own request'
);
select public.rls_test_logout();

select public.rls_test_login('24000000-0000-0000-0000-000000000001');
select lives_ok(
  $$select public.reject_rental_request((select id from public.rental_requests where idempotency_key = 'idem-key-reject'))$$,
  'the owner can reject a pending request'
);
select public.rls_test_logout();
select is((select status from public.rental_requests where idempotency_key = 'idem-key-reject'), 'rejected', 'rejected request is marked rejected');
select is((select available_quantity from public.listings where id = '24000000-0000-0000-0000-000000000013'), 4, 'rejecting never touches stock');
select is((select count(*)::int from public.messages m join public.rental_requests r on r.id = m.rental_request_id where r.idempotency_key = 'idem-key-reject' and m.message_type = 'status_event' and m.status_event_type = 'rejected'), 1, 'exactly one status_event message for the rejection');

select public.rls_test_login('24000000-0000-0000-0000-000000000001');
select lives_ok(
  $$select public.accept_rental_request((select id from public.rental_requests where idempotency_key = 'idem-key-accept'))$$,
  'the owner can accept a pending request'
);
select public.rls_test_logout();
select is((select available_quantity from public.listings where id = '24000000-0000-0000-0000-000000000013'), 2, 'accepting decrements stock by the accepted quantity');

-- Regression: two items in the same request against the same listing (with
-- different date ranges) must be checked by their COMBINED quantity, not
-- independently -- available_quantity is a single global counter, not
-- date-partitioned. Neither item alone exceeds stock, but together they do.
insert into public.listings (id, owner_id, slug, name, category_slug, governorate, price_per_day, total_quantity)
values ('24000000-0000-0000-0000-000000000014', '24000000-0000-0000-0000-000000000001', 'rr-projectors', 'Projectors', 'evenementiel', 'Tunis', 8, 5);

select public.rls_test_login('24000000-0000-0000-0000-000000000002');
select public.submit_rental_request(
  '24000000-0000-0000-0000-000000000001'::uuid,
  '[
    {"listing_id":"24000000-0000-0000-0000-000000000014","quantity":3,"start_date":"2026-11-01","end_date":"2026-11-02"},
    {"listing_id":"24000000-0000-0000-0000-000000000014","quantity":3,"start_date":"2026-11-10","end_date":"2026-11-11"}
  ]'::jsonb,
  null, 'pickup', null, 'idem-key-same-listing'
);
select public.rls_test_logout();

select public.rls_test_login('24000000-0000-0000-0000-000000000001');
select throws_ok(
  $$select public.accept_rental_request((select id from public.rental_requests where idempotency_key = 'idem-key-same-listing'))$$,
  'P0001', 'Not enough availability for Projectors: 6 requested, only 5 available',
  'combined quantity across two items on the same listing is checked, not each item independently'
);
select public.rls_test_logout();
select is((select available_quantity from public.listings where id = '24000000-0000-0000-0000-000000000014'), 5, 'a failed combined-quantity check leaves stock untouched (no partial decrement)');
select is((select status from public.rental_requests where idempotency_key = 'idem-key-same-listing'), 'pending', 'the request stays pending, not partially accepted');

select * from finish();
rollback;
