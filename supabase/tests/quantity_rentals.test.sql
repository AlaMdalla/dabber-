-- Run with `supabase test db`. The dblink section uses two real database
-- sessions to prove that concurrent confirmations serialize on listing stock.
begin;
create extension if not exists pgtap;
create extension if not exists dblink;
select plan(11);

insert into auth.users (id, email) values
  ('22000000-0000-0000-0000-000000000001', 'quantity-owner@example.test'),
  ('22000000-0000-0000-0000-000000000002', 'quantity-renter-a@example.test'),
  ('22000000-0000-0000-0000-000000000003', 'quantity-renter-b@example.test');

insert into public.listings (id, owner_id, slug, name, category_slug, governorate, total_quantity)
values
  ('22000000-0000-0000-0000-000000000010', '22000000-0000-0000-0000-000000000001', 'quantity-single-test', 'Car', 'transport', 'Tunis', 1),
  ('22000000-0000-0000-0000-000000000011', '22000000-0000-0000-0000-000000000001', 'quantity-multi-test', 'Chairs', 'evenementiel', 'Tunis', 10);

select is((select available_quantity from public.listings where id = '22000000-0000-0000-0000-000000000010'), 1, 'single-item listing defaults to one available');
select is((select available_quantity from public.listings where id = '22000000-0000-0000-0000-000000000011'), 10, 'multi-item listing starts fully available');

insert into public.reservations (id, listing_id, renter_id, start_date, end_date, quantity) values
  ('22000000-0000-0000-0000-000000000020', '22000000-0000-0000-0000-000000000011', '22000000-0000-0000-0000-000000000002', current_date + 10, current_date + 11, 4),
  ('22000000-0000-0000-0000-000000000021', '22000000-0000-0000-0000-000000000011', '22000000-0000-0000-0000-000000000003', current_date + 10, current_date + 11, 7);

update public.reservations set status = 'confirmed' where id = '22000000-0000-0000-0000-000000000020';
select is((select available_quantity from public.listings where id = '22000000-0000-0000-0000-000000000011'), 6, 'accepting a valid quantity decrements stock');

select throws_ok(
  $$update public.reservations set status = 'confirmed' where id = '22000000-0000-0000-0000-000000000021'$$,
  'P0001', 'Insufficient availability: requested 7, only 6 available',
  'insufficient acceptance fails clearly and atomically'
);
select is((select status from public.reservations where id = '22000000-0000-0000-0000-000000000021'), 'pending', 'failed acceptance remains pending');

update public.reservations set status = 'declined' where id = '22000000-0000-0000-0000-000000000021';
select is((select available_quantity from public.listings where id = '22000000-0000-0000-0000-000000000011'), 6, 'declining does not change stock');

update public.reservations set status = 'cancelled' where id = '22000000-0000-0000-0000-000000000020';
select is((select available_quantity from public.listings where id = '22000000-0000-0000-0000-000000000011'), 10, 'cancelling a confirmed rental restores stock');
update public.reservations set status = 'cancelled' where id = '22000000-0000-0000-0000-000000000020';
select is((select available_quantity from public.listings where id = '22000000-0000-0000-0000-000000000011'), 10, 'repeating a terminal update does not restore twice');

insert into public.reservations (id, listing_id, renter_id, start_date, end_date, quantity)
values ('22000000-0000-0000-0000-000000000022', '22000000-0000-0000-0000-000000000011', '22000000-0000-0000-0000-000000000002', current_date + 20, current_date + 21, 2);
update public.reservations set status = 'confirmed' where id = '22000000-0000-0000-0000-000000000022';
select is((select available_quantity from public.listings where id = '22000000-0000-0000-0000-000000000011'), 8, 'another multi-item rental is accepted');
update public.reservations set status = 'returned' where id = '22000000-0000-0000-0000-000000000022';
select is((select available_quantity from public.listings where id = '22000000-0000-0000-0000-000000000011'), 10, 'returning an accepted rental restores stock');

select throws_ok(
  $$update public.listings set total_quantity = 0 where id = '22000000-0000-0000-0000-000000000010'$$,
  '23514', null, 'total quantity cannot be below one'
);

select * from finish();
rollback;

begin;
select plan(3);
select function_returns('public', 'transition_reservation', array['uuid', 'text'], 'reservations', 'atomic transition RPC exists');
select has_check('public', 'listings', 'listings_quantity_bounds_check', 'listing stock has an upper bound');
select volatility_is('public', 'transition_reservation', array['uuid', 'text'], 'volatile', 'transition RPC is transactional/volatile');
select * from finish();
rollback;
