import { getTranslations } from "next-intl/server";
import { CookieBanner } from "@/interface/ui/components/consent/CookieBanner";
import { LandingDemoPreview } from "@/interface/ui/landing/LandingDemoPreview";
import { LandingFaqV2 } from "@/interface/ui/landing/LandingFaqV2";
import { FAQ_ANSWER_TAGS, FAQ_CONTACT_EMAIL, FAQ_ITEMS } from "@/interface/ui/landing/faqItems";
import { LandingFeatures } from "@/interface/ui/landing/LandingFeatures";
import { LandingFinalCta } from "@/interface/ui/landing/LandingFinalCta";
import { LandingHeader } from "@/interface/ui/landing/LandingHeader";
import { Logo } from "@/interface/ui/components/Logo";
import { LandingHero } from "@/interface/ui/landing/LandingHero";
import { LandingHowItWorks } from "@/interface/ui/landing/LandingHowItWorks";
import { LandingLocaleSync } from "@/interface/ui/landing/LandingLocaleSync";
import { LandingPricing } from "@/interface/ui/landing/LandingPricing";
import { MotionSection } from "@/interface/ui/landing/MotionSection";
import { LandingProblem } from "@/interface/ui/landing/LandingProblem";
import { LandingTrustStrip } from "@/interface/ui/landing/LandingTrustStrip";
import { LandingFooter } from "@/interface/ui/components/LandingFooter";
import { ScrollDepthTracker } from "@/interface/ui/landing/ScrollDepthTracker";
import { SectionViewTracker } from "@/interface/ui/landing/SectionViewTracker";
import { StickyMobileCTA } from "@/interface/ui/landing/StickyMobileCTA";

/**
 * Composition partagée des deux pages landing statiques (`/` fr, `/en` en). La page
 * appelante DOIT avoir appelé `setRequestLocale(locale)` avant de rendre ce composant
 * (les getTranslations/useTranslations RSC de tout l'arbre en dépendent) et fournir un
 * NextIntlClientProvider pour les composants clients. CookieBanner est rendu ici (et non
 * par le root layout, désormais statique et sans provider).
 */
export async function LandingPageContent({ locale }: { locale: "fr" | "en" }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cartora.app";
  const t = await getTranslations("Landing.faq");
  const tLanding = await getTranslations("Landing");

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Cartora",
    url: baseUrl,
    logo: `${baseUrl}/icon.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      email: FAQ_CONTACT_EMAIL,
      contactType: "customer support",
      areaServed: "FR",
      availableLanguage: ["French", "English"],
    },
  };

  // Balises ICU des réponses rendues en texte nu (fonctions identité) : le JSON-LD doit rester une
  // string. Un `t()` simple (sans valeurs) renverrait la chaîne BRUTE avec ses balises
  // `<pricing>…</pricing>` dans le JSON-LD (fast path use-intl) ; `t.markup` + fonctions identité
  // rend le texte nu. Une balise sans fonction (t.rich / t.markup) fait retomber next-intl sur la
  // CLÉ — d'où le test faq-answer-tags (balises ⊆ FAQ_ANSWER_TAGS).
  const stripAnswerTags = Object.fromEntries(
    FAQ_ANSWER_TAGS.map((tag) => [tag, (chunks: string) => chunks]),
  ) as Record<(typeof FAQ_ANSWER_TAGS)[number], (chunks: string) => string>;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((key) => ({
      "@type": "Question",
      name: t(`items.${key}.q`),
      acceptedAnswer: { "@type": "Answer", text: t.markup(`items.${key}.a`, stripAnswerTags) },
    })),
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cartora",
    url: baseUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        name: "FREE",
        price: "0",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "STARTER",
        price: "9.90",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "9.90",
          priceCurrency: "EUR",
          unitText: "MONTH",
        },
      },
      {
        "@type": "Offer",
        name: "PRO",
        price: "29.90",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "29.90",
          priceCurrency: "EUR",
          unitText: "MONTH",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <LandingLocaleSync locale={locale} />
      {/* Thème Cartora scopé à la landing (cf. globals.css .theme-cartora) — le dashboard
          /app et les menus publics /m/[slug] gardent le thème neutre. */}
      <div className="theme-cartora bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-canard-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-sand-50 focus:not-sr-only"
        >
          {tLanding("skipToContent")}
        </a>
        {/* Logo rendu ici (serveur) : voir la note `logo` de LandingHeader (budget JS). Mark seul
            sous sm (24 px) pour garder le CTA court dans la barre à 360 px, lockup h-7 dès sm ;
            les deux rendus SERVEUR (budget JS). */}
        <LandingHeader
          logo={
            <>
              <Logo variant="mark" className="h-6 sm:hidden" />
              <Logo className="hidden h-7 sm:block" />
            </>
          }
        />
        {/* Arc en 9 sections (refonte 2026, ex-12) : Hero → TrustStrip → Problème (fusionné
            avec l'ancienne Comparaison) → Comment ça marche → Features (audience intégrée à
            l'étape 2) → Démo-preuve → Pricing → FAQ → Final CTA. TrustSafety supprimée : la
            confiance vit dans la strip + la FAQ (elle était traitée trois fois). */}
        <main id="main">
          <LandingHero />
          {/* Reveal-on-scroll par section (fade seul, sans delay cumulatif — cf. docblock de
              MotionSection). */}
          <MotionSection>
            <LandingTrustStrip />
          </MotionSection>
          <MotionSection>
            <LandingProblem />
          </MotionSection>
          <MotionSection>
            <LandingHowItWorks />
          </MotionSection>
          <MotionSection>
            <LandingFeatures />
          </MotionSection>
          <MotionSection>
            <LandingDemoPreview />
          </MotionSection>
          <MotionSection>
            <LandingPricing />
          </MotionSection>
          <MotionSection>
            <LandingFaqV2 />
          </MotionSection>
          <MotionSection>
            <LandingFinalCta />
          </MotionSection>
          <ScrollDepthTracker />
          {/* Union des ids suivis (header nav, features, FAQ) — écrite UNE fois ici, ordre de page. */}
          <SectionViewTracker
            sectionIds={["how-it-works", "features", "demo", "pricing", "faq", "final-cta"]}
          />
        </main>
        <LandingFooter />
        <StickyMobileCTA />
      </div>
      {/* CookieBanner : client-only par construction (useHydrated) — HTML serveur vide dans
          TOUS les modes de rendu, apparition au montage. Plus de <Suspense> : le
          useSearchParams qui l'exigeait a été retiré du composant (en dev 16.2.12 son
          bailout CSR côté client face à un SSR dynamique contenant la bannière produisait
          un « Hydration failed » à chaque chargement — cf. docblock du composant). */}
      <CookieBanner />
    </>
  );
}
