import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { MENU_TEMPLATE_VALUES } from "@/domain/menu/MenuTypes";
import {
  MENU_LOCALE_LABELS,
  SUPPORTED_MENU_LOCALES,
  type MenuLocale,
} from "@/domain/menu/MenuLocale";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { BrowserMockup } from "@/interface/ui/landing/BrowserMockup";
import { DemoDesignLink } from "@/interface/ui/landing/DemoDesignLink";
import { RevealHeading } from "@/interface/ui/landing/Reveal";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import { DEMO_EXCERPT } from "@/interface/ui/landing/demoExcerpt";
// Convention relative pour public/ (pas d'alias @/). Les DEUX captures sont à refaire quand le
// menu démo change visiblement (règle CLAUDE.md) :
//  - demo-desktop.png 1800×1200 (3:2) — chaîne historique ;
//  - demo-mobile.png 780×1300 (3:5 EXACT — le wrapper zoom de BrowserMockup force `aspect-[3/5]`,
//    tout autre ratio serait rogné par object-cover) : `pnpm dev`, ouvrir
//    `/m/demo-cartora?noBanner=1&design=classic` (chrome FR), viewport 390×844 CSS px à DPR 2,
//    retirer la barre de designs `document.querySelectorAll('div.fixed.inset-x-0.z-50').forEach(n => n.remove())`,
//    clip x 0 / y 0 / w 390 / h 650, puis PNG 8 bits palette (sharp résolu depuis `next`,
//    compressionLevel 9). Contenu attendu : en-tête « Le Bistrot Démo » + monogramme, pill
//    FR·EN·ES·DE·IT, nav catégories, carte « Aujourd'hui » (Blanquette 18,50 € + chips
//    Lait/Céleri/Sulfites, Formule du midi, Menu complet), aucune bannière cookies.
//    Si la carte du jour dépasse 650 px à 390, augmenter la hauteur du clip ET `aspect-[3/5]`.
import demoDesktop from "../../../../public/landing/demo-desktop.png";
import demoMobile from "../../../../public/landing/demo-mobile.png";

// Design des deux captures — à changer si on recapture dans un autre skin.
const SHOWN_TEMPLATE = "CLASSIC" as const;

// Langue ouverte par défaut dans l'extrait : EN sur `/` ET `/en` (constante, aucune lecture de
// locale). La capture au-dessus est TOUJOURS en français (Blanquette + Formule du midi y sont
// lisibles en entier) : un extrait FR par défaut répéterait verbatim, 200 px plus bas, le texte
// de la capture — capture FR ↔ extrait EN prouvent « changez la langue » d'un coup d'œil, et le
// lecteur FR a FR à un clic. Jamais `useLocale()` / `getLocale()` ici (une lecture hors
// `setRequestLocale` dynamifierait la page statique).
const DEFAULT_EXCERPT_LANG: MenuLocale = "en";

// Chaînes COMPLÈTES, une par locale : Tailwind ne résout pas `peer-checked/${code}` (scan
// textuel du source — une classe composée à l'exécution n'est JAMAIS émise, tous les panneaux
// resteraient cachés en prod). Label coché = canard-300 + hairline canard sous le code (jamais
// la couleur seule : sand-500 et canard-300 sont proches en luminance — WCAG 1.4.1) ; focus =
// anneau nuit+canard (l'input sr-only n'a pas de boîte visible, l'anneau se pose sur le label
// via peer-focus-visible).
const LANG_CLASSES: Record<
  MenuLocale,
  { input: string; label: string; code: string; panel: string }
