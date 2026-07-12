"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormulaData } from "@/domain/menu/MenuTypes";
import { usePendingDeletes } from "@/hooks/use-deferred-delete";
import { FormulaCard } from "./FormulaCard";
import { FormulaFormDialog } from "./FormulaFormDialog";

type Props = {
  activeFormulas: FormulaData[];
  expiredFormulas: FormulaData[];
};

/**
 * Sous-bloc « Formules » de la section Aujourd'hui (TodaySection porte le h2
 * et le gating de plan). Pile identique à `DailyDishesSection` : liste active
 * + « Ajouter » + expirées repliées pour suppression manuelle.
 */
export function FormulasSection({ activeFormulas, expiredFormulas }: Props) {
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
        <Button onClick={handleAdd} size="sm">
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>

      {visibleActive.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
          <Layers className="size-8 text-canard-400" strokeWidth={1.75} aria-hidden="true" />
          <p className="text-body-sm text-muted-foreground">{t("empty")}</p>
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus />
            {t("add")}
          </Button>
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {visibleActive.map((formula) => (
            <li key={formula.id}>
              <FormulaCard formula={formula} />
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
                <FormulaCard formula={formula} isExpired />
              </li>
            ))}
          </ul>
        </details>
      )}

      <FormulaFormDialog
        key={createKey}
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}
