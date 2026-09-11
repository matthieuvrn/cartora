"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormulaData } from "@/domain/menu/MenuTypes";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { expiresToday } from "@/domain/menu/expiryStatus";
import { usePendingDeletes } from "@/hooks/use-deferred-delete";
import { FormulaCard } from "./FormulaCard";
import { FormulaFormDialog } from "./FormulaFormDialog";
import { EmptyState } from "./EmptyState";

type Props = {
  activeFormulas: FormulaData[];
  expiredFormulas: FormulaData[];
  sourceLocale: MenuLocale;
  /** ISO 8601 UTC (horloge serveur) — base de la ligne « Expire aujourd'hui à … ». */
  nowISO: string;
};

/**
 * Sous-bloc « Formules » de la section Aujourd'hui (TodaySection porte le h2
 * et le gating de plan). Pile identique à `DailyDishesSection` : liste active
 * + « Ajouter » + expirées repliées pour suppression manuelle.
 */
export function FormulasSection({ activeFormulas, expiredFormulas, sourceLocale, nowISO }: Props) {
  const t = useTranslations("Dashboard.formula");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  // Masque les cartes en attente de suppression (fenêtre « Annuler »).
  const pendingDeletes = usePendingDeletes();
  const visibleActive = activeFormulas.filter((f) => !pendingDeletes.has(f.id));
  const visibleExpired = expiredFormulas.filter((f) => !pendingDeletes.has(f.id));

  function handleAdd() {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  }

  return (
    <section aria-labelledby="formulas-section-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="formulas-section-heading" className="text-base font-semibold">
          {t("title")}
        </h3>
        <Button onClick={handleAdd} variant="outline" size="sm">
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>

      {visibleActive.length === 0 ? (
        <EmptyState
          icon={Layers}
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
          {visibleActive.map((formula) => (
            <li key={formula.id}>
              <FormulaCard
                formula={formula}
                sourceLocale={sourceLocale}
                expiresToday={expiresToday(formula, nowISO)}
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
            {visibleExpired.map((formula) => (
              <li key={formula.id}>
                <FormulaCard formula={formula} isExpired sourceLocale={sourceLocale} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <FormulaFormDialog
        key={createKey}
        mode="create"
        sourceLocale={sourceLocale}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}