> = {
  fr: {
    input: "peer/fr sr-only",
    label:
      "peer-checked/fr:text-canard-300 peer-focus-visible/fr:shadow-[0_0_0_2px_var(--color-nuit-900),0_0_0_4px_var(--color-canard-300)]",
    code: "peer-checked/fr:border-canard-300",
    panel: "peer-checked/fr:block",
  },
  en: {
    input: "peer/en sr-only",
    label:
      "peer-checked/en:text-canard-300 peer-focus-visible/en:shadow-[0_0_0_2px_var(--color-nuit-900),0_0_0_4px_var(--color-canard-300)]",
    code: "peer-checked/en:border-canard-300",
    panel: "peer-checked/en:block",
  },
  es: {
    input: "peer/es sr-only",
    label:
      "peer-checked/es:text-canard-300 peer-focus-visible/es:shadow-[0_0_0_2px_var(--color-nuit-900),0_0_0_4px_var(--color-canard-300)]",
    code: "peer-checked/es:border-canard-300",
    panel: "peer-checked/es:block",
  },
  de: {
    input: "peer/de sr-only",
    label:
      "peer-checked/de:text-canard-300 peer-focus-visible/de:shadow-[0_0_0_2px_var(--color-nuit-900),0_0_0_4px_var(--color-canard-300)]",
    code: "peer-checked/de:border-canard-300",
    panel: "peer-checked/de:block",
  },
  it: {
    input: "peer/it sr-only",
    label:
      "peer-checked/it:text-canard-300 peer-focus-visible/it:shadow-[0_0_0_2px_var(--color-nuit-900),0_0_0_4px_var(--color-canard-300)]",
    code: "peer-checked/it:border-canard-300",
    panel: "peer-checked/it:block",
  },
};

/**
 * Section preuve — scène NUIT au moment où la page prouve sa promesse (« créée en
 * 8 minutes »), pivot narratif de l'arc porcelaine→nuit. Lumière « engineered » statique
 * (grille hairline masquée + glow canard centré derrière le mockup + grain) : zéro canvas,
 * zéro rAF — le mouvement vit dans le CONTENU (BrowserMockup : parallaxe, reveal, dézoom).
 * Le wrapper `MotionSection` de la page (fade seul) : le cadre porte son propre reveal
 * (REVEAL_VISUAL), donc plus de double `y`.
 *
 * Les faits produit (ex-« fiche technique » 9 · 5 · 14, retirée ici — 3e/4e répétition avec la
 * strip de confiance et le footer) sont devenus structurels : rangée « La démo en 9 designs »
 * (9 deep-links `?design=`), extrait « La démo en 5 langues » (radios CSS-only, 0 KB) ; les
 * allergènes se lisent dans la capture et dans la strip.
 *
 * Composant SERVEUR : `PublicMenu.templateNames` est lu ICI et passé en prop `label` (ce
 * namespace n'est pas embarqué côté client — un composant client qui le lirait planterait en
 * MISSING_MESSAGE sans que CI le voie).
 */
