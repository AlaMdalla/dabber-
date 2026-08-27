import { Suspense } from "react";
import HeroSection from "@/components/home/HeroSection";
import CategorySection from "@/components/home/CategorySection";
import FeaturedListings from "@/components/home/FeaturedListings";
import HowItWorks from "@/components/home/HowItWorks";
import TrustSection from "@/components/home/TrustSection";
import ProfessionalCTA from "@/components/home/ProfessionalCTA";
import FAQSection from "@/components/home/FAQSection";
import ListingCardSkeleton from "@/components/ui/ListingCardSkeleton";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

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

export default async function Home() {
  const locale = await getLocale();
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}${localizePath("/listings?query={search_term_string}", locale)}`,
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    areaServed: "TN",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([websiteJsonLd, organizationJsonLd]).replace(
            /</g,
            "\\u003c"
          ),
        }}
      />
      <HeroSection />
      <HowItWorks />
      <CategorySection />
      <Suspense fallback={<FeaturedListingsFallback />}>
        <FeaturedListings />
      </Suspense>
      <TrustSection />
      <FAQSection />
      <ProfessionalCTA />
    </>
  );
}
