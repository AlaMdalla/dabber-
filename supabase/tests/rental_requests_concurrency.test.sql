-- Two grouped rental requests from different renters both want more of the
-- same listing than is left in stock. Two independent transactions race to
-- accept_rental_request() them concurrently; exactly one must succeed, the
-- other must fail cleanly, and stock must never go negative or be
-- double-decremented. Mirrors quantity_rentals_concurrency.test.sql, but at
-- the grouped-request level.
create extension if not exists pgtap;
create extension if not exists dblink;

insert into auth.users (id, email) values
  ('25000000-0000-0000-0000-000000000001', 'rr-race-owner@example.test'),
  ('25000000-0000-0000-0000-000000000002', 'rr-race-renter-a@example.test'),
  ('25000000-0000-0000-0000-000000000003', 'rr-race-renter-b@example.test');

insert into public.listings (id, owner_id, slug, name, category_slug, governorate, price_per_day, total_quantity)
values ('25000000-0000-0000-0000-000000000010', '25000000-0000-0000-0000-000000000001', 'rr-race-chairs', 'Race chairs', 'evenementiel', 'Tunis', 2, 5);

insert into public.conversations (id, user_a_id, user_b_id)
values (
  '25000000-0000-0000-0000-000000000030',
  least('25000000-0000-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000002'::uuid),
  greatest('25000000-0000-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000002'::uuid)
), (
  '25000000-0000-0000-0000-000000000031',
  least('25000000-0000-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000003'::uuid),
  greatest('25000000-0000-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000003'::uuid)
);

insert into public.rental_requests (id, renter_id, owner_id, conversation_id, idempotency_key, estimated_total)
values
  ('25000000-0000-0000-0000-000000000020', '25000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000030', 'race-a', 24),
  ('25000000-0000-0000-0000-000000000021', '25000000-0000-0000-0000-000000000003', '25000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000031', 'race-b', 18);

insert into public.reservations (id, listing_id, renter_id, start_date, end_date, quantity)
values
  ('25000000-0000-0000-0000-000000000040', '25000000-0000-0000-0000-000000000010', '25000000-0000-0000-0000-000000000002', current_date + 30, current_date + 31, 4),
  ('25000000-0000-0000-0000-000000000041', '25000000-0000-0000-0000-000000000010', '25000000-0000-0000-0000-000000000003', current_date + 30, current_date + 31, 3);

insert into public.rental_request_items (rental_request_id, listing_id, reservation_id, quantity, start_date, end_date, unit_price, listing_title, subtotal)
values
  ('25000000-0000-0000-0000-000000000020', '25000000-0000-0000-0000-000000000010', '25000000-0000-0000-0000-000000000040', 4, current_date + 30, current_date + 31, 2, 'Race chairs', 8),
  ('25000000-0000-0000-0000-000000000021', '25000000-0000-0000-0000-000000000010', '25000000-0000-0000-0000-000000000041', 3, current_date + 30, current_date + 31, 2, 'Race chairs', 6);

-- Wrapper so each dblink session can act as the owner without a real JWT:
-- sets the same request.jwt.claim.sub GUC PostgREST would set, local to
-- that session's own transaction.
create or replace function public.rental_request_test_try_accept(p_owner_id uuid, p_request_id uuid)
returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_owner_id::text, true);
  perform public.accept_rental_request(p_request_id);
  return 'accepted';
exception when others then
  return sqlerrm;
end;
$$;

select dblink_connect('rental_request_race_a', 'dbname=' || current_database());
select dblink_connect('rental_request_race_b', 'dbname=' || current_database());
select dblink_exec('rental_request_race_a', 'begin');
select dblink_exec('rental_request_race_b', 'begin');
select dblink_send_query(
  'rental_request_race_a',
  $$select public.rental_request_test_try_accept('25000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000020')$$
);
select dblink_send_query(
  'rental_request_race_b',
  $$select public.rental_request_test_try_accept('25000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000021')$$
);

create temporary table rental_request_race_results(result text);
insert into rental_request_race_results select result from dblink_get_result('rental_request_race_a') as t(result text);
select dblink_exec('rental_request_race_a', 'commit');
insert into rental_request_race_results select result from dblink_get_result('rental_request_race_b') as t(result text);
select dblink_exec('rental_request_race_b', 'commit');

select plan(6);
select is((select count(*)::integer from rental_request_race_results where result = 'accepted'), 1, 'only one concurrent grouped-request acceptance succeeds');
select is((select count(*)::integer from rental_request_race_results where result like 'Not enough availability for Race chairs:%'), 1, 'the losing acceptance names the conflicting listing');
select is((select available_quantity from public.listings where id = '25000000-0000-0000-0000-000000000010'), 1, 'concurrent grouped acceptance never produces negative stock');
select is((select count(*)::integer from public.reservations where listing_id = '25000000-0000-0000-0000-000000000010' and status = 'confirmed'), 1, 'stock cannot be oversold across grouped requests');
select is((select count(*)::integer from public.rental_requests where id in ('25000000-0000-0000-0000-000000000020', '25000000-0000-0000-0000-000000000021') and status = 'accepted'), 1, 'exactly one grouped request ends up accepted');
select is((select count(*)::integer from public.rental_requests where id in ('25000000-0000-0000-0000-000000000020', '25000000-0000-0000-0000-000000000021') and status = 'pending'), 1, 'the losing grouped request stays pending, never partially accepted');
select * from finish();

select dblink_disconnect('rental_request_race_a');
select dblink_disconnect('rental_request_race_b');
drop function public.rental_request_test_try_accept(uuid, uuid);
delete from public.rental_requests where id in (
  '25000000-0000-0000-0000-000000000020',
  '25000000-0000-0000-0000-000000000021'
);
delete from auth.users where id in (
  '25000000-0000-0000-0000-000000000001',
  '25000000-0000-0000-0000-000000000002',
  '25000000-0000-0000-0000-000000000003'
);
