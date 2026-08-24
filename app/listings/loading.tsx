import ListingCardSkeleton from "@/components/ui/ListingCardSkeleton";

export default function LoadingListings() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-8 w-56 animate-pulse rounded bg-border" />
      <div className="mt-2 h-5 w-72 max-w-full animate-pulse rounded bg-border" />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ListingCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
