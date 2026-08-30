"use client";

// Minimal dependency-free toast store: no toast/notification library exists
// in this project yet, and pulling one in just for a couple of confirmation
// messages isn't worth a new dependency. `showToast` can be called from any
// client component; `<Toaster />` (mounted once in the root layout) renders
// whatever is currently queued.

export interface ToastItem {
  id: number;
  message: string;
}

let toasts: ToastItem[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function showToast(message: string, durationMs = 4000) {
  const id = ++nextId;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
  }, durationMs);
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToastSnapshot() {
  return toasts;
}

// Must return a referentially stable value — a fresh [] on every call makes
// useSyncExternalStore think the snapshot changes on every render.
const EMPTY_TOASTS: ToastItem[] = [];

export function getServerToastSnapshot(): ToastItem[] {
  return EMPTY_TOASTS;
}
