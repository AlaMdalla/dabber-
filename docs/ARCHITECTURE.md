# Dabber — architecture & reference

Dabber is a peer-to-peer rental marketplace for Tunisia. Anyone can list equipment
for rent (cameras, event gear, camping equipment, medical equipment, etc.), and
anyone can request to rent it for a date range. On top of the listing marketplace,
Dabber runs a **Protected Rental Flow**: a shared, timestamped record of what was
agreed, the item's condition at handover, and confirmation of both the handover and
the return — so two strangers have more reason to trust each other than a plain
classifieds listing gives them.

This document describes the app as it exists in the repository today: stack,
project layout, data model, authorization model, and the full rental lifecycle.

---

## 1. Tech stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript.
- **Supabase**: Postgres + Row Level Security + Auth (Google OAuth, and legacy
  Facebook Login fields still present on `profiles`) + Storage + Realtime.
- **Tailwind CSS 4** for styling; no component library — everything is hand-built
  against a small set of CSS custom properties (`--ink`, `--accent`, `--border`,
  `--subtle`, `--muted`) defined in `app/globals.css`.
- No ORM: every query goes through the generated Supabase JS client
  (`lib/supabase/client.ts` for the browser, `lib/supabase/server.ts` for Server
  Components, both wrapping `@supabase/ssr`).
- No dedicated state/form/toast library. `lib/toast.ts` and `lib/cart.ts` are small
  hand-rolled external stores built on `useSyncExternalStore`.
- Deployed on Vercel (`https://dabber-ptoi.vercel.app`); Supabase project is on the
  free tier, which is why the schema favors indexes and RLS-scoped queries over
  denormalization or background jobs.

Environment variables (see `.env.local.example`): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, optionally `NEXT_PUBLIC_SITE_URL` and
`NEXT_PUBLIC_DABBER_FACEBOOK_GROUP_URL`.

```
npm run dev     # start the dev server
npm run build   # production build (also the fastest way to typecheck)
npm run lint    # eslint
```

Database migrations live in `supabase/migrations/*.sql`, applied in filename order
(`supabase db push`). pgTAP tests live in `supabase/tests/*.sql`, run with
`supabase test db`. There is no seed script; test files create their own fixture
rows and roll back.

---

## 2. Project structure

```
app/                     Next.js App Router routes (one folder per route segment)
components/              React components, grouped by feature (mirrors app/)
lib/
  supabase/               client.ts, server.ts, proxy.ts, types.ts, errorMessage.ts
  i18n/                   dictionaries.ts, config.ts, server.ts, categories.ts
  cart.ts, toast.ts, rentalPricing.ts, imageCompression.ts, slugify.ts, constants.ts
data/                     Static domain data: categories.ts, governorates.ts, businesses.ts
supabase/
  migrations/             Numbered SQL migrations (0001 … 0027), the source of truth for schema
  tests/                  pgTAP test suites
proxy.ts                  Next.js middleware entry point (locale routing + session refresh)
```

Routing convention: every localized page lives at its plain path (e.g.
`app/listings/[slug]/page.tsx` → `/listings/foo`); the locale (`fr` / `ar` / `en`)
is carried via a cookie + `x-dabber-locale` request header set by `proxy.ts`, not
via a `/[locale]/...` URL segment, except where a locale prefix is explicitly
present in the URL for shareable links (`localizePath()` in `lib/i18n/config.ts`
handles both).

---

## 3. Internationalization

