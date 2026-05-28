import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LandingAudience } from "@/interface/ui/landing/LandingAudience";
import { LandingComparison } from "@/interface/ui/landing/LandingComparison";
import { LandingDemoPreview } from "@/interface/ui/landing/LandingDemoPreview";
import { LandingFaqV2 } from "@/interface/ui/landing/LandingFaqV2";
import { FAQ_ITEMS } from "@/interface/ui/landing/faqItems";
import { LandingFeatures } from "@/interface/ui/landing/LandingFeatures";
import { LandingFinalCta } from "@/interface/ui/landing/LandingFinalCta";
import { LandingHeader } from "@/interface/ui/landing/LandingHeader";
import { LandingHero } from "@/interface/ui/landing/LandingHero";
import { LandingHowItWorks } from "@/interface/ui/landing/LandingHowItWorks";
import { LandingPricing } from "@/interface/ui/landing/LandingPricing";
import { LandingProblem } from "@/interface/ui/landing/LandingProblem";
import { LandingTrustSafety } from "@/interface/ui/landing/LandingTrustSafety";
import { LandingTrustStrip } from "@/interface/ui/landing/LandingTrustStrip";
import { ScrollDepthTracker } from "@/interface/ui/landing/ScrollDepthTracker";

const FR_TITLE = "Cartora — Menu digital pour restaurateurs indépendants";
const FR_DESCRIPTION =
  "Créez votre menu en ligne en 10 minutes, mettez-le à jour à la seconde, et partagez-le via QR code. Sans technique, sans engagement.";
const EN_TITLE = "Cartora — Digital menu for independent restaurants";
const EN_DESCRIPTION =
  "Build your online menu in 10 minutes, update it in real time, and share it via QR code. No technical skill required, no commitment.";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEn = locale === "en";
  const title = isEn ? EN_TITLE : FR_TITLE;
  const description = isEn ? EN_DESCRIPTION : FR_DESCRIPTION;

  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      type: "website",
      locale: isEn ? "en_US" : "fr_FR",
      siteName: "Cartora",
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HomePage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cartora.app";
  const t = await getTranslations("Landing.faq");

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Cartora",
    url: baseUrl,
    logo: `${baseUrl}/icon.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@cartora.app",
      contactType: "customer support",
      areaServed: "FR",
      availableLanguage: ["French", "English"],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((key) => ({
      "@type": "Question",
      name: t(`items.${key}.q`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`items.${key}.a`),
      },
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
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingTrustStrip />
        <LandingAudience />
        <LandingProblem />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingDemoPreview />
        <LandingComparison />
        <LandingPricing />
        <LandingTrustSafety />
        <LandingFaqV2 />
        <LandingFinalCta />
        <ScrollDepthTracker />
      </main>
    </>
  );
}
