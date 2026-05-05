"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategoryAction,
  renameCategoryAction,
  type ItemActionState,
} from "@/app/(app)/app/actions";
import { MAX_CATEGORY_NAME_LENGTH } from "@/domain/menu/CategoryPolicy";

type Props =
  | {
      mode: "create";
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }
  | {
      mode: "rename";
      categoryId: string;
      initialName: string;
      open: boolean;
      onOpenChange: (open: boolean) => void;
    };

const initialState: ItemActionState = { error: null };

export function CategoryFormDialog(props: Props) {
  const t = useTranslations("Dashboard");
  const action = props.mode === "create" ? createCategoryAction : renameCategoryAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Auto-close on success. The Dialog's content unmounts when open=false (Radix default),
  // so any local form state inside the form is reset at next open — no need to reset here.
  const onOpenChange = props.onOpenChange;
  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

  const errorKey = state.error === "duplicate_name" ? "category.duplicate" : `error.${state.error}`;
  const defaultName = props.mode === "rename" ? props.initialName : "";

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <form action={formAction} className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {props.mode === "create" ? t("category.add") : t("category.rename")}
            </DialogTitle>
          </DialogHeader>

          {props.mode === "rename" && (
            <input type="hidden" name="categoryId" value={props.categoryId} />
          )}

          <div className="space-y-2">
            <Label htmlFor="category-name">{t("category.namePlaceholder")}</Label>
            <Input
              id="category-name"
              name="name"
              defaultValue={defaultName}
              maxLength={MAX_CATEGORY_NAME_LENGTH}
              required
              autoFocus
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {t(errorKey)}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => props.onOpenChange(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {props.mode === "create" ? t("category.add") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
