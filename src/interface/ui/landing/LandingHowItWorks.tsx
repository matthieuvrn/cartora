import { useTranslations } from "next-intl";
import { DemoQrSvg } from "@/interface/ui/landing/DemoQr";
import { HowItWorksMilestone } from "@/interface/ui/landing/HowItWorksMilestone";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { StaggerGroup, StaggerItem } from "@/interface/ui/landing/StaggerReveal";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";

type StepKey = "step1" | "step2" | "step3";

const STEPS: ReadonlyArray<{ key: StepKey; number: number }> = [
  { key: "step1", number: 1 },
  { key: "step2", number: 2 },
  { key: "step3", number: 3 },
] as const;

/**
 * « La méthode » — composition OUVERTE (DA 2026, plus de cards clonées) : ligne de métro
 * ANCRÉE dans l'<ol> — route desktop statique hors stagger (span du wrapper `relative`),
 * pastille + tronçons par étape (`HowItWorksMilestone`), terminus sur la pastille sapin
 * (« votre carte est en ligne » : sapin = succès uniquement) ; sur mobile, rail vertical à
 * gauche rempli par le scroll (CSS `.how-rail-fill`). Chaque colonne est portée par un numéral
 * mono canard-700 en objet typographique (la voix « précision tech » du système), un label
 * « Étape » AA, et se termine par l'artefact produit par l'étape (e-mail saisi, ligne de carte
 * enregistrée, vrai QR démo). Plus de hairlines `divide-x` : le rail porte la structure — un
 * seul dispositif structurel par section. Le seul ordinal fiable pour les AT est le sr-only
 * « Étape N » (le <ol> est sans list-style ; `role="list"` restaure la liste, pas les ordinaux).
 */
