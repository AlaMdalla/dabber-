-- Run with `supabase test db`. Covers what happens to an accepted rental
-- request: handover condition report -> renter confirmation -> handover
-- code -> active -> return condition -> return code -> completed. Also
-- covers the wrong-actor/wrong-code/wrong-state guards and RLS isolation
-- for the three new tables. Submission/accept/reject/cancel themselves are
-- covered by rental_requests.test.sql.
begin;
create extension if not exists pgtap;
select plan(34);

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
  ('26000000-0000-0000-0000-000000000001', 'ho-owner@example.test'),
  ('26000000-0000-0000-0000-000000000002', 'ho-renter@example.test'),
  ('26000000-0000-0000-0000-000000000003', 'ho-stranger@example.test');

insert into public.listings (id, owner_id, slug, name, category_slug, governorate, price_per_day, total_quantity)
values ('26000000-0000-0000-0000-000000000010', '26000000-0000-0000-0000-000000000001', 'ho-drill', 'Perceuse', 'bricolage', 'Tunis', 5, 10);

select public.rls_test_login('26000000-0000-0000-0000-000000000002');
select public.submit_rental_request(
  '26000000-0000-0000-0000-000000000001'::uuid,
  '[{"listing_id":"26000000-0000-0000-0000-000000000010","quantity":2,"start_date":"2026-09-10","end_date":"2026-09-12"}]'::jsonb,
  null, 'pickup', null, 'ho-key-1'
);
select public.rls_test_logout();

select public.rls_test_login('26000000-0000-0000-0000-000000000001');
select public.accept_rental_request((select id from public.rental_requests where idempotency_key = 'ho-key-1'));
select public.rls_test_logout();

-- Wrong actor / wrong state guards on the handover condition report.
select public.rls_test_login('26000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.submit_handover_condition((select id from public.rental_requests where idempotency_key = 'ho-key-1'), 'looks fine', array['ho-key-1/a.webp'])$$,
  'P0001', 'Only the owner can record the handover condition',
  'the renter cannot submit the handover condition'
);
select public.rls_test_logout();

select public.rls_test_login('26000000-0000-0000-0000-000000000001');
select throws_ok(
  $$select public.submit_handover_condition((select id from public.rental_requests where idempotency_key = 'ho-key-1'), null, array[]::text[])$$,
  'P0001', 'Add at least one photo',
  'submitting with no photos is rejected'
);

select lives_ok(
  $$select public.submit_handover_condition((select id from public.rental_requests where idempotency_key = 'ho-key-1'), 'Petite rayure sur le côté.', array['ho-key-1/a.webp'])$$,
  'the owner can submit the handover condition report'
);
select public.rls_test_logout();

select is((select condition_note from public.rental_handovers h join public.rental_requests r on r.id = h.rental_request_id where r.idempotency_key = 'ho-key-1'), 'Petite rayure sur le côté.', 'condition note stored');
select is((select owner_submitted_at is not null from public.rental_handovers h join public.rental_requests r on r.id = h.rental_request_id where r.idempotency_key = 'ho-key-1'), true, 'owner_submitted_at stamped');
select is((select char_length(code) from public.rental_handovers h join public.rental_requests r on r.id = h.rental_request_id where r.idempotency_key = 'ho-key-1'), 4, 'a 4-digit handover code was generated');
select is((select count(*)::int from public.rental_handover_photos p join public.rental_handovers h on h.id = p.handover_id join public.rental_requests r on r.id = h.rental_request_id where r.idempotency_key = 'ho-key-1'), 1, 'one handover photo recorded');
select is((select count(*)::int from public.rental_request_notifications n join public.rental_requests r on r.id = n.rental_request_id where r.idempotency_key = 'ho-key-1' and n.type = 'handover_condition_submitted' and n.recipient_id = '26000000-0000-0000-0000-000000000002'), 1, 'renter notified of the condition report');

-- The owner cannot confirm the handover code before the renter has
-- confirmed the condition, and only the renter may confirm it.
select public.rls_test_login('26000000-0000-0000-0000-000000000001');
select throws_ok(
  $$select public.confirm_handover_code((select id from public.rental_requests where idempotency_key = 'ho-key-1'), '0000')$$,
  'P0001', 'The renter has not confirmed the item condition yet',
  'the handover code cannot be confirmed before the renter accepts the condition'
);
select throws_ok(
  $$select public.confirm_handover_condition((select id from public.rental_requests where idempotency_key = 'ho-key-1'))$$,
  'P0001', 'Only the renter can confirm this',
  'the owner cannot confirm their own condition report'
);
select public.rls_test_logout();

select public.rls_test_login('26000000-0000-0000-0000-000000000002');
select lives_ok(
  $$select public.confirm_handover_condition((select id from public.rental_requests where idempotency_key = 'ho-key-1'))$$,
  'the renter can confirm the condition report'
);
select lives_ok(
  $$select public.confirm_handover_condition((select id from public.rental_requests where idempotency_key = 'ho-key-1'))$$,
  'confirming twice is a harmless no-op'
);
select public.rls_test_logout();
select is((select renter_confirmed_at is not null from public.rental_handovers h join public.rental_requests r on r.id = h.rental_request_id where r.idempotency_key = 'ho-key-1'), true, 'renter_confirmed_at stamped');

