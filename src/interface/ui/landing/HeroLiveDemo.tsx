"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Flame, Pause, SkipForward, Sparkles } from "lucide-react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { PhoneMockup } from "@/interface/ui/components/PhoneMockup";
import {
  setLandingMotionPaused,
  useLandingMotionPaused,
} from "@/interface/ui/landing/landingMotionStore";
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
import { HeroPhone } from "./HeroPhone";
import { cn } from "@/lib/utils";

/**
 * Le « waw » du hero (Phase 3) : un menu VIVANT dans le téléphone — mini-menu JSX fac-similé
 * du vrai /m/demo-cartora (Le Bistrot Démo), habillé par les tokens CSS `[data-template]`
 * déjà présents dans le stylesheet global. AUCUN import des composants templates (le
 * code-split du registry doit rester intact — cf. registry.tsx) : seuls les hex d'aperçu
 * (brandTokens, constantes pures) servent à la pastille du chip.
 *
 * Cycle : toutes les ~3,8s le template change (les 9 skins) ; à mi-temps une micro-édition
 * « mis à jour à la seconde » s'applique (prix du jour, plat ajouté, plat épuisé) avec un
 * toast dans l'écran. Le cycle est suspendu hors viewport / onglet caché / via le bouton
 * pause (landingMotionStore — mécanisme WCAG 2.2.2, qui suspend aussi float + mesh), et
 * n'existe pas sous `prefers-reduced-motion` (rendu statique CARTORA, hook hydration-safe).
 * La police display du template SUIVANT est préchargée à chaque palier (FontFace API).
 *
 * Passe 2026-09 : les points de playlist sont un VRAI tablist APG (9 onglets, activation
 * automatique, flèches/Home/End sur les boutons — jamais sur le div), un bouton « suivant »
 * et un toggle pause strict ; le prix du risotto « roule » chiffre par chiffre (CSS pur,
 * .live-digit-in) ; l'ardoise « Aujourd'hui » reprend le plat du jour réel du seed ; le
 * chevalet QR est solidaire du téléphone (prop `aside` de HeroPhone, hors sous-arbre
 * aria-hidden). Noms de designs = `PublicMenu.templateNames` lus côté serveur (LandingHero)
 * et passés en prop : un seul vocabulaire avec la section Démo, aucune constante locale.
 */

const TEMPLATE_ORDER = [
  "CARTORA",
  "NOIR",
  "SOLAR",
  "ZEN",
  "NEON",
  "BISTRO",
  "VELOURS",
  "RIVAGE",
  "CLASSIC",
] as const;

type TemplateId = (typeof TEMPLATE_ORDER)[number];

// Pastille du chip = accent d'aperçu du skin (miroir brandTokens/--tpl-*).
const TEMPLATE_DOT: Record<TemplateId, string> = {
  CARTORA: CARTORA_FALLBACK.accent,
  NOIR: NOIR_FALLBACK.accent,
  SOLAR: SOLAR_FALLBACK.primary,
  ZEN: ZEN_FALLBACK.accent,
  NEON: NEON_FALLBACK.primary,
  BISTRO: BISTRO_FALLBACK.primary,
  VELOURS: VELOURS_FALLBACK.accent,
  RIVAGE: RIVAGE_FALLBACK.primary,
  CLASSIC: CLASSIC_FALLBACK.primary,
};

// Fonds sombres → status bar claire dans le mockup.
const DARK_TEMPLATES: ReadonlySet<TemplateId> = new Set(["NOIR", "NEON", "VELOURS"]);

// Police display à précharger AVANT d'afficher le skin (var posée sur <html> par next/font,
// preload:false — le woff2 ne part que quand un glyphe la consomme). Fraunces/Geist sont
// déjà chargées sur la landing (CARTORA/RIVAGE… retombent dessus sans fetch).
const TEMPLATE_FONT_VAR: Partial<Record<TemplateId, string>> = {
  CLASSIC: "--font-jetbrains-mono",
  BISTRO: "--font-cormorant",
  NOIR: "--font-cormorant",
  SOLAR: "--font-bricolage",
  ZEN: "--font-schibsted",
  NEON: "--font-archivo",
  RIVAGE: "--font-playfair",
  VELOURS: "--font-newsreader",
};

