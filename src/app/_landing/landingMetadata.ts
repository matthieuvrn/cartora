import type { Metadata } from "next";

/**
 * Métadonnées des deux pages landing statiques (`/` = fr, `/en` = en). Constantes par locale
 * — surtout PAS de getLocale()/getTranslations() dans generateMetadata : toute API dynamique
 * y casserait le prerender. Les alternates hreflang relient les deux pages (x-default = fr,
 * marché principal).
 *
 * `title.absolute` : `/en` est un segment ENFANT du root layout, donc son `title.template`
 * (« %s | Cartora ») s'y appliquait (marque doublée) alors que `/` (même segment) y échappait.
 * L'og:image n'est PAS déclarée ici : un `openGraph` de page remplace celui du root en bloc,
 * l'image file-based n'est réinjectée que depuis un `opengraph-image.tsx` du segment — d'où
 * `src/app/en/opengraph-image.tsx` (ré-export du root avec un alt EN).
 */
const COPY = {
  fr: {
    title: "Cartora — Menu digital pour restaurateurs indépendants",
    description:
      "Créez votre menu en ligne en 10 minutes, mettez-le à jour à la seconde, et partagez-le via QR code. Sans technique, sans engagement.",
    path: "/",
    ogLocale: "fr_FR",
    ogAlternate: "en_US",
  },
  en: {
    title: "Cartora — Digital menu for independent restaurants",
    description:
      "Build your online menu in 10 minutes, update it in real time, and share it via QR code. No technical skill required, no commitment.",
    path: "/en",
    ogLocale: "en_US",
    ogAlternate: "fr_FR",
  },
} as const;

export function landingMetadata(locale: "fr" | "en"): Metadata {
  const copy = COPY[locale];
  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      canonical: copy.path,
      languages: { fr: "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      type: "website",
      locale: copy.ogLocale,
      alternateLocale: copy.ogAlternate,
      siteName: "Cartora",
      url: copy.path,
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
    },
  };
}
