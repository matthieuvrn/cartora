"use client";

import Image, { getImageProps, type StaticImageData } from "next/image";
import { useCallback, useRef, type ElementType } from "react";
import { useLocale } from "next-intl";
import { ArrowUpRight, Lock } from "lucide-react";
import { LazyMotion, domAnimation, m, useScroll, useTransform } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, REVEAL_VISUAL } from "@/lib/motion";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

type BrowserMockupProps = {
  /** Capture desktop 1800×1200 (3:2) — import statique (dimensions intrinsèques pour CLS). */
  src: StaticImageData;
  /** Capture mobile 780×1300 (3:5) — servie sous md par `<picture>`, et par le satellite dès lg. */
  srcMobile: StaticImageData;
  /** `Landing.demo.imageAlt` — vrai pour les DEUX cadrages. */
  alt: string;
  /** URL affichée dans la barre du chrome (ex. "cartora.app/m/demo-cartora"). */
  url: string;
  /** Destination du cadre-lien (ex. "/m/demo-cartora"). */
  href: string;
  /** `Landing.demo.frameLinkLabel` — nom accessible du `<a>` (inclut « nouvel onglet »). */
  linkLabel: string;
  /** `Landing.demo.frameHint` — chip « Ouvrir ↗ » au survol (md+). */
  hint: string;
  /** Fusionné à WRAPPER_CLASS (cn). */
  className?: string;
};

// Dézoom de l'image seule (le chrome ne zoome pas) — variant ENFANT hérité de l'orchestration
// initial="hidden" / whileInView="show" posée sur le m.div reveal.
const IMAGE_ZOOM = {
  hidden: { scale: 1.04 },
  show: { scale: 1, transition: { duration: 0.8, ease: EASE_OUT_EXPO } },
} as const;

const VIEWPORT = { once: true, margin: "0px 0px -10% 0px" } as const;

// Largeur du cadre : portrait 320 px sous md, desktop 896 px dès md. La règle chrono
// (LandingDemoPreview, demo-p3-1) recopie ces deux max-w — les garder alignées. `isolate` crée
// le contexte d'empilement dans lequel l'écho `-z-10` reste AU-DESSUS du fond de la section.
// Idem pour les deux `sizes="320px"` du <source> mobile (sinon le navigateur choisit un candidat
// srcset pour 100vw : 2× plus de pixels que l'affichage sur chaque téléphone).
const WRAPPER_CLASS = "relative isolate mx-auto w-full max-w-[320px] md:max-w-4xl";

// Cadre « fenêtre navigateur » macOS, propre (à la Linear/Vercel) : chrome nuit, pastilles
// MONOCHROMES (les trois feux rouge/jaune/vert d'origine étaient trois teintes hors grammaire —
// rouge ≠ corail, vert ≠ sapin — posées sur la scène où « un climax par viewport » se voit le
// plus ; Linear/Vercel les éteignent pour la même raison), pill d'URL en mono. Le screenshot
// devient « un vrai site qu'on peut visiter ». `shadow-frame` = élévation + halo fusionnés en UN
// token composé — remplace l'ancien empilement `shadow-xl` + `shadow-[var(--shadow-glow)]` (non
// déterministe : deux utilities box-shadow en concurrence).
// `isolate` : WebKit ne rogne pas un descendant transformé (scale du dézoom) au border-radius
// du parent overflow-hidden sans contexte d'empilement propre → coins carrés visibles 800 ms
// sur Safari/iOS. 0 KB, inoffensif ailleurs.
const FRAME_CLASS =
  "overflow-hidden isolate rounded-2xl border border-white/10 bg-nuit-800 shadow-frame";

// Cadre d'écho : une « autre peau » (VELOURS, aubergine) derrière le cadre, recolorée par les
// tokens `[data-template]` de globals.css (@layer base, non scopés — même mécanique que
// HeroLiveDemo) : aucun import du registry, aucune police. Décalage haut-gauche (−12/−12) :
// le satellite occupe le coin bas-droit à lg, les deux objets ne se croisent pas. Tailwind
// `-translate-*` écrit la propriété `translate`, motion écrit `transform` : les deux composent.
const ECHO_CLASS =
  "pointer-events-none absolute inset-0 -z-10 -translate-x-3 -translate-y-3 rounded-2xl border border-(--menu-border) bg-(--menu-bg)";

// Satellite « écran nu » (lg+) : image + bord + ombre, ni pastilles ni châssis (un mini-navigateur
// de 176 px lirait comme une fenêtre desktop miniature ; un châssis iPhone = skeuomorphisme).
// Ombre : shadow-pill-dark (halo court, 24 px de flou) et non shadow-frame (28 px d'offset /
// 54 px de flou) : le halo du cadre principal déborderait de 32 px sous le satellite et
// s'écraserait sur la hairline de la rangée designs.
const SATELLITE_CLASS =
  "overflow-hidden rounded-[1.25rem] border border-white/10 bg-nuit-800 shadow-[var(--shadow-pill-dark)]";

