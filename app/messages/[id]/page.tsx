import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MessageCircle, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ConversationWithDetails, MessageWithListing, Profile } from "@/lib/supabase/types";
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
      "*, user_a:profiles!conversations_user_a_id_fkey(full_name, avatar_url, whatsapp_number), user_b:profiles!conversations_user_b_id_fkey(full_name, avatar_url, whatsapp_number)"
    )
    .eq("id", id)
    .single<
      ConversationWithDetails & {
        user_a: Pick<Profile, "full_name" | "avatar_url" | "whatsapp_number"> | null;
        user_b: Pick<Profile, "full_name" | "avatar_url" | "whatsapp_number"> | null;
      }
    >();

  if (!conversation) {
    notFound();
  }

  if (conversation.user_a_id !== user.id && conversation.user_b_id !== user.id) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*, listings(name, slug, image_url, price_per_day, description)")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .returns<MessageWithListing[]>();

  const isUserA = conversation.user_a_id === user.id;
  const other = isUserA ? conversation.user_b : conversation.user_a;
  const otherId = isUserA ? conversation.user_b_id : conversation.user_a_id;
  const whatsappNumber = other?.whatsapp_number?.replace(/\D/g, "");

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
        </div>
        {whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Contacter sur WhatsApp"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-colors hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>

      <MessageThread
        conversationId={conversation.id}
        currentUserId={user.id}
        initialMessages={messages ?? []}
        otherWhatsappNumber={whatsappNumber}
      />
    </div>
  );
}
