"use client";

import Image from "next/image";
import { useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Clock } from "lucide-react";
import type { DailyMenuEntryData } from "@/domain/menu/MenuTypes";
import { ALLERGEN_VALUES } from "@/domain/menu/ItemPolicy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteDailyEntryAction, type DailyEntryActionState } from "@/app/(app)/app/actions";
import { itemImageUrl } from "@/lib/storage-url";
import { DailyEntryFormDialog } from "./DailyEntryFormDialog";
import { AllergenIcons, type AllergenLabels } from "./AllergenIcons";

type Props = {
  entry: DailyMenuEntryData;
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

const deleteInitialState: DailyEntryActionState = { error: null };

export function DailyEntryCard({ entry, isExpired = false }: Props) {
  const t = useTranslations("Dashboard");
  const tDaily = useTranslations("Dashboard.dailyMenu");
  const tAllergen = useTranslations("Allergen");
  const allergenLabels: AllergenLabels = ALLERGEN_VALUES.reduce((acc, a) => {
    acc[a] = { short: tAllergen(`${a}.short`), legal: tAllergen(`${a}.legal`) };
    return acc;
  }, {} as AllergenLabels);

  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const wrappedDelete = useCallback(async (prev: DailyEntryActionState, formData: FormData) => {
    const result = await deleteDailyEntryAction(prev, formData);
    if (result.success) setDeleteOpen(false);
    return result;
  }, []);
  const [deleteState, deleteAction, isDeleting] = useActionState(wrappedDelete, deleteInitialState);

  function handleEdit() {
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }

  const thumbnailUrl = entry.imagePath ? itemImageUrl(entry.imagePath) : null;
  const thumbnailAlt = entry.altTextFr || entry.altTextEn || entry.translations.fr.name;
  const exp = formatExpiration(entry.validUntilISO);

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
            <span className="font-medium truncate">{entry.translations.fr.name}</span>
            {isExpired && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {tDaily("expired")}
              </span>
            )}
          </div>
          {entry.translations.fr.description && (
            <p className="text-sm text-foreground/80 line-clamp-2">
              {entry.translations.fr.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            <span>{tDaily("expiresAt", { date: exp.date, time: exp.time })}</span>
          </div>
          <AllergenIcons
            allergens={entry.allergens}
            labels={allergenLabels}
            listLabel={tAllergen("sectionTitle")}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold tabular-nums">
            {formatPrice(entry.priceCents)}
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

      <DailyEntryFormDialog
        key={editKey}
        mode="edit"
        entry={entry}
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
              <input type="hidden" name="entryId" value={entry.id} />
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