export function LandingDemoPreview() {
  const t = useTranslations("Landing.demo");
  const tRoot = useTranslations("Landing");
  const tNames = useTranslations("PublicMenu");

  return (
    <LandingSection
      id="demo"
      ariaLabelledBy="demo-heading"
      scene="nuit"
      className="section-nuit texture-grain relative isolate overflow-hidden bg-background text-foreground"
      innerClassName="py-28 md:py-36"
    >
      {/* Couches décoratives (recette scène nuit) : grille masquée, glow canard CENTRÉ
          derrière le mockup à alpha 0.3 — un fond doit se voir —, puis contrepoint chaud
          discret près du climax corail « 8 minutes ». Coupes franches haut/bas : aucune
          couture en dégradé vers les sections porcelaine voisines.
          Centres ancrés sur la SECTION ENTIÈRE (qui s'est allongée de la rangée designs + de
          l'extrait) — mesurés à 1440 le 2026-09-12 (headless, méthode demo-x-1.5 : centre du
          cadre pour le canard → 50 % 48 %, centre de l'em « 8 minutes » pour le corail →
          58 % 19 % ; section 1 927 px) ; à re-mesurer après intégration si la hauteur bouge. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="bg-grid-nuit absolute inset-0" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 620px 520px at 50% 48%, oklch(0.42 0.058 198 / 0.3), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 360px 300px at 58% 19%, oklch(0.55 0.18 38 / 0.1), transparent 70%)",
          }}
        />
      </div>

      <header className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
        <span aria-hidden="true" className="eyebrow-thread mx-auto" />
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {t("kicker")}
        </p>
        <RevealHeading
          as="h2"
          id="demo-heading"
          className="mt-6 text-display-xl text-balance text-sand-50"
        >
          {t.rich("title", {
            em: (chunks) => <em className="font-medium text-corail-300 italic">{chunks}</em>,
          })}
        </RevealHeading>
        <p className="mt-5 text-lead text-sand-200/80">{t("subtitle")}</p>
      </header>

      {/* Règle chrono : matérialise le « chronométrez-nous » — bornes 00:00/08:00 dérivées du
          titre, graduations muettes (8 intervalles), aucune valeur intermédiaire (garde-fou
          « chiffres inventés »). Largeur = WRAPPER_CLASS de BrowserMockup (max-w-[320px]
          md:max-w-4xl) — garder les deux alignées. mb-8 (32 px) : l'écho VELOURS déborde de
          12 px au-dessus du cadre et remonte de 14 px en sortie de scroll (26 px au pire) →
          6 px d'air minimum, jamais de collision ticks/plaque. Aucune animation : instrument
          statique (un remplissage au scroll relèverait du rail de « Comment ça marche »). */}
      <div
        aria-hidden="true"
        className="mx-auto mb-8 w-full max-w-[320px] font-mono text-micro tracking-wide text-sand-500 md:max-w-4xl"
      >
        <div className="flex justify-between tabular-nums">
          <span>00:00</span>
          <span>08:00</span>
        </div>
        <div className="mt-1.5 flex h-2 items-start justify-between border-t border-white/10">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={cn("w-px bg-white/18", i === 0 || i === 8 ? "h-2" : "h-1")} />
          ))}
        </div>
      </div>

      {/* La largeur du cadre (320 px sous md, 896 px dès md) vit DANS BrowserMockup — une seule
          source pour cadre, écho et satellite. */}
      <div className="relative">
        <BrowserMockup
          src={demoDesktop}
          srcMobile={demoMobile}
          alt={t("imageAlt")}
          url="cartora.app/m/demo-cartora"
          href="/m/demo-cartora"
          linkLabel={t("frameLinkLabel")}
          hint={t("frameHint")}
        />
      </div>

      {/* Rangée des 9 designs : des LIENS (`?design=` validé côté /m/[slug] contre TEMPLATE_META,
          rendu dans le bon skin dès le SSR), pas des onglets. Hors du reveal du cadre (jamais en
          opacity 0). mt-10 lg:mt-12 : 16 px d'air sous le satellite (32 px de débord à lg).
          `role="list"` explicite : liste sans puces, VoiceOver perdrait la sémantique.
          Label AU-DESSUS de la liste à tous les breakpoints (la spec le voulait en ligne dès md) :
          mesuré à 1440, les 9 liens FR font 754 px (EN 717) pour 714 px disponibles à côté du
          label — un gap ≤ 14 px aurait été fragile (webfont, EN/FR). Seul sur sa ligne, le
          registre est celui de la legend de l'extrait dessous ; ≥ lg les 9 liens tiennent sur
          UNE ligne (142 px de marge), md = 2 lignes (accepté). */}
      <nav
        aria-labelledby="demo-designs-label"
        className="mx-auto mt-10 max-w-4xl border-t border-white/10 pt-4 lg:mt-12"
      >
        <p id="demo-designs-label" className="font-mono text-caption tracking-wide text-sand-500">
          {t("designsLabel", { count: MENU_TEMPLATE_VALUES.length })}
        </p>
        <ul
          role="list"
          className="mt-2 flex flex-wrap gap-x-5 gap-y-0 font-mono text-caption tracking-wide md:gap-y-1"
        >
          {MENU_TEMPLATE_VALUES.map((code, i) => {
            const shown = code === SHOWN_TEMPLATE;
            const design = code.toLowerCase();
            return (
              <li key={code}>
                <DemoDesignLink
                  href={`/m/demo-cartora?design=${design}`}
                  design={design}
                  index={i + 1}
                  label={tNames(`templateNames.${code}`)}
                  shown={shown}
                >
                  <span className="sr-only">{tRoot("opensInNewTab")}</span>
                  {shown && <span className="sr-only">{t("designShown")}</span>}
                </DemoDesignLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Extrait du seed en 5 langues — sélecteur CSS-only (radios natifs + named peers Tailwind 4,
          0 KB, aucun état React : `defaultChecked` non contrôlé = hydratation sûre). Inputs,
          labels et panneaux sont FRÈRES DIRECTS dans une seule grille (les `~` de peer-* cassent
          sinon) ; les inputs sr-only sont position:absolute donc hors flux, les panneaux `hidden`
          n'occupent aucune cellule. min-w-0 : <fieldset> garde le `min-inline-size: min-content`
          de l'UA (preflight ne le touche pas) — le mot allemand/italien le plus long déciderait
          sinon de la largeur minimale (débordement à 360). */}
      <fieldset className="mx-auto mt-8 min-w-0 max-w-4xl border-t border-white/10 pt-4">
        <legend className="float-left w-full font-mono text-caption tracking-wide text-sand-500">
          {t("excerpt.legend", { count: SUPPORTED_MENU_LOCALES.length })}
        </legend>
        {/* md : 5 rangées min-content pour les labels + une 6e rangée 1fr qui absorbe la hauteur
            du panneau (sans elle, la hauteur du panneau row-span se répartirait sur les 5 rangées
            de labels → colonne de codes espacée de 45 px au lieu d'une liste compacte). */}
        <div className="clear-both grid grid-cols-5 gap-y-3 pt-3 md:grid-cols-[10rem_1fr] md:grid-rows-[repeat(5,min-content)_1fr] md:gap-x-10 md:gap-y-1">
          {SUPPORTED_MENU_LOCALES.map((code) => (
            <input
              key={`in-${code}`}
              type="radio"
              name="demo-lang"
              id={`demo-lang-${code}`}
              value={code}
              defaultChecked={code === DEFAULT_EXCERPT_LANG}
              className={LANG_CLASSES[code].input}
            />
          ))}
          {SUPPORTED_MENU_LOCALES.map((code) => (
            <label
              key={`lb-${code}`}
              htmlFor={`demo-lang-${code}`}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm font-mono text-caption tracking-wide text-sand-500 transition-colors hover:text-sand-100 md:col-start-1 md:min-h-0 md:justify-start md:py-1",
                LANG_CLASSES[code].label,
              )}
            >
              <span
                className={cn("border-b border-transparent uppercase", LANG_CLASSES[code].code)}
              >
                {code}
              </span>
              <span className="hidden text-sand-500 md:inline">{MENU_LOCALE_LABELS[code]}</span>
              <span className="sr-only md:hidden">{MENU_LOCALE_LABELS[code]}</span>
            </label>
          ))}
          {/* min-h-[14rem] : les descriptions DE/IT sont plus longues — le CTA en dessous ne saute
              pas au changement de langue. `lang` : prononciation correcte en lecteur d'écran. */}
          {SUPPORTED_MENU_LOCALES.map((code) => (
            <div
              key={`pn-${code}`}
              lang={code}
              className={cn(
                "col-span-5 hidden min-h-[14rem] md:col-span-1 md:col-start-2 md:row-span-6 md:row-start-1",
                LANG_CLASSES[code].panel,
              )}
            >
              <p className="display text-h3 text-sand-50">{DEMO_EXCERPT[code].dish.name}</p>
              <p className="mt-1 text-body-sm text-sand-300">
                {DEMO_EXCERPT[code].dish.description}
              </p>
              <div aria-hidden="true" className="my-4 h-px bg-white/10" />
              <p className="display text-h3 text-sand-50">{DEMO_EXCERPT[code].formula.name}</p>
              <p className="mt-1 text-body-sm whitespace-pre-line text-sand-300">
                {DEMO_EXCERPT[code].formula.description}
              </p>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="mt-12 flex flex-col items-center gap-3">
        <TrackedCtaButton
          event="demo_link_click"
          href="/m/demo-cartora"
          external
          variant="primary"
          size="lg"
          arrow
          metadata={{ surface: "button" }}
        >
          {t("openCta")}
        </TrackedCtaButton>
        <p className="text-body-sm text-sand-300/75">{t("footnote")}</p>
      </div>
    </LandingSection>
  );
}
