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
  total_quantity: number;
  available_quantity: number;
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

export interface ListingComment {
  id: string;
  listing_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ListingCommentWithAuthor extends ListingComment {
  profiles: Pick<Profile, "full_name" | "avatar_url"> | null;
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
  | "total_quantity"
  | "available_quantity"
> & {
  profiles: Pick<Profile, "full_name"> | null;
};

/** Columns the account/profile "my listings" links render. */
export type ListingSummary = Pick<
  Listing,
  "id" | "slug" | "name" | "image_url" | "price_per_day" | "governorate"
>;

export type ReservationStatus = "pending" | "confirmed" | "declined" | "cancelled" | "returned";

export interface Reservation {
  id: string;
  listing_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  status: ReservationStatus;
  quantity: number;
  inventory_restored: boolean;
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

export type MessageType = "text" | "rental_request" | "status_event";
export type StatusEventType = "accepted" | "rejected" | "cancelled" | "completed" | "active";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  listing_id: string | null;
  message_type: MessageType;
  rental_request_id: string | null;
  status_event_type: StatusEventType | null;
  created_at: string;
  read_at: string | null;
}

export type SharedListing = Pick<
  Listing,
  "name" | "slug" | "image_url" | "price_per_day" | "description"
>;

export interface MessageWithListing extends Message {
  listings: SharedListing | null;
  rental_requests?: RentalRequestWithItems | null;
}

export interface ConversationWithDetails extends Conversation {
  user_a: Pick<Profile, "full_name" | "avatar_url"> | null;
  user_b: Pick<Profile, "full_name" | "avatar_url"> | null;
}

/** Row shown on the admin users list. */
export type AdminUserRow = Pick<
  Profile,
  "id" | "full_name" | "avatar_url" | "email" | "whatsapp_number" | "created_at"
>;

/** Row shown on the admin listings list. */
export type AdminListingRow = Pick<
  Listing,
  "id" | "slug" | "name" | "governorate" | "category_slug" | "price_per_day" | "availability" | "created_at"
> & {
  profiles: Pick<Profile, "full_name"> | null;
};

/** Row shown on the admin reservations list. */
export interface AdminReservationRow extends Reservation {
  listings: Pick<Listing, "id" | "name" | "slug" | "owner_id"> | null;
  profiles: Pick<Profile, "full_name" | "avatar_url"> | null;
}

export interface AdminRow {
  user_id: string;
  created_at: string;
}

export interface AdminBanRow {
  user_id: string;
  banned_by: string | null;
  reason: string | null;
  created_at: string;
}

/** Columns the owner storefront (public profile page) renders per listing. */
export type StorefrontListing = Pick<
  Listing,
  | "id"
  | "slug"
  | "name"
  | "description"
  | "image_url"
  | "price_per_day"
  | "availability"
  | "category_slug"
  | "governorate"
  | "owner_id"
  | "total_quantity"
  | "available_quantity"
>;

export type RentalRequestStatus =
  | "pending"
  | "accepted"
  | "active"
  | "return_pending"
  | "completed"
  | "rejected"
  | "cancelled"
  | "disputed";

export type FulfillmentMethod = "pickup" | "delivery";

export interface RentalRequest {
  id: string;
  renter_id: string;
  owner_id: string;
  status: RentalRequestStatus;
  renter_message: string | null;
  fulfillment_method: FulfillmentMethod;
  delivery_address: string | null;
  currency: string;
  estimated_total: number | null;
  confirmed_total: number | null;
  conversation_id: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  active_at: string | null;
  return_requested_at: string | null;
}

export interface RentalRequestItem {
  id: string;
  rental_request_id: string;
  listing_id: string;
  reservation_id: string;
  quantity: number;
  start_date: string;
  end_date: string;
  unit_price: number | null;
  listing_title: string;
  listing_image_url: string | null;
  subtotal: number | null;
  created_at: string;
  updated_at: string;
}

export interface RentalRequestWithItems extends RentalRequest {
  rental_request_items: RentalRequestItem[];
  renter?: Pick<Profile, "full_name" | "avatar_url"> | null;
  owner?: Pick<Profile, "full_name" | "avatar_url"> | null;
}

export type RentalRequestNotificationType =
  | "rental_request_submitted"
  | "rental_request_accepted"
  | "rental_request_rejected"
  | "rental_request_cancelled"
  | "handover_condition_submitted"
  | "handover_confirmed"
  | "rental_active"
  | "return_condition_submitted"
  | "rental_completed";

export interface RentalRequestNotification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  rental_request_id: string;
  type: RentalRequestNotificationType;
  created_at: string;
  read_at: string | null;
}

export interface RentalHandover {
  id: string;
  rental_request_id: string;
  code: string;
  condition_note: string | null;
  owner_submitted_at: string | null;
  renter_confirmed_at: string | null;
  code_confirmed_at: string | null;
  created_at: string;
}

export interface RentalHandoverPhoto {
  id: string;
  handover_id: string;
  storage_path: string;
  position: number;
  created_at: string;
}

export interface RentalHandoverWithPhotos extends RentalHandover {
  rental_handover_photos: RentalHandoverPhoto[];
}

export type ReturnConditionStatus = "good" | "issue";

export interface RentalReturn {
  id: string;
  rental_request_id: string;
  code: string;
  condition_status: ReturnConditionStatus | null;
  note: string | null;
  owner_submitted_at: string | null;
  code_confirmed_at: string | null;
  created_at: string;
}
