"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Lock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FormulaData } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { FormulaCard } from "./FormulaCard";
import { FormulaFormDialog } from "./FormulaFormDialog";

type Props = {
  activeFormulas: FormulaData[];
  expiredFormulas: FormulaData[];
  planTier: PlanTier;
};

/**
 * Section "Formules" du dashboard (S3.2). Pile identique à `DailyDishesSection` :
 * paywall si FREE, sinon liste active + bouton "Ajouter" + (si présentes) expirées
 * en bloc dépliable pour suppression manuelle.
 */
export function FormulasSection({ activeFormulas, expiredFormulas, planTier }: Props) {
  const t = useTranslations("Dashboard.formula");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  const allowed = PlanPolicy.canUseFormulas(planTier);

  function handleAdd() {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  }

  if (!allowed) {
    return (
      <section aria-labelledby="formulas-section-heading" className="space-y-3">
        <h2 id="formulas-section-heading" className="text-h3">
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
    <section aria-labelledby="formulas-section-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="formulas-section-heading" className="text-h3">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>

      {activeFormulas.length === 0 ? (
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
          {activeFormulas.map((formula) => (
            <li key={formula.id}>
              <FormulaCard formula={formula} />
            </li>
          ))}
        </ul>
      )}

      {expiredFormulas.length > 0 && (
        <details className="rounded-lg border bg-muted/40 p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {t("emptyExpired")} ({expiredFormulas.length})
          </summary>
          <ul className="mt-3 space-y-2" role="list">
            {expiredFormulas.map((formula) => (
              <li key={formula.id}>
                <FormulaCard formula={formula} isExpired />
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-muted-foreground italic">{t("publishHint")}</p>

      <FormulaFormDialog
        key={createKey}
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}
