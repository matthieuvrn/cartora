import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/interface/ui/components/Logo";
import { ManageCookiesButton } from "@/interface/ui/components/consent/ManageCookiesButton";
import { COOKIE_BANNER_OFFSET } from "@/interface/ui/components/consent/cookieBannerOffset";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    // Footer minimal global, rendu via <LocaleShell> (auth/légal//m ; masqué par CSS sur le
    // shell dashboard — cf. globals.css : body:has([data-app-shell]) [data-global-footer]).
    // La landing statique ne passe pas par LocaleShell : elle rend son <LandingFooter/> riche.
    <footer
      data-global-footer
      className="border-t"
      // « Gérer mes cookies » et les liens légaux dégagés de la bannière tant qu'elle est visible.
      style={{ marginBottom: COOKIE_BANNER_OFFSET }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between">
        {/* Mark mono (currentColor = muted-foreground) : présent aussi sur les menus publics /m/,
            où la marque ne doit pas injecter sa couleur — le copyright y figurait déjà. */}
        <p className="inline-flex items-center gap-2">
          <Logo variant="mark" tone="mono" className="h-4" />
          <span>&copy; {new Date().getFullYear()} Cartora</span>
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/confidentialite" className="underline-offset-4 hover:underline">
            {t("privacy")}
          </Link>
          <Link href="/mentions-legales" className="underline-offset-4 hover:underline">
            {t("legal")}
          </Link>
          <Link href="/cgu" className="underline-offset-4 hover:underline">
            {t("terms")}
          </Link>
          <ManageCookiesButton />
        </nav>
      </div>
    </footer>
  );
}
