"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Flame, Pause, Play, Sparkles } from "lucide-react";
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

const TEMPLATE_NAMES: Record<TemplateId, string> = {
  CARTORA: "Cartora",
  NOIR: "Noir",
  SOLAR: "Solar",
  ZEN: "Zen",
  NEON: "Néon",
  BISTRO: "Bistro",
  VELOURS: "Velours",
  RIVAGE: "Rivage",
  CLASSIC: "Classic",
};

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
const RISOTTO_NEW_PRICE = "19,50 €";

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

type MiniRowProps = {
  name: string;
  desc?: string;
  price: string;
  badge?: ReactNode;
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
        <span className="flex items-center gap-1.5">
          <span className="menu-item-name truncate text-[12px] leading-tight font-medium">
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
      </div>
      <span
        className={cn(
          "menu-price shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums transition-[color,transform] duration-300",
          flash && "scale-110",
          soldOut && "line-through opacity-50",
        )}
      >
        {price}
      </span>
    </div>
  );
}

const IN_VIEW_THRESHOLD = 0.15;

export function HeroLiveDemo({ className, qrCard }: { className?: string; qrCard?: ReactNode }) {
  const t = useTranslations("Landing.hero");
  const reduce = useReducedMotionSafe();
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);
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
    preloadTemplateFont(TEMPLATE_ORDER[(step + 1) % TEMPLATE_ORDER.length]);
    // resetTimer (0 ms, asynchrone — setState synchrone interdit dans le corps de l'effet) :
    // une suspension en pleine fenêtre d'édition (onglet caché, scroll-out, pause) laisserait
    // `editing` bloqué à true — à la reprise, le palier repart sain, toast compris.
    const resetTimer = window.setTimeout(() => setEditing(false), 0);
    const editTimer = window.setTimeout(() => setEditing(true), EDIT_AT_MS);
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

      <div className="mt-4">
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
            const priceEdit = showEdit && editKind === "price" && item.id === "risotto";
            return (
              <MiniRow
                key={item.id}
                name={item.name}
                desc={item.desc}
                price={priceEdit ? RISOTTO_NEW_PRICE : item.price}
                badge={
                  item.badge && <MiniBadge kind={item.badge} label={badgeLabels[item.badge]} />
                }
                flash={priceEdit}
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
      <div className="relative">
        {/* L'écran est un visuel de démonstration : un label global, contenu masqué aux AT.
            Sous reduced-motion le rendu est statique → label neutre (exactitude 1.1.1).
            Hydration-safe : useReducedMotionSafe vaut false au 1er rendu client (= SSR),
            la bascule PRM arrive après montage via une mise à jour React normale. */}
        <div role="img" aria-label={t(reduce ? "demoImageAltStatic" : "demoImageAlt")}>
          <div aria-hidden="true">
            <HeroPhone className="w-full" paused={paused}>
              <PhoneMockup tilt={-6} statusBarLight={DARK_TEMPLATES.has(template)}>
                {screen}
              </PhoneMockup>
            </HeroPhone>
          </div>
        </div>
        {qrCard && <div className="absolute -bottom-9 -left-16 z-10 hidden md:block">{qrCard}</div>}
      </div>

      {/* Indicateur « playlist » des 9 templates (décoratif) + bouton pause/lecture — le
          mécanisme WCAG 2.2.2, focusable et visible, HORS des zones aria-hidden. Sur la
          scène nuit : points hairline, le point actif prend la couleur d'accent du skin. */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <span aria-hidden="true" className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            {TEMPLATE_ORDER.map((tpl, i) => {
              const active = i === step % TEMPLATE_ORDER.length;
              return (
                <span
                  key={tpl}
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: active ? "1rem" : "0.375rem",
                    backgroundColor: active ? TEMPLATE_DOT[tpl] : "oklch(1 0 0 / 0.22)",
                  }}
                />
              );
            })}
          </span>
          <span className="font-mono text-caption tracking-wide text-sand-300">
            {t("liveMenu.templateChip", {
              name: TEMPLATE_NAMES[template],
              index: (step % TEMPLATE_ORDER.length) + 1,
              total: TEMPLATE_ORDER.length,
            })}
          </span>
        </span>
        {/* Rendu inconditionnel (pas de gate `reduce` : mismatch d'hydratation structurel
            SSR reduce=null → client PRM true). Sous reduced-motion il est simplement inerte. */}
        <button
          type="button"
          onClick={() => setLandingMotionPaused(!paused)}
          aria-pressed={paused}
          aria-label={t("liveMenu.pause")}
          className="flex size-8 items-center justify-center rounded-full border border-white/12 text-sand-300 transition-colors hover:bg-white/8 hover:text-sand-50"
        >
          {paused ? (
            <Play className="size-3.5 stroke-[1.75]" aria-hidden="true" />
          ) : (
            <Pause className="size-3.5 stroke-[1.75]" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