function preloadTemplateFont(tpl: TemplateId) {
  const varName = TEMPLATE_FONT_VAR[tpl];
  if (!varName || typeof document === "undefined" || !("fonts" in document)) return;
  const family = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .split(",")[0]
    ?.trim()
    .replace(/^["']|["']$/g, "");
  if (family) void document.fonts.load(`1rem "${family}"`).catch(() => undefined);
}

// Contenu fac-similé du VRAI menu démo (scripts/seed-demo.ts — Le Bistrot Démo). Les noms de
// plats restent en français sur /en : c'est la carte authentique d'un bistrot français, comme
// sur /m/demo-cartora (source FR). Prix en format FR, comme le rendu public.
const STARTERS = [
  {
    id: "veloute",
    name: "Velouté de potimarron",
    desc: "Potimarron rôti, huile de noisette",
    price: "9,50 €",
    badge: "popular",
  },
  {
    id: "burrata",
    name: "Burrata fumée",
    desc: "Tomates anciennes, basilic",
    price: "14,00 €",
    badge: "new",
  },
] as const;

const MAINS = [
  {
    id: "magret",
    name: "Magret de canard",
    desc: "Miel, romarin, pommes grenailles",
    price: "24,00 €",
    badge: "popular",
  },
  {
    id: "risotto",
    name: "Risotto aux cèpes",
    desc: "Cèpes sauvages, copeaux de parmesan",
    price: "21,00 €",
    badge: null,
  },
] as const;

const ADDED_DISH = {
  name: "Bar en croûte de sel",
  desc: "Légumes de saison, beurre citronné",
  price: "26,00 €",
};
// Édité 19,50 dans l'animation (le seed reste la valeur canonique 21,00). MÊME LONGUEUR que
// le prix seed : RollingPrice est keyé par index, un prix plus court décalerait tous les
// caractères.
const RISOTTO_NEW_PRICE = "19,50 €";

// Plat du jour du VRAI menu démo (DEMO_DAILY_DISHES[0], valid_until +2 ans → réellement
// visible sur /m/demo-cartora). Contenu FR sur les deux locales, comme les 5 plats épinglés.
// ⚠️ Contrat seed (scripts/seed-demo.ts, commentaire l. 64-70) : nom / prix / badge /
// allergènes à la lettre ; desc abrégée (hors contrat). Les formules du seed (19,90 € /
// 25,90 €) sont volontairement absentes : 19,90 € se lirait comme un prix de plan.
const TODAY_DISH = {
  name: "Blanquette de veau à l'ancienne",
  desc: "Veau fermier mijoté, sauce crémeuse aux champignons",
  price: "18,50 €",
  allergens: ["allergenMilk", "allergenCelery", "allergenSulphites"] as const, // clés Landing.hero.liveMenu.*
};

// 3 micro-éditions qui tournent : prix du jour → plat ajouté → plat épuisé.
const EDITS = ["price", "add", "soldout"] as const;
type EditKind = (typeof EDITS)[number];

const DWELL_MS = 3800;
const EDIT_AT_MS = 1700;

// Fallbacks (skins clairs sans tokens badge dédiés) : teintes de la famille de marque —
// teal doux pour « nouveau », chaleur cuivrée pour « populaire » — plus jamais les
// blue-100/orange-100 stock de Tailwind (audit DA 2026).
const BADGE_STYLE = {
  new: {
    icon: Sparkles,
    bg: "var(--menu-badge-new-bg, #e3efec)",
    fg: "var(--menu-badge-new-fg, #1f5f56)",
  },
  popular: {
    icon: Flame,
    bg: "var(--menu-badge-popular-bg, #fdeadb)",
    fg: "var(--menu-badge-popular-fg, #a34a12)",
  },
} as const;

function MiniBadge({ kind, label }: { kind: keyof typeof BADGE_STYLE; label: string }) {
  const config = BADGE_STYLE[kind];
  const Icon = config.icon;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-px text-[8px] font-medium transition-colors duration-500"
      style={{ backgroundColor: config.bg, color: config.fg }}
    >
      <Icon className="size-2" aria-hidden="true" />
      {label}
    </span>
  );
}

// Chip allergène : miroir texte-only de AllergenIcons (src/interface/ui/components) — mêmes
// tokens `--menu-allergen-*` (redéfinis par les skins sombres), mêmes fallbacks ambre du
// produit (#fffbeb / #b45309 = 4,8:1), sans @iconify. Couleur produit confinée à l'écran.
function MiniChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-px text-[8px] leading-none font-medium transition-colors duration-500"
      style={{
        backgroundColor: "var(--menu-allergen-bg, #fffbeb)",
        color: "var(--menu-allergen-fg, #b45309)",
      }}
    >
      {label}
    </span>
  );
}

