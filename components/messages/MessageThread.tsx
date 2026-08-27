"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "@/components/i18n/LocalizedLink";
import { ImageOff, MessageCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import type { Message, MessageWithListing, SharedListing } from "@/lib/supabase/types";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { localizePath, type Locale } from "@/lib/i18n/config";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

function formatBubbleTime(isoDate: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(isoDate),
  );
}

function formatDaySeparator(
  isoDate: string,
  locale: Locale,
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
) {
  const date = new Date(isoDate);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return t("messages.today");
  if (date.toDateString() === yesterday.toDateString()) return t("messages.yesterday");

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
}

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageWithListing[];
  otherWhatsappNumber?: string | null;
}

function SharedListingCard({ listing }: { listing: SharedListing }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="flex w-64 max-w-full items-center gap-3 rounded-xl border border-border bg-white p-2.5 transition-colors hover:bg-subtle"
    >
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-subtle text-muted">
        {listing.image_url ? (
          <Image
            src={listing.image_url}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <ImageOff className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{listing.name}</p>
        {listing.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
            {listing.description}
          </p>
        )}
        <p className="mt-0.5 text-xs font-medium text-ink">
          {listing.price_per_day !== null
            ? t("common.priceDay", { price: listing.price_per_day })
            : t("common.priceRequest")}
        </p>
      </div>
    </Link>
  );
}

export default function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
  otherWhatsappNumber,
}: MessageThreadProps) {
  const { locale, t } = useI18n();
  const [messages, setMessages] = useState<MessageWithListing[]>(initialMessages);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function handleSendWhatsapp() {
    const trimmed = body.trim();
    if (!trimmed || !otherWhatsappNumber) return;

    const lastShared = [...messages].reverse().find((message) => message.listings);
    const listing = lastShared?.listings;
    const productInfo = listing
      ? `\n\n📦 ${listing.name}\n💰 ${
          listing.price_per_day !== null ? t("common.priceDay", { price: listing.price_per_day }) : t("common.priceRequest")
        }\n🔗 ${window.location.origin}${localizePath(`/listings/${listing.slug}`, locale)}`
      : "";
    const fullMessage = `${trimmed}${productInfo}`;

    const digits = otherWhatsappNumber.replace(/\D/g, "");
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(fullMessage)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  useEffect(() => {
    const supabase = createClient();

    async function markAsRead() {
      const { error: readError } = await supabase.rpc(
        "mark_conversation_read",
        { p_conversation_id: conversationId },
      );

      if (!readError) {
        window.dispatchEvent(new Event("dabber:messages-read"));
      }
    }

    void markAsRead();
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((current) =>
            current.some((message) => message.id === incoming.id)
              ? current
              : [...current, { ...incoming, listings: null }]
          );

          if (incoming.listing_id) {
            void supabase
              .from("listings")
              .select("name, slug, image_url, price_per_day, description")
              .eq("id", incoming.listing_id)
              .single<SharedListing>()
              .then(({ data: listing }) => {
                if (!listing) return;
                setMessages((current) =>
                  current.map((message) =>
                    message.id === incoming.id
                      ? { ...message, listings: listing }
                      : message
                  )
                );
              });
          }

          if (incoming.recipient_id === currentUserId) {
            void supabase
              .rpc("mark_conversation_read", {
                p_conversation_id: conversationId,
              })
              .then(({ error: readError }) => {
                if (!readError) {
                  window.dispatchEvent(new Event("dabber:messages-read"));
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setIsSending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: trimmed,
      })
      .select()
      .single<Message>();

    setIsSending(false);

    if (insertError) {
      console.error("[MessageThread] send failed:", insertError);
      setError(describeError(insertError));
      return;
    }

    setBody("");
    if (data) {
      setMessages((current) =>
        current.some((message) => message.id === data.id)
          ? current
          : [...current, { ...data, listings: null }]
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-subtle">
      <div className="flex-1 space-y-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-muted">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{t("messages.noMessagesYet")}</p>
              <p className="mt-1 text-sm text-muted">{t("messages.noMessagesYetDescription")}</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMine = message.sender_id === currentUserId;
            const previous = messages[index - 1];
            const showDaySeparator =
              !previous ||
              new Date(previous.created_at).toDateString() !==
                new Date(message.created_at).toDateString();

            return (
              <div key={message.id}>
                {showDaySeparator && (
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-muted">
                      {formatDaySeparator(message.created_at, locale, t)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex flex-col gap-1 py-1.5 ${isMine ? "items-end" : "items-start"}`}
                >
                  {message.listings && <SharedListingCard listing={message.listings} />}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isMine
                        ? "rounded-br-md bg-accent text-ink"
                        : "rounded-bl-md border border-border bg-white text-ink"
                    }`}
                  >
                    {message.body}
                  </div>
                  <span className="px-1 text-[11px] text-muted">
                    {formatBubbleTime(message.created_at, locale)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border bg-white p-3.5"
      >
        <input
          type="text"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("messages.write")}
          className="h-12 flex-1 rounded-full border border-border bg-subtle px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="submit"
          disabled={isSending || !body.trim()}
          aria-label={t("common.send")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <Send className="h-4.5 w-4.5 rtl:-scale-x-100" aria-hidden="true" />
        </button>
        {otherWhatsappNumber && (
          <button
            type="button"
            onClick={handleSendWhatsapp}
            disabled={!body.trim()}
            aria-label={t("messages.sendWhatsapp")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition-colors hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="bg-white px-4 pb-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
