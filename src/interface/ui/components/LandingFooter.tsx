import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/interface/ui/components/Logo";
import { ManageCookiesButton } from "@/interface/ui/components/consent/ManageCookiesButton";

// Footer riche de la landing (rendu DANS .theme-cartora via page.tsx → tokens canard/sapin).
// Le footer minimal global (layout.tsx) est masqué sur la landing par CSS (body:has(.theme-cartora)).
// Liens : UNIQUEMENT des destinations qui existent (ancres landing + routes legal + auth). Pas de
// blog/support/statut/contact inventés (= liens morts), pas de newsletter (pas de backend).

type FooterLink = { href: string; label: string; external?: boolean };

const linkClass =
  "inline-flex min-h-[44px] items-center text-body-sm text-sand-600 transition-colors hover:text-canard-700";

export async function LandingFooter() {
  const t = await getTranslations("Footer");

  const columns: ReadonlyArray<{ heading: string; links: FooterLink[] }> = [
    {
      heading: t("colProduct"),
      links: [
        { href: "#pricing", label: t("linkPricing") },
        { href: "#demo", label: t("linkDemo") },
        { href: "#features", label: t("linkFeatures") },
      ],
    },
    {
      heading: t("colResources"),
      links: [
        { href: "#faq", label: t("linkFaq") },
        { href: "mailto:contact@cartora.app", label: t("linkSupport"), external: true },
      ],
    },
    {
      heading: t("colAccount"),
      links: [
        { href: "/login", label: t("linkLogin") },
        { href: "/signup", label: t("linkSignup") },
      ],
    },
  ];

  return (
    <footer className="border-t border-sand-200" aria-labelledby="landing-footer-heading">
      <h2 id="landing-footer-heading" className="sr-only">
        Cartora
      </h2>
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Marque */}
          <div className="lg:col-span-1">
            <Logo variant="lockup" className="h-7" />
            <p className="mt-3 font-display text-body-sm text-sand-600 italic">{t("tagline")}</p>
          </div>

          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <p className="text-caption tracking-wide text-sand-500 uppercase">{col.heading}</p>
              <ul className="mt-2 flex flex-col">
                {col.links.map((link) =>
                  link.external ? (
                    <li key={link.href}>
                      <a href={link.href} className={linkClass}>
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ))}

          {/* Légal */}
          <nav aria-label={t("colLegal")}>
            <p className="text-caption tracking-wide text-sand-500 uppercase">{t("colLegal")}</p>
            <ul className="mt-2 flex flex-col">
              <li>
                <Link href="/confidentialite" className={linkClass}>
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className={linkClass}>
                  {t("legal")}
                </Link>
              </li>
              <li>
                <Link href="/cgu" className={linkClass}>
                  {t("terms")}
                </Link>
              </li>
              <li className="flex min-h-[44px] items-center">
                <ManageCookiesButton />
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-sand-200 pt-6 text-caption text-sand-500">
          &copy; {new Date().getFullYear()} Cartora
        </div>
      </div>
    </footer>
  );
}
