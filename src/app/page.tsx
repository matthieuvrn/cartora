import { LandingHeader } from "@/interface/ui/landing/LandingHeader";
import { LandingHero } from "@/interface/ui/landing/LandingHero";

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
      </main>
    </>
  );
}
