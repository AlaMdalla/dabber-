"use client";

import { useI18n } from "@/components/i18n/LocaleProvider";
import type { Message, RentalRequestWithItems } from "@/lib/supabase/types";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

interface StatusEventPillProps {
  message: Message & { rental_requests?: RentalRequestWithItems | null };
}

const EVENT_KEYS: Record<string, TranslationKey> = {
  accepted: "rentalRequest.eventAccepted",
  rejected: "rentalRequest.eventRejected",
  cancelled: "rentalRequest.eventCancelled",
  completed: "rentalRequest.eventCompleted",
  active: "rentalRequest.eventActive",
};

export default function StatusEventPill({ message }: StatusEventPillProps) {
  const { t } = useI18n();

  if (!message.status_event_type) return null;
  const key = EVENT_KEYS[message.status_event_type];
  if (!key) return null;

  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-muted shadow-sm">
        {t(key)}
      </span>
    </div>
  );
}
