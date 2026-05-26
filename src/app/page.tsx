import { LandingFaqV2 } from "@/interface/ui/landing/LandingFaqV2";
import { LandingFinalCta } from "@/interface/ui/landing/LandingFinalCta";
import { LandingHeader } from "@/interface/ui/landing/LandingHeader";
import { LandingHero } from "@/interface/ui/landing/LandingHero";
import { LandingPricing } from "@/interface/ui/landing/LandingPricing";
import { LandingTrustSafety } from "@/interface/ui/landing/LandingTrustSafety";
import { LandingTrustStrip } from "@/interface/ui/landing/LandingTrustStrip";

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingTrustStrip />
        <LandingPricing />
        <LandingTrustSafety />
        <LandingFaqV2 />
        <LandingFinalCta />
      </main>
    </>
  );
}
