import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { DailyDishPolicy } from "@/domain/menu/DailyDishPolicy";
import { ALLERGEN_VALUES, type Allergen } from "@/domain/menu/ItemPolicy";
import { SUPPORTED_MENU_LOCALES } from "@/domain/menu/MenuLocale";
import { MENU_TEMPLATE_VALUES, type MenuTemplate } from "@/domain/menu/MenuTypes";
import {
  BISTRO_FALLBACK,
  CARTORA_FALLBACK,
  CLASSIC_FALLBACK,
  NEON_FALLBACK,
  NOIR_FALLBACK,
  RIVAGE_FALLBACK,
  SOLAR_FALLBACK,
  VELOURS_FALLBACK,
  ZEN_FALLBACK,
} from "@/interface/ui/components/menu-template/brandTokens";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { StaggerGroup, StaggerItem } from "@/interface/ui/landing/StaggerReveal";
import { cn } from "@/lib/utils";
import { DemoQrSvg } from "./DemoQr";
import { FeatureCard, type FeatureKey, type FeatureTier } from "./FeatureCard";

// Bento à hairlines partagées (passe moodboard 2026-09) : 3 lignes × 2 cellules, spans alternés
// 4+2 / 2+4 / 4+2. L'ordre EST la mise en page (md) et l'ordre de lecture (mobile) : l'éditeur
// ouvre, les deux cellules PRO ouvrent les lignes 2 et 3. Le tier est un discriminant statique →
// la couleur de la chip ne dépend jamais du texte i18n. `qr` en starter : QR et stats n'ont de
// réalité qu'une fois la carte publiée (STARTER+).
const BENTO: ReadonlyArray<{ key: FeatureKey; tier: FeatureTier; span: 4 | 2 }> = [
  { key: "editor", tier: "all", span: 4 },
  { key: "qr", tier: "starter", span: 2 },
  { key: "bilingual", tier: "pro", span: 2 },
  { key: "allergens", tier: "all", span: 4 },
  { key: "branding", tier: "pro", span: 4 },
  { key: "daily", tier: "starter", span: 2 },
] as const;

const SPAN_CLASS = { 4: "md:col-span-4", 2: "md:col-span-2" } as const;

// Hairlines partagées : `divide-*` ne sait pas dessiner une grille 2D → bords par cellule (idiome
// ProblemGrid). Sous md, chaque cellule après la première porte un border-t ; dès md, la cellule
// de droite (index impair) porte le border-l et la 2e cellule (ligne 1) perd son border-t.
// Portées par la cellule de grille STATIQUE (jamais par le StaggerItem) : pendant l'entrée en
// cascade, seul le contenu monte — les hairlines restent alignées sur le cadre fixe du conteneur.
function cellClass(index: number): string {
  return cn(
    "border-sand-200",
    index > 0 && "border-t",
    index === 1 && "md:border-t-0",
    index % 2 === 1 && "md:border-l",
  );
}

// Palette d'aperçu par template (constantes pures de brandTokens.ts — jamais registry.tsx, qui
// tirerait les composants de rendu). Ordre = MENU_TEMPLATE_VALUES (domaine). La pastille montre
// encre / papier (primary / bg) : c'est la lecture « skin clair ou sombre » qui fait 9 designs.
const TEMPLATE_SWATCHES: Record<MenuTemplate, { primary: string; bg: string }> = {
  CLASSIC: CLASSIC_FALLBACK,
  CARTORA: CARTORA_FALLBACK,
  BISTRO: BISTRO_FALLBACK,
  NOIR: NOIR_FALLBACK,
  SOLAR: SOLAR_FALLBACK,
  ZEN: ZEN_FALLBACK,
  NEON: NEON_FALLBACK,
  RIVAGE: RIVAGE_FALLBACK,
  VELOURS: VELOURS_FALLBACK,
};

// Allergènes du « Velouté de potimarron » (seed démo, 1re ligne de l'éditeur) : les 3 chips
// « cochées » du visuel — l'éditeur coche parmi les 14, le visuel le montre.
const VELOUTE_ALLERGENS: ReadonlySet<Allergen> = new Set<Allergen>(["GLUTEN", "MILK", "NUTS"]);

// Jauge d'échéance : 5 jours restants sur MAX_HORIZON_DAYS (14). Le 5 est ILLUSTRATIF (même statut
// que la Blanquette à 18,50 €) et cohérent avec la légende `daily.visualDaysLeft` ; le 14 est le
// fait produit (DailyDishPolicy). Ne jamais dériver de `new Date()` : la page est prérendue statique.
const DAILY_DAYS_LEFT = 5;

