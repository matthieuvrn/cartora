"use client";

import { startTransition, useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import type { MenuCategoryData } from "@/domain/menu/MenuTypes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, HIT_AREA } from "@/lib/utils";
import { reorderItemsAction, type ItemActionState } from "@/app/(app)/app/actions";
import { ItemCard } from "./ItemCard";
import { ItemFormDialog } from "./ItemFormDialog";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

type Props = {
  category: MenuCategoryData;
  canDelete: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Ancre de la nav « Aller à… » (cf. categoryAnchorId). */
  id?: string;
};

const reorderInitialState: ItemActionState = { error: null };

export function CategorySection({ category, canDelete, onMoveUp, onMoveDown, id }: Props) {
  const t = useTranslations("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const contentId = `cat-content-${category.id}`;
  const [createOpen, setCreateOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const wrappedReorder = useCallback(async (prev: ItemActionState, formData: FormData) => {
    return reorderItemsAction(prev, formData);
  }, []);
  const [reorderState, reorderAction, isReordering] = useActionState(
    wrappedReorder,
    reorderInitialState,
  );

  function handleMove(itemIndex: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= category.items.length) return;

    const newIds = category.items.map((it) => it.id);
    [newIds[itemIndex], newIds[targetIndex]] = [newIds[targetIndex], newIds[itemIndex]];

    const formData = new FormData();
    formData.set("categoryId", category.id);
    formData.set("itemIds", JSON.stringify(newIds));
    startTransition(() => reorderAction(formData));
  }

  function handleAdd() {
    setCollapsed(false);
    setFormKey((k) => k + 1);
    setCreateOpen(true);
  }

  return (
    <Card id={id} className="scroll-mt-20 md:scroll-mt-24">
      <CardHeader className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className={HIT_AREA}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            aria-label={collapsed ? t("category.expand") : t("category.collapse")}
            onClick={() => setCollapsed((v) => !v)}
          >
            <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} />
          </Button>
          <CardTitle className="display truncate">{category.name}</CardTitle>
          <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
            {category.items.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={HIT_AREA}
            aria-label={t("category.moveUp")}
            onClick={onMoveUp}
            disabled={!onMoveUp}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={HIT_AREA}
            aria-label={t("category.moveDown")}
            onClick={onMoveDown}
            disabled={!onMoveDown}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={HIT_AREA}
            aria-label={t("category.rename")}
            onClick={() => setRenameOpen(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={HIT_AREA}
            aria-label={t("category.delete")}
            onClick={() => setDeleteOpen(true)}
            disabled={!canDelete}
            title={!canDelete ? t("category.deleteLast") : undefined}
          >
            <Trash2 className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleAdd} className="ml-1">
            <Plus />
            {t("addItem")}
          </Button>
        </div>
      </CardHeader>
      <div id={contentId} hidden={collapsed}>
        <CardContent>
          {category.items.length === 0 ? (
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
            <div className="space-y-3">
              {category.items.map((item, index) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  categoryId={category.id}
                  onMoveUp={index > 0 ? () => handleMove(index, "up") : undefined}
                  onMoveDown={
                    index < category.items.length - 1 ? () => handleMove(index, "down") : undefined
                  }
                  isReordering={isReordering}
                />
              ))}
              {reorderState.error && (
                <p role="alert" className="text-sm text-destructive">
                  {t(`error.${reorderState.error}`)}
                </p>
              )}
            </div>
          )}
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
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Card>
  );
}
