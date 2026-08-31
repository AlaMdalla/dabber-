"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MarkNotificationsRead() {
  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.rpc("mark_reservation_notifications_read"),
      supabase.rpc("mark_rental_request_notifications_read"),
    ]).then(([reservationResult, rentalRequestResult]) => {
      if (reservationResult.error || rentalRequestResult.error) {
        console.error(
          "[MarkNotificationsRead] failed:",
          reservationResult.error ?? rentalRequestResult.error,
        );
        return;
      }
      window.dispatchEvent(new Event("dabber:notifications-read"));
    });
  }, []);

  return null;
}
