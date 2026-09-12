"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { LandingLocaleSwitch } from "@/interface/ui/landing/LandingLocaleSwitch";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import {
  refreshLandingScenes,
  setLandingMenuOpen,
  useLandingChrome,
} from "@/interface/ui/landing/landingChromeStore";
import { cn } from "@/lib/utils";

/** Ordre = ordre de la page (un indicateur piloté par le scroll ne recule jamais) ; href = `#id`. */
const NAV_LINKS = [
  { id: "how-it-works", labelKey: "navHow" },
  { id: "features", labelKey: "navFeatures" },
  { id: "demo", labelKey: "navDemo" },
  { id: "pricing", labelKey: "navTarifs" },
] as const;
/** Constante MODULE : passée au hook, l'IO du scroll-spy n'est jamais reconstruit à un re-rendu. */
const NAV_IDS: readonly string[] = NAV_LINKS.map((l) => l.id);

const MOBILE_MENU_ID = "landing-mobile-menu";

/** Fonction module-stable (pas de useCallback) : `setLandingMenuOpen` est un import. */
const closeMenu = () => setLandingMenuOpen(false);

/**
 * Scroll-spy des 4 ancres : PROPRE IO persistant (`SectionViewTracker` se déconnecte au premier
 * hit et envoie des beacons — inutilisable ici). Bande centrale 40 % → 45 % du viewport : une
 * section est active quand elle couvre ce ruban de 5 % ; la DERNIÈRE section (ordre de page) qui
 * le touche l'emporte ; `null` hors des 4 cibles. Aucun listener scroll. Pendant un saut d'ancre
 * (`scroll-behavior: smooth`), les sections intermédiaires s'allument brièvement — accepté (0 KB).
 *
 * Dépend aussi de `reduce` : la bascule `prefers-reduced-motion` post-hydratation (false → true)
 * remonte les `<section>` (les wrappers motion changent de type d'élément) — l'effet se rejoue
 * sur les nouveaux nœuds et rafraîchit au passage les IO de scène du store (même cause).
 */
function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const reduce = useReducedMotionSafe();

  useEffect(() => {
    // Au montage : double build inoffensif (`useLandingChrome` s'est abonné juste avant).
    refreshLandingScenes();
    const inView = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) inView.add(id);
          else inView.delete(id);
        }
        let next: string | null = null;
        for (const id of ids) if (inView.has(id)) next = id;
        setActive(next);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [ids, reduce]);

  return active;
}

