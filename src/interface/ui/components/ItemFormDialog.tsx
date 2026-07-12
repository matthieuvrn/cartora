"use client";

import { useActionState, useCallback, useEffect, useId } from "react";
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
import { Switch } from "@/components/ui/switch";
import { createItemAction, updateItemAction, type ItemActionState } from "@/app/(app)/app/actions";
import { ErrorMessage } from "./ErrorMessage";
import type { MenuItemData } from "@/domain/menu/MenuTypes";
import { ALLERGEN_VALUES, type Allergen, type ItemBadge } from "@/domain/menu/ItemPolicy";
import { formatCentsToEurInput } from "@/lib/price";
import { prefersReducedMotion } from "@/lib/utils";

type Props = {
  mode: "create" | "edit";
  categoryId: string;
  item?: MenuItemData;
  /** Préremplissage du mode create — utilisé par « Dupliquer ». */
  initialValues?: {
    name: string;
    description: string;
    priceCents: number;
    badge: ItemBadge;
    allergens: Allergen[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: ItemActionState = { error: null };

export function ItemFormDialog({
  mode,
  categoryId,
  item,
  initialValues,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("Dashboard");
  const tAllergen = useTranslations("Allergen");
  const id = useId();
  const selectedAllergens = new Set(item?.allergens ?? initialValues?.allergens ?? []);
  const serverAction = mode === "create" ? createItemAction : updateItemAction;

  const wrappedAction = useCallback(
    async (prev: ItemActionState, formData: FormData) => {
      const result = await serverAction(prev, formData);
      if (result.success) {
        onOpenChange(false);
        toast.success(mode === "create" ? t("toast.itemCreated") : t("toast.itemUpdated"));
      }
      return result;
    },
    [serverAction, onOpenChange, mode, t],
  );
  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);
  const nameError = state.fieldErrors?.name;

  // Après création : amener la nouvelle rangée à l'écran et lui donner le focus.
  // Elle n'existe qu'après le refresh RSC déclenché par revalidatePath — d'où
  // la courte attente en requestAnimationFrame.
  const createdItemId = state.createdItemId;
  useEffect(() => {
    if (!createdItemId) return;
    let raf = 0;
    let attempts = 0;
    const tryFocus = () => {
      const el = document.getElementById(`item-${createdItemId}`);
      if (el) {
        el.scrollIntoView({
          block: "center",
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
        el.focus({ preventScroll: true });
      } else if (attempts++ < 15) {
        raf = requestAnimationFrame(tryFocus);
      }
    };
    tryFocus();
    return () => cancelAnimationFrame(raf);
  }, [createdItemId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="flex w-full flex-col gap-0 sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>{mode === "create" ? t("addItem") : t("editItem")}</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            <input type="hidden" name="categoryId" value={categoryId} />
            {mode === "edit" && item && <input type="hidden" name="itemId" value={item.id} />}

            {state.error?.code !== "validation" && <ErrorMessage error={state.error} />}

            {/* Saisie monolingue (S4) : une seule langue — celle du restaurateur.
                Les traductions se gèrent dans /app/traductions. v1 : source = fr,
                `translations.fr` EST le texte source (swap vers `texts` au step 11). */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`${id}-name`}>{t("name")}</Label>
                <Input
                  id={`${id}-name`}
                  name="name"
                  placeholder="ex: Spaghetti Carbonara"
                  defaultValue={item?.translations.fr.name ?? initialValues?.name ?? ""}
                  aria-invalid={!!nameError}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${id}-desc`}>{t("description")}</Label>
                <Textarea
                  id={`${id}-desc`}
                  name="description"
                  placeholder="ex: Pâtes fraîches, pancetta, parmesan..."
                  defaultValue={
                    item?.translations.fr.description ?? initialValues?.description ?? ""
                  }
                />
              </div>
            </div>

            {/* Price + Badge row */}
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
                    defaultValue={
                      item
                        ? formatCentsToEurInput(item.priceCents)
                        : initialValues
                          ? formatCentsToEurInput(initialValues.priceCents)
                          : ""
                    }
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
                <Select name="badge" defaultValue={item?.badge ?? initialValues?.badge ?? "NONE"}>
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

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{tAllergen("sectionTitle")}</legend>
              <p className="text-xs text-muted-foreground">{tAllergen("selectLabel")}</p>
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

            {mode === "edit" && (
              <div className="flex items-center gap-2">
                <Switch
                  id={`${id}-available`}
                  name="isAvailable"
                  value="true"
                  defaultChecked={item?.isAvailable ?? true}
                />
                <Label htmlFor={`${id}-available`}>{t("available")}</Label>
              </div>
            )}
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
