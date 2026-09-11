"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DailyDishData } from "@/domain/menu/MenuTypes";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { expiresToday } from "@/domain/menu/expiryStatus";
import { usePendingDeletes } from "@/hooks/use-deferred-delete";
import { DailyDishCard } from "./DailyDishCard";
import { DailyDishFormDialog } from "./DailyDishFormDialog";
import { EmptyState } from "./EmptyState";

type Props = {
  activeDishes: DailyDishData[];
  expiredDishes: DailyDishData[];
  sourceLocale: MenuLocale;
  /** ISO 8601 UTC (horloge serveur) — base de la ligne « Expire aujourd'hui à … ». */
  nowISO: string;
};

/**
 * Sous-bloc « Plats du jour » de la section Aujourd'hui (TodaySection porte le
 * h2 et le gating de plan). Liste active + « Ajouter » + expirées repliées en
 * bas, grisées, pour suppression manuelle.
 */
export function DailyDishesSection({ activeDishes, expiredDishes, sourceLocale, nowISO }: Props) {
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
        {/* Outline : même registre que « Ajouter un item » des catégories — le seul bouton
            plein du viewport reste le climax de la barre de publication. */}
        <Button onClick={handleAdd} variant="outline" size="sm">
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>

      {visibleActive.length === 0 ? (
        <EmptyState
          icon={Sun}
          description={t("empty")}
          action={
            <Button variant="outline" size="sm" onClick={handleAdd}>
              <Plus />
              {t("add")}
            </Button>
          }
        />
      ) : (
        /* Expiration « aujourd'hui » calculée ici (helper domaine pur) — la carte reste un rendu. */
        <ul className="space-y-2" role="list">
          {visibleActive.map((dish) => (
            <li key={dish.id}>
              <DailyDishCard
                dish={dish}
                sourceLocale={sourceLocale}
                expiresToday={expiresToday(dish, nowISO)}
              />
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
                <DailyDishCard dish={dish} isExpired sourceLocale={sourceLocale} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <DailyDishFormDialog
        key={createKey}
        mode="create"
        sourceLocale={sourceLocale}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}
