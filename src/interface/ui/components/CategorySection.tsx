"use client";

import { startTransition, useActionState, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { MenuCategoryData } from "@/domain/menu/MenuTypes";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  reorderItemsAction,
  type ItemActionState,
} from "@/app/(app)/app/actions";
import { ItemCard } from "./ItemCard";
import { ItemFormDialog } from "./ItemFormDialog";

type Props = { category: MenuCategoryData };

const reorderInitialState: ItemActionState = { error: null };

export function CategorySection({ category }: Props) {
  const t = useTranslations("Dashboard");
  const [createOpen, setCreateOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const wrappedReorder = useCallback(
    async (prev: ItemActionState, formData: FormData) => {
      return reorderItemsAction(prev, formData);
    },
    [],
  );
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
    setFormKey((k) => k + 1);
    setCreateOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`category.${category.type}`)}</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus />
            {t("addItem")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {category.items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {t("emptyCategory")}
          </p>
        ) : (
          <div className="space-y-3">
            {category.items.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                categoryId={category.id}
                onMoveUp={index > 0 ? () => handleMove(index, "up") : undefined}
                onMoveDown={index < category.items.length - 1 ? () => handleMove(index, "down") : undefined}
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

      <ItemFormDialog
        key={formKey}
        mode="create"
        categoryId={category.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </Card>
  );
}
