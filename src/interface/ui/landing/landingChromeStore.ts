import { useSyncExternalStore } from "react";

/**
 * Micro-store client « chrome de la landing » (header + pilule collante + carte menu mobile),
 * même pattern `useSyncExternalStore` que `landingMotionStore` — état 100 % client, aucune API
 * dynamique, donc compatible avec les pages statiques `/` et `/en`.
 *
 * Scènes : deux IntersectionObserver sur les éléments `[data-scene="nuit"]` (hero, strip, démo,
 * clôture, footer) — l'un sur la bande HAUTE du viewport (64 px = h-16, la bande reste 64 même
 * barre compactée : 8 px de marge, voulu) pour la peau du header, l'autre sur la bande BASSE
 * (96 px = bottom 16 + h-13 (52) + 28 de marge) pour la peau de la pilule collante. Les IO ne
 * démarrent qu'au PREMIER abonné (post-montage : aucune lecture de `window` côté serveur).
 *
 * Contrat EXPLICITE : `data-scene="nuit"`, pas la classe `section-nuit` — un futur composant qui
 * pose `section-nuit` sans `data-scene` n'est PAS vu (voulu : la carte Starter du pricing porte
 * `section-nuit` mais est une carte dans une section claire, pas une scène). Un Set par bande et
 * non un booléen : à la frontière hero → strip les deux scènes touchent la bande une frame — le
 * Set évite le clignotement nuit → clair → nuit.
 *
 * `menuOpen` vit UNIQUEMENT ici (aucun `useState` miroir dans le header) : le header lit et
 * écrit, la pilule lit la même valeur (un seul CTA primaire flottant par viewport).
 */

export type SceneBand = "nuit" | "light";

export interface LandingChromeState {
  /** Scène sous la bande haute du viewport (0 → 64 px) : peau du header. */
  top: SceneBand;
  /** Scène sous la bande basse (innerHeight − 96 → innerHeight) : peau de la pilule collante. */
  bottom: SceneBand;
  /** Carte menu mobile ouverte (masque la pilule : un seul CTA primaire flottant par viewport). */
  menuOpen: boolean;
}

type Listener = () => void;

/** = HTML prérendu (hero nuit en haut, carte fermée). */
const SERVER_SNAPSHOT: LandingChromeState = { top: "nuit", bottom: "nuit", menuOpen: false };
const HEADER_BAND_PX = 64;
const PILL_BAND_PX = 96;

const listeners = new Set<Listener>();
// MÊME référence que SERVER_SNAPSHOT : Object.is(getSnapshot(), getServerSnapshot()) est vrai à
// l'hydratation → aucun re-rendu post-hydratation causé par le store.
let state: LandingChromeState = SERVER_SNAPSHOT;
let topIO: IntersectionObserver | null = null;
let bottomIO: IntersectionObserver | null = null;
let rebuildFrame = 0;
let builtHeight = 0;

function set<K extends keyof LandingChromeState>(key: K, value: LandingChromeState[K]) {
  // Aucune notification sans changement (montage, resize, entrées redondantes).
  if (state[key] === value) return;
  // Remplacement immutable : useSyncExternalStore compare par référence.
  state = { ...state, [key]: value };
  listeners.forEach((listener) => listener());
}

function track(members: Set<Element>, band: "top" | "bottom"): IntersectionObserverCallback {
  return (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) members.add(entry.target);
      else members.delete(entry.target);
    }
    set(band, members.size > 0 ? "nuit" : "light");
  };
}

function build() {
  const scenes = document.querySelectorAll('[data-scene="nuit"]');
  // Sets créés DANS build() : StrictMode (subscribe / unsubscribe / subscribe) ne garde aucune
  // entrée périmée.
  const topSet = new Set<Element>();
  const bottomSet = new Set<Element>();
  const h = window.innerHeight;
  builtHeight = h;
  const top = new IntersectionObserver(track(topSet, "top"), {
    rootMargin: `0px 0px -${h - HEADER_BAND_PX}px 0px`,
    threshold: 0,
  });
  const bottom = new IntersectionObserver(track(bottomSet, "bottom"), {
    rootMargin: `-${h - PILL_BAND_PX}px 0px 0px 0px`,
    threshold: 0,
  });
  scenes.forEach((el) => {
    top.observe(el);
    bottom.observe(el);
  });
  topIO = top;
  bottomIO = bottom;
}

function teardown() {
  topIO?.disconnect();
  bottomIO?.disconnect();
  topIO = null;
  bottomIO = null;
}

// `resize` n'est PAS rare sur mobile : la barre d'URL Chrome/Safari le déclenche à chaque
// changement de sens de scroll. Coalescé par rAF ET ignoré tant que innerHeight n'a pas changé
// (le rootMargin ne dépend que de la hauteur) : un resize horizontal ou une barre d'URL sans
// variation de hauteur ne reconstruit rien.
function onResize() {
  if (rebuildFrame) return;
  rebuildFrame = requestAnimationFrame(() => {
    rebuildFrame = 0;
    if (window.innerHeight === builtHeight) return;
    teardown();
    build();
  });
}

function start() {
  build();
  window.addEventListener("resize", onResize, { passive: true });
}

function stop() {
  window.removeEventListener("resize", onResize);
  if (rebuildFrame) {
    cancelAnimationFrame(rebuildFrame);
    rebuildFrame = 0;
  }
  teardown();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

/**
 * Ré-observe les scènes : à appeler quand des `[data-scene]` ont été REMPLACÉS dans le DOM
 * (bascule `prefers-reduced-motion` post-hydratation — les wrappers motion remontent leurs
 * sous-arbres). No-op sans abonné (le prochain `start()` construira sur le DOM courant).
 */
export function refreshLandingScenes() {
  if (listeners.size === 0) return;
  teardown();
  build();
}

export function useLandingChrome(): LandingChromeState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** No-op si la valeur ne change pas. */
export function setLandingMenuOpen(open: boolean) {
  set("menuOpen", open);
}
