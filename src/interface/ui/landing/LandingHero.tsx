import { useTranslations } from "next-intl";
import { MENU_TEMPLATE_VALUES, type MenuTemplate } from "@/domain/menu/MenuTypes";
import { HeroIntro } from "./HeroIntro";
import { HeroLiveDemo } from "./HeroLiveDemo";
import { HeroQrCard } from "./HeroQrCard";

/**
 * Hero « Nuit de service » : scène nuit pleine largeur (le -mt-16 glisse le fond sous le
 * header sticky transparent), lumière « engineered » statique (grille hairline masquée +
 * glow canard derrière le téléphone + contrepoint corail) — le mouvement vit dans le
 * CONTENU (menu vivant, reveals), jamais dans le fond. Le h1 reste l'élément LCP, rendu
 * immédiat sans opacity-gate.
 *
 * Contrats inter-sections : `data-scene="nuit"` sur la <section> (sentinelles du header
 * scene-aware, landingChromeStore) ; AUCUNE hairline ni `relative` au pied de la grille —
 * la TrustStrip est l'unique propriétaire du franchissement hero → strip (coupes franches,
 * décision 2026-09-12 : hero et strip sont deux scènes nuit-900, un dégradé « aube » vers la
 * porcelaine n'aurait de sens qu'à la frontière strip → Problème).
 */
export function LandingHero() {
  const t = useTranslations("Landing.hero");
  // Noms de designs = ceux du produit (PublicMenu.templateNames, 9 clés fr+en existantes).
  // Lus côté serveur uniquement : ce namespace n'est pas dans le provider client de la landing
  // (LANDING_CLIENT_NAMESPACES) — la map est sérialisée en prop (≈ 120 octets, 0 KB JS).
  const tn = useTranslations("PublicMenu.templateNames");
  const templateNames = Object.fromEntries(
    MENU_TEMPLATE_VALUES.map((code) => [code, tn(code)]),
  ) as Record<MenuTemplate, string>;

  return (
    <section
      aria-labelledby="hero-heading"
      data-scene="nuit"
      className="section-nuit texture-grain relative isolate -mt-16 overflow-hidden bg-background text-foreground"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="bg-grid-nuit absolute inset-0" />
        {/* Glow principal derrière le téléphone (alphas ≥ 0.25 — un fond doit se voir). */}
        <div
          className="absolute top-[8%] right-[-12%] h-[720px] w-[720px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.42 0.058 198 / 0.5), transparent 70%)",
          }}
        />
        {/* Lueur d'appui sous le bloc texte, plus froide et plus discrète. */}
        <div
          className="absolute top-[30%] left-[-16%] h-[560px] w-[560px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.34 0.058 200 / 0.35), transparent 70%)",
          }}
        />
        {/* Contrepoint chaud : petit halo corail près du climax « 10 minutes ». */}
        <div
          className="absolute top-[52%] left-[18%] h-[340px] w-[340px]"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.55 0.18 38 / 0.12), transparent 70%)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-6xl gap-14 px-6 pt-32 pb-24 md:min-h-[88svh] md:grid-cols-12 md:items-center md:gap-10 md:pt-28 md:pb-24">
        {/* Texte — le kicker porte la catégorie pour laisser le h1 à la promesse. */}
        <div className="md:col-span-7">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            {t("kicker")}
          </p>
          <h1 id="hero-heading" className="mt-6 text-display-2xl text-balance text-sand-50">
            {t.rich("title", {
              em: (chunks) => (
                <em className="relative font-medium text-corail-300 italic">
                  {chunks}
                  {/* Trait « brush » corail dessiné une fois au chargement (cf. .hero-underline). */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 120 10"
                    preserveAspectRatio="none"
                    className="absolute inset-x-0 -bottom-2 h-2.5 w-full text-corail-500"
                  >
                    <path
                      d="M3 7C32 3.5 64 2.8 117 5.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      pathLength="1"
                      className="hero-underline"
                    />
                  </svg>
                </em>
              ),
            })}
          </h1>

          {/* Sous-titre + CTA + micro-trust : apparition en cascade après le h1. */}
          <HeroIntro />
        </div>

        {/* Menu VIVANT dans le téléphone (cycle des 9 templates + micro-éditions) et
            chevalet QR réellement scannable (SVG généré au build, desktop).
            Colonne téléphone : cadre « instrument » serveur (0 KB) — équerres + anneaux hairline
            + ligne mono factuelle. Aucun corail : le climax du viewport reste « 10 minutes ».
            Tout le cadre est xl+ (à lg le bord droit du téléphone touche le bord du conteneur) ;
            seule la ligne mono, centrée, apparaît dès lg. */}
        <div className="flex items-center justify-center md:col-span-5 md:justify-end">
          <div className="relative w-[300px] md:w-[340px] lg:w-[360px]">
            {/* Anneaux concentriques statiques (xl+ : marge droite 88 px, rien n'est rogné).
                Centre = milieu du wrapper (téléphone + rangée de contrôles), ≈ 45 px sous le centre
                du téléphone. Rayons 196 / 222 / 248 px > demi-largeur du téléphone (180) et
                436 + 248 < 779 (bas du téléphone) : seuls des croissants émergent sur les flancs ;
                le mask linéaire éteint la moitié basse (lumière qui tombe). */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 -z-10 hidden size-[496px] -translate-x-1/2 -translate-y-1/2 xl:block [mask-image:linear-gradient(to_bottom,black_35%,transparent_95%)]"
            >
              <span className="absolute inset-0 rounded-full border border-white/10" />
              <span className="absolute inset-[26px] rounded-full border border-white/8" />
              <span className="absolute inset-[52px] rounded-full border border-white/6" />
            </div>

            {/* Équerres (xl+). Boîte du cadre = racine du menu vivant + 24 px haut/bas, 96 px à
                gauche (le chevalet QR déborde de 64 px), 48 px à droite : 96 + 360 + 48 = 504
                = 7 × 72 px (pas de la grille nuit). */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 -left-24 hidden size-5 border-t border-l border-white/12 xl:block"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 -right-12 hidden size-5 border-t border-r border-white/12 xl:block"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -left-24 hidden size-5 border-b border-l border-white/12 xl:block"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-12 hidden size-5 border-b border-r border-white/12 xl:block"
            />

            {/* Ligne mono factuelle posée sur l'arête haute du cadre (lg+ : centrée sur le téléphone,
                jamais au bord). Valeurs recopiées : 9 = TEMPLATE_META / TEMPLATE_ORDER,
                5 = SUPPORTED_MENU_LOCALES, QR = HeroQrCard. Pas de « 14 » (la strip le porte).
                Pas de point corail (.eyebrow sans .eyebrow-dot). */}
            <p className="eyebrow absolute -top-6 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 whitespace-nowrap lg:inline-flex">
              {t("specLine")}
            </p>

            <HeroLiveDemo
              className="w-full"
              qrCard={<HeroQrCard />}
              templateNames={templateNames}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
