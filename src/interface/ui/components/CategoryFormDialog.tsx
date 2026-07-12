"use client";

import { useActionState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategoryAction,
  renameCategoryAction,
  type ItemActionState,
} from "@/app/(app)/app/actions";
import { MAX_CATEGORY_NAME_LENGTH } from "@/domain/menu/CategoryPolicy";
import { ErrorMessage } from "./ErrorMessage";

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
  const serverAction = props.mode === "create" ? createCategoryAction : renameCategoryAction;
  const successMessage =
    props.mode === "create" ? t("toast.categoryCreated") : t("toast.categoryRenamed");

  // Fermeture + toast impératifs, par résultat, dans l'action wrappée. Contrairement à un
  // useEffect sur `state.success`, ce pattern reste correct pour deux soumissions réussies
  // d'affilée (le booléen ne changerait pas → l'effet ne re-déclencherait pas). Le
  // SheetContent démonte son contenu à open=false (Radix), donc rien à reset ici.
  const onOpenChange = props.onOpenChange;
  const wrappedAction = useCallback(
    async (prev: ItemActionState, formData: FormData) => {
      const result = await serverAction(prev, formData);
      if (result.success) {
        onOpenChange(false);
        toast.success(successMessage);
      }
      return result;
    },
    [serverAction, onOpenChange, successMessage],
  );
  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);

  const defaultName = props.mode === "rename" ? props.initialName : "";

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            {props.mode === "create" ? t("category.add") : t("category.rename")}
          </SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
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
                // Focus intentionnel : la modale est ouverte par une action
                // utilisateur, placer le focus sur le 1er champ suit les WAI-ARIA
                // Authoring Practices (dialog) et améliore l'usage au clavier.
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>

            <ErrorMessage error={state.error} />
            {state.fieldErrors?.name && (
              <p role="alert" className="text-sm text-destructive">
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t pt-4">
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
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
