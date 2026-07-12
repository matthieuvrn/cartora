"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Trash2, Clock } from "lucide-react";
import type { FormulaData } from "@/domain/menu/MenuTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteFormulaAction } from "@/app/(app)/app/actions";
import { deferDelete } from "@/hooks/use-deferred-delete";
import { HIT_AREA_TALL } from "@/lib/utils";
import { actionErrorText } from "./actionErrorText";
import { FormulaFormDialog } from "./FormulaFormDialog";

type Props = {
  formula: FormulaData;
  isExpired?: boolean;
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatExpiration(validUntilISO: string): { date: string; time: string } {
  const d = new Date(validUntilISO);
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(d);
  return { date, time };
}

export function FormulaCard({ formula, isExpired = false }: Props) {
  const t = useTranslations("Dashboard");
  const tFormula = useTranslations("Dashboard.formula");
  const tErrors = useTranslations("Errors");

  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);

  function handleEdit() {
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }

  // Suppression optimiste avec « Annuler » (cf. deferDelete) — la carte est
  // masquée via usePendingDeletes côté section.
  function handleDelete() {
    deferDelete({
      id: formula.id,
      message: t("undoDelete.deleted", { name: formula.translations.fr.name }),
      undoLabel: t("undoDelete.undo"),
      execute: async () => {
        const formData = new FormData();
        formData.set("formulaId", formula.id);
        const result = await deleteFormulaAction({ error: null }, formData);
        if (result.error) toast.error(actionErrorText(tErrors, result.error));
      },
    });
  }

  const exp = formatExpiration(formula.validUntilISO);

  return (
    <>
      <div
        className={`flex items-start justify-between rounded-lg border p-3 gap-4 ${isExpired ? "opacity-60" : ""}`}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium truncate">{formula.translations.fr.name}</span>
            {isExpired && <Badge variant="warning">{tFormula("expired")}</Badge>}
          </div>
          {formula.translations.fr.description && (
            <p className="whitespace-pre-line text-sm text-foreground/80 line-clamp-4">
              {formula.translations.fr.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            <span>{tFormula("expiresAt", { date: exp.date, time: exp.time })}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-mono font-semibold tabular-nums">
            {formatPrice(formula.priceCents)}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            className={HIT_AREA_TALL}
            aria-label={tFormula("edit")}
            onClick={handleEdit}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className={HIT_AREA_TALL}
            aria-label={tFormula("delete")}
            onClick={handleDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <FormulaFormDialog
        key={editKey}
        mode="edit"
        formula={formula}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
