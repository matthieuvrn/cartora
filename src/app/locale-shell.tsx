import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { CookieBanner } from "@/interface/ui/components/consent/CookieBanner";
import { Footer } from "@/interface/ui/components/Footer";
import { HtmlLangSync } from "@/interface/ui/components/HtmlLangSync";

/**
 * Coquille i18n du « monde à cookie » (dashboard, auth, légal, menus publics) : résout la
 * locale UI depuis le cookie `locale` (rendu dynamique assumé — ces routes le sont déjà par
 * leurs lectures DB/session) et fournit ce que le root layout rendait avant le chantier
 * « landing statique » : provider next-intl, footer global et bannière cookies.
 *
 * Le root layout ne lit PLUS aucune API dynamique — c'est ce qui permet à `/` et `/en`
 * d'être prérendus statiques et servis du CDN (les pages landing embarquent leur propre
 * provider avec `setRequestLocale`). Toute NOUVELLE section non-landing doit envelopper son
 * layout dans <LocaleShell> pour retrouver traductions + footer + consentement.
 */
export async function LocaleShell({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangSync locale={locale} />
      {children}
      <Footer />
      <CookieBanner />
    </NextIntlClientProvider>
  );
}
