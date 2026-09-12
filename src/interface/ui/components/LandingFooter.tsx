import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/interface/ui/components/Logo";
import { ManageCookiesButton } from "@/interface/ui/components/consent/ManageCookiesButton";
import { COOKIE_BANNER_OFFSET } from "@/interface/ui/components/consent/cookieBannerOffset";
import { BRAND_WORDMARK, brandWordmarkLayout } from "@/interface/ui/brand/wordmark";
import { FAQ_CONTACT_EMAIL } from "@/interface/ui/landing/faqItems";
import { cn } from "@/lib/utils";

// Footer riche de la landing (rendu DANS .theme-cartora via page.tsx → tokens canard/sapin).
// DA « Nuit de service » : scène nuit-950 (le bord de page le plus sombre de l'arc lumineux),
// grain signature, hairlines white/8. Le remap sémantique vient de `.section-nuit` ;
// `bg-nuit-950` (utility) assombrit le fond par rapport au nuit-900 des autres scènes.
// Le footer minimal global (layout.tsx) n'est jamais rendu sur la landing (cf. globals.css).
// Composant SERVEUR (0 Ko JS pour le lockup et le filigrane `wordmark.ts`) — ne jamais le passer
// en "use client". Décor : glow canard de tête + wordmark outliné en filigrane dans une bande
// sans texte (`isolate overflow-hidden` obligatoires, cf. commentaire JSX). Colophon : rangée
// factuelle pleine largeur `Landing.footer.facts.*` (jamais `Landing.demo.stats.*`).
// Liens : UNIQUEMENT des destinations qui existent (ancres landing + routes legal + auth). Pas de
// blog/support/statut/contact inventés (= liens morts), pas de newsletter (pas de backend).

type FooterLink = { href: string; label: string; external?: boolean };

// Cible tactile 44px sur mobile (WCAG 2.5.5) ; resserré au pointeur sur desktop (md+),
// où le minimum WCAG tombe à 24px — évite des colonnes de footer trop aérées.
const linkClass =
  "inline-flex min-h-[44px] items-center text-body-sm text-sand-300 transition-colors hover:text-sand-50 md:min-h-0 md:py-1.5";

// Titre de colonne : registre mono « précision tech » (cf. spec DA §4).
// sand-400 (8,7:1 nominal) : sand-500 (5,1:1) n'avait que 0,6 de marge et le glow de tête
// éclaircit légèrement le fond sous la rangée des titres à partir de lg (D7).
const headingClass = "font-mono text-micro tracking-[0.16em] text-sand-400 uppercase";

// Ligne factuelle mono du colophon : réassurances (trustBadge scindé sur « · ») + faits produit
// sous des clés PROPRES `Landing.footer.facts.*` (9 = TEMPLATE_META, 5 = SUPPORTED_MENU_LOCALES,
// 14 = ALLERGEN_VALUES — recopiés, jamais calculés au rendu). Ne PAS lire `Landing.demo.stats.*`
// (supprimée par la passe Démo : MISSING_MESSAGE au runtime, invisible en CI).
const FACT_KEYS = ["designs", "languages", "allergens"] as const;

