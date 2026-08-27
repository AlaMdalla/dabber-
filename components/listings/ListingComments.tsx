"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageCircle, Trash2, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ListingCommentWithAuthor } from "@/lib/supabase/types";
import { describeError } from "@/lib/supabase/errorMessage";
import { useI18n } from "@/components/i18n/LocaleProvider";

interface ListingCommentsProps {
  listingId: string;
  initialComments: ListingCommentWithAuthor[];
  currentUserId: string | null;
}

export default function ListingComments({
  listingId,
  initialComments,
  currentUserId,
}: ListingCommentsProps) {
  const { t } = useI18n();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody || !currentUserId) return;

    setIsSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("listing_comments")
      .insert({ listing_id: listingId, author_id: currentUserId, body: trimmedBody })
      .select("*, profiles(full_name, avatar_url)")
      .single<ListingCommentWithAuthor>();

    if (insertError) {
      setError(t("comments.failed", { error: describeError(insertError) }));
    } else if (data) {
      setComments((current) => [...current, data]);
      setBody("");
    }
    setIsSending(false);
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm(t("comments.deleteConfirm"))) return;

    setDeletingId(commentId);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("listing_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      setError(t("comments.failed", { error: describeError(deleteError) }));
    } else {
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    }
    setDeletingId(null);
  }

  return (
    <section className="mt-14 border-t border-border pt-10" aria-labelledby="comments-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <h2 id="comments-title" className="text-2xl font-bold tracking-tight text-ink">
              {t("comments.title")}
            </h2>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-subtle px-3 py-1 text-xs font-medium text-muted">
          {comments.length}
        </span>
      </div>

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-border bg-subtle p-4 sm:p-5">
          <label htmlFor="listing-comment" className="sr-only">
            {t("comments.placeholder")}
          </label>
          <textarea
            id="listing-comment"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t("comments.placeholder")}
            className="w-full resize-y rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted">{body.length}/1000</span>
            <button
              type="submit"
              disabled={isSending || !body.trim()}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {isSending ? t("comments.sending") : t("comments.submit")}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted">{t("comments.loginToComment")}</p>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-white px-4 sm:px-6">
        {comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t("comments.empty")}</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="py-5 first:pt-5 last:pb-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-subtle text-muted">
                  {comment.profiles?.avatar_url ? (
                    <Image src={comment.profiles.avatar_url} alt="" fill sizes="36px" className="object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">
                      {comment.profiles?.full_name ?? t("comments.user")}
                    </p>
                    {comment.author_id === currentUserId && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        aria-label={t("comments.delete")}
                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-ink/80">{comment.body}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}