// Miroir EXACT du breakpoint `md` de Tailwind 4 (48rem, émis `@media (width >= 48rem)`) —
// ne JAMAIS l'écrire en px : avec une taille de police racine ≠ 16 px (zoom texte seul,
// minimum-font-size), un `767.98px` basculerait à une autre largeur que `md:aspect-[3/2]`
// et object-cover rognerait ~40 % de la mauvaise capture. Même grammaire « range » que Tailwind.
const MOBILE_MEDIA = "(width < 48rem)";

// `relative z-10` : l'image scalée à 1,04 est un sibling POSTÉRIEUR — sans z, elle peindrait
// par-dessus la barre pendant les 800 ms du dézoom (le wrapper zoom est lui-même
// overflow-hidden : double ceinture). Sous md (cadre portrait de 320 px) : paddings resserrés
// (px-3 / px-2) — mesuré à 390, le pill « cartora.app/m/demo-cartora » en text-micro (tracking
// 0,06 em) fait ≈ 231 px pour 226 disponibles avec les paddings desktop et repliait sur deux
// lignes ; nowrap + truncate en garde-fou (une URL plus longue s'ellipse, ne déforme jamais la barre).
function Chrome({ url }: { url: string }) {
  return (
    <div className="relative z-10 flex items-center gap-3 border-b border-white/10 bg-nuit-800 px-3 py-2.5 md:px-4">
      <div className="flex shrink-0 gap-1.5" aria-hidden="true">
        <span className="size-3 rounded-full bg-white/15" />
        <span className="size-3 rounded-full bg-white/15" />
        <span className="size-3 rounded-full bg-white/15" />
      </div>
      <div className="mx-auto flex min-w-0 items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 font-mono text-micro text-sand-300 md:px-3">
        <Lock className="size-3 shrink-0 stroke-[2]" aria-hidden="true" />
        <span className="truncate whitespace-nowrap">{url}</span>
      </div>
    </div>
  );
}

/**
 * Fenêtre navigateur autour de la capture de la démo — et LIEN vers la vraie carte (tout le
 * cadre est cliquable, tracké `demo_link_click { surface: "frame" }` ; halo `shadow-frame-hover`
 * + chip « Ouvrir ↗ » au survol/focus, jamais de lift : le hover = matière, le lift est réservé
 * aux pilules CTA). Art direction : `<picture>` sert la capture portrait 3:5 sous md et la
 * desktop 3:2 dès md (le wrapper zoom réserve le ratio en CSS → CLS nul) ; dès lg un satellite
 * portrait « écran nu » chevauche le coin bas-droit.
 *
 * Trois couches `m.div` IMBRIQUÉES, jamais fusionnées (la valeur scroll `style={{ y }}` et le
 * `y: 12` de REVEAL_VISUAL se battraient sur la même propriété) : parallaxe ±24 px pilotée par
 * le scroll (existant) → reveal REVEAL_VISUAL (once, −10 %) → dézoom image 1,04 → 1. L'écho
 * VELOURS suit le même scrollYProgress à ±14 px (plus loin = plus lent). Rien > 5 s : rien à
 * brancher sur le store pause. `LazyMotion strict` + `m.*`, fallback statique sous
 * `prefers-reduced-motion` avec la MÊME structure de balises (l'HTML prérendu est la branche
 * animée ; la branche PRM s'applique après montage — jamais d'`initial` opacity 0 en PRM).
 */
