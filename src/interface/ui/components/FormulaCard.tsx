"use client";

import { useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Clock } from "lucide-react";
import type { FormulaData } from "@/domain/menu/MenuTypes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteFormulaAction, type FormulaActionState } from "@/app/(app)/app/actions";
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

const deleteInitialState: FormulaActionState = { error: null };

export function FormulaCard({ formula, isExpired = false }: Props) {
  const t = useTranslations("Dashboard");
  const tFormula = useTranslations("Dashboard.formula");

  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const wrappedDelete = useCallback(async (prev: FormulaActionState, formData: FormData) => {
    const result = await deleteFormulaAction(prev, formData);
    if (result.success) setDeleteOpen(false);
    return result;
  }, []);
  const [deleteState, deleteAction, isDeleting] = useActionState(wrappedDelete, deleteInitialState);

  function handleEdit() {
    setEditKey((k) => k + 1);
    setEditOpen(true);
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
            {isExpired && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {tFormula("expired")}
              </span>
            )}
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
          <span className="text-sm font-semibold tabular-nums">
            {formatPrice(formula.priceCents)}
          </span>
          <Button variant="ghost" size="icon-xs" aria-label={tFormula("edit")} onClick={handleEdit}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={tFormula("delete")}
            onClick={() => setDeleteOpen(true)}
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{tFormula("delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{tFormula("deleteConfirm")}</p>
          {deleteState.error && (
            <p role="alert" className="text-sm text-destructive">
              {t(`error.generic`)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="formulaId" value={formula.id} />
              <Button type="submit" variant="destructive" disabled={isDeleting}>
                {isDeleting ? "…" : tFormula("delete")}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