/* Mini-visuels bento : JSX/CSS pur, rendus côté serveur (0 Ko JS), décoratifs (le corps de
   cellule porte l'information — FeatureCard les pose en aria-hidden). Le contenu culinaire est
   le fac-similé du menu démo, comme le hero (carte authentique d'un bistrot français), en
   français sur /en par contrat. Registre de gris : sand-500 = fac-similé pur (descriptions,
   labels de catégories, codes de locale) ; sand-600 = légendes TRADUITES porteuses d'un fait
   produit (« 14 jours max », « 9 designs », « encore 5 jours ») — AA 4,5:1 tenu en 11 px. */

function EditorRow({ name, desc, price }: { name: string; desc: string; price: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-body-sm font-medium text-sand-800">{name}</span>
        <span className="mt-0.5 block truncate text-caption text-sand-500">{desc}</span>
      </span>
      <span className="shrink-0 font-mono text-body-sm text-canard-800">{price}</span>
    </div>
  );
}

function CategoryLabel({ children, first = false }: { children: string; first?: boolean }) {
  return (
    <p
      className={cn(
        "font-mono text-micro tracking-[0.16em] text-sand-500 uppercase",
        !first && "mt-4",
      )}
    >
      {children}
    </p>
  );
}

// Fenêtre sur le produit : cadre blanc élevé (seule shadow-lg de la section — la profondeur du
// col-span devient matière) + cadre fantôme décalé de 12 px dès md. Le wrapper aria-hidden de
// FeatureCard (`emphasis`) le pose en absolu haut-droit dès md et la cellule le rogne par le BAS
// (Desserts) ; AUCUNE transform (translate/scale) : la colonne des prix reste entière, l'échelle
// lg vient de la largeur naturelle du wrapper (≈ 262 → 415 px). Sous md il reste dans le flux,
// borné en largeur (le correctif d'overflow 2026-09-06 en dépend).
function EditorVisual() {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="absolute inset-0 hidden translate-x-3 translate-y-3 rounded-xl border border-sand-200/80 bg-sand-50/60 md:block"
      />
      <div className="relative rounded-xl bg-white p-4 shadow-md ring-1 ring-sand-200 md:shadow-lg lg:p-5">
        <CategoryLabel first>Entrées</CategoryLabel>
        <div className="mt-1 divide-y divide-sand-200">
          <EditorRow
            name="Velouté de potimarron"
            desc="Potimarron rôti, huile de noisette"
            price="9,50 €"
          />
          <EditorRow name="Burrata fumée" desc="Tomates anciennes, basilic" price="14,00 €" />
        </div>
        <CategoryLabel>Plats</CategoryLabel>
        <div className="mt-1 divide-y divide-sand-200">
          <EditorRow
            name="Magret de canard"
            desc="Miel, romarin, pommes grenailles"
            price="24,00 €"
          />
        </div>
        {/* Ligne « en cours d'édition » : ring canard + caret. Le caret clignote 3 fois (3,75 s,
            tw-animate-css) au survol de la cellule seulement — borné, hors bouton pause. */}
        <div className="-mx-2 mt-1.5 flex items-start justify-between gap-4 rounded-lg bg-canard-50 px-2 py-2.5 ring-2 ring-canard-300">
          <span className="min-w-0">
            <span className="block text-body-sm font-medium text-canard-950">
              Risotto aux cèpes
              <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-canard-600 group-hover:animate-caret-blink group-hover:repeat-3" />
            </span>
            <span className="mt-0.5 block truncate text-caption text-sand-500">
              Cèpes sauvages, copeaux de parmesan
            </span>
          </span>
          <span className="shrink-0 font-mono text-body-sm font-medium text-canard-800">
            19,50 €
          </span>
        </div>
        <CategoryLabel>Desserts</CategoryLabel>
        <div className="mt-1 divide-y divide-sand-200">
          {/* Aligné sur le seed (non épinglé — libre, mais autant être juste). */}
          <EditorRow
            name="Moelleux chocolat noir"
            desc="Cœur coulant, glace vanille bourbon"
            price="9,50 €"
          />
        </div>
      </div>
    </div>
  );
}

function QrVisual() {
  return (
    <div className="w-fit rounded-lg border border-sand-200 bg-white p-2">
      {/* VRAI QR (SVG généré au build via DemoQr — 0 Ko JS), même URL que le hero, l'étape 3 et
          la clôture (`DEMO_QR_URL`, source unique). Décoratif : le corps de cellule porte l'info. */}
      <DemoQrSvg decorative className="size-20" />
    </div>
  );
}

