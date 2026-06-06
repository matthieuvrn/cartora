"use client";

import Image from "next/image";
import { useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Clock } from "lucide-react";
import type { DailyDishData } from "@/domain/menu/MenuTypes";
import { ALLERGEN_VALUES } from "@/domain/menu/ItemPolicy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteDailyDishAction, type DailyDishActionState } from "@/app/(app)/app/actions";
import { itemImageUrl } from "@/lib/storage-url";
import { DailyDishFormDialog } from "./DailyDishFormDialog";
import { AllergenIcons, type AllergenLabels } from "./AllergenIcons";

type Props = {
  dish: DailyDishData;
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

const deleteInitialState: DailyDishActionState = { error: null };

export function DailyDishCard({ dish, isExpired = false }: Props) {
  const t = useTranslations("Dashboard");
  const tDaily = useTranslations("Dashboard.dailyDishes");
  const tAllergen = useTranslations("Allergen");
  const allergenLabels: AllergenLabels = ALLERGEN_VALUES.reduce((acc, a) => {
    acc[a] = { short: tAllergen(`${a}.short`), legal: tAllergen(`${a}.legal`) };
    return acc;
  }, {} as AllergenLabels);

  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const wrappedDelete = useCallback(async (prev: DailyDishActionState, formData: FormData) => {
    const result = await deleteDailyDishAction(prev, formData);
    if (result.success) setDeleteOpen(false);
    return result;
  }, []);
  const [deleteState, deleteAction, isDeleting] = useActionState(wrappedDelete, deleteInitialState);

  function handleEdit() {
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }

  const thumbnailUrl = dish.imagePath ? itemImageUrl(dish.imagePath) : null;
  const thumbnailAlt = dish.altTextFr || dish.altTextEn || dish.translations.fr.name;
  const exp = formatExpiration(dish.validUntilISO);

  return (
    <>
      <div
        className={`flex items-start justify-between rounded-lg border p-3 gap-4 ${isExpired ? "opacity-60" : ""}`}
      >
        {thumbnailUrl && (
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={thumbnailUrl}
              alt={thumbnailAlt}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium truncate">{dish.translations.fr.name}</span>
            {isExpired && <Badge variant="warning">{tDaily("expired")}</Badge>}
          </div>
          {dish.translations.fr.description && (
            <p className="text-sm text-foreground/80 line-clamp-2">
              {dish.translations.fr.description}
            </p>
          )}
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
          <Button variant="ghost" size="icon-xs" aria-label={tDaily("edit")} onClick={handleEdit}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={tDaily("delete")}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <DailyDishFormDialog
        key={editKey}
        mode="edit"
        dish={dish}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{tDaily("delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{tDaily("deleteConfirm")}</p>
          {deleteState.error && (
            <p role="alert" className="text-sm text-destructive">
              {t(`error.generic`)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="dishId" value={dish.id} />
              <Button type="submit" variant="destructive" disabled={isDeleting}>
                {isDeleting ? "…" : tDaily("delete")}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