/**
 * Header de la landing (DA « Nuit de service ») — TROIS peaux, une matrice (`data-skin` sur le
 * `<header>`, matière dans `.landing-bar` de globals.css) :
 *
 * | `scrolled` | scène haute (`useLandingChrome().top`) | `data-skin`     | classe header  |
 * |------------|----------------------------------------|-----------------|----------------|
 * | false      | (ignorée)                              | `transparent`   | `section-nuit` |
 * | true       | `nuit`                                 | `nuit`          | `section-nuit` |
 * | true       | `light`                                | `porcelaine`    | (aucune)       |
 *
 * Le `<header>` garde 64 px EN FLUX (`h-16` : hero `-mt-16` et `scroll-padding-top: 4rem` en
 * dépendent) ; la barre VISIBLE est un enfant absolu qui se compacte à 56 px dès 80 px de scroll
 * (une seule transition CSS, cf. `.landing-bar`). `pointer-events-none` sur le header +
 * `pointer-events-auto` sur la barre et la carte : la bande de 8 px sous la barre compactée ne
 * bloque pas les clics sur la page.
 *
 * Scène : `landingChromeStore` (IO sur `[data-scene="nuit"]`) — le header scrollé redevient verre
 * nuit au-dessus des scènes nuit (hero, strip, démo, clôture, footer) et verre porcelaine
 * au-dessus des sections claires. `text-foreground` est OBLIGATOIRE sur `.landing-bar` : il
 * re-résout `color` sous le remap `section-nuit` pour tout `currentColor` en dessous (graduation
 * de la règle, séparateurs) — sans lui, encre sur nuit-900 (invisible).
 *
 * Nav : 4 ancres dans l'ordre de la page à partir de `lg` (Comment ça marche · Fonctionnalités ·
 * Démo · Tarifs) + indicateur glissant (UNE hairline `transform`ée, écrite par ref : aucun state,
 * aucun re-rendu à la mesure). Sous `lg`, les ancres, la langue et le login vivent dans la CARTE
 * menu inline (déclencheur « Menu » `aria-expanded`, APG disclosure navigation) — jamais un
 * `Sheet` Radix (portail en thème CLAIR, ≈ 20 KB). Sous `sm`, le logo est le mark seul.
 *
 * Largeur (D2, FR = cas contraignant, à mesurer à 1024) : 360 → mark 24 + CTA court + « Menu »
 * ≈ 232 / 328 px ; 640–1023 → lockup h-7 + login + CTA court + « Menu » ≈ 530 ; 1024 → lockup +
 * 4 ancres (`ml-6 gap-6`) + FR · EN + login + CTA court ≈ 946 / 976 ; ≥ 1280 → CTA long. Échelle
 * de repli si débordement à 1024 : `gap-5` sur la nav, puis tout le seuil `lg` → `xl`.
 *
 * `logo` : mark ET lockup sont rendus par le PARENT serveur (`LandingPageContent`) et passés en
 * prop — `Logo.tsx` embarque le wordmark Fraunces outliné (~2,4 Ko gz de tracés) et ce header est
 * un composant client : le rendre ici l'ajouterait au bundle initial (mesuré 291 → 298 Ko gz sur
 * `perf:landing`). Côté serveur, ces tracés ne coûtent que du HTML.
 *
 * Focus : AUCUNE utility `focus-visible:ring-*` dans ce fichier — les règles globales font le
 * focus (base : sand-50 + canard-600 sur porcelaine ; `.section-nuit :focus-visible` non layerée :
 * nuit-900 + canard-300). Une utility ring (layer utilities > base) donnerait un anneau à 22 %
 * (1,44:1) sur porcelaine. Grammaire couleur : canard = structure, zéro corail, aucun prix.
 *
 * Langue : `LandingLocaleSwitch` (deux liens mono FR · EN) et non le `LocaleSwitcher` partagé —
 * son DropdownMenu Radix pesait ~26 KB gz sur le bundle initial de la landing (cf. docblock).
 */
