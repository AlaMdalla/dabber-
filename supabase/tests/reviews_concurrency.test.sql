-- Concurrent first submissions must still create both reveal notifications.
-- The rental-request row lock in submit_review serializes the count/reveal step.
create extension if not exists pgtap;
create extension if not exists dblink;

insert into auth.users (id, email) values
  ('28000000-0000-0000-0000-000000000001', 'review-race-owner@example.test'),
  ('28000000-0000-0000-0000-000000000002', 'review-race-renter@example.test');

insert into public.conversations (id, user_a_id, user_b_id)
values ('28000000-0000-0000-0000-000000000010',
  '28000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000002');

insert into public.rental_requests (
  id, renter_id, owner_id, status, conversation_id, idempotency_key, completed_at
) values (
  '28000000-0000-0000-0000-000000000020',
  '28000000-0000-0000-0000-000000000002',
  '28000000-0000-0000-0000-000000000001', 'completed',
  '28000000-0000-0000-0000-000000000010', 'review-race', now()
);

create or replace function public.review_test_submit(
  p_user_id uuid, p_request_id uuid, p_rating smallint, p_tags text[]
) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform public.submit_review(p_request_id, p_rating, null, p_tags);
  return 'submitted';
exception when others then
  return sqlerrm;
end;
$$;

select dblink_connect('review_race_owner', 'dbname=' || current_database());
select dblink_connect('review_race_renter', 'dbname=' || current_database());
select dblink_send_query('review_race_owner', $$select public.review_test_submit(
  '28000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000020',
  4, array['returned_on_time'])$$);
select dblink_send_query('review_race_renter', $$select public.review_test_submit(
  '28000000-0000-0000-0000-000000000002', '28000000-0000-0000-0000-000000000020',
  5, array['responsive'])$$);

create temporary table review_race_results(result text);
insert into review_race_results
select result from dblink_get_result('review_race_owner') as t(result text);
insert into review_race_results
select result from dblink_get_result('review_race_renter') as t(result text);

select plan(4);
select is((select count(*)::int from review_race_results where result = 'submitted'), 2, 'both concurrent reviews are submitted');
select is((select count(*)::int from public.reviews where rental_request_id = '28000000-0000-0000-0000-000000000020'), 2, 'both reviews persist');
select is((select count(*)::int from public.rental_request_notifications where rental_request_id = '28000000-0000-0000-0000-000000000020' and type = 'reviews_revealed'), 2, 'both reveal notifications are created despite the race');
select is((select count(*)::int from public.profile_reputation where user_id in ('28000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000002')), 2, 'both reviews enter reputation aggregates');
select * from finish();

select dblink_disconnect('review_race_owner');
select dblink_disconnect('review_race_renter');
drop function public.review_test_submit(uuid, uuid, smallint, text[]);
delete from auth.users where id in (
  '28000000-0000-0000-0000-000000000001',
  '28000000-0000-0000-0000-000000000002'
);
