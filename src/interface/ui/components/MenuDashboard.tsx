"use client";

import { useTranslations } from "next-intl";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import { CategorySection } from "./CategorySection";

type Props = { menu: MenuOverview };

export function MenuDashboard({ menu }: Props) {
  const t = useTranslations("Dashboard");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
          {menu.status}
        </span>
      </div>

      {menu.categories.map((category) => (
        <CategorySection key={category.id} category={category} />
      ))}
    </div>
  );
}
