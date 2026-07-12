"use client";

import { useActionState, useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createFormulaAction,
  updateFormulaAction,
  type FormulaActionState,
} from "@/app/(app)/app/actions";
import { ErrorMessage } from "./ErrorMessage";
import { formatCentsToEurInput } from "@/lib/price";
import type { FormulaData } from "@/domain/menu/MenuTypes";
import { FormulaPolicy } from "@/domain/menu/FormulaPolicy";

type Props = {
  mode: "create" | "edit";
  formula?: FormulaData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: FormulaActionState = { error: null };

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FormulaFormDialog({ mode, formula, open, onOpenChange }: Props) {
  const t = useTranslations("Dashboard");
  const tFormula = useTranslations("Dashboard.formula");
  const id = useId();
  const serverAction = mode === "create" ? createFormulaAction : updateFormulaAction;

  const defaultDatetimeLocal = useMemo(() => {
    if (formula) return isoToDatetimeLocal(formula.validUntilISO);
    return isoToDatetimeLocal(FormulaPolicy.defaultExpirationISO(new Date().toISOString()));
  }, [formula]);

  async function wrappedAction(prev: FormulaActionState, formData: FormData) {
    const local = formData.get("validUntilLocal");
    if (typeof local === "string" && local.length > 0) {
      const iso = new Date(local).toISOString();
      formData.set("validUntilISO", iso);
    }
    const result = await serverAction(prev, formData);
    if (result.error === null) {
      onOpenChange(false);
      toast.success(t("toast.formulaSaved"));
    }
    return result;
  }

  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);
  const nameError = state.fieldErrors?.name;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="flex w-full flex-col gap-0 sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>{mode === "create" ? tFormula("add") : tFormula("edit")}</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            {mode === "edit" && formula && (
              <input type="hidden" name="formulaId" value={formula.id} />
            )}

            {state.error?.code !== "validation" && <ErrorMessage error={state.error} />}

            {/* Saisie monolingue (S4) : une seule langue — celle du restaurateur.
                Les traductions se gèrent dans /app/traductions. */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`${id}-name`}>{tFormula("nameLabel")}</Label>
                <Input
                  id={`${id}-name`}
                  name="name"
                  placeholder={tFormula("namePlaceholder")}
                  defaultValue={formula?.translations.fr.name ?? ""}
                  aria-invalid={!!nameError}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${id}-desc`}>{tFormula("compositionLabel")}</Label>
                <Textarea
                  id={`${id}-desc`}
                  name="description"
                  rows={4}
                  placeholder={tFormula("compositionPlaceholder")}
                  defaultValue={formula?.translations.fr.description ?? ""}
                />
                <p className="text-xs text-muted-foreground">{tFormula("compositionHint")}</p>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-1">
              <Label htmlFor={`${id}-price`}>{tFormula("priceLabel")}</Label>
              <div className="relative">
                <Input
                  id={`${id}-price`}
                  name="priceEur"
                  type="text"
                  inputMode="decimal"
                  required
                  className="pr-8"
                  placeholder="12,50"
                  defaultValue={formula ? formatCentsToEurInput(formula.priceCents) : ""}
                  aria-invalid={!!state.fieldErrors?.priceEur}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
              </div>
              {state.fieldErrors?.priceEur && (
                <p className="text-xs text-destructive">{state.fieldErrors.priceEur}</p>
              )}
            </div>

            {/* Expiration */}
            <div className="space-y-1">
              <Label htmlFor={`${id}-validUntil`}>{tFormula("validUntilLabel")}</Label>
              <Input
                id={`${id}-validUntil`}
                name="validUntilLocal"
                type="datetime-local"
                defaultValue={defaultDatetimeLocal}
                aria-invalid={!!state.fieldErrors?.validUntilISO}
                required
              />
              <p className="text-xs text-muted-foreground">{tFormula("validUntilHint")}</p>
              {state.fieldErrors?.validUntilISO && (
                <p className="text-xs text-destructive">{state.fieldErrors.validUntilISO}</p>
              )}
            </div>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "…" : t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
