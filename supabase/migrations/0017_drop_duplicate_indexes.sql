-- Drop two indexes made redundant by a composite index/constraint whose
-- leading column already covers the same lookups, so they only cost extra
-- storage and slow down writes without helping any query:
--   * listing_images_listing_id_idx (listing_id) is a prefix of the unique
--     index backing `unique (listing_id, position)` from 0012.
--   * reservations_listing_id_idx (listing_id) is a prefix of
--     reservations_listing_status_idx (listing_id, status) from 0010, and
--     every current query that filters by listing_id also filters status.
drop index if exists public.listing_images_listing_id_idx;
drop index if exists public.reservations_listing_id_idx;
