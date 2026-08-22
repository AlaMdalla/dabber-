import HeroSection from "@/components/home/HeroSection";
import CategorySection from "@/components/home/CategorySection";
import FeaturedListings from "@/components/home/FeaturedListings";
import FeaturedBusinesses from "@/components/home/FeaturedBusinesses";
import HowItWorks from "@/components/home/HowItWorks";
import TrustSection from "@/components/home/TrustSection";
import ProfessionalCTA from "@/components/home/ProfessionalCTA";

export default function Home() {
  return (
    <>
      <HeroSection />
      <CategorySection />
      <FeaturedListings />
      <FeaturedBusinesses />
      <HowItWorks />
      <TrustSection />
      <ProfessionalCTA />
    </>
  );
}
