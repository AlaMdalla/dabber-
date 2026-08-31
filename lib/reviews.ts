import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileReputation, ReviewTag } from "@/lib/supabase/types";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

/** Tags shown when reviewing an owner vs. a renter -- mirrors the check constraint on reviews.tags. */
export const OWNER_REVIEW_TAGS: ReviewTag[] = ["item_matched_description", "responsive", "on_time"];
export const RENTER_REVIEW_TAGS: ReviewTag[] = ["returned_on_time", "took_care_of_item", "showed_up_as_agreed"];

export const REVIEW_TAG_LABEL_KEYS: Record<ReviewTag, TranslationKey> = {
  item_matched_description: "review.tag.itemMatchedDescription",
  responsive: "review.tag.responsive",
  on_time: "review.tag.onTime",
  returned_on_time: "review.tag.returnedOnTime",
  took_care_of_item: "review.tag.tookCareOfItem",
  showed_up_as_agreed: "review.tag.showedUpAsAgreed",
};

/**
 * Looks up the public reveal-gated reputation aggregate for a batch of
 * users. Not a PostgREST embedded join -- `profile_reputation` is a view
 * with no foreign key for PostgREST to detect, so callers fetch listings
 * (or profiles) and this map separately, then merge by user id.
 */
export async function getReputationMap(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, Pick<ProfileReputation, "avg_rating" | "review_count">>> {
  const uniqueIds = [...new Set(userIds)];
  const map = new Map<string, Pick<ProfileReputation, "avg_rating" | "review_count">>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase
    .from("profile_reputation")
    .select("user_id, avg_rating, review_count")
    .in("user_id", uniqueIds)
    .returns<ProfileReputation[]>();

  for (const row of data ?? []) {
    map.set(row.user_id, { avg_rating: row.avg_rating, review_count: row.review_count });
  }
  return map;
}
