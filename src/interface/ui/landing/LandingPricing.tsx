import { useTranslations } from "next-intl";
import { Check, Minus } from "lucide-react";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { RevealHeading } from "@/interface/ui/landing/Reveal";
import { StaggerGroup, StaggerItem } from "@/interface/ui/landing/StaggerReveal";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";
import { REVEAL_VISUAL } from "@/lib/motion";
import { cn } from "@/lib/utils";

type TierKey = "free" | "starter" | "pro";

/** Lignes du mini-bloc specs (`Landing.pricing.specs.labels.*` / `specs.<tier>.*`). */
const SPEC_KEYS = ["categories", "designs", "languages"] as const;

/**
 * Contrat d'une carte tarif. Le namespace `Pricing` (partagé avec l'app : PricingTiers,
 * TemplateUpsellCard, PlanChangeCard, SubscriptionSummaryCard) n'est lu ici que pour `name`,
 * `price`, `period`, `recommended` et les libellés CTA — les listes de features de la landing
 * sont DÉCOUPLÉES (`Landing.pricing.<tier>.features` + `free.restrictions` + `<tier>.intro`),
 * pour ne jamais répéter ni contredire le bloc specs (6/10/∞ · 2/2/9 · 1/1/5). Plus de couplage
 * par position (`trailingRestrictions`) : les restrictions ont leur propre tableau.
 */
type TierConfig = {
  key: TierKey;
  event: LandingEventName;
  href: string;
  variant: "primary" | "outline";
  highlighted: boolean;
  /** Tiers payants : `Landing.pricing.<tier>.intro` (« Tout FREE/STARTER inclus ») en ligne mono au-dessus des puces. */
  hasIntro: boolean;
  /** Free uniquement : `Landing.pricing.free.restrictions` (tirets sand + préfixe sr-only « Non inclus : »). */
  hasRestrictions: boolean;
  ctaKey: "ctaStartFree" | "ctaPublish" | "ctaGoPro";
  taglineKey: "freeTagline" | "starterTagline" | "proTagline";
  reassuranceKey: "reassurance.free" | "reassurance.paid";
  /** Ordre visuel ≥ lg (Free / Starter / Pro). Sous lg : ordre DOM = Starter première. */
  lgOrder: string;
};

// Ordre DOM = ordre mobile/tablette : Starter d'abord. Desktop (≥ lg) Free / Starter / Pro via lg:order-*.
// Tab ≥ lg = milieu → gauche → droite (déviation acceptée, pricing.md §1.15). Ne pas « corriger » par le DOM.
const TIERS: readonly TierConfig[] = [
  {
    key: "starter",
    event: "cta_pricing_starter",
    href: "/signup?plan=starter&src=pricing",
    variant: "primary",
    highlighted: true,
    hasIntro: true,
    hasRestrictions: false,
    ctaKey: "ctaPublish",
    taglineKey: "starterTagline",
    reassuranceKey: "reassurance.paid",
    lgOrder: "lg:order-2",
  },
  {
    key: "free",
    event: "cta_pricing_free",
    href: "/signup?plan=free&src=pricing",
    variant: "outline",
    highlighted: false,
    hasIntro: false,
    hasRestrictions: true,
    ctaKey: "ctaStartFree",
    taglineKey: "freeTagline",
    reassuranceKey: "reassurance.free",
    lgOrder: "lg:order-1",
  },
  {
    key: "pro",
    event: "cta_pricing_pro",
    href: "/signup?plan=pro&src=pricing",
    variant: "outline",
    highlighted: false,
    hasIntro: true,
    hasRestrictions: false,
    ctaKey: "ctaGoPro",
    taglineKey: "proTagline",
    reassuranceKey: "reassurance.paid",
    lgOrder: "lg:order-3",
  },
] as const;

/**
 * Section tarifs (RSC — `Pricing.*` est hors `LANDING_CLIENT_NAMESPACES`, aucune feuille
 * cliente ne le lit). Scène PORCELAINE portant UNE carte nuit inversée (Starter) : la carte
 * est une carte dans une scène claire, PAS une scène — jamais de `scene` sur la section ni de
 * `data-scene` sur l'article (contrat header.md : le header et la pilule collante resteraient
 * porcelaine sur tout `#pricing`). Corail : UN seul point de 6 px par viewport (le kicker) ; le
 * tag « Recommandé » reprend la grammaire eyebrow SANS point. Sapin = succès (coches), les
 * restrictions Free = tiret sand-500 + préfixe sr-only. `id="pricing"` = cible de la balise
 * `<pricing>` de la FAQ et de `SectionViewTracker` — à conserver.
 */