Three locales: `fr` (default fallback content), `ar` (Tunisian Arabic/derja — the
app's **default locale**, RTL), `en`. Translations live in one file,
`lib/i18n/dictionaries.ts`, as three flat `Record<string, string>` objects (`fr`,
`en`, `ar`) keyed by dotted strings like `"rentalRequest.title"`. There is no
nested-object or ICU pluralization system — interpolation is `{placeholder}`
substitution via `translate()`.

- Server Components read the locale via `getServerI18n()` (`lib/i18n/server.ts`),
  which reads the `x-dabber-locale` header set by the middleware.
- Client Components read it via `useI18n()` from `components/i18n/LocaleProvider.tsx`
  (a React context seeded from the server-rendered locale).
- `components/i18n/LocalizedLink.tsx` wraps `next/link` so internal links carry the
  current locale automatically.
- `document.documentElement.dir` flips to `rtl` for `ar`.

**When adding a feature**: add one key per locale to all three blocks in
`dictionaries.ts` (grep the file for an existing feature's keys to match the
single-line-per-locale formatting convention already used there).

---

## 4. Authorization model

Two layers, used together everywhere:

1. **Row Level Security (RLS)** on every table, keyed off `auth.uid()`. Read
   policies are generally permissive (listings, profiles, comments are public);
   write policies are scoped to the owning user.
2. **`SECURITY DEFINER` RPCs** for any write that needs to touch more than one
   table atomically, needs a server-side authorization check more complex than "is
   this my row", or needs to bypass RLS by design (e.g. creating a conversation
   between two users, neither of whom "owns" it). These functions:
   - run as the function-owning role, so they bypass RLS on the tables they touch;
   - re-derive every permission check from `auth.uid()` inside the function body
     (never trust a client-supplied `owner_id`/`renter_id`/etc.);
   - are the *only* way to write to tables that intentionally have no client
     insert/update policy (`rental_requests`, `rental_request_items`,
     `rental_handovers`, `rental_returns`, `*_notifications`, `conversations`).
   - end with `revoke all ... from public; grant execute ... to authenticated;` so
     anonymous/unauthenticated callers can't invoke them.

Two boolean helper functions gate admin/moderation access:
`public.is_admin()` (checks the `admins` allowlist table) and `public.is_banned()`
(checks `banned_users`). Bans never touch Supabase Auth directly (no service-role
key is configured in this project) — a banned user can still authenticate, but is
blocked at the RLS layer from creating listings, reservations, or messages.

---

## 5. Data model

Grouped by domain. All tables are in the `public` schema. Every domain's
migration file has the rationale in its header comment — this section summarizes
the current shape, not the history.

### 5.1 Identity

**`profiles`** — 1:1 with `auth.users`, auto-created by the `handle_new_user()`
trigger on signup from OAuth metadata. Columns: `full_name`, `avatar_url`, `email`,
`facebook_id`, `whatsapp_number`, timestamps. Publicly readable; only the owner can
update their own row.

**`admins`** / **`banned_users`** — allowlist/denylist tables, admin-only access.
Triggers prevent an admin from removing their own access and prevent
banning/self-banning an admin (must demote first).

### 5.2 Listings

**`listings`** — the rentable item. `owner_id`, `slug` (unique), `name`,
`description`, `category_slug`, `governorate`, `price_per_day` (nullable = "price
on request"), `availability` (`disponible` | `a-confirmer`, auto-managed — see
below), `image_url` (cover), plus **`total_quantity`** / **`available_quantity`**
for stock-based listings (e.g. "20 chairs"). Publicly readable; only the owner can
write.

**`listing_images`** — ordered gallery (position 0–4), `listing_images` keeps
`listings.image_url` as a denormalized cover image for cheap card rendering
elsewhere.

**`listing_blocked_dates`** — lets an owner block their own calendar (e.g. they're
using the item themselves) without going through the reservation/renter flow.

**`listing_comments`** — flat public comments on a listing (not threaded).

**`listing_availability`** (view) — a public, identity-free projection of
confirmed/pending reservation date ranges plus owner-blocked ranges, so anonymous
visitors can see a listing's calendar without exposing who booked what.

### 5.3 Inventory / stock engine

Stock is **not** date-partitioned — `listings.available_quantity` is a single
global counter, decremented when a reservation is confirmed and restored when it's
cancelled or returned. This is intentional (see `0022_quantity_rentals.sql`): a
`pending` request never reserves stock (so multiple renters can compete for the
same window), only `confirmed` does. The
`enforce_reservation_update_rules()` trigger on `reservations` is the single
authoritative place that increments/decrements `available_quantity`, guarded by
`reservations.inventory_restored` so a reservation is never double-restored no
matter how many times its status is updated. `enforce_listing_quantity_rules()` on
`listings` rejects any *direct* client edit of `available_quantity` (it's only
mutable from inside that trigger chain) and keeps `total_quantity ≥
available_quantity`, auto-flipping `availability` to `a-confirmer` when stock hits
zero.

**Anything that changes a reservation's status must go through this trigger** —
never update `reservations.status` from application code without it, or stock
tracking breaks.

### 5.4 Reservations (single-listing bookings)

