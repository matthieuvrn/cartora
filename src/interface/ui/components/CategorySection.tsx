"use client";

import { startTransition, useActionState, useCallback, useOptimistic, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import type { MenuCategoryData } from "@/domain/menu/MenuTypes";
import { resolveText, type MenuLocale } from "@/domain/menu/MenuLocale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, HIT_AREA, HIT_AREA_TALL } from "@/lib/utils";
import { reorderItemsAction, type ItemActionState } from "@/app/(app)/app/actions";
import { usePendingDeletes } from "@/hooks/use-deferred-delete";
import { actionErrorText } from "./actionErrorText";
import { SortableList, useSortableRow } from "./dnd/SortableList";
import { ItemRow } from "./ItemRow";
import { QuickAddItemRow } from "./QuickAddItemRow";
import { ItemFormDialog } from "./ItemFormDialog";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

type Props = {
  category: MenuCategoryData;
  /** Langue de saisie du restaurateur — descend jusqu'aux rangées (S4). */
  sourceLocale: MenuLocale;
  canDelete: boolean;
  /** État replié, possédé par MenuEditor (persisté en localStorage par menu). */
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  /**
   * Recherche active : la liste d'items reçue est FILTRÉE — le réordonnancement
   * et la saisie rapide sont masqués (les indices ne correspondent plus à
   * l'ordre réel) et la section est dépliée de force par le parent.
   */
  searchActive?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Ancre de la nav par chips (cf. categoryAnchorId). */
  id?: string;
};

const reorderInitialState: ItemActionState = { error: null };

export function CategorySection({
  category,
  sourceLocale,
  canDelete,
  collapsed,
  onCollapsedChange,
  searchActive = false,
  onMoveUp,
  onMoveDown,
  id,
}: Props) {
  const t = useTranslations("Dashboard");
  const tErrors = useTranslations("Errors");
  const contentId = `cat-content-${category.id}`;
  const [createOpen, setCreateOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Handle de tri de la CATÉGORIE — lit le contexte DnD parent (MenuEditor) ;
  // le DndContext des items rendu plus bas n'affecte que les rangées.
  const { setNodeRef, style, isDragging, handleAttributes, handleListeners } = useSortableRow(
    category.id,
    { disabled: searchActive },
  );

  // Ordre optimiste des items : le reducer rejoue l'ordre demandé sur la liste
  // serveur courante. Échec de l'action ⇒ la base n'a pas changé, l'affichage
  // retombe automatiquement sur l'ordre serveur (+ toast d'erreur).
  const [optimisticItems, applyOptimisticOrder] = useOptimistic(
    category.items,
    (current, orderedIds: string[]) =>
      orderedIds.flatMap((itemId) => current.find((it) => it.id === itemId) ?? []),
  );

  // Masque les rangées en attente de suppression (fenêtre « Annuler »). Le
  // réordonnancement est suspendu pendant cette fenêtre : l'array envoyé au
  // serveur doit rester COMPLET, or l'item « supprimé » y existe encore.
  const pendingDeletes = usePendingDeletes();
  const liveItems = optimisticItems.filter((it) => !pendingDeletes.has(it.id));
  const hasPendingDelete = liveItems.length !== optimisticItems.length;

  // Pas de surface d'erreur inline pour le réordonnancement (pas de formulaire) :
  // un échec est signalé en toast, résolu via le namespace partagé `Errors`.
  const wrappedReorder = useCallback(
    async (prev: ItemActionState, formData: FormData) => {
      const result = await reorderItemsAction(prev, formData);
      if (result.error) toast.error(actionErrorText(tErrors, result.error));
      return result;
    },
    [tErrors],
  );
  const [, reorderAction] = useActionState(wrappedReorder, reorderInitialState);

  function handleReorder(orderedIds: string[]) {
    const formData = new FormData();
    formData.set("categoryId", category.id);
    formData.set("itemIds", JSON.stringify(orderedIds));
    // Setter optimiste DANS la même transition que l'action — sinon React
    // annule la valeur optimiste dès la fin du rendu courant.
    startTransition(() => {
      applyOptimisticOrder(orderedIds);
      reorderAction(formData);
    });
  }

  function handleMove(itemIndex: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= liveItems.length) return;

    const newIds = liveItems.map((it) => it.id);
    [newIds[itemIndex], newIds[targetIndex]] = [newIds[targetIndex], newIds[itemIndex]];
    handleReorder(newIds);
  }

  function handleAdd() {
    onCollapsedChange(false);
    setFormKey((k) => k + 1);
    setCreateOpen(true);
  }

  const canReorderItems = !searchActive && !hasPendingDelete;

  function itemLabel(itemId: string): string {
    const found = liveItems.find((it) => it.id === itemId);
    return found ? resolveText(found.texts.name, sourceLocale, sourceLocale) : "";
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      id={id}
      className={cn(isDragging && "relative z-10 shadow-lg")}
    >
      <CardHeader className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {!searchActive && (
            <button
              type="button"
              {...handleAttributes}
              {...handleListeners}
              className={cn(
                "shrink-0 touch-none text-muted-foreground/70 transition-colors hover:text-foreground",
                isDragging ? "cursor-grabbing" : "cursor-grab",
                HIT_AREA_TALL,
              )}
              aria-label={t("dnd.grabCategory", { name: category.name })}
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </button>
          )}
          {!searchActive && (
            <Button
              variant="ghost"
              size="icon"
              className={HIT_AREA}
              aria-expanded={!collapsed}
              aria-controls={contentId}
              aria-label={collapsed ? t("category.expand") : t("category.collapse")}
              onClick={() => onCollapsedChange(!collapsed)}
            >
              <ChevronDown
                className={cn("size-4 transition-transform", collapsed && "-rotate-90")}
              />
            </Button>
          )}
          <CardTitle className="display truncate">{category.name}</CardTitle>
          <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
            {liveItems.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus />
            {t("addItem")}
          </Button>
          {!searchActive && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={HIT_AREA}
                  aria-label={t("category.menuLabel")}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                  <Pencil />
                  {t("category.rename")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!onMoveUp} onSelect={() => onMoveUp?.()}>
                  <ArrowUp />
                  {t("category.moveUp")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!onMoveDown} onSelect={() => onMoveDown?.()}>
                  <ArrowDown />
                  {t("category.moveDown")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!canDelete}
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  {t("category.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <div id={contentId} hidden={collapsed}>
        <CardContent className="space-y-3">
          {liveItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <UtensilsCrossed
                className="size-8 text-canard-400"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <p className="text-body-sm text-muted-foreground">{t("emptyCategory")}</p>
              <Button variant="outline" size="sm" onClick={handleAdd}>
                <Plus />
                {t("addItem")}
              </Button>
            </div>
          ) : (
            <SortableList
              ids={liveItems.map((it) => it.id)}
              labelFor={itemLabel}
              onReorder={handleReorder}
              disabled={!canReorderItems}
            >
              <div className="space-y-2">
                {liveItems.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    categoryId={category.id}
                    sourceLocale={sourceLocale}
                    sortable={canReorderItems}
                    onMoveUp={
                      canReorderItems && index > 0 ? () => handleMove(index, "up") : undefined
                    }
                    onMoveDown={
                      canReorderItems && index < liveItems.length - 1
                        ? () => handleMove(index, "down")
                        : undefined
                    }
                  />
                ))}
              </div>
            </SortableList>
          )}
          {!searchActive && <QuickAddItemRow categoryId={category.id} />}
        </CardContent>
      </div>

      <ItemFormDialog
        key={formKey}
        mode="create"
        categoryId={category.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <CategoryFormDialog
        mode="rename"
        categoryId={category.id}
        initialName={category.name}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <DeleteCategoryDialog
        categoryId={category.id}
        categoryName={category.name}
        itemCount={category.items.length}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Card>
  );
}
