"use client";

// Dependency-free external store for the multi-item rental cart, following
// the same pattern as lib/toast.ts: a module-level snapshot, a listener set,
// and subscribe/getSnapshot/getServerSnapshot for useSyncExternalStore.
// Persisted to localStorage (survives refresh and login redirects) and kept
// in sync across tabs via the `storage` event. A cart can only ever hold
// items from one owner -- addCartItem() reports "different-owner" instead
// of silently mutating so the UI can offer to keep or replace the cart.

import type { FulfillmentMethod } from "@/lib/supabase/types";

export interface CartItem {
  listingId: string;
  listingSlug: string;
  listingName: string;
  listingImageUrl: string | null;
  unitPrice: number | null;
  availableQuantity: number;
  quantity: number;
  startDate: string;
  endDate: string;
}

export interface CartState {
  ownerId: string | null;
  ownerName: string | null;
  items: CartItem[];
  message: string;
  fulfillmentMethod: FulfillmentMethod;
  deliveryAddress: string;
  idempotencyKey: string;
}

export type AddItemResult = "added" | "updated" | "different-owner";

const STORAGE_KEY = "dabber:cart";

function emptyCart(): CartState {
  return {
    ownerId: null,
    ownerName: null,
    items: [],
    message: "",
    fulfillmentMethod: "pickup",
    deliveryAddress: "",
    idempotencyKey: "",
  };
}

const EMPTY_CART = emptyCart();

let cart: CartState = emptyCart();
let hasLoaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage unavailable (private mode, quota, disabled) -- cart just
    // won't survive a refresh; nothing to recover from here.
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cart = raw ? { ...emptyCart(), ...JSON.parse(raw) } : emptyCart();
  } catch {
    cart = emptyCart();
  }
}

function ensureLoaded() {
  if (hasLoaded || typeof window === "undefined") return;
  hasLoaded = true;
  load();
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      load();
      emit();
    }
  });
}

function findIndex(items: CartItem[], listingId: string, startDate: string, endDate: string) {
  return items.findIndex(
    (item) => item.listingId === listingId && item.startDate === startDate && item.endDate === endDate,
  );
}

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function subscribeCart(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCartSnapshot(): CartState {
  ensureLoaded();
  return cart;
}

export function getServerCartSnapshot(): CartState {
  return EMPTY_CART;
}

/** Adds (or updates the quantity of) one line. Returns "different-owner" without changing anything if the cart already belongs to another owner. */
export function addCartItem(owner: { id: string; name: string | null }, item: CartItem): AddItemResult {
  ensureLoaded();
  if (cart.ownerId && cart.ownerId !== owner.id && cart.items.length > 0) {
    return "different-owner";
  }

  const index = findIndex(cart.items, item.listingId, item.startDate, item.endDate);
  const items =
    index === -1
      ? [...cart.items, item]
      : cart.items.map((existing, i) => (i === index ? { ...existing, quantity: item.quantity } : existing));

  cart = {
    ...cart,
    ownerId: owner.id,
    ownerName: owner.name,
    items,
    idempotencyKey: cart.idempotencyKey || newIdempotencyKey(),
  };
  persist();
  emit();
  return index === -1 ? "added" : "updated";
}

/** Discards the current cart and starts a fresh one with just this item -- used after the renter confirms "start a new cart" for a different owner. */
export function replaceCartWithItem(owner: { id: string; name: string | null }, item: CartItem) {
  cart = { ...emptyCart(), ownerId: owner.id, ownerName: owner.name, items: [item], idempotencyKey: newIdempotencyKey() };
  persist();
  emit();
}

export function updateCartItem(
  listingId: string,
  startDate: string,
  endDate: string,
  changes: Partial<Pick<CartItem, "quantity" | "startDate" | "endDate" | "availableQuantity">>,
) {
  ensureLoaded();
  cart = {
    ...cart,
    items: cart.items.map((item) =>
      item.listingId === listingId && item.startDate === startDate && item.endDate === endDate
        ? { ...item, ...changes }
        : item,
    ),
  };
  persist();
  emit();
}

export function removeCartItem(listingId: string, startDate: string, endDate: string) {
  ensureLoaded();
  const items = cart.items.filter(
    (item) => !(item.listingId === listingId && item.startDate === startDate && item.endDate === endDate),
  );
  cart = {
    ...cart,
    items,
    ownerId: items.length > 0 ? cart.ownerId : null,
    ownerName: items.length > 0 ? cart.ownerName : null,
  };
  persist();
  emit();
}

export function setCartDetails(
  changes: Partial<Pick<CartState, "message" | "fulfillmentMethod" | "deliveryAddress">>,
) {
  ensureLoaded();
  cart = { ...cart, ...changes };
  persist();
  emit();
}

/** Called only after a successful submission -- a failed one must leave the cart untouched. */
export function clearCart() {
  cart = emptyCart();
  persist();
  emit();
}
