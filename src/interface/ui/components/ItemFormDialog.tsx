"use client";

import { useActionState, useCallback, useId } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createItemAction, updateItemAction, type ItemActionState } from "@/app/(app)/app/actions";
import type { MenuItemData } from "@/domain/menu/MenuTypes";
import { ALLERGEN_VALUES } from "@/domain/menu/ItemPolicy";

type Props = {
  mode: "create" | "edit";
  categoryId: string;
  item?: MenuItemData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: ItemActionState = { error: null };

export function ItemFormDialog({ mode, categoryId, item, open, onOpenChange }: Props) {
  const t = useTranslations("Dashboard");
  const tAllergen = useTranslations("Allergen");
  const id = useId();
  const selectedAllergens = new Set(item?.allergens ?? []);
  const serverAction = mode === "create" ? createItemAction : updateItemAction;
  const wrappedAction = useCallback(
    async (prev: ItemActionState, formData: FormData) => {
      const result = await serverAction(prev, formData);
      if (result.success) onOpenChange(false);
      return result;
    },
    [serverAction, onOpenChange],
  );
  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("addItem") : t("editItem")}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="categoryId" value={categoryId} />
          {mode === "edit" && item && <input type="hidden" name="itemId" value={item.id} />}

          {state.error && state.error !== "validation" && (
            <p role="alert" className="text-sm text-destructive">
              {t(`error.${state.error}`)}
            </p>
          )}

          {/* FR fields */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-muted-foreground">Français</legend>
            <div className="space-y-1">
              <Label htmlFor={`${id}-nameFr`}>{t("nameFr")}</Label>
              <Input
                id={`${id}-nameFr`}
                name="nameFr"
                required
                placeholder="ex: Spaghetti Carbonara"
                defaultValue={item?.translations.fr.name ?? ""}
                aria-invalid={!!state.fieldErrors?.["translations.fr.name"]}
              />
              {state.fieldErrors?.["translations.fr.name"] && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors["translations.fr.name"]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-descFr`}>{t("descriptionFr")}</Label>
              <Textarea
                id={`${id}-descFr`}
                name="descriptionFr"
                placeholder="ex: Pâtes fraîches, pancetta, parmesan..."
                defaultValue={item?.translations.fr.description ?? ""}
              />
            </div>
          </fieldset>

          {/* EN fields */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-muted-foreground">English</legend>
            <div className="space-y-1">
              <Label htmlFor={`${id}-nameEn`}>{t("nameEn")}</Label>
              <Input
                id={`${id}-nameEn`}
                name="nameEn"
                placeholder="ex: Spaghetti Carbonara"
                defaultValue={item?.translations.en.name ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-descEn`}>{t("descriptionEn")}</Label>
              <Textarea
                id={`${id}-descEn`}
                name="descriptionEn"
                placeholder="ex: Fresh pasta, pancetta, parmesan..."
                defaultValue={item?.translations.en.description ?? ""}
              />
            </div>
          </fieldset>

          {/* Price + Badge row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`${id}-price`}>{t("price")}</Label>
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
                  defaultValue={item ? (item.priceCents / 100).toFixed(2) : ""}
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
              <Select name="badge" defaultValue={item?.badge ?? "NONE"}>
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
