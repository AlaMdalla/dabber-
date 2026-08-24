"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/supabase/errorMessage";
import type { Message, MessageWithListing, SharedListing } from "@/lib/supabase/types";

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageWithListing[];
  otherWhatsappNumber?: string | null;
}

function SharedListingCard({ listing }: { listing: SharedListing }) {
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
            ? `${listing.price_per_day} DT / jour`
            : "Prix sur demande"}
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
  const [messages, setMessages] = useState<MessageWithListing[]>(initialMessages);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function handleSendWhatsapp() {
    const trimmed = body.trim();
    if (!trimmed || !otherWhatsappNumber) return;

    const digits = otherWhatsappNumber.replace(/\D/g, "");
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(trimmed)}`,
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
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex flex-col gap-1.5 ${isMine ? "items-end" : "items-start"}`}
            >
              {message.listings && <SharedListingCard listing={message.listings} />}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMine ? "bg-accent text-ink" : "bg-subtle text-ink"
                }`}
              >
                {message.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border p-4"
      >
        <input
          type="text"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Écrire un message…"
          className="h-12 flex-1 rounded-xl border border-border px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="submit"
          disabled={isSending || !body.trim()}
          className="h-12 rounded-xl bg-accent px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
        >
          Envoyer
        </button>
        {otherWhatsappNumber && (
          <button
            type="button"
            onClick={handleSendWhatsapp}
            disabled={!body.trim()}
            aria-label="Envoyer ce message via WhatsApp"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-colors hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