export async function LandingFooter() {
  const t = await getTranslations("Footer");
  const tLanding = await getTranslations("Landing.footer");
  // Statique-safe : la page landing a appelé setRequestLocale(), donc getLocale() ne lit
  // jamais cookies() (cf. i18n/request.ts) et le prerender CDN est préservé.
  const locale = await getLocale();
  const wordmark = brandWordmarkLayout();
  const facts = [
    ...tLanding("trustBadge").split(" · "),
    ...FACT_KEYS.map((k) => tLanding(`facts.${k}`)),
  ];

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
        { href: `mailto:${FAQ_CONTACT_EMAIL}`, label: t("linkSupport"), external: true },
      ],
    },
  ];

  return (
    <footer
      // Sentinelle de scène du header / de la pilule collante (landingChromeStore) : sans elle,
      // la pilule serait canard sur une scène nuit.
      data-scene="nuit"
      className="section-nuit texture-grain relative isolate overflow-hidden border-t border-white/8 bg-nuit-950 text-foreground"
      // Dernière rangée (liens FR/EN) dégagée de la bannière cookies tant qu'elle est visible.
      style={{ marginBottom: COOKIE_BANNER_OFFSET }}
      aria-labelledby="landing-footer-heading"
    >
      <h2 id="landing-footer-heading" className="sr-only">
        Cartora
      </h2>

      {/* Décor (0 Ko JS) : glow canard né du bord haut — amortit la coupe nuit-900 → nuit-950 sans
          dégradé de fond — et wordmark outliné en filigrane, calé en bas et coupé par le bas.
          `isolate` sur le footer : sans lui les enfants -z-10 passeraient derrière bg-nuit-950 ;
          `overflow-hidden` : le wordmark (4,5:1) est plus large que tout viewport mobile.
          `pointer-events-none` : un svg absolu avalerait sinon les clics sur la bande basse. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-x-0 top-0 h-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 100% at 50% 0%, oklch(0.42 0.058 198 / 0.12), transparent 70%)",
          }}
        />
        {/* Filigrane : PAS <Logo variant="wordmark"> (role="img" aria-label="Cartora" imposé — il
            annoncerait une seconde image dans une région déjà nommée « Cartora »). Tracé nu,
            currentColor = sand-100 à 5 %. 45 % visible (translate-y 55 %) dans la bande sans texte
            réservée par le pb-20/md:pb-32 du conteneur : aucun texte sand-500 ne passe au-dessus
            des traits (2,7:1 sinon). Variante haute documentée dans closing.md (50 % + md:pb-36). */}
        <svg
          viewBox={wordmark.viewBox}
          className="absolute inset-x-0 bottom-0 mx-auto h-auto w-full max-w-6xl translate-y-[55%] text-sand-100/5"
        >
          <path fill="currentColor" transform={wordmark.text.transform} d={BRAND_WORDMARK.path} />
        </svg>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-20 md:pb-32">
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-3 lg:grid-cols-5">
          {/* Bloc de marque : logo (wordmark en fill-foreground → sand-100 via section-nuit) +
              tagline display. Le badge pilule (lisait comme un bouton) en est SORTI → rangée
              factuelle pleine largeur sous la grille. */}
          <div className="flex flex-col items-start gap-5 md:col-span-3 lg:col-span-2 lg:pr-10">
            {/* h-8 / md:h-9 (ex h-7) : le lockup était sous-dimensionné pour un bloc de marque
                (header : mark h-6 sous sm, lockup h-7 dès sm). */}
            <Logo variant="lockup" className="h-8 md:h-9" />
            <p className="display text-h3 text-sand-200 italic">{t("tagline")}</p>
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

        {/* Ligne factuelle du colophon — RANGÉE PLEINE LARGEUR (≈ 640 px FR : ne tient dans aucune
            colonne de la grille). Ex-badge pilule (lisait comme un bouton) → liste mono. Idiom de la
            fiche technique de Démo (séparateur « · » sand-500 identique) décalé d'un breakpoint :
            séparateur « · » RÉEL aria-hidden SOUS md (repli sur 2–3 lignes sans barre orpheline)
            — jamais de ::before (lu par Chrome/VoiceOver), cf. LandingTrustStrip —, hairlines white/15 dès md
            (contenu 720 px ≥ 648 : une seule ligne, aucune hairline en tête de ligne — si une
            traduction future dépasse, passer les hairlines à `lg:`, jamais réintroduire le repli
            avec hairline). role="list" : Tailwind retire list-style, Safari/VoiceOver perdrait la
            sémantique de liste (règle CLAUDE.md, no-redundant-roles désactivée pour ça). Jamais de
            point corail ici. */}
        <ul
          role="list"
          className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-caption tracking-wide text-sand-400 md:mt-14 md:gap-x-0"
        >
          {facts.map((fact, i) => (
            <li
              key={fact}
              className={cn("md:px-3 md:first:pl-0", i > 0 && "md:border-l md:border-white/15")}
            >
              {i > 0 && (
                <span aria-hidden="true" className="mr-3 text-sand-500 md:hidden">
                  ·
                </span>
              )}
              {fact}
            </li>
          ))}
        </ul>

        {/* Barre finale : © + sélecteur de langue statique (deux pages statiques `/` et `/en`
            → deux liens pleins ; les liens légaux vivent déjà dans la colonne Légal). CONTENU
            INCHANGÉ (© build-frozen = défaut connu hors périmètre ; FR · EN Links avec
            lang/hrefLang/aria-current — ne PAS remplacer par le client LandingLocaleSwitch).
            Seule la marge haute passe de mt-14 à mt-8 : la rangée factuelle s'intercale au-dessus. */}
        <div className="mt-8 flex flex-col items-start gap-4 border-t border-white/8 pt-6 md:flex-row md:items-center md:justify-between">
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
