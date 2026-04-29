"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_CATEGORIES } from "@/domain/menu/CategoryPolicy";
import { CategoryFormDialog } from "./CategoryFormDialog";

type Props = {
  categoriesCount: number;
};

export function AddCategoryButton({ categoriesCount }: Props) {
  const t = useTranslations("Dashboard");
  const [open, setOpen] = useState(false);
  const limitReached = categoriesCount >= MAX_CATEGORIES;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={limitReached}
        title={limitReached ? t("category.limitReached", { max: MAX_CATEGORIES }) : undefined}
      >
        <Plus />
        {t("category.add")}
      </Button>
      <CategoryFormDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  );
}
