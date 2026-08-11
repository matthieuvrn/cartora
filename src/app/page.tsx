import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import frMessages from "../../messages/fr.json";
import { landingClientMessages } from "@/app/_landing/landingClientMessages";
import { LandingPageContent } from "@/app/_landing/LandingPageContent";
import { landingMetadata } from "@/app/_landing/landingMetadata";

// `dynamic = "error"` : toute API dynamique (cookies/headers) glissée dans l'arbre fait
// ÉCHOUER le build en nommant l'API fautive, au lieu de redynamifier silencieusement la page.
export const dynamic = "error";
export const metadata = landingMetadata("fr");

/**
 * Landing FR — STATIQUE (prérendue, servie du CDN). `setRequestLocale("fr")` fournit la
 * locale à tout l'arbre RSC sans lecture de cookie (cf. i18n/request.ts) ; le provider
 * n'embarque que les namespaces consommés par les composants clients de la landing
 * (cf. landingClientMessages — PAS fr.json entier). Le pendant anglais vit sur /en.
 * Le build doit afficher `○ /` — vérifié en CI par scripts/check-landing-budget.mjs.
 */
export default function HomePage() {
  setRequestLocale("fr");
  return (
    <NextIntlClientProvider locale="fr" messages={landingClientMessages(frMessages)}>
      <LandingPageContent locale="fr" />
    </NextIntlClientProvider>
  );
}
