"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MarkNotificationsRead() {
  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("mark_reservation_notifications_read").then(({ error }) => {
      if (error) {
        console.error("[MarkNotificationsRead] failed:", error);
        return;
      }
      window.dispatchEvent(new Event("dabber:notifications-read"));
    });
  }, []);

  return null;
}
