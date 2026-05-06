"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryPolicy } from "@/domain/menu/CategoryPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { CategoryFormDialog } from "./CategoryFormDialog";

type Props = {
  categoriesCount: number;
  planTier: PlanTier;
};

export function AddCategoryButton({ categoriesCount, planTier }: Props) {
  const t = useTranslations("Dashboard");
  const [open, setOpen] = useState(false);
  const max = CategoryPolicy.maxFor(planTier);
  // Infinity formatte mal : on n'affiche pas la limite si PRO (illimité côté produit).
  const limitReached = categoriesCount >= max;
  const displayMax = Number.isFinite(max) ? max : null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={limitReached}
        title={
          limitReached && displayMax !== null
            ? t("category.limitReached", { max: displayMax })
            : undefined
        }
      >
        <Plus />
        {t("category.add")}
      </Button>
      <CategoryFormDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  );
}
