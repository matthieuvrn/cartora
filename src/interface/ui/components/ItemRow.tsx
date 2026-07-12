"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Flame,
  GripVertical,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { MenuItemData } from "@/domain/menu/MenuTypes";
import { resolveText, type MenuLocale } from "@/domain/menu/MenuLocale";
import { ALLERGEN_VALUES, type ItemBadge } from "@/domain/menu/ItemPolicy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteItemAction, setItemAvailabilityAction } from "@/app/(app)/app/actions";
import { deferDelete } from "@/hooks/use-deferred-delete";
import { cn, HIT_AREA, HIT_AREA_TALL } from "@/lib/utils";
import { actionErrorText } from "./actionErrorText";
import { ItemFormDialog } from "./ItemFormDialog";
import { AllergenIcons, type AllergenLabels } from "./AllergenIcons";
import { useSortableRow } from "./dnd/SortableList";

type Props = {
  item: MenuItemData;
  categoryId: string;
  /** Langue de saisie du restaurateur — résout `texts` (S4, jamais le champ déprécié). */
  sourceLocale: MenuLocale;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Rangée triable (drag & drop) — désactivé pendant une recherche. */
  sortable?: boolean;
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

const badgeConfig: Record<
  Exclude<ItemBadge, "NONE">,
  { icon: typeof Sparkles; variant: "canard" | "sapin" }
> = {
  NEW: { icon: Sparkles, variant: "canard" },
  POPULAR: { icon: Flame, variant: "sapin" },
};

function BadgeChip({ badge, label }: { badge: Exclude<ItemBadge, "NONE">; label: string }) {
  const config = badgeConfig[badge];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant}>
      <Icon />
      {label}
    </Badge>
  );
}

/**
 * Rangée dense d'un item : nom + badge + description sur deux lignes compactes,
 * prix mono, switch de disponibilité toujours visible (l'action quotidienne n°1),
 * crayon d'édition direct et menu overflow (dupliquer / déplacer / supprimer —
 * suppression optimiste avec « Annuler », cf. deferDelete).
 * `id="item-{id}"` + `tabIndex=-1` : cible de focus après création.
 */