-- The handover code itself: wrong code rejected, correct code starts the
-- rental.
select public.rls_test_login('26000000-0000-0000-0000-000000000001');
select throws_ok(
  $$select public.confirm_handover_code((select id from public.rental_requests where idempotency_key = 'ho-key-1'), 'XXXX')$$,
  'P0001', 'Incorrect code',
  'a wrong handover code is rejected'
);
select lives_ok(
  $$select public.confirm_handover_code(
    (select id from public.rental_requests where idempotency_key = 'ho-key-1'),
    (select code from public.rental_handovers h join public.rental_requests r on r.id = h.rental_request_id where r.idempotency_key = 'ho-key-1')
  )$$,
  'the correct handover code starts the rental'
);
select public.rls_test_logout();
select is((select status from public.rental_requests where idempotency_key = 'ho-key-1'), 'active', 'rental is now active');
select is((select active_at is not null from public.rental_requests where idempotency_key = 'ho-key-1'), true, 'active_at stamped');
select is((select count(*)::int from public.messages m join public.rental_requests r on r.id = m.rental_request_id where r.idempotency_key = 'ho-key-1' and m.status_event_type = 'active'), 1, 'exactly one status_event message for going active');

-- An active rental can no longer be cancelled online -- that's what the
-- return flow (or a later dispute) is for.
select public.rls_test_login('26000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.cancel_rental_request((select id from public.rental_requests where idempotency_key = 'ho-key-1'))$$,
  'P0001', 'This request can no longer be cancelled',
  'an active rental cannot be cancelled'
);
select public.rls_test_logout();

-- Return: owner records condition, renter confirms with the return code.
select public.rls_test_login('26000000-0000-0000-0000-000000000001');
select throws_ok(
  $$select public.submit_return_condition((select id from public.rental_requests where idempotency_key = 'ho-key-1'), 'bad', null)$$,
  'P0001', 'Invalid condition status',
  'an unknown condition status is rejected'
);
select lives_ok(
  $$select public.submit_return_condition((select id from public.rental_requests where idempotency_key = 'ho-key-1'), 'issue', 'Chargeur manquant.')$$,
  'the owner can record the return condition'
);
select public.rls_test_logout();
select is((select status from public.rental_requests where idempotency_key = 'ho-key-1'), 'return_pending', 'rental is now awaiting return confirmation');

select public.rls_test_login('26000000-0000-0000-0000-000000000001');
select throws_ok(
  $$select public.confirm_return_code((select id from public.rental_requests where idempotency_key = 'ho-key-1'), '0000')$$,
  'P0001', 'Only the renter can confirm the return',
  'the owner cannot confirm their own return record'
);
select public.rls_test_logout();

select public.rls_test_login('26000000-0000-0000-0000-000000000002');
select throws_ok(
  $$select public.confirm_return_code((select id from public.rental_requests where idempotency_key = 'ho-key-1'), 'XXXX')$$,
  'P0001', 'Incorrect code',
  'a wrong return code is rejected'
);
select lives_ok(
  $$select public.confirm_return_code(
    (select id from public.rental_requests where idempotency_key = 'ho-key-1'),
    (select code from public.rental_returns ret join public.rental_requests r on r.id = ret.rental_request_id where r.idempotency_key = 'ho-key-1')
  )$$,
  'the correct return code completes the rental'
);
select public.rls_test_logout();

select is((select status from public.rental_requests where idempotency_key = 'ho-key-1'), 'completed', 'rental is now completed');
select is((select completed_at is not null from public.rental_requests where idempotency_key = 'ho-key-1'), true, 'completed_at stamped');
select is((select status from public.reservations res join public.rental_request_items i on i.reservation_id = res.id join public.rental_requests r on r.id = i.rental_request_id where r.idempotency_key = 'ho-key-1'), 'returned', 'the backing reservation is marked returned');
select is((select available_quantity from public.listings where id = '26000000-0000-0000-0000-000000000010'), 10, 'stock is restored once the return is confirmed');
select is((select count(*)::int from public.messages m join public.rental_requests r on r.id = m.rental_request_id where r.idempotency_key = 'ho-key-1' and m.status_event_type = 'completed'), 1, 'exactly one status_event message for completion');
select is((select count(*)::int from public.rental_request_notifications n join public.rental_requests r on r.id = n.rental_request_id where r.idempotency_key = 'ho-key-1' and n.type = 'rental_completed' and n.recipient_id = '26000000-0000-0000-0000-000000000001'), 1, 'owner notified of completion');

-- RLS: an unrelated third party cannot see any of the handover/return records.
select public.rls_test_login('26000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.rental_handovers h join public.rental_requests r on r.id = h.rental_request_id where r.idempotency_key = 'ho-key-1'), 0, 'a stranger cannot select the handover record');
select is((select count(*)::int from public.rental_handover_photos p join public.rental_handovers h on h.id = p.handover_id join public.rental_requests r on r.id = h.rental_request_id where r.idempotency_key = 'ho-key-1'), 0, 'a stranger cannot select handover photos');
select is((select count(*)::int from public.rental_returns ret join public.rental_requests r on r.id = ret.rental_request_id where r.idempotency_key = 'ho-key-1'), 0, 'a stranger cannot select the return record');
select public.rls_test_logout();

select * from finish();
rollback;
