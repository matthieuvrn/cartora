import { LandingAudience } from "@/interface/ui/landing/LandingAudience";
import { LandingFaqV2 } from "@/interface/ui/landing/LandingFaqV2";
import { LandingFeatures } from "@/interface/ui/landing/LandingFeatures";
import { LandingFinalCta } from "@/interface/ui/landing/LandingFinalCta";
import { LandingHeader } from "@/interface/ui/landing/LandingHeader";
import { LandingHero } from "@/interface/ui/landing/LandingHero";
import { LandingHowItWorks } from "@/interface/ui/landing/LandingHowItWorks";
import { LandingPricing } from "@/interface/ui/landing/LandingPricing";
import { LandingProblem } from "@/interface/ui/landing/LandingProblem";
import { LandingTrustSafety } from "@/interface/ui/landing/LandingTrustSafety";
import { LandingTrustStrip } from "@/interface/ui/landing/LandingTrustStrip";

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingTrustStrip />
        <LandingAudience />
        <LandingProblem />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingPricing />
        <LandingTrustSafety />
        <LandingFaqV2 />
        <LandingFinalCta />
      </main>
    </>
  );
}