**`reservations`** — one row per listing/date-range/quantity request.
`status`: `pending → confirmed → returned`, or `pending → declined`, or
`→ cancelled` from either `pending` or (renter-initiated, ≥3 days before start)
`confirmed`. `transition_reservation(id, status)` RPC is the entry point for an
owner confirming/declining/marking-returned or either party cancelling; it
re-derives the caller's role from `auth.uid()` and enforces the cutoff rule
server-side. `reservation_notifications` mirrors every status change to the other
party (trigger-driven, unlike the rental-request notifications below).

This is the original, single-item booking path (still used directly by e.g. the
admin dashboard and the `/reservations` "my bookings" page). **Grouped rental
requests (5.5) build on top of this table** — every `rental_request_item` owns
exactly one `reservations` row, so a rental request's items are, mechanically,
just several reservations created and transitioned together.

### 5.5 Rental requests (grouped, multi-item)

Lets a renter request several listings from the *same* owner in one shot (e.g. "20
chairs + 2 tables + a projector, all from this owner, same weekend") as a single
transaction with one shared conversation thread, instead of N separate
reservations the renter has to track individually.

- **`rental_requests`** — one row per grouped request: `renter_id`, `owner_id`,
  `status`, `fulfillment_method` (`pickup`/`delivery`) + `delivery_address`,
  `renter_message`, `currency`, `estimated_total` (client-preview, server-snapshot
  at submit) / `confirmed_total` (frozen at accept), `conversation_id`,
  `idempotency_key` (unique per renter — a resubmitted cart returns the existing
  request instead of creating a duplicate), and a full set of lifecycle timestamps:
  `accepted_at`, `rejected_at`, `cancelled_at`, `active_at`, `return_requested_at`,
  `completed_at`.
- **`rental_request_items`** — one row per listing in the request, each owning
  exactly one `reservations.id` (via `reservation_id`, unique). Snapshots
  `listing_title` / `listing_image_url` / `unit_price` / `subtotal` at submit time
  so a later listing edit or price change never rewrites history.
- **`rental_request_notifications`** — in-app notifications for the lifecycle,
  inserted directly by the RPCs below (not trigger-driven, unlike
  `reservation_notifications`), `unique (rental_request_id, recipient_id, type)` so
  a resubmitted step never double-notifies.

**Status lifecycle**: `pending → accepted → active → return_pending → completed`,
with `rejected` / `cancelled` as early exits (before `active`) and `disputed`
reserved for a future dispute feature. See §6 for the full walkthrough — this is
the flagship feature of the app.

### 5.6 Messaging

**`conversations`** — one row per unordered pair of users (`user_a_id <
user_b_id`, enforced by a check constraint), not per listing — so two people
discussing several different listings still see one thread.
**`messages`** — has a `message_type`: `text` (plain, client-insertable),
`rental_request` (renders `RentalRequestCard`, only RPC-insertable, references
`rental_request_id`), or `status_event` (renders a small centered pill via
`StatusEventPill`, references `rental_request_id` + `status_event_type` ∈
`accepted | rejected | cancelled | active | completed`). A message can also
optionally reference a plain `listing_id` to render an inline shared-listing card
(used when someone shares a listing into a conversation). `recipient_id` and
`read_at` are auto-managed by a trigger from the conversation's participant pair.

### 5.7 The Protected Rental Flow (handover / return)

See §6 — full write-up below.

### 5.8 Admin

`admins` / `banned_users` (5.1) plus read access, via `is_admin()`-gated policies,
to aggregate views of users/listings/reservations for `/admin`, `/admin/users`,
`/admin/listings`, `/admin/reservations`.

---

## 6. The Protected Rental Flow — full lifecycle

This is what turns Dabber from "just another listings site" into something that
actually reduces stranger-to-stranger rental risk: a jointly-built, timestamped
record of the item's condition, and a two-sided confirmation (not a one-click
button either party can press alone) at both the handover and the return.

### Status machine

```
pending ──accept──▶ accepted ──(handover)──▶ active ──(return)──▶ return_pending ──▶ completed
   │                    │
 reject              cancel
   ▼                    ▼
rejected            cancelled
```

- `pending → accepted/rejected`: owner-only, via `accept_rental_request` /
  `reject_rental_request`.
