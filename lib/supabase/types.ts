export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  facebook_id: string | null;
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
  profiles: Pick<Profile, "full_name" | "avatar_url"> | null;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface ConversationWithDetails extends Conversation {
  listings: Pick<Listing, "name" | "slug" | "image_url"> | null;
  buyer: Pick<Profile, "full_name" | "avatar_url"> | null;
  seller: Pick<Profile, "full_name" | "avatar_url"> | null;
}
