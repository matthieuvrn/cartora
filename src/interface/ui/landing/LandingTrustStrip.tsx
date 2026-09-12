import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { StaggerGroup, StaggerItem } from "@/interface/ui/landing/StaggerReveal";
import { REVEAL_HEADING } from "@/lib/motion";

// Ordre figé par la copy : « 9 DESIGNS · 5 LANGUES · 14 ALLERGÈNES UE · 10 MINUTES ».
// Valeurs RECOPIÉES dans messages/*.json (jamais calculées au rendu) — sources :
// TEMPLATE_META (9), SUPPORTED_MENU_LOCALES (5), ALLERGEN_VALUES (14), copy hero « 10 minutes ».
const FACT_KEYS = ["designs", "languages", "allergens", "minutes"] as const;
const REASSURANCE_KEYS = ["hostingEu", "stripe", "rgpd", "supportFr"] as const;

/**
 * Fin de la scène nuit du hero (DA « Nuit de service »), registre « instrument » : valeurs
 * Fraunces, labels mono, ticks de coin + hairlines white/18. Aucun corail (le climax du
 * viewport est le « 10 minutes » du hero), aucun sapin (pas un succès).
 *
 * Colonne vertébrale : elle traverse la coupe nuit → porcelaine SANS dégradé de fond (chemin
 * nominal « coupes franches » ; la variante aube strip → Problème reste documentée dans la spec,
 * non livrée) — seule une ligne de 1 px passe, et change de couleur à la coupe (white/18 côté
 * nuit, sand-400 → transparent côté porcelaine). Elle est au bord GAUCHE du contenu parce que
 * c'est là que vit le `.eyebrow-thread` de Problème, qui la reprend (adaptation documentée du
 * « centrale » du plan). Toute la matière vit sur deux couches `aria-hidden` non animées, hors
 * des `m.li` floutés ; la grille miroir des colonnes est bornée à la première liste (jamais sous
 * les réassurances). La strip est l'UNIQUE propriétaire des hairlines qui traversent la coupe
 * hero → strip (le hero, `overflow-hidden`, n'en peint aucune).
 *
 * `id="trust"` = ancre stable (sélecteurs de recette, futur lien), pas de tracking, pas d'entrée
 * nav. `scene="nuit"` = contrat des sentinelles du header (à préserver à toute réécriture).
 * Aucun heading : les deux listes sont nommées par `aria-label` (« Chiffres clés » /
 * « Engagements »). Contrastes : AA tenu (labels sand-400 ≥ 8:1 sur nuit-900). Sous `sm` les
 * cellules sont des LIGNES « › 9 designs » alignées sur la colonne vertébrale. L'ancienne
 * marquee infinie a été retirée (WCAG 2.2.2) et rien ici ne dépasse 1 s.
 */
export function LandingTrustStrip() {
  const t = useTranslations("Landing.trustStrip");

  return (
    <LandingSection
      id="trust"
      scene="nuit"
      className="section-nuit texture-grain relative border-t border-white/8 bg-background"
      innerClassName="relative py-8 md:py-10"
    >
      {/* Couche 1 (toute la hauteur) : ticks de coin + colonne vertébrale qui traverse la coupe
          vers Problème. inset-x-6 ⇔ px-6 de LandingSection (changer l'un = changer l'autre).
          Aucune hairline de colonne ICI : elle traverserait la ligne de réassurances. */}
      <div
        aria-hidden="true"
        className="corner-ticks pointer-events-none absolute inset-x-6 inset-y-0"
      >
        {/* Segment nuit (white/18) qui S'ARRÊTE sur le bras vertical du tick bas-gauche
            (bottom-3 = --tick-size, une seule alpha, pas d'empilement), puis chute
            sand-400 → transparent sous la coupe, reprise par le .eyebrow-thread de Problème. */}
        <span className="absolute bottom-3 left-0 h-5 w-px bg-white/18 md:h-7" />
        <span className="absolute top-full left-0 h-12 w-px bg-linear-to-b from-sand-400 to-transparent md:h-16" />
      </div>

      {/* Wrapper relative de la PREMIÈRE liste : la grille miroir des colonnes (couche 2) est
          bornée à sa hauteur (+ le padding haut, -top-10 = md:py-10, pour que les pointillés
          partent du bord de section). UNIQUE propriétaire du franchissement hero → strip
          (hero-p3-1 ne peint rien). Passer à grid-cols-5 ICI ET sur l'ul le jour de la 5e
          cellule (réserve). */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-10 bottom-0 hidden grid-cols-4 md:grid"
        >
          <div />
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative border-l border-white/8">
              <span className="hairline-dashed-up absolute -top-12 -left-px h-12" />
            </div>
          ))}
        </div>

        <StaggerGroup
          as="ul"
          role="list"
          aria-label={t("factsLabel")}
          className="relative grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-4 md:grid-cols-4 md:gap-0"
        >
          {FACT_KEYS.map((key) => (
            <StaggerItem
              key={key}
              as="li"
              variants={REVEAL_HEADING}
              className="flex items-baseline gap-2 md:flex-col md:items-center md:gap-1 md:px-4 md:text-center"
            >
              <span aria-hidden="true" className="font-mono text-caption text-sand-400 md:hidden">
                ›
              </span>
              <span className="font-mono text-caption text-sand-100 tabular-nums md:font-display md:text-h1 md:leading-none">
                {t(`facts.${key}.value`)}
              </span>
              <span className="font-mono text-micro tracking-[0.16em] text-sand-400 uppercase">
                {t(`facts.${key}.label`)}
              </span>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>

      {/* Seconde ligne discrète : les 4 réassurances, sans icône, séparées par des points
          RÉELS (aria-hidden) — jamais de ::before (VoiceOver/Chrome lisent le contenu généré). */}
      <ul
        role="list"
        aria-label={t("reassuranceLabel")}
        className="relative mt-5 flex flex-wrap justify-center gap-x-3 gap-y-1 font-mono text-micro text-sand-400 md:mt-6"
      >
        {REASSURANCE_KEYS.map((key, i) => (
          <li key={key} className="flex items-center gap-3">
            {t(key)}
            {i < REASSURANCE_KEYS.length - 1 && <span aria-hidden="true">·</span>}
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