export function LandingPricing() {
  const t = useTranslations("Landing.pricing");
  const tPricing = useTranslations("Pricing");

  return (
    // Pas de prop `scene` : la carte Starter est une carte nuit DANS une scène claire (header.md).
    // `isolate` obligatoire : sans contexte d'empilement propre, la grille `-z-10` passerait
    // derrière le fond du wrapper `theme-cartora`.
    <LandingSection id="pricing" ariaLabelledBy="pricing-heading" className="relative isolate">
      {/* Grille sand masquée : retour porcelaine amorti après la scène nuit de la démo (P2).
          Positionnée sur la <section> (l'inner div n'est pas relative) = pleine largeur ;
          hauteur bornée : elle s'éteint (masque) avant la rangée de cartes. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-112">
        <div className="bg-grid-sand absolute inset-0" />
      </div>

      <header className="mx-auto mb-14 max-w-[38rem] text-center md:mb-16">
        <span aria-hidden="true" className="eyebrow-thread mx-auto" />
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {t("kicker")}
        </p>
        {/* Vraie balise h2 (m.h2 animée / h2 nue en PRM) : l'id nomme la région. */}
        <RevealHeading
          id="pricing-heading"
          className="mt-6 text-display-xl text-balance text-canard-950"
        >
          {t("title")}
        </RevealHeading>
        <p className="mt-5 text-lead text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* < lg : colonne unique bornée à 448 px et centrée (Starter première, hauteurs naturelles).
          ≥ lg : 3 colonnes, items-stretch (défaut) : les trois cartes ont la même hauteur ; les blocs
          nom → prix sont géométriquement égaux ⇒ les trois CTA tombent sur la même ligne. La marge
          négative de Starter vit sur l'ITEM (boîte de marge étirée = +32 px), jamais sur l'article
          (h-full + -my-4 ne ferait que décaler la carte — cf. pricing.md §1.10). Aucune classe
          `md:*` : à md le libellé CTA n'aurait que 120 px (« Commencer gratuitement » wrappe). */}
      <StaggerGroup className="mx-auto grid max-w-md grid-cols-1 gap-6 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        {TIERS.map((tier) => {
          const titleId = `pricing-${tier.key}-title`;
          const dark = tier.highlighted;
          const period =
            tier.key === "free" ? t("priceNote.freePeriod") : tPricing(`${tier.key}.period`);
          const note = tier.key === "free" ? t("priceNote.freeNote") : t("priceNote.paid");
          const features = t.raw(`${tier.key}.features`) as string[];
          const restrictions = tier.hasRestrictions ? (t.raw("free.restrictions") as string[]) : [];

          return (
            <StaggerItem
              key={tier.key}
              className={cn(tier.lgOrder, dark && "lg:-my-4")}
              variants={dark ? REVEAL_VISUAL : undefined}
            >
              {/* Tous les cn(taille, couleur) ci-dessous reposent sur le cn() étendu (utils.ts) :
                  sans l'extension, tailwind-merge SUPPRIME text-h3 / text-display-lg / text-body-sm. */}
              <article
                aria-labelledby={titleId}
                className={cn(
                  "flex h-full flex-col rounded-2xl p-6 lg:p-8",
                  dark
                    ? // Carte inversée : le remap .section-nuit rend le CTA primaire porcelaine.
                      // Dominance STRUCTURELLE (marge négative sur l'item, padding vertical +16 px
                      // ici en compensation) sans scale. Plus d'overflow-hidden : le tag chevauche
                      // le bord ; le décor se rogne lui-même, le grain suit le radius (globals).
                      // PAS de data-scene ici (header.md).
                      "section-nuit texture-grain relative z-10 bg-background text-foreground shadow-frame lg:py-12 xl:px-10"
                    : "border border-sand-200 bg-card",
                )}
              >
                {dark && (
                  <>
                    {/* Recette nuit complète (P1) : grille + halo né du bord supérieur. */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
                    >
                      <div className="bg-grid-nuit absolute inset-0" />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(ellipse 60% 45% at 50% 0%, oklch(0.42 0.058 198 / 0.35), transparent 70%)",
                        }}
                      />
                    </div>
                    {/* Tag en grammaire eyebrow (P1), à cheval sur le bord haut, hors flux.
                        Sans eyebrow-dot : un seul point corail par viewport (le kicker).
                        `bg-background` = nuit-900 via le remap .section-nuit de l'article. */}
                    <span className="eyebrow absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-white/12 bg-background px-3 py-1 whitespace-nowrap">
                      {tPricing("recommended")}
                    </span>
                  </>
                )}

                <h3
                  id={titleId}
                  className={cn("text-h3", dark ? "text-sand-50" : "text-canard-950")}
                >
                  {tPricing(`${tier.key}.name`)}
                </h3>
                {/* Une ligne à toutes les largeurs (≤ 26 car. ≈ 170 px < 245 px à lg) — aucun min-h. */}
                <p className={cn("mt-1 text-body-sm", dark ? "text-sand-300" : "text-sand-600")}>
                  {t(tier.taglineKey)}
                </p>

                {/* Bloc prix « précision tech » (P2) : chiffre Fraunces + colonne mono 2 lignes.
                    Empilé sous lg (colonne unique), côte à côte dès lg (40 px), 52 px dès xl. */}
                <div className="mt-6 flex flex-col gap-1.5 lg:flex-row lg:items-end lg:gap-3">
                  <span
                    className={cn(
                      "display text-display-lg leading-none tabular-nums lg:text-h1 xl:text-display-lg",
                      dark ? "text-sand-50" : "text-canard-950",
                    )}
                  >
                    {tPricing(`${tier.key}.price`)}
                  </span>
                  <span className="flex flex-col font-mono text-caption leading-[1.35] text-muted-foreground lg:pb-1">
                    <span>{period}</span>
                    <span>{note}</span>
                  </span>
                </div>

                {/* CTA remonté sous le prix (P2), réassurance dessous (P1).
                    min-h-9 : 2 lignes de caption (36 px) — la ligne payante FR (42 car. ≈ 312 px)
                    tient sur 2 lignes dès 245 px, Free sur 1. */}
                <TrackedCtaButton
                  event={tier.event}
                  href={tier.href}
                  variant={tier.variant}
                  size="lg"
                  arrow={dark}
                  metadata={{ plan: tier.key }}
                  className="mt-6 w-full"
                >
                  {tPricing(tier.ctaKey)}
                </TrackedCtaButton>
                <p className="mt-3 min-h-9 text-center font-mono text-caption text-pretty text-muted-foreground">
                  {t(tier.reassuranceKey)}
                </p>

                {/* Mini-bloc specs (P2) : lignes clé / valeur justifiées, valeurs recopiées
                    (test src/i18n/pricing-specs.test.ts = PlanPolicy). Hiérarchie dt/dd par la
                    couleur seule (text-caption pèse déjà 500 — `font-medium` serait un no-op). */}
                <dl className="mt-8 divide-y divide-border border-y border-border font-mono text-caption">
                  {SPEC_KEYS.map((spec) => (
                    <div key={spec} className="flex items-baseline justify-between gap-4 py-2">
                      <dt className="text-muted-foreground">{t(`specs.labels.${spec}`)}</dt>
                      <dd className={cn("tabular-nums", dark ? "text-sand-50" : "text-canard-950")}>
                        {t(`specs.${tier.key}.${spec}`)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {tier.hasIntro && (
                  <p className="mt-6 font-mono text-caption text-muted-foreground">
                    {t(`${tier.key}.intro`)}
                  </p>
                )}
                <ul className={cn("space-y-3", tier.hasIntro ? "mt-3" : "mt-6")}>
                  {features.map((feature) => (
                    <li
                      key={feature}
                      className={cn(
                        "flex items-start gap-2.5 text-body-sm",
                        dark ? "text-sand-200" : "text-sand-700",
                      )}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0 stroke-[1.75]",
                          dark ? "text-sapin-300" : "text-sapin-600",
                        )}
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {restrictions.map((restriction) => (
                    <li
                      key={restriction}
                      className="flex items-start gap-2.5 text-body-sm text-muted-foreground"
                    >
                      {/* sand-500 = 3,95:1 sur blanc (≥ 3:1, 1.4.11) : le tiret est le seul indice visuel
                          de « non inclus » pour un lecteur voyant ; sand-400 (2,31:1) échouait. */}
                      <Minus
                        className="mt-0.5 size-4 shrink-0 stroke-[1.75] text-sand-500"
                        aria-hidden="true"
                      />
                      <span>
                        {/* Espace explicite après le préfixe (Prettier la rend en espace littérale
                            avant </span>, préservée par JSX sur une même ligne) : deux nœuds texte
                            adjacents sans espace seraient lus « Non inclus :Aperçu… » — l'espace
                            vit dans le JSX, pas dans le JSON (test pricing-specs). */}
                        <span className="sr-only">{t("notIncluded")} </span>
                        {restriction}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
      {/* Plus de pied de section : la micro-réassurance vit sous chaque CTA, « TVA incluse » dans
          la colonne prix. La clé `Landing.pricing.footer` est retirée par la passe d'intégration. */}
    </LandingSection>
  );
}
