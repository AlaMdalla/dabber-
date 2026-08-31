-- Two independent transactions race to accept four units from stock of five.
-- Exactly one succeeds; the other catches the server-side availability error.
create extension if not exists pgtap;
create extension if not exists dblink;

insert into auth.users (id, email) values
  ('23000000-0000-0000-0000-000000000001', 'race-owner@example.test'),
  ('23000000-0000-0000-0000-000000000002', 'race-renter-a@example.test'),
  ('23000000-0000-0000-0000-000000000003', 'race-renter-b@example.test');
insert into public.listings (id, owner_id, slug, name, category_slug, governorate, total_quantity)
values ('23000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000001', 'quantity-race-test', 'Race chairs', 'evenementiel', 'Tunis', 5);
insert into public.reservations (id, listing_id, renter_id, start_date, end_date, quantity) values
  ('23000000-0000-0000-0000-000000000020', '23000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000002', current_date + 30, current_date + 31, 4),
  ('23000000-0000-0000-0000-000000000021', '23000000-0000-0000-0000-000000000010', '23000000-0000-0000-0000-000000000003', current_date + 30, current_date + 31, 4);

create or replace function public.quantity_test_try_confirm(p_id uuid)
returns text language plpgsql as $$
begin
  update public.reservations set status = 'confirmed' where id = p_id;
  return 'confirmed';
exception when others then
  return sqlerrm;
end;
$$;

select dblink_connect('quantity_race_a', 'dbname=' || current_database());
select dblink_connect('quantity_race_b', 'dbname=' || current_database());
select dblink_exec('quantity_race_a', 'begin');
select dblink_exec('quantity_race_b', 'begin');
select dblink_send_query('quantity_race_a', $$select public.quantity_test_try_confirm('23000000-0000-0000-0000-000000000020')$$);
select dblink_send_query('quantity_race_b', $$select public.quantity_test_try_confirm('23000000-0000-0000-0000-000000000021')$$);

create temporary table quantity_race_results(result text);
insert into quantity_race_results select result from dblink_get_result('quantity_race_a') as t(result text);
select dblink_exec('quantity_race_a', 'commit');
insert into quantity_race_results select result from dblink_get_result('quantity_race_b') as t(result text);
select dblink_exec('quantity_race_b', 'commit');

select plan(4);
select is((select count(*)::integer from quantity_race_results where result = 'confirmed'), 1, 'only one concurrent acceptance succeeds');
select is((select count(*)::integer from quantity_race_results where result like 'Insufficient availability:%'), 1, 'the losing acceptance receives a clear stock error');
select is((select available_quantity from public.listings where id = '23000000-0000-0000-0000-000000000010'), 1, 'concurrent acceptance never produces negative stock');
select is((select count(*)::integer from public.reservations where listing_id = '23000000-0000-0000-0000-000000000010' and status = 'confirmed'), 1, 'stock cannot be oversold');
select * from finish();

select dblink_disconnect('quantity_race_a');
select dblink_disconnect('quantity_race_b');
drop function public.quantity_test_try_confirm(uuid);
delete from auth.users where id in (
  '23000000-0000-0000-0000-000000000001',
  '23000000-0000-0000-0000-000000000002',
  '23000000-0000-0000-0000-000000000003'
);