- `pending/accepted → cancelled`: either party may cancel a `pending` request only
  if they're the *renter* (an owner uses reject, not cancel, so the renter always
  gets an explicit decision); either party may cancel an `accepted` request, with
  the renter subject to the same "not within 3 days of start" cutoff used
  elsewhere. **Cancellation is not possible once `active`** — that's what the
  return flow (or a future dispute) is for.
- `accepted → active`: only via the handover code exchange (below) — there is no
  direct status update.
- `active → return_pending → completed`: only via the return condition + code
  exchange (below).

`accepted` and `active` are **not** subdivided into further DB statuses for their
internal sub-steps (e.g. "condition submitted but not yet confirmed") — that
progress is derived from which fields are populated on the `rental_handovers` /
`rental_returns` row, not a separate enum value. This keeps the state machine
small while still letting the UI show fine-grained progress.

### Step by step

**1. Request → accept.** `submit_rental_request` (called from the cart) creates the
grouped request, its per-item reservations (as `pending`, not yet holding stock),
posts a structured `rental_request` message into the conversation, and notifies
the owner. `accept_rental_request`:
- locks the request row, verifies the caller is the owner and the request is
  `pending`;
- **validates combined stock per listing**: because a request can hold several
  items against the *same* listing (e.g. two different date ranges), and
  `available_quantity` isn't date-partitioned, it sums `quantity` per listing
  across all of that request's items, locks each distinct listing row (`for
  update`, in a stable `order by listing_id` to avoid deadlocking a concurrent
  accept on the same listings), and rejects with `Not enough availability for
  <listing>: <n> requested, only <m> available` if the combined amount doesn't
  fit — checking each item independently would wrongly allow two items that each
  individually fit to jointly oversell;
- flips every item's `reservations.status` to `confirmed` (which is what actually
  decrements stock, via the trigger in §5.3);
- sets `status = accepted`, `confirmed_total = estimated_total`, posts a
  `status_event` message, notifies the renter.

**2. Handover — condition report.** Once `accepted`, the owner calls
`submit_handover_condition(request_id, note, photo_paths[])` (photos are uploaded
to the private `rental-condition-images` Storage bucket by the client *first*, RPC
just records the paths). This upserts a `rental_handovers` row: generates a
one-time 4-digit `code`, stores 1–5 `rental_handover_photos`, stamps
`owner_submitted_at`. Resubmitting (e.g. to add a photo before the renter has
confirmed) clears any prior renter confirmation, since it would have applied to
the old report.

**3. Handover — renter confirmation.** The renter reviews the photos/note and
calls `confirm_handover_condition`, which stamps `renter_confirmed_at`. This can
happen remotely, before the two people physically meet — it's "I agree this
report is accurate," not "I have the item in hand."

**4. Handover — the code.** At the physical handover, **the renter's screen shows
the code**; the owner has to type in what the renter reads aloud
(`confirm_handover_code`). This is the actual proof of physical exchange — only
once this succeeds does the request become `active` (`active_at` stamped, a
`status_event` message posted, the renter notified). The RPC requires
`renter_confirmed_at` to already be set, so the code step can't be used to skip
the condition-review step.

**5. Active.** Nothing to confirm while active; the UI shows dates, the other
party's contact button, and (owner-only) a "Confirm the return" action.

**6. Return — condition + the code, reversed.** The owner calls
`submit_return_condition(request_id, 'good'|'issue', note)`, which generates a
*new* code and moves the request to `return_pending`. This time **the owner's
screen shows the code** (they're the one receiving the item back); the renter
types in what the owner reads aloud (`confirm_return_code`). On match: every
item's reservation flips to `returned` (restoring stock via the same §5.3
trigger), the request becomes `completed`, a final `status_event` message posts,
the owner is notified. Recording `'issue'` doesn't block completion — it's still
the same code-confirmed handoff, just flagged; disputing it further is a separate,
not-yet-built "report a problem" feature (see §8).

### Security note on the code

Row Level Security is row-granular, not column-granular: both parties can select
the full `rental_handovers` / `rental_returns` row, `code` column included. The
"receiver shows it, giver types it" rule is enforced by the **UI** (the giver's
screens never fetch or display the code), not by the database. This is a
deliberate MVP tradeoff — a workflow-level proof of physical presence, not a
cryptographic guarantee — matching the product brief's instruction not to
overengineer this or make the security story intimidating.

### RPC reference (this feature)

| RPC | Caller | From status | Effect |
|---|---|---|---|
| `submit_rental_request(owner_id, items, message, fulfillment_method, delivery_address, idempotency_key)` | renter | — | creates request + items + reservations + conversation message |
| `accept_rental_request(request_id)` | owner | `pending` | → `accepted`, confirms reservations, decrements stock |
| `reject_rental_request(request_id)` | owner | `pending` | → `rejected` |
| `cancel_rental_request(request_id)` | renter or owner | `pending`/`accepted` | → `cancelled`, restores stock if it had been confirmed |
| `submit_handover_condition(request_id, note, photo_paths[])` | owner | `accepted` | creates/updates the handover report + code |
| `confirm_handover_condition(request_id)` | renter | `accepted` | acknowledges the condition report |
| `confirm_handover_code(request_id, code)` | owner | `accepted` | → `active` |
| `submit_return_condition(request_id, status, note)` | owner | `active` | → `return_pending`, creates the return code |
| `confirm_return_code(request_id, code)` | renter | `return_pending` | → `completed`, restores stock |

### Frontend

- `app/rentals/page.tsx` — list of the current user's rentals, either role, built
  on `rental_requests` (distinct from `app/reservations/page.tsx`, which is the
  older renter-only view over raw `reservations`).
- `app/rentals/[id]/page.tsx` + `components/rentals/RentalRecordView.tsx` — the
  "Résumé de la location" hub: one screen, one primary action at a time, driven
  entirely by `rental.status` and the presence/absence of fields on the
  handover/return rows. Subscribes to Postgres Realtime changes on
  `rental_requests` / `rental_handovers` / `rental_returns` so both parties see
  the other's action (e.g. "renter confirmed the condition") without a manual
  refresh — important for the code-exchange moment specifically.
- `components/rentals/HandoverConditionForm.tsx` — owner's photo/note form; photos
  are compressed client-side (`lib/imageCompression.ts`, shared with
  `ListingForm.tsx`) to webp before upload.
- `components/rentals/ReturnConditionForm.tsx` — owner's good/issue + note form.
- `components/rentals/ShortCodeReveal.tsx` / `ShortCodeEntry.tsx` — the two small,
  reused-in-both-directions code-exchange UI pieces.
- `components/messages/RentalRequestCard.tsx` — the structured card rendered
  inline in a conversation for a `rental_request`-type message; handles
  accept/reject/cancel directly, and links to `/rentals/[id]` once `accepted` or
  later.

---

## 7. Storage buckets

| Bucket | Public | Path convention | Purpose |
|---|---|---|---|
| `listing-images` | yes | `{owner_id}/{listing_id}/{file}` | listing gallery photos |
| `avatar-images` | yes | `{user_id}/{file}` | profile avatars |
| `rental-condition-images` | **no** | `{rental_request_id}/{file}` | handover condition photos; RLS-scoped to that rental's renter/owner only, signed URLs generated client-side for display |

All three enforce a 5 MB file-size limit and JPEG/PNG/WebP only at the Storage
level, in addition to client-side compression before upload.

---

## 8. Known gaps / roadmap

The product brief for the Protected Rental Flow prioritizes work as P0–P3. What's
in this repo today is **P0 only**:

- ✅ Full request → accept → handover → active → return → completed lifecycle
- ✅ Condition photos + two-sided confirmation before handover
- ✅ Two-sided code confirmation at both handover and return
- ✅ Shared rental record page, per-role guided UI

**Not yet built (P1)**:
- Dispute reporting ("Signaler un problème") as its own tracked record — today,
  `submit_return_condition`'s `'issue'` status is the only signal; there's no
  category/photo evidence/structured dispute table yet.
- Reviews / reputation (star ratings, "N rentals completed", "% returns
  confirmed") — no `reviews` table exists yet. The underlying data it would need
  (completed-rental history, code-confirmed handovers/returns) already exists, so
  this can be built without touching the schema above.
- Trust badges surfaced on listing cards / profile pages (verified checkmark,
  completed-rental count, rating).

**P2+, deliberately deferred further**: return photos (handover already supports
photos; return intentionally doesn't yet), a structured accessory checklist
(handover currently uses a free-text note for this), and "external rental" links
for items discovered outside the marketplace (the schema doesn't hard-couple a
`rental_request` to a `listings` row in a way that would block this later, but no
UI exists for it).