export function ItemRow({
  item,
  categoryId,
  sourceLocale,
  onMoveUp,
  onMoveDown,
  sortable = false,
}: Props) {
  const t = useTranslations("Dashboard");
  const tErrors = useTranslations("Errors");
  const tAllergen = useTranslations("Allergen");
  const allergenLabels: AllergenLabels = ALLERGEN_VALUES.reduce((acc, a) => {
    acc[a] = { short: tAllergen(`${a}.short`), legal: tAllergen(`${a}.legal`) };
    return acc;
  }, {} as AllergenLabels);
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateKey, setDuplicateKey] = useState(0);
  const deleteFocusTargetRef = useRef<HTMLElement | null>(null);

  const name = resolveText(item.texts.name, sourceLocale, sourceLocale);
  const description = resolveText(item.texts.description, sourceLocale, sourceLocale);

  const { setNodeRef, style, isDragging, handleAttributes, handleListeners } = useSortableRow(
    item.id,
    { disabled: !sortable },
  );

  // Suppression optimiste : la rangée disparaît tout de suite (masquée via
  // usePendingDeletes côté CategorySection), le toast « Annuler » couvre 5 s,
  // l'appel serveur ne part qu'à l'échéance. Le focus est rendu à une rangée
  // voisine — le trigger du menu disparaît avec la rangée.
  function handleDelete() {
    const row = document.getElementById(`item-${item.id}`);
    deleteFocusTargetRef.current = (row?.nextElementSibling ??
      row?.previousElementSibling) as HTMLElement | null;

    deferDelete({
      id: item.id,
      message: t("undoDelete.deleted", { name }),
      undoLabel: t("undoDelete.undo"),
      execute: async () => {
        const formData = new FormData();
        formData.set("itemId", item.id);
        const result = await deleteItemAction({ error: null }, formData);
        if (result.error) toast.error(actionErrorText(tErrors, result.error));
      },
    });
  }

  function handleEdit() {
    setEditKey((k) => k + 1);
    setEditOpen(true);
  }

  function handleDuplicate() {
    setDuplicateKey((k) => k + 1);
    setDuplicateOpen(true);
  }

  // Bascule optimiste : le switch reflète l'intention immédiatement ; en cas
  // d'échec serveur la base (props) n'a pas bougé → retour visuel automatique
  // + toast. Le setter DOIT être appelé dans la même transition que l'action,
  // sinon React annule la valeur optimiste dès la fin du rendu courant.
  const [optimisticAvailable, setOptimisticAvailable] = useOptimistic(item.isAvailable);
  const [, startAvailabilityTransition] = useTransition();

  function handleToggleAvailability(next: boolean) {
    startAvailabilityTransition(async () => {
      setOptimisticAvailable(next);
      const result = await setItemAvailabilityAction({ itemId: item.id, isAvailable: next });
      if (result.error) toast.error(actionErrorText(tErrors, result.error));
    });
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        id={`item-${item.id}`}
        tabIndex={-1}
        className={cn(
          "flex items-center gap-3 rounded-lg border bg-card px-3 py-2",
          isDragging && "relative z-10 shadow-lg",
        )}
      >
        {sortable && (
          <button
            type="button"
            {...handleAttributes}
            {...handleListeners}
            className={cn(
              "shrink-0 touch-none text-muted-foreground/70 transition-colors hover:text-foreground",
              isDragging ? "cursor-grabbing" : "cursor-grab",
              HIT_AREA_TALL,
            )}
            aria-label={t("dnd.grabItem", { name })}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        )}
        <div className={cn("min-w-0 flex-1", !optimisticAvailable && "opacity-60")}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">{name}</span>
            {item.badge !== "NONE" && (
              <BadgeChip badge={item.badge} label={t(`badge.${item.badge}`)} />
            )}
            {!optimisticAvailable && (
              <Badge variant="outline" className="shrink-0">
                {t("unavailable")}
              </Badge>
            )}
          </div>
          {(description || item.allergens.length > 0) && (
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              {description && (
                <p className="min-w-0 truncate text-sm text-muted-foreground">{description}</p>
              )}
              {item.allergens.length > 0 && (
                <div className="shrink-0">
                  <AllergenIcons
                    allergens={item.allergens}
                    labels={allergenLabels}
                    listLabel={tAllergen("sectionTitle")}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatPrice(item.priceCents)}
          </span>
          <Switch
            size="sm"
            checked={optimisticAvailable}
            onCheckedChange={handleToggleAvailability}
            aria-label={t("available")}
            title={
              optimisticAvailable
                ? t("availability.shownAfterPublish")
                : t("availability.hiddenAfterPublish")
            }
            className={HIT_AREA}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            className={HIT_AREA_TALL}
            aria-label={t("editItem")}
            onClick={handleEdit}
          >
            <Pencil />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className={HIT_AREA_TALL}
                aria-label={t("itemMenu.label")}
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(e) => {
                // Après une suppression, Radix voudrait rendre le focus au
                // trigger — qui disparaît avec la rangée. On le donne au voisin.
                if (!deleteFocusTargetRef.current) return;
                e.preventDefault();
                deleteFocusTargetRef.current.focus();
                deleteFocusTargetRef.current = null;
              }}
            >
              <DropdownMenuItem onSelect={handleDuplicate}>
                <Copy />
                {t("duplicate")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!onMoveUp} onSelect={() => onMoveUp?.()}>
                <ChevronUp />
                {t("moveUp")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!onMoveDown} onSelect={() => onMoveDown?.()}>
                <ChevronDown />
                {t("moveDown")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={handleDelete}
              >
                <Trash2 />
                {t("deleteItem")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Dupliquer = formulaire de création prérempli. La photo n'est pas copiée —
          le fichier de stockage appartient à l'item source. */}
      <ItemFormDialog
        key={`duplicate-${duplicateKey}`}
        mode="create"
        categoryId={categoryId}
        initialValues={{
          name: `${name} ${t("duplicateSuffix")}`,
          description,
          priceCents: item.priceCents,
          badge: item.badge,
          allergens: item.allergens,
        }}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
      />
    </>
  );
}
