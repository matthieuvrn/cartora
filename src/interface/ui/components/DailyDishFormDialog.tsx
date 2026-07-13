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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDailyDishAction,
  updateDailyDishAction,
  type DailyDishActionState,
} from "@/app/(app)/app/actions";
import { ErrorMessage } from "./ErrorMessage";
import { formatCentsToEurInput } from "@/lib/price";
import type { DailyDishData } from "@/domain/menu/MenuTypes";
import { resolveText, type MenuLocale } from "@/domain/menu/MenuLocale";
import { ALLERGEN_VALUES } from "@/domain/menu/ItemPolicy";
import { DailyDishPolicy } from "@/domain/menu/DailyDishPolicy";

type Props = {
  mode: "create" | "edit";
  dish?: DailyDishData;
  /** Langue de saisie du restaurateur (S4) — pré-remplissage du formulaire. */
  sourceLocale: MenuLocale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: DailyDishActionState = { error: null };

/**
 * Convertit un ISO 8601 UTC vers le format `datetime-local` (YYYY-MM-DDTHH:MM)
 * dans la TZ du navigateur. Utilisé pour pré-remplir le picker d'expiration.
 */
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DailyDishFormDialog({ mode, dish, sourceLocale, open, onOpenChange }: Props) {
  const t = useTranslations("Dashboard");
  const tDaily = useTranslations("Dashboard.dailyDishes");
  const tAllergen = useTranslations("Allergen");
  const id = useId();
  const selectedAllergens = new Set(dish?.allergens ?? []);
  const serverAction = mode === "create" ? createDailyDishAction : updateDailyDishAction;

  // Default value pour le datetime-local : fin de journée Paris si création,
  // ou la valeur existante de l'entrée si édition.
  const defaultDatetimeLocal = useMemo(() => {
    if (dish) return isoToDatetimeLocal(dish.validUntilISO);
    return isoToDatetimeLocal(DailyDishPolicy.defaultExpirationISO(new Date().toISOString()));
  }, [dish]);

  // Wrap l'action pour convertir le datetime-local → ISO avant d'envoyer.
  // Le navigateur expose une `value` au format `YYYY-MM-DDTHH:MM` ; on construit
  // un Date en TZ navigateur (sémantique attendue par l'utilisateur) puis ISO UTC.
  async function wrappedAction(prev: DailyDishActionState, formData: FormData) {
    const local = formData.get("validUntilLocal");
    if (typeof local === "string" && local.length > 0) {
      const iso = new Date(local).toISOString();
      formData.set("validUntilISO", iso);
    }
    const result = await serverAction(prev, formData);
    if (result.error === null) {
      onOpenChange(false);
      toast.success(t("toast.dishSaved"));
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
          <SheetTitle>{mode === "create" ? tDaily("add") : tDaily("edit")}</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            {mode === "edit" && dish && <input type="hidden" name="dishId" value={dish.id} />}

            {state.error?.code !== "validation" && <ErrorMessage error={state.error} />}

            {/* Saisie monolingue (S4) : une seule langue — celle du restaurateur.
                Les traductions se gèrent dans /app/traductions. */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`${id}-name`}>{t("name")}</Label>
                <Input
                  id={`${id}-name`}
                  name="name"
                  placeholder="ex : Pot-au-feu maison"
                  defaultValue={
                    dish ? resolveText(dish.texts.name, sourceLocale, sourceLocale) : ""
                  }
                  aria-invalid={!!nameError}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${id}-desc`}>{t("description")}</Label>
                <Textarea
                  id={`${id}-desc`}
                  name="description"
                  defaultValue={
                    dish ? resolveText(dish.texts.description, sourceLocale, sourceLocale) : ""
                  }
                />
              </div>
            </div>

            {/* Price + Badge */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`${id}-price`}>{t("price")}</Label>
                <div className="relative">
                  <Input
                    id={`${id}-price`}
                    name="priceEur"
                    type="text"
                    inputMode="decimal"
                    required
                    className="pr-8"
                    placeholder="12,50"
                    defaultValue={dish ? formatCentsToEurInput(dish.priceCents) : ""}
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
              <div className="space-y-1">
                <Label htmlFor={`${id}-badge`}>{t("badgeLabel")}</Label>
                <Select name="badge" defaultValue={dish?.badge ?? "NONE"}>
                  <SelectTrigger id={`${id}-badge`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{t("badge.NONE")}</SelectItem>
                    <SelectItem value="NEW">{t("badge.NEW")}</SelectItem>
                    <SelectItem value="POPULAR">{t("badge.POPULAR")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Allergens */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{tAllergen("sectionTitle")}</legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
                {ALLERGEN_VALUES.map((a) => {
                  const checkboxId = `${id}-allergen-${a}`;
                  return (
                    <label
                      key={a}
                      htmlFor={checkboxId}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        id={checkboxId}
                        type="checkbox"
                        name="allergens"
                        value={a}
                        defaultChecked={selectedAllergens.has(a)}
                        className="size-4 rounded border-input"
                      />
                      <span>{tAllergen(`${a}.short`)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Expiration */}
            <div className="space-y-1">
              <Label htmlFor={`${id}-validUntil`}>{tDaily("validUntilLabel")}</Label>
              <Input
                id={`${id}-validUntil`}
                name="validUntilLocal"
                type="datetime-local"
                defaultValue={defaultDatetimeLocal}
                aria-invalid={!!state.fieldErrors?.validUntilISO}
                required
              />
              <p className="text-xs text-muted-foreground">{tDaily("validUntilHint")}</p>
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
