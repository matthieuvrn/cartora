"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Lock, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DailyDishData } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { DailyDishCard } from "./DailyDishCard";
import { DailyDishFormDialog } from "./DailyDishFormDialog";

type Props = {
  activeDishes: DailyDishData[];
  expiredDishes: DailyDishData[];
  planTier: PlanTier;
};

/**
 * Section "Menu du jour" du dashboard (S3.1). Pile :
 * - tier FREE  → paywall (CTA upgrade vers Starter).
 * - tier ≥ STARTER → liste des entrées actives + bouton "Ajouter" + (si présent) liste des expirées
 *   en bas, grisées, pour permettre suppression manuelle.
 */
export function DailyDishesSection({ activeDishes, expiredDishes, planTier }: Props) {
  const t = useTranslations("Dashboard.dailyDishes");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  const allowed = PlanPolicy.canUseDailyDishes(planTier);

  function handleAdd() {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  }

  if (!allowed) {
    return (
      <section aria-labelledby="daily-menu-section-heading" className="space-y-3">
        <h2 id="daily-menu-section-heading" className="text-h3">
          {t("title")}
        </h2>
        <Alert>
          <Lock className="size-4" />
          <AlertTitle>{t("paywall.title")}</AlertTitle>
          <AlertDescription>{t("paywall.description")}</AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section aria-labelledby="daily-menu-section-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="daily-menu-section-heading" className="text-h3">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>

      {activeDishes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
          <Sun className="size-8 text-canard-400" strokeWidth={1.75} aria-hidden="true" />
          <p className="text-body-sm text-muted-foreground">{t("empty")}</p>
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus />
            {t("add")}
          </Button>
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {activeDishes.map((dish) => (
            <li key={dish.id}>
              <DailyDishCard dish={dish} />
            </li>
          ))}
        </ul>
      )}

      {expiredDishes.length > 0 && (
        <details className="rounded-lg border bg-muted/40 p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {t("emptyExpired")} ({expiredDishes.length})
          </summary>
          <ul className="mt-3 space-y-2" role="list">
            {expiredDishes.map((dish) => (
              <li key={dish.id}>
                <DailyDishCard dish={dish} isExpired />
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-muted-foreground italic">{t("publishHint")}</p>

      <DailyDishFormDialog
        key={createKey}
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}
