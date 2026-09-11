"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, HIT_AREA } from "@/lib/utils";
import { renameRestaurantAction, type RenameActionState } from "@/app/(app)/app/actions";
import { ErrorMessage } from "./ErrorMessage";

type Props = {
  currentName: string;
};

const initialState: RenameActionState = { error: null };

/**
 * Nom du restaurant éditable inline — fournit le SEUL `<h1>` de /app, consommé par `PageHeader`
 * via son slot `headingSlot` (cf. `EditorIdentityHeader`). Ne jamais rendre un second h1 dans
 * l'éditeur, et ne jamais imbriquer le `<form>` d'édition dans un h1 (HTML invalide) : c'est
 * précisément la raison d'être du slot.
 */
export function EditableRestaurantName({ currentName }: Props) {
  const t = useTranslations("Dashboard");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const wrappedAction = useCallback(
    async (prev: RenameActionState, formData: FormData) => {
      const result = await renameRestaurantAction(prev, formData);
      if (result.success) {
        setEditing(false);
        toast.success(t("toast.nameSaved"));
      }
      return result;
    },
    [t],
  );
  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        {/* Nom long : on passe à la ligne plutôt que de tronquer — c'est le titre de la page. */}
        <h1 className="min-w-0 text-h2 break-words">{currentName}</h1>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-8 shrink-0", HIT_AREA)}
          onClick={() => setEditing(true)}
          aria-label={t("editName")}
        >
          <Pencil className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <Input
        ref={inputRef}
        name="displayName"
        defaultValue={currentName}
        placeholder={t("namePlaceholder")}
        required
        maxLength={50}
        // Focus intentionnel : l'édition inline est déclenchée par l'utilisateur
        // (clic sur « renommer ») ; placer le focus dans le champ est attendu.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className="h-9 w-full max-w-64 min-w-0 flex-1 text-lg"
        disabled={isPending}
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        disabled={isPending}
        aria-label={t("saveName")}
      >
        <Check className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => setEditing(false)}
        disabled={isPending}
        aria-label={t("cancelEdit")}
      >
        <X className="size-4" />
      </Button>
      <ErrorMessage error={state.error} className="basis-full text-sm text-destructive" />
    </form>
  );
}
