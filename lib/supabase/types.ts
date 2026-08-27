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

export interface ListingWithOwner extends Listing {
  profiles: Pick<Profile, "full_name" | "avatar_url" | "whatsapp_number"> | null;
}

export type ReservationStatus = "pending" | "confirmed" | "cancelled";

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

/** Row from the public `listing_availability` view: renter-identity-free. */
export interface AvailabilityRange {
  listing_id: string;
  start_date: string;
  end_date: string;
  status: Exclude<ReservationStatus, "cancelled">;
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
