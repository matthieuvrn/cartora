import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/interface/ui/components/Logo";
import { ManageCookiesButton } from "@/interface/ui/components/consent/ManageCookiesButton";
import { COOKIE_BANNER_OFFSET } from "@/interface/ui/components/consent/cookieBannerOffset";

// Footer riche de la landing (rendu DANS .theme-cartora via page.tsx → tokens canard/sapin).
// DA « Nuit de service » : scène nuit-950 (le bord de page le plus sombre de l'arc lumineux),
// grain signature, hairlines white/8. Le remap sémantique vient de `.section-nuit` ;
// `bg-nuit-950` (utility) assombrit le fond par rapport au nuit-900 des autres scènes.
// Le footer minimal global (layout.tsx) n'est jamais rendu sur la landing (cf. globals.css).
// Liens : UNIQUEMENT des destinations qui existent (ancres landing + routes legal + auth). Pas de
// blog/support/statut/contact inventés (= liens morts), pas de newsletter (pas de backend).

type FooterLink = { href: string; label: string; external?: boolean };

// Cible tactile 44px sur mobile (WCAG 2.5.5) ; resserré au pointeur sur desktop (md+),
// où le minimum WCAG tombe à 24px — évite des colonnes de footer trop aérées.
const linkClass =
  "inline-flex min-h-[44px] items-center text-body-sm text-sand-300 transition-colors hover:text-sand-50 md:min-h-0 md:py-1.5";

// Titre de colonne : registre mono « précision tech » (cf. spec DA §4).
const headingClass = "font-mono text-micro tracking-[0.16em] text-sand-500 uppercase";

export async function LandingFooter() {
  const t = await getTranslations("Footer");
  const tLanding = await getTranslations("Landing.footer");
  // Statique-safe : la page landing a appelé setRequestLocale(), donc getLocale() ne lit
  // jamais cookies() (cf. i18n/request.ts) et le prerender CDN est préservé.
  const locale = await getLocale();

  // Ex-colonnes « Ressources » (2 liens) et « Compte » (2 liens) fusionnées : la FAQ rejoint
  // Produit, le support rejoint Compte → 3 colonnes équilibrées (4/3/4 avec Légal).
  const columns: ReadonlyArray<{ heading: string; links: FooterLink[] }> = [
    {
      heading: t("colProduct"),
      links: [
        { href: "#pricing", label: t("linkPricing") },
        { href: "#demo", label: t("linkDemo") },
        { href: "#features", label: t("linkFeatures") },
        { href: "#faq", label: t("linkFaq") },
      ],
    },
    {
      heading: t("colAccount"),
      links: [
        { href: "/login", label: t("linkLogin") },
        { href: "/signup", label: t("linkSignup") },
        { href: "mailto:contact@cartora.app", label: t("linkSupport"), external: true },
      ],
    },
  ];

  return (
    <footer
      className="section-nuit texture-grain relative border-t border-white/8 bg-nuit-950 text-foreground"
      // Dernière rangée (liens FR/EN) dégagée de la bannière cookies tant qu'elle est visible.
      style={{ marginBottom: COOKIE_BANNER_OFFSET }}
      aria-labelledby="landing-footer-heading"
    >
      <h2 id="landing-footer-heading" className="sr-only">
        Cartora
      </h2>
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-3 lg:grid-cols-5">
          {/* Marque élargie : logo (wordmark en fill-foreground → sand-100 via section-nuit),
              tagline display, badge factuel de confiance. */}
          <div className="flex flex-col items-start gap-5 md:col-span-3 lg:col-span-2 lg:pr-10">
            <Logo variant="lockup" className="h-7" />
            <p className="display text-h3 text-sand-200 italic">{t("tagline")}</p>
            <p className="w-fit rounded-full border border-white/12 px-3.5 py-1.5 font-mono text-caption text-sand-300">
              {tLanding("trustBadge")}
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <p className={headingClass}>{col.heading}</p>
              <ul className="mt-4 flex flex-col">
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
            <p className={headingClass}>{t("colLegal")}</p>
            <ul className="mt-4 flex flex-col">
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
              {/* Même registre que les trois liens voisins (linkClass) : le style propre du
                  bouton (text-sm muted + underline) faisait une 4e ligne d'un autre système. */}
              <li>
                <ManageCookiesButton className={linkClass} />
              </li>
            </ul>
          </nav>
        </div>

        {/* Barre finale : © + sélecteur de langue statique (deux pages statiques `/` et `/en`
            → deux liens pleins ; les liens légaux vivent déjà dans la colonne Légal). */}
        <div className="mt-14 flex flex-col items-start gap-4 border-t border-white/8 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-caption text-sand-500">
            &copy; {new Date().getFullYear()} Cartora
          </p>
          <p className="flex items-center gap-2 font-mono text-caption">
            <Link
              href="/"
              lang="fr"
              hrefLang="fr"
              aria-current={locale === "fr" ? "page" : undefined}
              className={
                locale === "fr"
                  ? "inline-flex min-h-[44px] items-center text-sand-50 md:min-h-0"
                  : "inline-flex min-h-[44px] items-center text-sand-500 transition-colors hover:text-sand-300 md:min-h-0"
              }
            >
              FR
            </Link>
            <span aria-hidden="true" className="text-sand-500">
              ·
            </span>
            <Link
              href="/en"
              lang="en"
              hrefLang="en"
              aria-current={locale === "en" ? "page" : undefined}
              className={
                locale === "en"
                  ? "inline-flex min-h-[44px] items-center text-sand-50 md:min-h-0"
                  : "inline-flex min-h-[44px] items-center text-sand-500 transition-colors hover:text-sand-300 md:min-h-0"
              }
            >
              EN
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
