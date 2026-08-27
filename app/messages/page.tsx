import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/i18n/LocalizedLink";
import { redirect } from "next/navigation";
import { Paperclip, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import type { ConversationWithDetails, MessageWithListing } from "@/lib/supabase/types";
import { getServerI18n } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default async function MessagesPage() {
  const { t } = await getServerI18n();
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

  // Only the single most recent message per conversation is rendered below.
  // A plain `.in()` query can't express "top 1 per group" in one round trip,
  // so this caps total rows instead of fetching every message ever sent
  // across every one of the user's conversations. A user would need over
  // 300 messages more recent than a given conversation's last one for that
  // conversation to lose its preview here — see the audit notes for the
  // exact `DISTINCT ON` fix if that starts happening in practice.
  const { data: recentMessages } = conversationIds.length
    ? await supabase
        .from("messages")
        .select("*, listings(name, slug, image_url, price_per_day, description)")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(300)
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
            const otherName = other?.full_name ?? t("listing.dabberUser");

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
                          ? lastMessage.listings?.name ?? t("common.listing")
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
            title={t("messages.empty")}
            description={t("messages.emptyDescription")}
          />
        </div>
      )}
    </div>
  );
}
