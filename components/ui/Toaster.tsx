"use client";

import { useSyncExternalStore } from "react";
import { getServerToastSnapshot, getToastSnapshot, subscribeToasts } from "@/lib/toast";

export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToastSnapshot, getServerToastSnapshot);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto max-w-sm rounded-xl bg-ink px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
