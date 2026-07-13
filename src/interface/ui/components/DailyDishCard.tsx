"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Trash2, Clock } from "lucide-react";
import type { DailyDishData } from "@/domain/menu/MenuTypes";
import { resolveText, type MenuLocale } from "@/domain/menu/MenuLocale";
import { ALLERGEN_VALUES } from "@/domain/menu/ItemPolicy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteDailyDishAction } from "@/app/(app)/app/actions";
import { deferDelete } from "@/hooks/use-deferred-delete";
import { HIT_AREA_TALL } from "@/lib/utils";
import { actionErrorText } from "./actionErrorText";
import { DailyDishFormDialog } from "./DailyDishFormDialog";
import { AllergenIcons, type AllergenLabels } from "./AllergenIcons";

type Props = {
  dish: DailyDishData;
  sourceLocale: MenuLocale;
  /** Si true, l'entrée est expirée — affichée en grisé avec un badge "Expiré". */
  isExpired?: boolean;
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatExpiration(validUntilISO: string): { date: string; time: string } {
  const d = new Date(validUntilISO);
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(d);
  return { date, time };
}

export function DailyDishCard({ dish, sourceLocale, isExpired = false }: Props) {
  const t = useTranslations("Dashboard");
  const tDaily = useTranslations("Dashboard.dailyDishes");
  const tErrors = useTranslations("Errors");
  const tAllergen = useTranslations("Allergen");
  const allergenLabels: AllergenLabels = ALLERGEN_VALUES.reduce((acc, a) => {
    acc[a] = { short: tAllergen(`${a}.short`), legal: tAllergen(`${a}.legal`) };
    return acc;
  }, {} as AllergenLabels);

  const name = resolveText(dish.texts.name, sourceLocale, sourceLocale);
  const description = resolveText(dish.texts.description, sourceLocale, sourceLocale);

  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);

  function handleEdit() {
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }

  // Suppression optimiste avec « Annuler » (cf. deferDelete) — la carte est
  // masquée via usePendingDeletes côté section.
  function handleDelete() {
    deferDelete({
      id: dish.id,
      message: t("undoDelete.deleted", { name }),
      undoLabel: t("undoDelete.undo"),
      execute: async () => {
        const formData = new FormData();
        formData.set("dishId", dish.id);
        const result = await deleteDailyDishAction({ error: null }, formData);
        if (result.error) toast.error(actionErrorText(tErrors, result.error));
      },
    });
  }

  const exp = formatExpiration(dish.validUntilISO);

  return (
    <>
      <div
        className={`flex items-start justify-between rounded-lg border p-3 gap-4 ${isExpired ? "opacity-60" : ""}`}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium truncate">{name}</span>
            {isExpired && <Badge variant="warning">{tDaily("expired")}</Badge>}
          </div>
          {description && <p className="text-sm text-foreground/80 line-clamp-2">{description}</p>}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            <span>{tDaily("expiresAt", { date: exp.date, time: exp.time })}</span>
          </div>
          <AllergenIcons
            allergens={dish.allergens}
            labels={allergenLabels}
            listLabel={tAllergen("sectionTitle")}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-mono font-semibold tabular-nums">
            {formatPrice(dish.priceCents)}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            className={HIT_AREA_TALL}
            aria-label={tDaily("edit")}
            onClick={handleEdit}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className={HIT_AREA_TALL}
            aria-label={tDaily("delete")}
            onClick={handleDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <DailyDishFormDialog
        key={editKey}
        mode="edit"
        dish={dish}
        sourceLocale={sourceLocale}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
