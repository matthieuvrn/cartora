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
  const id = useId();
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

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="categoryId" value={categoryId} />
          {mode === "edit" && item && <input type="hidden" name="itemId" value={item.id} />}

          {state.error && state.error !== "validation" && (
            <p role="alert" className="text-sm text-destructive">
              {t(`error.${state.error}`)}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor={`${id}-nameFr`}>{t("nameFr")}</Label>
            <Input
              id={`${id}-nameFr`}
              name="nameFr"
              required
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
              defaultValue={item?.translations.fr.description ?? ""}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`${id}-nameEn`}>{t("nameEn")}</Label>
            <Input
              id={`${id}-nameEn`}
              name="nameEn"
              defaultValue={item?.translations.en.name ?? ""}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`${id}-descEn`}>{t("descriptionEn")}</Label>
            <Textarea
              id={`${id}-descEn`}
              name="descriptionEn"
              defaultValue={item?.translations.en.description ?? ""}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`${id}-price`}>{t("price")}</Label>
            <Input
              id={`${id}-price`}
              name="priceEur"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={item ? (item.priceCents / 100).toFixed(2) : ""}
              aria-invalid={!!state.fieldErrors?.priceEur}
            />
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
