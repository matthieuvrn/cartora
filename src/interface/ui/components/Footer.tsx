import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ManageCookiesButton } from "@/interface/ui/components/consent/ManageCookiesButton";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    // Footer minimal global (toutes routes hors landing). Sur la landing, masqué par CSS au profit
    // de <LandingFooter/> (cf. globals.css : body:has(.theme-cartora) [data-global-footer]).
    <footer data-global-footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Cartora</p>
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
