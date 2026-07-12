"use client";

import { startTransition, useActionState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteCategoryAction, type ItemActionState } from "@/app/(app)/app/actions";
import { ErrorMessage } from "./ErrorMessage";

type Props = {
  categoryId: string;
  categoryName: string;
  /** Nombre d'items supprimés en cascade — affiché dans la confirmation. */
  itemCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: ItemActionState = { error: null };

export function DeleteCategoryDialog({
  categoryId,
  categoryName,
  itemCount,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("Dashboard");
  const wrappedDelete = useCallback(
    async (prev: ItemActionState, formData: FormData) => {
      const result = await deleteCategoryAction(prev, formData);
      if (result.success) {
        onOpenChange(false);
        toast.success(t("toast.categoryDeleted"));
      }
      return result;
    },
    [onOpenChange, t],
  );
  const [state, formAction, isPending] = useActionState(wrappedDelete, initialState);

  function handleConfirm() {
    const formData = new FormData();
    formData.set("categoryId", categoryId);
    startTransition(() => formAction(formData));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("category.delete")}</DialogTitle>
          <DialogDescription>
            {t("category.deleteConfirmWithCount", { name: categoryName, count: itemCount })}
          </DialogDescription>
        </DialogHeader>

        <ErrorMessage error={state.error} />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {t("category.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
