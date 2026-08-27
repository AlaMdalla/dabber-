-- Cap avatar uploads the same way 0012 already caps listing photos. The
-- client sends whatever file the user picks with no compression or size
-- check (unlike ListingForm's compressListingImage), so without a bucket
-- limit a single avatar upload could be arbitrarily large against the
-- project's 1 GB Storage / 5 GB egress allowance.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatar-images';
