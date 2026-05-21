"use client";

import { useActionState, useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    }
    return result;
  }

  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? tFormula("add") : tFormula("edit")}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          {mode === "edit" && formula && (
            <input type="hidden" name="formulaId" value={formula.id} />
          )}

          {state.error?.code !== "validation" && <ErrorMessage error={state.error} />}

          {/* FR */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-muted-foreground">Français</legend>
            <div className="space-y-1">
              <Label htmlFor={`${id}-nameFr`}>{tFormula("nameLabel")}</Label>
              <Input
                id={`${id}-nameFr`}
                name="nameFr"
                required
                placeholder={tFormula("namePlaceholder")}
                defaultValue={formula?.translations.fr.name ?? ""}
                aria-invalid={!!state.fieldErrors?.["translations.fr.name"]}
              />
              {state.fieldErrors?.["translations.fr.name"] && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors["translations.fr.name"]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-descFr`}>{tFormula("compositionLabel")}</Label>
              <Textarea
                id={`${id}-descFr`}
                name="descriptionFr"
                rows={4}
                placeholder={tFormula("compositionPlaceholder")}
                defaultValue={formula?.translations.fr.description ?? ""}
              />
              <p className="text-xs text-muted-foreground">{tFormula("compositionHint")}</p>
            </div>
          </fieldset>

          {/* EN */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-muted-foreground">English</legend>
            <div className="space-y-1">
              <Label htmlFor={`${id}-nameEn`}>{tFormula("nameEnLabel")}</Label>
              <Input
                id={`${id}-nameEn`}
                name="nameEn"
                defaultValue={formula?.translations.en.name ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-descEn`}>{tFormula("compositionEnLabel")}</Label>
              <Textarea
                id={`${id}-descEn`}
                name="descriptionEn"
                rows={4}
                defaultValue={formula?.translations.en.description ?? ""}
              />
            </div>
          </fieldset>

          {/* Price */}
          <div className="space-y-1">
            <Label htmlFor={`${id}-price`}>{tFormula("priceLabel")}</Label>
            <div className="relative">
              <Input
                id={`${id}-price`}
                name="priceEur"
                type="number"
                step="0.01"
                min="0"
                required
                className="pr-8"
                placeholder="0.00"
                defaultValue={formula ? (formula.priceCents / 100).toFixed(2) : ""}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "…" : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
