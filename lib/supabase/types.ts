export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  facebook_id: string | null;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

export type Availability = "disponible" | "a-confirmer";

export interface Listing {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  category_slug: string;
  governorate: string;
  price_per_day: number | null;
  availability: Availability;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  storage_path: string | null;
  position: number;
  created_at: string;
}

export interface ListingWithOwner extends Listing {
  profiles: Pick<Profile, "full_name" | "avatar_url" | "whatsapp_number"> | null;
  listing_images?: ListingImage[];
}

/** Columns ListingCard renders. Feed queries select only these instead of `*`. */
export type ListingCardData = Pick<
  Listing,
  | "id"
  | "slug"
  | "name"
  | "image_url"
  | "price_per_day"
  | "availability"
  | "governorate"
  | "category_slug"
> & {
  profiles: Pick<Profile, "full_name"> | null;
};

/** Columns the account/profile "my listings" links render. */
export type ListingSummary = Pick<
  Listing,
  "id" | "slug" | "name" | "image_url" | "price_per_day" | "governorate"
>;

export type ReservationStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface Reservation {
  id: string;
  listing_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithRenter extends Reservation {
  profiles: Pick<Profile, "full_name" | "avatar_url"> | null;
}

export interface ReservationWithListing extends Reservation {
  listings: Pick<Listing, "id" | "name" | "slug" | "image_url" | "owner_id"> | null;
}

export type ReservationNotificationType =
  | "reservation_requested"
  | "reservation_confirmed"
  | "reservation_declined"
  | "reservation_cancelled";

export interface ReservationNotification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  reservation_id: string;
  type: ReservationNotificationType;
  created_at: string;
  read_at: string | null;
}

/** Row from the public `listing_availability` view: renter-identity-free. */
export interface AvailabilityRange {
  listing_id: string;
  start_date: string;
  end_date: string;
  status: "pending" | "confirmed";
}

/** A date range the owner has blocked off themselves (no renter involved). */
export interface ListingBlockedDate {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  listing_id: string | null;
  created_at: string;
  read_at: string | null;
}

export type SharedListing = Pick<
  Listing,
  "name" | "slug" | "image_url" | "price_per_day" | "description"
>;

export interface MessageWithListing extends Message {
  listings: SharedListing | null;
}

export interface ConversationWithDetails extends Conversation {
  user_a: Pick<Profile, "full_name" | "avatar_url"> | null;
  user_b: Pick<Profile, "full_name" | "avatar_url"> | null;
}
