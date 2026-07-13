"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DailyDishData, FormulaData } from "@/domain/menu/MenuTypes";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";
import { PricingModal } from "./PricingModal";
import { DailyDishesSection } from "./DailyDishesSection";
import { FormulasSection } from "./FormulasSection";

type Props = {
  dailyDishes: { active: DailyDishData[]; expired: DailyDishData[] };
  formulas: { active: FormulaData[]; expired: FormulaData[] };
  planTier: PlanTier;
  sourceLocale: MenuLocale;
};

/**
 * Section « Aujourd'hui » : regroupe plats du jour + formules sous un seul
 * titre (miroir de la section publique du même nom). FREE : un teaser compact
 * unique ouvrant la PricingModal — au lieu de deux pavés paywall empilés
 * au-dessus de la carte.
 */
export function TodaySection({ dailyDishes, formulas, planTier, sourceLocale }: Props) {
  const t = useTranslations("Dashboard");
  const [pricingOpen, setPricingOpen] = useState(false);
  const dishesAllowed = PlanPolicy.canUseDailyDishes(planTier);
  const formulasAllowed = PlanPolicy.canUseFormulas(planTier);

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

  return (
    <section aria-labelledby="today-section-heading" className="space-y-5">
      <div>
        <h2 id="today-section-heading" className="text-h3">
          {t("today.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("today.description")}</p>
      </div>

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
    </section>
  );
}