export function LandingHeader({ logo }: { logo: React.ReactNode }) {
  const t = useTranslations("Landing.header");
  const [scrolled, setScrolled] = useState(false);
  const { top, menuOpen } = useLandingChrome();
  const active = useActiveSection(NAV_IDS);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);

  const skin = !scrolled ? "transparent" : top === "nuit" ? "nuit" : "porcelaine";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Indicateur glissant : mesuré à chaque changement d'`active`, sur `resize` et une fois après
  // `document.fonts.ready` (swap Geist), écrit DIRECTEMENT sur le style de la hairline — aucun
  // setState, aucun re-rendu du header. `span.offsetLeft` est relatif à la `<nav class="relative">`
  // (le `<span class="relative">` interne est positionné, le `<Link>` ne l'est pas).
  useEffect(() => {
    let alive = true;
    const measure = () => {
      const ind = indRef.current;
      const nav = navRef.current;
      if (!alive || !ind || !nav) return;
      const span = active ? nav.querySelector<HTMLElement>(`[data-nav-target="${active}"]`) : null;
      // Sous lg la nav est display:none → offsetWidth 0 → même écriture qu'« aucune section »
      // (idempotente : écrire "0" sur "0" n'invalide rien, le resize mobile en boucle est gratuit).
      if (span && span.offsetWidth > 0) {
        ind.style.transform = `translateX(${span.offsetLeft}px) scaleX(${span.offsetWidth})`;
        ind.style.opacity = "1";
      } else {
        ind.style.transform = "translateX(0) scaleX(0)";
        ind.style.opacity = "0";
      }
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      alive = false;
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  // Carte menu ouverte : Escape (ferme + refocus déclencheur), pointerdown hors du header,
  // passage ≥ lg. Pas de focus trap ni de verrou de scroll (carte inline, pas un modal).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLandingMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setLandingMenuOpen(false);
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => {
      if (mq.matches) setLandingMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      mq.removeEventListener("change", onMq);
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      data-skin={skin}
      className={cn(
        "pointer-events-none sticky top-0 z-40 h-16",
        skin !== "porcelaine" && "section-nuit",
      )}
    >
      {/* Barre visible : absolue → sa hauteur ne touche pas le flux (64 px in-flow, hero -mt-16
          intact). `text-foreground` OBLIGATOIRE (cf. docblock). La transition de hauteur vit dans
          la règle `.landing-bar` (Tailwind ne transitionne que ce que transition-property liste). */}
      <div
        className={cn(
          "landing-bar pointer-events-auto absolute inset-x-0 top-0 text-foreground",
          scrolled ? "h-14" : "h-16",
        )}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <Link
            href="/"
            aria-label="Cartora"
            className={cn(
              "origin-left rounded-sm transition-transform duration-300 ease-[var(--ease-out-expo)]",
              scrolled && "scale-[0.92]",
            )}
          >
            {logo}
          </Link>

          <nav
            ref={navRef}
            aria-label={t("navLabel")}
            className="relative ml-6 hidden items-center gap-6 lg:flex"
          >
            {NAV_LINKS.map(({ id, labelKey }) => {
              const isActive = active === id;
              return (
                <Link
                  key={id}
                  href={`#${id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "group inline-flex min-h-[44px] items-center rounded-sm text-sm font-medium transition-colors",
                    isActive ? "text-foreground" : "text-foreground/70 hover:text-foreground",
                  )}
                >
                  <span data-nav-target={id} className="relative">
                    {t(labelKey)}
                    {/* Soulignement hover conservé sur les liens NON actifs (l'actif est porté par
                        l'indicateur partagé — jamais de double trait). */}
                    {!isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-200 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
                      />
                    )}
                  </span>
                </Link>
              );
            })}
            {/* Indicateur partagé : UNE hairline, glisse par transform (aucun layout), écrite par
                ref. bottom-2 = même ligne que le soulignement hover (-bottom-1 sous un texte 20 px
                centré dans 44 px). bg-primary = « hairline canard » sur porcelaine (canard-600),
                sand-50 sur verre nuit / transparent — comme le remplissage de la règle et le CTA
                porcelaine. Le `style` prop est CONSTANT (= HTML prérendu) : React ne le ré-écrit
                pas, les écritures impératives survivent aux re-rendus (scrolled / menuOpen). */}
            <span
              ref={indRef}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-0 h-px w-px origin-left bg-primary transition-[transform,opacity,background-color] duration-300 ease-[var(--ease-out-expo)]"
              style={{ transform: "translateX(0) scaleX(0)", opacity: 0 }}
            />
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* `cn` = tailwind-merge : `hidden` remplace `flex`, `lg:flex` reste → hidden lg:flex. */}
            <LandingLocaleSwitch className="mr-1 hidden lg:flex" />
            <TrackedCtaButton
              event="cta_header_login"
              href="/login"
              variant="ghost"
              className="hidden sm:inline-flex"
            >
              {t("loginCta")}
            </TrackedCtaButton>
            <TrackedCtaButton
              event="cta_header_signup"
              href="/signup?src=header"
              variant="primary"
              className="shrink-0 px-4 whitespace-nowrap sm:px-5"
            >
              {/* Libellé court jusqu'à xl (le cluster porte « Menu » < lg et la nav à 4 ancres
                  ≥ lg) ; `shrink-0` + nowrap : la pilule ne se fait pas écraser par le flex. */}
              <span className="xl:hidden">{t("signupCtaShort")}</span>
              <span className="hidden xl:inline">{t("signupCta")}</span>
            </TrackedCtaButton>
            {/* Déclencheur de la carte menu (< lg) : libellé visible « Menu », l'état est porté par
                aria-expanded. Hairline border-foreground/20 = même vocabulaire que le variant
                `outline` du CTA (sand/20 sur nuit, encre/20 sur porcelaine). */}
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls={MOBILE_MENU_ID}
              onClick={() => setLandingMenuOpen(!menuOpen)}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-foreground/20 px-3 font-mono text-micro tracking-[0.16em] text-foreground/80 uppercase transition-colors hover:border-foreground/40 hover:bg-foreground/[0.04] lg:hidden"
            >
              {t("menuLabel")}
            </button>
          </div>
        </div>
        {/* Règle graduée de lecture (CSS scroll-driven, 0 JS) : DERNIER enfant de la barre —
            masquée sans support `animation-timeline` et sous PRM, invisible sur la peau
            transparente (cf. `.landing-ruler`). */}
        <div aria-hidden="true" className="landing-ruler" />
      </div>

      {/* Carte menu mobile : INLINE dans le header (frère de la barre), scène nuit quelle que soit
          la peau. `hidden` = HTML prérendu (carte fermée), identique au premier rendu client.
          `top-full mt-2` est relatif au header (64 px en flux) → 72 px ; sous la barre compactée il
          reste 16 px — accepté. max-h : viewports courts ET bannière cookies (`--cookie-banner-h`
          publiée sur <html>) — le CTA en bas de la carte ne passe jamais derrière la bannière.
          Le CTA primaire est porcelaine automatiquement (remap section-nuit) : jamais surcharger
          ses ombres. Entrée tw-animate rejouée à chaque hidden → visible ; sortie sèche. */}
      <div
        id={MOBILE_MENU_ID}
        hidden={!menuOpen}
        className="section-nuit texture-grain pointer-events-auto absolute inset-x-4 top-full mt-2 max-h-[calc(100svh-5rem-var(--cookie-banner-h,0px))] overflow-y-auto rounded-2xl border border-white/10 bg-background text-foreground shadow-frame lg:hidden animate-in fade-in-0 slide-in-from-top-1 duration-200 ease-[var(--ease-out-expo)]"
      >
        {/* texture-grain::after est à z-index 1 : le contenu passe au-dessus. onClickCapture filtré
            sur <a> = SEUL mécanisme de fermeture au clic (ancres, langue, login, CTA) : le store est
            mis à jour, puis le onClick interne du lien (cookie, tracking), puis la navigation native
            — le rendu `hidden` n'arrive qu'après l'événement (batching). Un tap dans le padding ne
            ferme pas la carte. */}
        <div
          className="relative z-10 p-6"
          onClickCapture={(e) => {
            if ((e.target as Element).closest("a")) closeMenu();
          }}
        >
          <nav aria-label={t("navLabel")}>
            <ul role="list" className="flex flex-col">
              {NAV_LINKS.map(({ id, labelKey }) => (
                <li key={id}>
                  <Link
                    href={`#${id}`}
                    className="display flex min-h-12 items-center rounded-sm text-h2 text-sand-50 transition-colors hover:text-canard-300"
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-5">
            <LandingLocaleSwitch />
            <TrackedCtaButton
              event="cta_header_login"
              href="/login"
              variant="ghost"
              metadata={{ surface: "mobile-menu" }}
              className="min-h-11"
            >
              {t("loginCta")}
            </TrackedCtaButton>
          </div>
          <TrackedCtaButton
            event="cta_header_signup"
            href="/signup?src=menu"
            size="lg"
            metadata={{ surface: "mobile-menu" }}
            className="mt-4 w-full"
          >
            {t("signupCta")}
          </TrackedCtaButton>
        </div>
      </div>
    </header>
  );
}
