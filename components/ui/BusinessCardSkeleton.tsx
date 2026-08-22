export default function BusinessCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement de la boutique"
      className="flex flex-col rounded-2xl border border-border bg-white p-6"
    >
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse rounded-xl bg-border" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-32 animate-pulse rounded bg-border" />
          <div className="h-3 w-20 animate-pulse rounded bg-border" />
        </div>
      </div>
      <div className="mt-4 h-3 w-full animate-pulse rounded bg-border" />
      <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-border" />
    </div>
  );
}
