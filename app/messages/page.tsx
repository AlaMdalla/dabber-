import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Paperclip, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import type { ConversationWithDetails, MessageWithListing } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/messages");
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      "*, user_a:profiles!conversations_user_a_id_fkey(full_name, avatar_url), user_b:profiles!conversations_user_b_id_fkey(full_name, avatar_url)"
    )
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .returns<ConversationWithDetails[]>();

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);

  const { data: recentMessages } = conversationIds.length
    ? await supabase
        .from("messages")
        .select("*, listings(name, slug, image_url, price_per_day, description)")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .returns<MessageWithListing[]>()
    : { data: [] as MessageWithListing[] };

  const lastMessageByConversation = new Map<string, MessageWithListing>();
  for (const message of recentMessages ?? []) {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Messages</h1>

      {conversations && conversations.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          {conversations.map((conversation) => {
            const isUserA = conversation.user_a_id === user.id;
            const other = isUserA ? conversation.user_b : conversation.user_a;
            const lastMessage = lastMessageByConversation.get(conversation.id);
            const otherName = other?.full_name ?? "Utilisateur Dabber";

            return (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-muted">
                    {other?.avatar_url ? (
                      <Image
                        src={other.avatar_url}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <UserIcon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {otherName}
                    </p>
                    {lastMessage && (
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
                        {lastMessage.listing_id && (
                          <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
                        )}
                        {lastMessage.listing_id
                          ? lastMessage.listings?.name ?? "Annonce"
                          : lastMessage.body}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Aucune conversation"
            description="Contactez un vendeur depuis une annonce pour démarrer une conversation."
          />
        </div>
      )}
    </div>
  );
}
