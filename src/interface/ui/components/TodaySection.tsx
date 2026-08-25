"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DailyDishData, FormulaData } from "@/domain/menu/MenuTypes";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";
import { cn } from "@/lib/utils";
import { PricingModal } from "./PricingModal";
import { DailyDishesSection } from "./DailyDishesSection";
import { FormulasSection } from "./FormulasSection";

// Persistance de l'état replié (par menu) : même pattern hydration-safe que le
// repli des catégories dans MenuEditor (server snapshot = null ⇒ défaut calculé
// au premier rendu, localStorage lu post-hydratation, sync inter-onglets).
const TODAY_COLLAPSE_SYNC_EVENT = "cartora:today-collapsed";

function subscribeToTodayCollapse(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(TODAY_COLLAPSE_SYNC_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(TODAY_COLLAPSE_SYNC_EVENT, callback);
  };
}

type Props = {
  menuId: string;
  dailyDishes: { active: DailyDishData[]; expired: DailyDishData[] };
  formulas: { active: FormulaData[]; expired: FormulaData[] };
  planTier: PlanTier;
  sourceLocale: MenuLocale;
};

/**
 * Section « Aujourd'hui » : regroupe plats du jour + formules sous un seul
 * titre (miroir de la section publique du même nom). Repliable — sans choix
 * persisté, repliée par défaut quand rien n'est actif (la carte reste l'objet
 * principal de la page), dépliée quand du contenu actif existe (un plat du
 * jour qui expire ne doit pas vivre caché). Tout l'en-tête (chevron + titre)
 * est la cible de dépli, et le résumé repliée compte actifs ET expirés — la
 * section ne cache jamais d'information actionnable. FREE : un teaser compact
 * unique ouvrant la PricingModal — au lieu de deux pavés paywall empilés
 * au-dessus de la carte.
 */
export function TodaySection({ menuId, dailyDishes, formulas, planTier, sourceLocale }: Props) {
  const t = useTranslations("Dashboard");
  const [pricingOpen, setPricingOpen] = useState(false);
  const dishesAllowed = PlanPolicy.canUseDailyDishes(planTier);
  const formulasAllowed = PlanPolicy.canUseFormulas(planTier);

  const activeDishCount = dishesAllowed ? dailyDishes.active.length : 0;
  const activeFormulaCount = formulasAllowed ? formulas.active.length : 0;
  const expiredCount =
    (dishesAllowed ? dailyDishes.expired.length : 0) +
    (formulasAllowed ? formulas.expired.length : 0);
  const hasActiveContent = activeDishCount + activeFormulaCount > 0;

  const storageKey = `cartora:today-collapsed:${menuId}`;
  const getCollapseSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      // localStorage indisponible : défaut calculé, le fallback mémoire prend le relais.
      return null;
    }
  }, [storageKey]);
  const storedCollapse = useSyncExternalStore(
    subscribeToTodayCollapse,
    getCollapseSnapshot,
    () => null,
  );
  // Fallback mémoire : si l'écriture localStorage échoue (stockage désactivé,
  // quota…), le toggle DOIT rester fonctionnel — c'est le seul accès à la section.
  const [fallbackCollapsed, setFallbackCollapsed] = useState<boolean | null>(null);
  const collapsed =
    fallbackCollapsed ?? (storedCollapse === null ? !hasActiveContent : storedCollapse === "1");

  function setCollapsed(next: boolean) {
    try {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
      window.dispatchEvent(new Event(TODAY_COLLAPSE_SYNC_EVENT));
      setFallbackCollapsed(null);
    } catch {
      setFallbackCollapsed(next);
    }
  }

  if (!dishesAllowed && !formulasAllowed) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-3">
          <Sun className="size-5 shrink-0 text-canard-400" strokeWidth={1.75} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("today.title")}</p>
            <p className="text-sm text-muted-foreground">{t("today.teaser")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPricingOpen(true)}>
            {t("today.teaserCta")}
          </Button>
        </div>
        <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
      </>
    );
  }

  const summaryParts: string[] = [];
  if (activeDishCount > 0) summaryParts.push(t("today.summaryDishes", { count: activeDishCount }));
  if (activeFormulaCount > 0)
    summaryParts.push(t("today.summaryFormulas", { count: activeFormulaCount }));
  if (expiredCount > 0) summaryParts.push(t("today.summaryExpired", { count: expiredCount }));
  const summary = summaryParts.length > 0 ? summaryParts.join(" · ") : t("today.summaryEmpty");

  const contentId = "today-section-content";

  return (
    <section aria-labelledby="today-section-heading" className="space-y-5">
      <div>
        {/* Pattern accordéon : le bouton (nom accessible = titre) vit DANS le
            h2 ; cible chevron + titre, min 44px de haut. Le double anneau de
            focus vient de la règle globale :focus-visible de .theme-app. */}
        <h2 id="today-section-heading" className="text-h3">
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls={contentId}
            onClick={() => setCollapsed(!collapsed)}
            className="group -ml-1 flex min-h-11 items-center gap-1.5 rounded-md pr-2 text-left"
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground/70 transition-[transform,color] group-hover:text-foreground",
                collapsed && "-rotate-90",
              )}
              aria-hidden="true"
            />
            {t("today.title")}
          </button>
        </h2>
        <p className="pl-[22px] text-sm text-muted-foreground">
          {collapsed ? summary : t("today.description")}
        </p>
      </div>

      <div id={contentId} hidden={collapsed} className="space-y-5">
        {dishesAllowed && (
          <DailyDishesSection
            activeDishes={dailyDishes.active}
            expiredDishes={dailyDishes.expired}
            sourceLocale={sourceLocale}
          />
        )}
        {formulasAllowed && (
          <FormulasSection
            activeFormulas={formulas.active}
            expiredFormulas={formulas.expired}
            sourceLocale={sourceLocale}
          />
        )}
      </div>
    </section>
  );
}
