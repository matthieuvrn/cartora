"use client";

import { useRef, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createItemAction } from "@/app/(app)/app/actions";
import { actionErrorText } from "./actionErrorText";

type Props = { categoryId: string };

/**
 * Saisie rapide en bas de catégorie : nom + prix + Entrée → item créé, champs
 * réinitialisés, focus conservé sur le nom pour enchaîner (saisir une carte de
 * 60 plats sans ouvrir 60 fois le formulaire). Les détails (photo, allergènes,
 * badge, description…) s'ajoutent ensuite via Modifier.
 */
export function QuickAddItemRow({ categoryId }: Props) {
  const t = useTranslations("Dashboard");
  const tErrors = useTranslations("Errors");
  const nameRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("categoryId", categoryId);
    formData.set("badge", "NONE");
    formData.set("description", "");

    startTransition(async () => {
      const result = await createItemAction({ error: null }, formData);
      if (result.error) {
        toast.error(
          result.fieldErrors?.priceEur ??
            result.fieldErrors?.name ??
            actionErrorText(tErrors, result.error),
        );
        return;
      }
      form.reset();
      nameRef.current?.focus();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-1.5"
    >
      <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Input
        ref={nameRef}
        name="name"
        required
        placeholder={t("quickAdd.namePlaceholder")}
        aria-label={t("quickAdd.namePlaceholder")}
        className="h-8 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="relative w-24 shrink-0">
        <Input
          name="priceEur"
          type="text"
          inputMode="decimal"
          required
          placeholder="12,50"
          aria-label={t("price")}
          className="h-8 pr-6 text-right"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          €
        </span>
      </div>
      <Button type="submit" size="sm" variant="ghost" disabled={isPending} className="shrink-0">
        {isPending ? "…" : t("quickAdd.submit")}
      </Button>
    </form>
  );
}
