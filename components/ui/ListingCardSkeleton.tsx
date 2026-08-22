export default function ListingCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement de l'annonce"
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white"
    >
      <div className="aspect-[4/3] w-full animate-pulse bg-border" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-border" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-border" />
        <div className="mt-1 h-4 w-1/3 animate-pulse rounded bg-border" />
      </div>
    </div>
  );
}