export function LandingHowItWorks() {
  const t = useTranslations("Landing.howItWorks");
  const tHero = useTranslations("Landing.hero");
  const tAllergen = useTranslations("Allergen");

  return (
    <LandingSection id="how-it-works" ariaLabelledBy="how-it-works-heading">
      <header className="mb-10 max-w-[38rem]">
        <span aria-hidden="true" className="eyebrow-thread" />
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {t("kicker")}
        </p>
        <h2
          id="how-it-works-heading"
          className="mt-5 text-display-lg text-balance md:text-display-xl"
        >
          {t("title")}
        </h2>
      </header>

      {/* Route desktop HORS de l'arbre animé (D7) : REVEAL_ITEM démarre chaque li à opacity 0 — une
          route rendue dans les li n'apparaîtrait qu'avec chacun d'eux. Ici elle est visible dès le
          scroll-in de la section ; les tronçons (HowItWorksMilestone) se dessinent par-dessus.
          CONTRAT : 3 colonnes + md:gap-8 ⇒ right = une colonne − 2 px ; la route finit 2 px SOUS la
          pastille sapin (D6 : le rail s'arrête au terminus). L'<ol> n'a ni padding ni margin, le li a
          md:pt-9 et sa pastille est à md:top-0 : la ligne y = 5-6 traverse le centre de chaque pastille.
          Peinture des jonctions : ordre DOM des descendants positionnés (z-index auto) — la pastille
          du li N+1 recouvre le débord du li N. NE PAS ajouter de z-index (un z-index sur un li
          piégerait ses propres descendants). */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute top-[5px] right-[calc((100%-4rem)/3-2px)] left-0 hidden border-t border-dashed border-sand-300 md:block"
        />
        {/* Stagger d'entrée des 3 étapes — section parente enveloppée par MotionSection (fade
            seul). `role="list"` : preflight pose list-style:none et Safari/VoiceOver perd alors la
            sémantique de liste. */}
        <StaggerGroup as="ol" role="list" className="grid grid-cols-1 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ key, number }, index) => {
            const titleId = `how-it-works-${key}-title`;
            const nn = String(number).padStart(2, "0"); // affichage seulement — JAMAIS dans le sr-only
            // Artefact par étape — sélection ici (closure sur t/tHero/tAllergen), pas en module.
            const artefact =
              key === "step1" ? (
                <EmailArtefact
                  label={t("artefacts.emailLabel")}
                  value={t("artefacts.emailValue")}
                />
              ) : key === "step2" ? (
                <MenuRowArtefact allergen={tAllergen("MILK.short")} />
              ) : (
                <QrArtefact caption={tHero("qrCaption")} />
              );
            return (
              <StaggerItem
                key={key}
                as="li"
                className="relative pb-10 pl-8 last:pb-0 md:flex md:flex-col md:pt-9 md:pb-0 md:pl-0"
              >
                <HowItWorksMilestone index={index} last={index === STEPS.length - 1} />
                {/* Numéral = objet typographique (registre mono « précision tech »), décoratif pour l'AT.
                    L'ordinal ACCESSIBLE est le span sr-only ci-dessous (« Étape 1 » — chiffre NON zéro-paddé :
                    VoiceOver/NVDA liraient « 01 » « zéro un ») ; le label visible est aria-hidden parce que son
                    text-transform: uppercase peut être épelé lettre à lettre par VoiceOver. C'est le SEUL ordinal
                    fiable (le <ol> est sans list-style ; role="list" restaure la liste, pas les ordinaux).
                    leading-none / tracking-normal neutralisent la line-height et le letter-spacing Fraunces
                    embarqués par text-h1 / text-display-lg (composés via --tw-leading / --tw-tracking : les
                    utilitaires non préfixés survivent au md:text-display-lg). */}
                <span
                  aria-hidden="true"
                  className="block font-mono text-h1 leading-none tracking-normal text-canard-700 tabular-nums md:text-display-lg"
                >
                  {nn}
                </span>
                <span className="mt-2 block font-mono text-micro tracking-[0.16em] text-sand-600 uppercase">
                  <span aria-hidden="true">{t("stepLabel")}</span>
                  <span className="sr-only">
                    {t("stepLabel")} {number}
                  </span>
                </span>
                <h3 id={titleId} className="mt-4 text-h3 text-canard-950">
                  {t(`${key}.title`)}
                </h3>
                {/* t.rich OBLIGATOIRE tant que step2 porte un <em> : un t() ne throw pas — use-intl loggue une
                    IntlError (INVALID_MESSAGE / FORMATTING_ERROR) et rend le CHEMIN DE LA CLÉ en clair
                    (« Landing.howItWorks.step2.body »). Vérif = grep du HTML prérendu FR ET EN.
                    Emphase de la section — variante A (arbitrage Matt 2026-09-12) : « environ 10 minutes »
                    en corail-600 (5,12:1 sur sand-50, AA ; JAMAIS corail-500 = 3,27:1). Un climax corail par
                    viewport : cette variante n'est valable qu'AVEC le lavis sand-200 de HighlightSweep (aside
                    du constat, co-visible sur les laptops courants) — retirer l'un = retirer l'autre (alternative
                    B : text-canard-950 ici, corail-200 là-bas). not-italic EXPLICITE : l'UA met <em> en italique
                    et Geist n'a pas de face italique chargée — l'italique corail ne vit que sur Fraunces. */}
                <p className="mt-2.5 text-body text-sand-700">
                  {t.rich(`${key}.body`, {
                    em: (chunks) => (
                      <em className="font-medium text-corail-600 not-italic">{chunks}</em>
                    ),
                  })}
                </p>
                {/* Artefact produit : sur md+ le li est flex-col ⇒ mt-auto aligne les trois artefacts
                    sur une même ligne basse quelle que soit la longueur des bodies (md:pt-6 = espacement minimal). */}
                <div className="mt-6 md:mt-auto md:pt-6">{artefact}</div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>

      {/* Pont de conversion : le momentum des 3 étapes débouche sur un geste, pas sur du vide. */}
      <div className="mt-10">
        <TrackedCtaButton event="cta_how_signup" href="/signup?src=how" variant="outline" arrow>
          {t("cta")}
        </TrackedCtaButton>
      </div>
    </LandingSection>
  );
}

/* Étape 1 — champ e-mail « en cours de saisie » : ring canard (focus) + caret STATIQUE
   (précédent Features ; un caret clignotant serait une boucle infinie). Décoratif : jamais
   un <input> (faux contrôle focusable). Label sand-600 : 6,55:1 sur blanc (sand-500 = 3,95,
   sous AA — même sous aria-hidden on ne livre pas un fac-similé de formulaire illisible).
   Valeur en `truncate` : à md (194 px internes) la valeur mono 13 px fait ≈ 187 px — pendant
   le FOUT JetBrains Mono la fallback monospace est plus large et ferait passer le caret à la
   ligne ; nowrap + ellipsis plutôt qu'un retour. */
function EmailArtefact({ label, value }: { label: string; value: string }) {
  return (
    <div
      aria-hidden="true"
      className="max-w-[17rem] rounded-lg bg-white px-3 py-2.5 ring-2 ring-canard-300"
    >
      <span className="block font-mono text-micro tracking-[0.16em] text-sand-600 uppercase">
        {label}
      </span>
      <span className="mt-1 flex items-center font-mono text-body-sm text-canard-950">
        <span className="min-w-0 truncate">{value}</span>
        <span className="ml-0.5 h-3.5 w-px shrink-0 bg-canard-600" />
      </span>
    </div>
  );
}

/* Étape 2 — ligne de carte ENREGISTRÉE (pas de ring, pas de caret : l'état « rempli »),
   fac-similé du seed : Burrata fumée 14,00 €, allergène MILK. Nom en français sur /en
   (contrat du fac-similé, comme le hero et Features). CONTRAT SEED : si scripts/seed-demo.ts
   change le prix de la Burrata fumée, mettre à jour ce littéral ET EditorVisual (Features).
   14,00 € est un littéral de fac-similé, PAS un prix Cartora (aucune 5e source de prix). */
function MenuRowArtefact({ allergen }: { allergen: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex max-w-[20rem] items-start justify-between gap-4 rounded-lg border border-sand-200 bg-white px-3 py-2.5"
    >
      <span className="min-w-0">
        <span className="block text-body-sm font-medium text-canard-950">Burrata fumée</span>
        <span className="mt-1.5 inline-flex rounded-full border border-sand-200 bg-sand-50 px-2.5 py-0.5 text-micro text-sand-700">
          {allergen}
        </span>
      </span>
      <span className="shrink-0 font-mono text-body-sm font-medium text-canard-800">14,00 €</span>
    </div>
  );
}

/* Étape 3 — VRAI QR (SVG au build via DemoQr.tsx, 0 Ko JS), même destination que le hero
   (DEMO_QR_URL = source unique). `DemoQrSvg` porte role="img" + aria-label (il porte une
   information — scannable — contrairement aux deux autres artefacts). Carte à LARGEUR FIXE
   w-32 (précédent HeroQrCard w-40), border-box : 128 − 16 (p-2) − 2 (border) = 110 px internes
   ⇒ la caption 11 px mono (≈ 6,6 px/car.) tient sur 2 lignes en FR (« Scannez : c’est » /
   « une vraie carte », 15 + 15 car. = 99 px) et en EN (“Scan it — it’s a” / “real menu”).
   Ne pas descendre sous 99 px internes (p-2.5 → 106 px et p-3 → 102 px restent à 2 lignes). */
function QrArtefact({ caption }: { caption: string }) {
  return (
    <div className="w-32 rounded-lg border border-sand-200 bg-white p-2">
      <DemoQrSvg />
      <p className="mt-1.5 text-center font-mono text-micro leading-snug text-sand-600">
        {caption}
      </p>
    </div>
  );
}
