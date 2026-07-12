"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DailyDishData } from "@/domain/menu/MenuTypes";
import { usePendingDeletes } from "@/hooks/use-deferred-delete";
import { DailyDishCard } from "./DailyDishCard";
import { DailyDishFormDialog } from "./DailyDishFormDialog";

type Props = {
  activeDishes: DailyDishData[];
  expiredDishes: DailyDishData[];
};

/**
 * Sous-bloc « Plats du jour » de la section Aujourd'hui (TodaySection porte le
 * h2 et le gating de plan). Liste active + « Ajouter » + expirées repliées en
 * bas, grisées, pour suppression manuelle.
 */
export function DailyDishesSection({ activeDishes, expiredDishes }: Props) {
  const t = useTranslations("Dashboard.dailyDishes");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  // Masque les cartes en attente de suppression (fenêtre « Annuler »).
  const pendingDeletes = usePendingDeletes();
  const visibleActive = activeDishes.filter((d) => !pendingDeletes.has(d.id));
  const visibleExpired = expiredDishes.filter((d) => !pendingDeletes.has(d.id));

  function handleAdd() {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  }

  return (
    <section aria-labelledby="daily-menu-section-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="daily-menu-section-heading" className="text-base font-semibold">
          {t("title")}
        </h3>
        <Button onClick={handleAdd} size="sm">
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>

      {visibleActive.length === 0 ? (
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
          {visibleActive.map((dish) => (
            <li key={dish.id}>
              <DailyDishCard dish={dish} />
            </li>
          ))}
        </ul>
      )}

      {visibleExpired.length > 0 && (
        <details className="rounded-lg border bg-muted/40 p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {t("emptyExpired")} ({visibleExpired.length})
          </summary>
          <ul className="mt-3 space-y-2" role="list">
            {visibleExpired.map((dish) => (
              <li key={dish.id}>
                <DailyDishCard dish={dish} isExpired />
              </li>
            ))}
          </ul>
        </details>
      )}

      <DailyDishFormDialog
        key={createKey}
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}
