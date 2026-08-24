import { Suspense } from "react";
import HeroSection from "@/components/home/HeroSection";
import CategorySection from "@/components/home/CategorySection";
import FeaturedListings from "@/components/home/FeaturedListings";
import FeaturedBusinesses from "@/components/home/FeaturedBusinesses";
import HowItWorks from "@/components/home/HowItWorks";
import TrustSection from "@/components/home/TrustSection";
import ProfessionalCTA from "@/components/home/ProfessionalCTA";
import ListingCardSkeleton from "@/components/ui/ListingCardSkeleton";

function FeaturedListingsFallback() {
  return (
    <section className="bg-subtle py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded bg-border" />
        <div className="mt-2 h-5 w-80 max-w-full animate-pulse rounded bg-border" />
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ListingCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <CategorySection />
      <Suspense fallback={<FeaturedListingsFallback />}>
        <FeaturedListings />
      </Suspense>
      <FeaturedBusinesses />
      <HowItWorks />
      <TrustSection />
      <ProfessionalCTA />
    </>
  );
}
