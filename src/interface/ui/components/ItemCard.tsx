"use client";

import Image from "next/image";
import { useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Sparkles, Flame, ChevronUp, ChevronDown } from "lucide-react";
import type { MenuItemData } from "@/domain/menu/MenuTypes";
import { ALLERGEN_VALUES, type ItemBadge } from "@/domain/menu/ItemPolicy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteItemAction, type ItemActionState } from "@/app/(app)/app/actions";
import { itemImageUrl } from "@/lib/storage-url";
import { ItemFormDialog } from "./ItemFormDialog";
import { AllergenIcons, type AllergenLabels } from "./AllergenIcons";

type Props = {
  item: MenuItemData;
  categoryId: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isReordering?: boolean;
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

const badgeConfig: Record<
  Exclude<ItemBadge, "NONE">,
  { icon: typeof Sparkles; className: string }
> = {
  NEW: { icon: Sparkles, className: "bg-canard-100 text-canard-700" },
  POPULAR: { icon: Flame, className: "bg-sapin-100 text-sapin-700" },
};

function BadgeChip({ badge, label }: { badge: Exclude<ItemBadge, "NONE">; label: string }) {
  const config = badgeConfig[badge];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

const deleteInitialState: ItemActionState = { error: null };

export function ItemCard({ item, categoryId, onMoveUp, onMoveDown, isReordering }: Props) {
  const t = useTranslations("Dashboard");
  const tAllergen = useTranslations("Allergen");
  const allergenLabels: AllergenLabels = ALLERGEN_VALUES.reduce((acc, a) => {
    acc[a] = { short: tAllergen(`${a}.short`), legal: tAllergen(`${a}.legal`) };
    return acc;
  }, {} as AllergenLabels);
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const wrappedDelete = useCallback(async (prev: ItemActionState, formData: FormData) => {
    const result = await deleteItemAction(prev, formData);
    if (result.success) setDeleteOpen(false);
    return result;
  }, []);
  const [deleteState, deleteAction, isDeleting] = useActionState(wrappedDelete, deleteInitialState);

  function handleEdit() {
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }

  const thumbnailUrl = item.imagePath ? itemImageUrl(item.imagePath) : null;
  const thumbnailAlt = item.altTextFr || item.altTextEn || item.translations.fr.name;

  return (
    <>
      <div className="flex items-start justify-between rounded-lg border p-3 gap-4">
        {(onMoveUp || onMoveDown) && (
          <div className="flex flex-col gap-0.5 shrink-0">
            {onMoveUp && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("moveUp")}
                onClick={onMoveUp}
                disabled={isReordering}
              >
                <ChevronUp />
              </Button>
            )}
            {onMoveDown && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("moveDown")}
                onClick={onMoveDown}
                disabled={isReordering}
              >
                <ChevronDown />
              </Button>
            )}
          </div>
        )}
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
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{item.translations.fr.name}</span>
            {item.badge !== "NONE" && (
              <BadgeChip badge={item.badge} label={t(`badge.${item.badge}`)} />
            )}
            <span
              className={`inline-block size-2 shrink-0 rounded-full ${
                item.isAvailable ? "bg-success" : "bg-muted-foreground/40"
              }`}
              title={t("available")}
            />
          </div>
          {item.translations.en.name && (
            <p className="text-sm text-muted-foreground truncate">{item.translations.en.name}</p>
          )}
          {item.translations.fr.description && (
            <p className="text-sm text-foreground/80 line-clamp-2">
              {item.translations.fr.description}
            </p>
          )}
          <AllergenIcons
            allergens={item.allergens}
            labels={allergenLabels}
            listLabel={tAllergen("sectionTitle")}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-mono font-semibold tabular-nums">
            {formatPrice(item.priceCents)}
          </span>
          <Button variant="ghost" size="icon-xs" aria-label={t("editItem")} onClick={handleEdit}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("deleteItem")}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <ItemFormDialog
        key={editKey}
        mode="edit"
        categoryId={categoryId}
        item={item}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("deleteItem")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("confirmDelete")}</p>
          {deleteState.error && (
            <p role="alert" className="text-sm text-destructive">
              {t(`error.${deleteState.error}`)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <Button type="submit" variant="destructive" disabled={isDeleting}>
                {isDeleting ? "…" : t("deleteItem")}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
