import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import enMessages from "../../../messages/en.json";
import { landingClientMessages } from "@/app/_landing/landingClientMessages";
import { LandingPageContent } from "@/app/_landing/LandingPageContent";
import { landingMetadata } from "@/app/_landing/landingMetadata";

// `dynamic = "error"` : toute API dynamique (cookies/headers) glissée dans l'arbre fait
// ÉCHOUER le build en nommant l'API fautive, au lieu de redynamifier silencieusement la page.
export const dynamic = "error";
export const metadata = landingMetadata("en");

/**
 * Landing EN — STATIQUE, pendant anglais de `/` (hreflang croisés via landingMetadata).
 * LandingLocaleSync corrige `<html lang>` et pose le cookie `locale=en` si absent, pour
 * qu'un visiteur arrivé directement ici continue en anglais sur /signup et le reste du site.
 * Le build doit afficher `○ /en` — vérifié en CI par scripts/check-landing-budget.mjs.
 */
export default function EnglishHomePage() {
  setRequestLocale("en");
  return (
    <NextIntlClientProvider locale="en" messages={landingClientMessages(enMessages)}>
      <LandingPageContent locale="en" />
    </NextIntlClientProvider>
  );
}
