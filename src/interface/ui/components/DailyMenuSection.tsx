"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DailyMenuEntryData } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { DailyEntryCard } from "./DailyEntryCard";
import { DailyEntryFormDialog } from "./DailyEntryFormDialog";

type Props = {
  activeEntries: DailyMenuEntryData[];
  expiredEntries: DailyMenuEntryData[];
  planTier: PlanTier;
};

/**
 * Section "Menu du jour" du dashboard (S3.1). Pile :
 * - tier FREE  → paywall (CTA upgrade vers Starter).
 * - tier ≥ STARTER → liste des entrées actives + bouton "Ajouter" + (si présent) liste des expirées
 *   en bas, grisées, pour permettre suppression manuelle.
 */
export function DailyMenuSection({ activeEntries, expiredEntries, planTier }: Props) {
  const t = useTranslations("Dashboard.dailyMenu");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  const allowed = PlanPolicy.canUseDailyMenu(planTier);

  function handleAdd() {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  }

  if (!allowed) {
    return (
      <section aria-labelledby="daily-menu-section-heading" className="space-y-3">
        <h2 id="daily-menu-section-heading" className="text-lg font-semibold">
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
          <h2 id="daily-menu-section-heading" className="text-lg font-semibold">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>

      {activeEntries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {activeEntries.map((entry) => (
            <li key={entry.id}>
              <DailyEntryCard entry={entry} />
            </li>
          ))}
        </ul>
      )}

      {expiredEntries.length > 0 && (
        <details className="rounded-lg border bg-muted/40 p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {t("emptyExpired")} ({expiredEntries.length})
          </summary>
          <ul className="mt-3 space-y-2" role="list">
            {expiredEntries.map((entry) => (
              <li key={entry.id}>
                <DailyEntryCard entry={entry} isExpired />
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-muted-foreground italic">{t("publishHint")}</p>

      <DailyEntryFormDialog
        key={createKey}
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}
