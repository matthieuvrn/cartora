"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
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

type Props = {
  categoryId: string;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: ItemActionState = { error: null };

export function DeleteCategoryDialog({ categoryId, categoryName, open, onOpenChange }: Props) {
  const t = useTranslations("Dashboard");
  const [state, formAction, isPending] = useActionState(deleteCategoryAction, initialState);

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

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
            {t("category.deleteConfirm", { name: categoryName })}
          </DialogDescription>
        </DialogHeader>

        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {t(`error.${state.error}`)}
          </p>
        )}

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
