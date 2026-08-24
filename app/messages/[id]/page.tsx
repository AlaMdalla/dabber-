import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ImageOff, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ConversationWithDetails, Message } from "@/lib/supabase/types";
import MessageThread from "@/components/messages/MessageThread";

export default async function ConversationPage({
  params,
}: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/messages/${id}`);
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "*, listings(name, slug, image_url), buyer:profiles!conversations_buyer_id_fkey(full_name, avatar_url), seller:profiles!conversations_seller_id_fkey(full_name, avatar_url)"
    )
    .eq("id", id)
    .single<ConversationWithDetails>();

  if (!conversation) {
    notFound();
  }

  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const isBuyer = conversation.buyer_id === user.id;
  const other = isBuyer ? conversation.seller : conversation.buyer;
  const otherId = isBuyer ? conversation.seller_id : conversation.buyer_id;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-3xl flex-col px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 border-b border-border py-4">
        <Link
          href="/messages"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href={`/profiles/${otherId}`}
          aria-label={`Voir le profil de ${other?.full_name ?? "cet utilisateur"}`}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {other?.avatar_url ? (
            <Image
              src={other.avatar_url}
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserIcon className="h-4 w-4" aria-hidden="true" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profiles/${otherId}`}
            className="block truncate text-sm font-semibold text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {other?.full_name ?? "Utilisateur Dabber"}
          </Link>
          {conversation.listings && (
            <Link
              href={`/listings/${conversation.listings.slug}`}
              className="truncate text-xs text-muted underline underline-offset-2 hover:text-ink"
            >
              {conversation.listings.name}
            </Link>
          )}
        </div>
        <div className="relative hidden h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-subtle text-muted sm:flex">
          {conversation.listings?.image_url ? (
            <Image
              src={conversation.listings.image_url}
              alt=""
              fill
              sizes="36px"
              className="object-cover"
            />
          ) : (
            <ImageOff className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
      </div>

      <MessageThread
        conversationId={conversation.id}
        currentUserId={user.id}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