export function BrowserMockup({
  src,
  srcMobile,
  alt,
  url,
  href,
  linkLabel,
  hint,
  className,
}: BrowserMockupProps) {
  const reduce = useReducedMotionSafe();
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const yEcho = useTransform(scrollYProgress, [0, 1], [14, -14]);

  const onFrameClick = useCallback(() => {
    trackLandingEvent({ event: "demo_link_click", locale, metadata: { surface: "frame" } });
  }, [locale]);

  // Pas de placeholder blur : avec getImageProps, le fond flou (backgroundImage inline) n'est
  // JAMAIS retiré — le onLoad qui le nettoie (blurComplete) est un état interne de <Image>.
  // Le cadre bg-nuit-800 + aspect-* réservent déjà la boîte (CLS nul) ; on économise le data-URI.
  const {
    props: { srcSet: mobileSrcSet, width: mobileW, height: mobileH },
  } = getImageProps({ src: srcMobile, alt, sizes: "320px", loading: "lazy" });
  const { props: desktopImg } = getImageProps({
    src,
    alt,
    sizes: "(min-width: 768px) 896px, 100vw",
    loading: "lazy",
  });

  // Tag du wrapper zoom par branche : un `m.div` hors `LazyMotion strict` lèverait — jamais un
  // m.div dans la branche PRM.
  const Zoom: ElementType = reduce ? "div" : m.div;
  const zoomProps = reduce ? {} : { variants: IMAGE_ZOOM };

  // Cadre-lien : identique dans les deux branches (construit UNE fois). Rien d'interactif à
  // l'intérieur (pastilles et pill du chrome sont décoratifs). `aria-label` = nom concis (masque
  // l'alt comme nom, choix assumé : l'image reste dans l'arbre). `rounded-2xl` + `outline-none` :
  // l'anneau focus nuit (box-shadow, règle globale .section-nuit :focus-visible) épouse le cadre
  // sans doubler l'outline de @layer base ; `shadow-frame` vit sur le div interne → aucun
  // conflit box-shadow avec l'anneau.
  const frameLink = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={linkLabel}
      onClick={onFrameClick}
      className="group block rounded-2xl outline-none"
    >
      <div
        className={cn(
          FRAME_CLASS,
          "relative transition-shadow duration-300 ease-[var(--ease-out-expo)] group-hover:shadow-frame-hover group-focus-visible:shadow-frame-hover",
        )}
      >
        <Chrome url={url} />
        <Zoom className="aspect-[3/5] overflow-hidden md:aspect-[3/2]" {...zoomProps}>
          {/* preflight rend <img> block mais laisse <picture> inline. `alt={alt}` explicite APRÈS
              le spread, obligatoire : jsx-a11y/alt-text ne résout pas un spread d'identifiant. */}
          <picture className="block h-full w-full">
            <source
              media={MOBILE_MEDIA}
              srcSet={mobileSrcSet}
              sizes="320px"
              width={mobileW}
              height={mobileH}
            />
            <img {...desktopImg} alt={alt} className="h-full w-full object-cover" />
          </picture>
        </Zoom>
        {/* Chip « Ouvrir ↗ » : DANS la barre de chrome (top-2 = 8 px, ≈ 24 px < 41 px de barre), à
            droite, là où un chrome macOS n'a rien. `hidden md:inline-flex` : invisible au touch par
            nature (tout le cadre est tapable) et le cadre portrait de 320 px n'a pas la place.
            Porcelaine/nuit — aucun corail (le viewport a déjà « 8 minutes » + eyebrow-dot). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2 right-3 z-20 hidden items-center gap-1 rounded-full border border-white/12 bg-nuit-900/85 px-2.5 py-1 font-mono text-micro tracking-wide text-sand-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 md:inline-flex"
        >
          {hint}
          <ArrowUpRight className="size-3 stroke-[2]" />
        </span>
      </div>
    </a>
  );

  // Satellite : sibling du <a> dans le m.div reveal → hérite de l'opacité/scale du reveal et
  // suit la parallaxe du cadre. 176 px de large, −32 px sous le cadre / −24 px à droite (à lg le
  // conteneur interne fait 976 px pour 896 de cadre → 40 px de marge, aucun clip ; seule la
  // <section> est overflow-hidden). `hidden lg:block` + lazy : sous lg l'image n'est jamais
  // téléchargée. `pointer-events-none` : le survol passe au cadre-lien (un seul objet cliquable) ;
  // `alt=""` + aria-hidden : doublon décoratif de la capture mobile.
  const satellite = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-6 -bottom-8 z-10 hidden w-44 lg:block"
    >
      <div className={SATELLITE_CLASS}>
        <Image src={srcMobile} alt="" sizes="176px" loading="lazy" className="h-auto w-full" />
      </div>
    </div>
  );

  if (reduce) {
    return (
      <div ref={ref} className={cn(WRAPPER_CLASS, className)}>
        <div aria-hidden="true" data-template="VELOURS" className={ECHO_CLASS} />
        <div>
          <div className="relative">
            {frameLink}
            {satellite}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn(WRAPPER_CLASS, className)}>
      <LazyMotion features={domAnimation} strict>
        {/* Écho AVANT (et hors) du m.div parallaxe : sa propre vitesse. */}
        <m.div
          aria-hidden="true"
          data-template="VELOURS"
          className={ECHO_CLASS}
          style={{ y: yEcho }}
        />
        {/* Parallaxe ±24 px — PAS de FRAME_CLASS ici (descendu dans le <a>). */}
        <m.div style={{ y }}>
          <m.div
            className="relative"
            variants={REVEAL_VISUAL}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
          >
            {frameLink}
            {satellite}
          </m.div>
        </m.div>
      </LazyMotion>
    </div>
  );
}