// Chaque caractère est un span keyé par (index, caractère) : un chiffre qui change est REMONTÉ
// et rejoue .live-digit-in ; les autres (« , », « 0 », « € ») gardent leur nœud → immobiles.
// tabular-nums (hérité) garde les largeurs stables ; inline-block pour que transform/filter
// s'appliquent. L'espace avant € devient U+00A0 (une espace U+0020 seule dans un inline-block
// est collapsée → largeur 0) — même caractère que formatPrice() sur /m/. ÉCHAPPEMENT
// EXPLICITE "\u00A0" (Prettier le conserve) : un U+00A0 littéral est invisible à l'œil et
// serait normalisé en U+0020 par un copier-coller ou un éditeur → bug « 19,50€ » de retour.
function RollingPrice({ value }: { value: string }) {
  return (
    <>
      {Array.from(value).map((ch, i) => (
        <span key={`${i}-${ch}`} className="live-digit-in inline-block">
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </>
  );
}

type MiniRowProps = {
  name: string;
  desc?: string;
  price: string;
  badge?: ReactNode;
  /** Chips allergènes rendues sous la desc (plat du jour). */
  chips?: ReactNode;
  /**
   * Nom sur 2 lignes (badge passe à la ligne si besoin) au lieu de `truncate` — obligatoire
   * sur la Blanquette (31 caractères ≈ 185 px + badge ≈ 58 px > ≈ 196 px disponibles à 300 px
   * de téléphone : le nom-contrat serait coupé « …à l'an… » sur la ligne vedette).
   */
  wrapName?: boolean;
  /** Prix rendu caractère par caractère (RollingPrice) — ligne risotto uniquement. */
  roll?: boolean;
  flash?: boolean;
  soldOut?: boolean;
  soldOutLabel?: string;
  entering?: boolean;
};

function MiniRow({
  name,
  desc,
  price,
  badge,
  chips,
  wrapName,
  roll,
  flash,
  soldOut,
  soldOutLabel,
  entering,
}: MiniRowProps) {
  return (
    <div
      className={cn(
        "-mx-1.5 flex items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors duration-300",
        flash && "bg-[color-mix(in_oklab,var(--menu-accent)_12%,transparent)]",
        entering && "live-item-in",
      )}
    >
      <div className={cn("min-w-0 transition-opacity duration-300", soldOut && "opacity-50")}>
        <span className={cn("flex items-center gap-1.5", wrapName && "flex-wrap")}>
          <span
            className={cn(
              "menu-item-name text-[12px] leading-tight font-medium",
              wrapName ? "min-w-0" : "truncate",
            )}
          >
            {name}
          </span>
          {soldOut && soldOutLabel ? (
            <span className="menu-muted shrink-0 rounded-full border border-current px-1.5 py-px text-[8px] font-medium">
              {soldOutLabel}
            </span>
          ) : (
            badge
          )}
        </span>
        {desc && (
          <p className="menu-muted mt-0.5 truncate text-[10px] leading-snug transition-colors duration-500">
            {desc}
          </p>
        )}
        {chips && <span className="mt-1 flex flex-wrap gap-1">{chips}</span>}
      </div>
      {/* transition-colors seulement (plus de scale-110 au flash) : la rangée ne doit pas
          grossir pendant que les chiffres roulent. Les spans de RollingPrice sont ENFANTS du
          .menu-price : sur SOLAR (pilule corail avec padding) la pilule reste intacte. */}
      <span
        className={cn(
          "menu-price shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums transition-colors duration-300",
          soldOut && "line-through opacity-50",
        )}
      >
        {roll ? <RollingPrice value={price} /> : price}
      </span>
    </div>
  );
}

const IN_VIEW_THRESHOLD = 0.15;

type HeroLiveDemoProps = {
  className?: string;
  /** Chevalet QR (composant serveur, SVG au build) — rendu solidaire du téléphone (md+). */
  qrCard?: ReactNode;
  /**
   * Noms des 9 designs = `PublicMenu.templateNames`, lus côté serveur dans LandingHero (le
   * namespace n'est pas embarqué par le provider client de la landing) : nom accessible des
   * onglets + chip, même vocabulaire que la section Démo (« Classique / Bistrot / Solaire »).
   */
  templateNames: Record<TemplateId, string>;
};

export function HeroLiveDemo({ className, qrCard, templateNames }: HeroLiveDemoProps) {
  const t = useTranslations("Landing.hero");
  const reduce = useReducedMotionSafe();
  const rootRef = useRef<HTMLDivElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);
  // Prix du risotto : false = 21,00 € (seed), true = 19,50 €. Il ALTERNE à chaque palier
  // « price » (CARTORA 21,00 → 19,50, persiste sur les paliers add/soldout — l'édition est
  // réelle —, ZEN 19,50 → 21,00, etc.) : chaque changement est une vraie édition animée.
  const [risottoAlt, setRisottoAlt] = useState(false);
  // Une seule bascule par palier « price » : l'effet [running, step] REJOUE à chaque flip de
  // `running` dans le même palier (pause → reprise, scroll-out/in, onglet caché) et rearmerait
  // editTimer — sans ce garde, le prix rebasculerait (19,50 → 21,00) sur le même skin.
  const lastPriceStepRef = useRef(-1);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  // WCAG 2.2.2 Pause/Stop/Hide : contenu auto-changeant > 5s présenté en parallèle du hero
  // → mécanisme de pause SUR la page obligatoire (prefers-reduced-motion n'en tient pas lieu —
  // même standard que la suppression de la marquee TrustStrip). Le store partagé suspend
  // AUSSI le float du téléphone (un seul contrôle, cf. G186).
  const paused = useLandingMotionPaused();

  const running = !reduce && inView && pageVisible && !paused;
  const template = TEMPLATE_ORDER[step % TEMPLATE_ORDER.length];
  const editKind: EditKind = EDITS[step % EDITS.length];
  const showEdit = editing && running;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // Toujours appliquer le DERNIER record : des crossings coalescés (main thread occupé)
    // livrés ensemble laisseraient sinon un état périmé (cycle figé ou tournant hors écran).
    // Gate sur le RATIO (pas isIntersecting, vrai dès 1px) pour honorer le seuil de 15 %.
    const io = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        if (last) setInView(last.intersectionRatio >= IN_VIEW_THRESHOLD);
      },
      { threshold: IN_VIEW_THRESHOLD },
    );
    io.observe(el);
    const onVisibility = () => setPageVisible(!document.hidden);
    // Synchronise l'état initial : un onglet ouvert en arrière-plan (Cmd+clic) naît caché
    // sans jamais émettre visibilitychange — sans cet appel, le cycle précharge 7 polices
    // dans un onglet jamais affiché. (Pas dans l'initialiseur useState : mismatch d'hydratation.)
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    // Genre d'édition DÉRIVÉ ici (fonction pure de `step` → deps [running, step] exactes) :
    // lire le `editKind` du rendu vaudrait un warning exhaustive-deps.
    const kind = EDITS[step % EDITS.length];
    preloadTemplateFont(TEMPLATE_ORDER[(step + 1) % TEMPLATE_ORDER.length]);
    // resetTimer (0 ms, asynchrone — setState synchrone interdit dans le corps de l'effet) :
    // une suspension en pleine fenêtre d'édition (onglet caché, scroll-out, pause) laisserait
    // `editing` bloqué à true — à la reprise, le palier repart sain, toast compris.
    const resetTimer = window.setTimeout(() => setEditing(false), 0);
    const editTimer = window.setTimeout(() => {
      setEditing(true);
      if (kind === "price" && lastPriceStepRef.current !== step) {
        lastPriceStepRef.current = step;
        setRisottoAlt((v) => !v);
      }
    }, EDIT_AT_MS);
    const nextTimer = window.setTimeout(() => {
      setEditing(false);
      setStep((s) => s + 1);
    }, DWELL_MS);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(editTimer);
      window.clearTimeout(nextTimer);
    };
  }, [running, step]);

  // L'utilisateur prend la main (WCAG 2.2.2) : sélection/suivant coupent le cycle via le MÊME
  // store que le float ; le bouton pause (aria-pressed → false) le relance depuis le design
  // choisi. Compteur `step` monotone : l'appariement template ↔ édition reste fixe.
  function selectTemplate(i: number) {
    preloadTemplateFont(TEMPLATE_ORDER[i]); // l'effet de cycle ne précharge plus quand running=false
    setEditing(false);
    setStep((s) => s - (s % TEMPLATE_ORDER.length) + i);
    setLandingMotionPaused(true);
  }
  function nextTemplate() {
    preloadTemplateFont(TEMPLATE_ORDER[(step + 1) % TEMPLATE_ORDER.length]);
    setEditing(false);
    setStep((s) => s + 1);
    setLandingMotionPaused(true);
  }
  // Clavier APG sur CHAQUE onglet (jamais sur le div role="tablist" : un div interactif sans
  // tabIndex est refusé par jsx-a11y/interactive-supports-focus). Les frères se résolvent
  // via la ref du tablist.
  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const n = TEMPLATE_ORDER.length;
    const cur = step % n;
    const next =
      e.key === "ArrowRight"
        ? (cur + 1) % n
        : e.key === "ArrowLeft"
          ? (cur + n - 1) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    selectTemplate(next);
    tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
  // Focus CLAVIER sur un onglet (Tab depuis le CTA) : le cycle continuerait sinon et déplacerait
  // aria-selected / le tabindex roulant sous le focus 3,8 s plus tard — l'APG « activation
  // automatique » suppose focus = sélection. Un clic souris passe déjà par selectTemplate.
  // `matches(":focus-visible")` lève une SyntaxError sur un moteur sans ce sélecteur
  // (Safari < 15.4) — dans un handler de focus, donc à chaque Tab, sans garde : on retombe
  // alors sur « toujours pauser au focus » (comportement sûr, un clic ne passe pas par ici).
  function onTabFocus(e: FocusEvent<HTMLButtonElement>) {
    let keyboard = true;
    try {
      keyboard = e.currentTarget.matches(":focus-visible");
    } catch {
      /* sélecteur non supporté : pause au focus quoi qu'il arrive */
    }
    if (keyboard) setLandingMotionPaused(true);
  }

  const badgeLabels = { new: t("liveMenu.badgeNew"), popular: t("liveMenu.badgePopular") };

  const screen = (
    <div
      data-template={template}
      className="menu-root flex h-full flex-col overflow-hidden px-5 pt-12 pb-4 text-left transition-colors duration-500"
    >
      {/* Toast « mis à jour à l'instant » — snackbar in-phone (écho des toasts sonner de
          l'éditeur réel), au-dessus du home indicator pour ne rien recouvrir d'important. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center transition-all duration-300 ease-[var(--ease-out-expo)]",
          showEdit ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <span className="flex items-center gap-1.5 rounded-full bg-sapin-600/95 px-2.5 py-1 text-[9px] font-medium text-sand-50 shadow-md">
          <span className="size-1.5 rounded-full bg-sand-50" aria-hidden="true" />
          {t("liveMenu.updatedToast")}
        </span>
      </div>

      <p className="menu-heading text-[19px] leading-tight font-semibold transition-colors duration-500">
        Le Bistrot Démo
      </p>

      {/* Ardoise « Aujourd'hui » : même contrat que TodaySection (.menu-today + --menu-today-*,
          .menu-today-title italique/capitales selon le skin) — 0 CSS ajouté. Le kicker « Plats du
          jour » est un fac-similé de /m/demo-cartora, où TodaySection l'affiche parce que le menu
          démo a plats ET formules (showSubtitles) — les formules sont volontairement absentes de
          l'écran (prix 19,90 € ≈ prix de plan), le kicker est gardé tel qu'on le voit sur la démo. */}
      <div className="menu-today mt-4 rounded-lg border p-2.5 transition-colors duration-500">
        <p className="menu-heading menu-today-title text-[13px] leading-tight font-semibold transition-colors duration-500">
          {t("liveMenu.today")}
        </p>
        <p className="menu-today-kicker mt-0.5 text-[8px] font-semibold tracking-wider uppercase transition-colors duration-500">
          {t("liveMenu.todayKicker")}
        </p>
        <div className="menu-divide mt-1 divide-y">
          <MiniRow
            name={TODAY_DISH.name}
            desc={TODAY_DISH.desc}
            price={TODAY_DISH.price}
            wrapName
            badge={<MiniBadge kind="popular" label={badgeLabels.popular} />}
            chips={TODAY_DISH.allergens.map((k) => (
              <MiniChip key={k} label={t(`liveMenu.${k}`)} />
            ))}
          />
        </div>
      </div>

      <div className="mt-3">
        <h3 className="menu-heading menu-category-title mb-1 text-[13px] font-semibold transition-colors duration-500">
          {t("liveMenu.catStarters")}
        </h3>
        <div className="menu-divide divide-y">
          {STARTERS.map((item) => (
            <MiniRow
              key={item.id}
              name={item.name}
              desc={item.desc}
              price={item.price}
              badge={item.badge && <MiniBadge kind={item.badge} label={badgeLabels[item.badge]} />}
              soldOut={showEdit && editKind === "soldout" && item.id === "burrata"}
              soldOutLabel={t("liveMenu.soldOut")}
            />
          ))}
        </div>
      </div>

      <div className="mt-3">
        <h3 className="menu-heading menu-category-title mb-1 text-[13px] font-semibold transition-colors duration-500">
          {t("liveMenu.catMains")}
        </h3>
        <div className="menu-divide divide-y">
          {MAINS.map((item) => {
            const isRisotto = item.id === "risotto";
            return (
              <MiniRow
                key={item.id}
                name={item.name}
                desc={item.desc}
                // Prix affiché = état `risottoAlt` (persiste entre les paliers) ; le flash ne
                // s'allume que pendant la fenêtre d'édition d'un palier « price ».
                price={isRisotto && risottoAlt ? RISOTTO_NEW_PRICE : item.price}
                roll={isRisotto}
                badge={
                  item.badge && <MiniBadge kind={item.badge} label={badgeLabels[item.badge]} />
                }
                flash={showEdit && editKind === "price" && isRisotto}
              />
            );
          })}
          {showEdit && editKind === "add" && (
            <MiniRow
              name={ADDED_DISH.name}
              desc={ADDED_DISH.desc}
              price={ADDED_DISH.price}
              badge={<MiniBadge kind="new" label={badgeLabels.new} />}
              flash
              entering
            />
          )}
        </div>
      </div>

      {/* Fondu bas — suggère la suite de la carte (Desserts/Boissons du vrai menu démo).
          transition-colors couvre --tw-gradient-from (@property <color>) → le fondu suit le
          cross-fade 500ms du root au lieu de snapper à chaque bascule sombre↔clair. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-(--menu-bg) to-transparent transition-colors duration-500"
      />
    </div>
  );

  return (
    <div ref={rootRef} className={className}>
      <HeroPhone
        className="w-full"
        paused={paused}
        aside={
          qrCard && (
            /* Chevalet QR solidaire du téléphone (HeroPhone.aside : couche float, hors
               aria-hidden — le QR scannable reste exposé aux AT). -bottom-7 (28 px) et non
               -bottom-9 : le coin bas-droit de la carte -rotate-6 (≈ +19 px) reste à 5 px
               au-dessus de la rangée d'onglets (mt-6 = +24 px) — un overlay pointer-events-auto
               ne doit jamais coiffer les deux premiers onglets (Cartora, Noir). */
            <div className="pointer-events-auto absolute -bottom-7 -left-16 hidden md:block">
              {qrCard}
            </div>
          )
        }
      >
        {/* Tabpanel nommé par l'onglet actif (les 9 onglets sont rendus inconditionnellement,
            l'id existe toujours). Pas de tabIndex : il ne contient qu'une image nommée. */}
        <div role="tabpanel" id="hero-live-panel" aria-labelledby={`hero-tab-${template}`}>
          {/* L'écran est un visuel de démonstration : un label global, contenu masqué aux AT.
              Sous reduced-motion le rendu est statique → label neutre (exactitude 1.1.1).
              Hydration-safe : useReducedMotionSafe vaut false au 1er rendu client (= SSR),
              la bascule PRM arrive après montage via une mise à jour React normale. */}
          <div role="img" aria-label={t(reduce ? "demoImageAltStatic" : "demoImageAlt")}>
            <div aria-hidden="true">
              <PhoneMockup tilt={-6} statusBarLight={DARK_TEMPLATES.has(template)}>
                {screen}
              </PhoneMockup>
            </div>
          </div>
        </div>
      </HeroPhone>

      {/* Rangée de contrôles — HORS des zones aria-hidden, rendu inconditionnel (pas de gate
          `reduce` : mismatch d'hydratation structurel SSR reduce=null → client PRM true ; sous
          reduced-motion onglets et « suivant » fonctionnent, pause est inerte). Deux lignes
          STRUCTURELLES (jamais de flex-wrap entre items : les cibles ne bougent pas quand le
          nom du design change). Hauteur constante : 24 + 10 + 36 = 70 px (+ mt-6). */}
      <div className="mt-6 flex flex-col items-center gap-y-2.5">
        {/* Onglets APG (activation automatique, tabindex roulant + flèches). Cibles 24 × 24 px
            (WCAG 2.5.8 ; 9 × 44 px ne tiennent pas dans 300 px). Le focus clavier sur un onglet
            suspend le cycle : sélection = focus (APG activation automatique). */}
        <div
          ref={tablistRef}
          role="tablist"
          aria-label={t("liveMenu.designsLabel")}
          className="flex items-center"
        >
          {TEMPLATE_ORDER.map((tpl, i) => {
            const active = i === step % TEMPLATE_ORDER.length;
            return (
              <button
                key={tpl}
                id={`hero-tab-${tpl}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="hero-live-panel"
                aria-label={t("liveMenu.designTab", { name: templateNames[tpl] })}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTemplate(i)}
                onKeyDown={onTabKeyDown}
                onFocus={onTabFocus}
                className="flex h-6 min-w-6 items-center justify-center rounded-full px-1 transition-colors hover:bg-white/8"
              >
                {/* 1.4.11 : inactif blanc 38 % (≈ 3,5:1 sur nuit-900) ; actif = couleur du skin
                    + liseré blanc 50 % (≈ 5,3:1) — CLASSIC #0f172a seul ferait 1,07:1. */}
                <span
                  aria-hidden="true"
                  className="block h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: active ? "1rem" : "0.375rem",
                    backgroundColor: active ? TEMPLATE_DOT[tpl] : "oklch(1 0 0 / 0.38)",
                    boxShadow: active ? "0 0 0 1px oklch(1 0 0 / 0.5)" : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-x-3">
          {/* Chip « Design X · i/9 » : redondant avec aria-selected → masqué aux AT (pas de live
              region sur un contenu auto-cyclique). Valeurs dérivées de TEMPLATE_ORDER, jamais un
              littéral. LARGEUR FIXE : min-w-[24ch] (JetBrains Mono = chasse fixe, ch = 0,6 em ;
              la plus longue chaîne FR « Design Classique · 9/9 » = 22 caractères + tracking-wide
              0,025 em ≈ 165 px < 24ch ≈ 173 px à 12 px) → « suivant »/pause ne bougent jamais. */}
          <span
            aria-hidden="true"
            className="inline-block min-w-[24ch] text-center font-mono text-caption tracking-wide text-sand-300"
          >
            {t("liveMenu.templateChip", {
              name: templateNames[template],
              index: (step % TEMPLATE_ORDER.length) + 1,
              total: TEMPLATE_ORDER.length,
            })}
          </span>

          <button
            type="button"
            onClick={nextTemplate}
            aria-label={t("liveMenu.next")}
            className="flex size-9 items-center justify-center rounded-full border border-white/12 text-sand-300 transition-colors hover:bg-white/8 hover:text-sand-50"
          >
            <SkipForward className="size-3.5 stroke-[1.75]" aria-hidden="true" />
          </button>
          {/* Toggle strict (APG) : icône Pause CONSTANTE + libellé « Pause » constant ; l'état
              « en pause » est porté par aria-pressed et rendu par la BORDURE sand-300 (12,5:1 —
              1.4.11 sur l'état pressé ; le fond white/12 seul ne ferait que 1,37:1). L'icône Play
              de l'existant disparaît : « Play » à côté d'un mot « Pause » se contredisait. */}
          <button
            type="button"
            onClick={() => setLandingMotionPaused(!paused)}
            aria-pressed={paused}
            aria-label={t("liveMenu.pause")}
            className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border border-white/12 text-sand-300 transition-colors hover:bg-white/8 hover:text-sand-50 aria-pressed:border-sand-300 aria-pressed:bg-white/12 aria-pressed:text-sand-50 md:px-3"
          >
            <Pause className="size-3.5 stroke-[1.75]" aria-hidden="true" />
            <span className="hidden font-mono text-caption tracking-wide md:inline">
              {t("liveMenu.pauseShort")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
