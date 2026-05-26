import { LandingFinalCta } from "@/interface/ui/landing/LandingFinalCta";
import { LandingHeader } from "@/interface/ui/landing/LandingHeader";
import { LandingHero } from "@/interface/ui/landing/LandingHero";
import { LandingPricing } from "@/interface/ui/landing/LandingPricing";
import { LandingTrustStrip } from "@/interface/ui/landing/LandingTrustStrip";

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingTrustStrip />
        <LandingPricing />
        <LandingFinalCta />
      </main>
    </>
  );
}
