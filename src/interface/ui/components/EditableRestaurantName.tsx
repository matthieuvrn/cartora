"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { renameRestaurantAction, type RenameActionState } from "@/app/(app)/app/actions";

type Props = {
  currentName: string;
};

const initialState: RenameActionState = { error: null };

export function EditableRestaurantName({ currentName }: Props) {
  const t = useTranslations("Dashboard");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const wrappedAction = useCallback(async (prev: RenameActionState, formData: FormData) => {
    const result = await renameRestaurantAction(prev, formData);
    if (result.success) setEditing(false);
    return result;
  }, []);
  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold">{currentName}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setEditing(true)}
          aria-label={t("editName")}
        >
          <Pencil className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Input
        ref={inputRef}
        name="displayName"
        defaultValue={currentName}
        placeholder={t("namePlaceholder")}
        required
        maxLength={50}
        autoFocus
        className="h-9 w-64 text-base font-bold"
        disabled={isPending}
      />
      <Button type="submit" variant="ghost" size="icon" className="size-8" disabled={isPending}>
        <Check className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setEditing(false)}
        disabled={isPending}
      >
        <X className="size-4" />
      </Button>
      {state.error && state.error !== "validation" && (
        <p className="text-sm text-destructive">{t(`error.${state.error}`)}</p>
      )}
      {state.error === "validation" && (
        <p className="text-sm text-destructive">{t("error.renameRequired")}</p>
      )}
    </form>
  );
}