// Les 14 allergènes INCO (ALLERGEN_VALUES, libellés `Allergen.<CODE>.short`) — toujours visibles
// (un hover-reveal serait invisible au touch, et le point est de VOIR le 14) ; les 3 du Velouté
// sont « cochées » (teinte canard). Le corps de cellule (« 14 allergènes ») reste le porteur a11y.
function AllergenVisual({ chips }: { chips: ReadonlyArray<{ code: Allergen; label: string }> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(({ code, label }) => (
        <span
          key={code}
          className={cn(
            "rounded-full border px-2.5 py-1 text-micro",
            VELOUTE_ALLERGENS.has(code)
              ? "border-canard-200 bg-canard-50 text-canard-800"
              : "border-sand-200 bg-sand-50 text-sand-700",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// Rangée des 5 locales (SUPPORTED_MENU_LOCALES) à focale + paire du seed. Focale FR au repos,
// EN au survol de la cellule : CROSSFADE couleur / opacité (aucune translation — la carte n'est
// pas cliquable). Sur touch, l'état de repos montre déjà tout. Aucun corail.
function BilingualVisual() {
  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center gap-3 text-caption tracking-wide">
        {SUPPORTED_MENU_LOCALES.map((locale) => (
          <span
            key={locale}
            className={cn(
              "relative pb-1 uppercase transition-colors duration-300",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-canard-600 after:opacity-0 after:transition-opacity after:duration-300",
              locale === "fr" &&
                "text-canard-950 after:opacity-100 group-hover:text-sand-500 group-hover:after:opacity-0",
              locale === "en" &&
                "text-sand-500 group-hover:text-canard-950 group-hover:after:opacity-100",
              locale !== "fr" && locale !== "en" && "text-sand-500",
            )}
          >
            {locale}
          </span>
        ))}
      </div>
      {/* Paire réelle du seed démo : « Burrata fumée » → « Smoked burrata » (plat épinglé). */}
      <p className="text-body-sm font-medium">
        <span className="block text-canard-950 transition-colors duration-300 group-hover:text-sand-500">
          Burrata fumée
        </span>
        <span className="block text-sand-500 transition-colors duration-300 group-hover:text-canard-950">
          {/* « › » U+203A : « → » U+2192 n'est pas dans le sous-ensemble JetBrains Mono (repli Arial). */}
          <span aria-hidden="true" className="mr-1.5 text-canard-500">
            ›
          </span>
          Smoked burrata
        </span>
      </p>
    </div>
  );
}

// Plat du jour du seed + jauge d'échéance : 14 segments (MAX_HORIZON_DAYS), 5 allumés, légende
// mono « encore 5 jours » / « 14 jours max » en sand-600 (fait produit traduit → AA). La pilule
// « Aujourd’hui » est le nom de la section publique (TODAY_SECTION_ANCHOR_ID) — pas une date. Le
// visuel raconte l'expiration automatique (la feature), jamais une promotion (pas d'ancien prix barré).
function DailyVisual({ daysLeft, horizon }: { daysLeft: string; horizon: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="rounded-full bg-canard-100 px-2.5 py-1 text-micro font-medium text-canard-800">
          Aujourd’hui
        </span>
        <span className="font-mono text-body-sm text-canard-950">Blanquette de veau</span>
        <span className="font-mono text-body-sm font-medium text-canard-800">18,50 €</span>
      </div>
      <div
        className="grid gap-px overflow-hidden rounded-full"
        style={{
          gridTemplateColumns: `repeat(${DailyDishPolicy.MAX_HORIZON_DAYS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: DailyDishPolicy.MAX_HORIZON_DAYS }, (_, day) => (
          <span
            key={day}
            className={cn("h-1", day < DAILY_DAYS_LEFT ? "bg-canard-600" : "bg-sand-200")}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 font-mono text-micro text-sand-600">
        <span>{daysLeft}</span>
        <span>{horizon}</span>
      </div>
    </div>
  );
}

// « Aa » Fraunces (encre) doublé d'un « Aa » Geist en filigrane sand-200 décalé de 6 px (deux
// dessins de lettres = « designs »), + les 9 pastilles encre/papier des templates. Aucun corail
// ajouté (SOLAR n'apparaît que comme moitié d'une pastille de 16 px — donnée template).
function BrandingVisual({ caption }: { caption: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <span className="relative inline-block leading-none">
        <span className="absolute top-1.5 left-1.5 font-sans text-display-lg leading-none text-sand-200">
          Aa
        </span>
        <span className="display relative text-display-lg leading-none text-canard-950">Aa</span>
      </span>
      <span className="flex flex-col items-end gap-2">
        <span className="flex items-center gap-1.5">
          {MENU_TEMPLATE_VALUES.map((code) => {
            const { primary, bg } = TEMPLATE_SWATCHES[code];
            return (
              <span
                key={code}
                className="size-4 rounded-full ring-1 ring-sand-300/70 ring-inset"
                style={{ background: `linear-gradient(135deg, ${primary} 50%, ${bg} 50%)` }}
              />
            );
          })}
        </span>
        <span className="font-mono text-micro text-sand-600">{caption}</span>
      </span>
    </div>
  );
}

export function LandingFeatures() {
  const t = useTranslations("Landing.features");
  // Namespace `Allergen` : lisible ici parce que LandingFeatures est un composant SERVEUR — un
  // visuel client ne le pourrait pas (seuls `Landing` + `Consent` sont embarqués côté client).
  const ta = useTranslations("Allergen");

  const visuals: Record<FeatureKey, ReactNode> = {
    editor: <EditorVisual />,
    qr: <QrVisual />,
    allergens: (
      <AllergenVisual
        chips={ALLERGEN_VALUES.map((code) => ({ code, label: ta(`${code}.short`) }))}
      />
    ),
    bilingual: <BilingualVisual />,
    daily: <DailyVisual daysLeft={t("daily.visualDaysLeft")} horizon={t("daily.visualHorizon")} />,
    branding: <BrandingVisual caption={t("branding.visualCaption")} />,
  };

  return (
    <LandingSection
      id="features"
      ariaLabelledBy="features-heading"
      // Voir LandingHowItWorks : frontière resserrée, le fil du kicker porte déjà 60 px.
      innerClassName="pt-4 md:pt-6"
    >
      <header className="mb-10 max-w-[38rem]">
        <span aria-hidden="true" className="eyebrow-thread" />
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {t("kicker")}
        </p>
        <h2 id="features-heading" className="mt-5 text-display-lg md:text-display-xl">
          {t("title")}
        </h2>
        <p className="mt-5 text-lead text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* Bento à hairlines partagées : UN conteneur (bord, radius, ombre) ; chaque cellule de grille
          est un div STATIQUE (span + hairlines, cf. cellClass) contenant le StaggerItem — seul le
          contenu monte en cascade, les hairlines ne bougent jamais contre le cadre fixe. Les variants
          motion se propagent par contexte React à travers le div intermédiaire. La section parente
          est enveloppée par MotionSection (fade seul). `grid-cols-1` (= minmax(0, 1fr)) sous md :
          sans piste explicite, la colonne auto prenait la largeur min-content de la cellule éditeur
          (descriptions `truncate` = nowrap) et la page défilait horizontalement de 11 px à
          390 px / 41 px à 360 px (passe 2026-09-06). */}
      <StaggerGroup className="grid grid-cols-1 overflow-hidden rounded-2xl border border-sand-200 bg-card shadow-md md:grid-cols-6">
        {BENTO.map(({ key, tier, span }, index) => (
          <div key={key} className={cn(SPAN_CLASS[span], cellClass(index))}>
            <StaggerItem className="h-full [&>article]:h-full">
              <FeatureCard
                featureKey={key}
                tier={tier}
                title={t(`${key}.title`)}
                body={t(`${key}.body`)}
                tierLabel={t(`${key}.tier`)}
                visual={visuals[key]}
                emphasis={key === "editor"}
              />
            </StaggerItem>
          </div>
        ))}
      </StaggerGroup>

      {/* Pont vers la preuve : ancre native vers la Démo (html { scroll-behavior: smooth }),
          0 Ko, pas d'événement (un saut interne n'est pas un demo_link_click ; section_view
          « demo » se déclenchera à l'arrivée). Lien cliquable → la flèche peut translater. */}
      <p className="mt-8 md:mt-10">
        <a
          href="#demo"
          className="group/proof inline-flex min-h-11 items-center gap-2 font-mono text-caption tracking-wide text-canard-800 transition-colors duration-200 hover:text-canard-950 md:min-h-0"
        >
          {t("proofLink")}
          <span
            aria-hidden="true"
            className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover/proof:translate-x-0.5"
          >
            →
          </span>
        </a>
      </p>
    </LandingSection>
  );
}
