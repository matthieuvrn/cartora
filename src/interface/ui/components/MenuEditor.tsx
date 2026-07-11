"use client";

import { startTransition, useActionState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { DailyDishData, FormulaData, MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { ActivationChecklist } from "@/domain/restaurant/ActivationPolicy";
import {
  reorderCategoriesAction,
  type ItemActionState,
  type PublishActionState,
} from "@/app/(app)/app/actions";
import type { ActionState } from "@/lib/action-result";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { ActivationChecklistCard } from "./ActivationChecklist";
import { AddCategoryButton } from "./AddCategoryButton";
import { CategorySection } from "./CategorySection";
import { DailyDishesSection } from "./DailyDishesSection";
import { FormulasSection } from "./FormulasSection";
import { EditableRestaurantName } from "./EditableRestaurantName";
import { MenuActionBar, categoryAnchorId } from "./MenuActionBar";
import { StaggerReveal } from "./StaggerReveal";

type Props = {
  menu: MenuOverview;
  restaurantName: string;
  logoPath: string | null;
  planTier: PlanTier;
  publishAction: (_prev: PublishActionState) => Promise<PublishActionState>;
  regenerateQrAction: (
    _prev: ActionState<{ success?: boolean }>,
  ) => Promise<ActionState<{ success?: boolean }>>;
  activationChecklist: ActivationChecklist | null;
  dismissActivationAction: () => Promise<void>;
  dailyDishes: { active: DailyDishData[]; expired: DailyDishData[] };
  formulas: { active: FormulaData[]; expired: FormulaData[] };
};

/**
 * Canvas d'édition de la carte : barre d'actions persistante (nav catégories + Aperçu + Publier +
 * statut, cf. MenuActionBar), en-tête d'identité (logo + nom), menu du jour, formules, catégories
 * repliables. L'aperçu du rendu public se fait à la demande via le dialog (bouton « Aperçu »).
 * Les surfaces de consultation/admin (stats, QR, facturation) vivent dans leurs propres sections du
 * shell — voir /app/stats, /app/partage, /app/abonnement.
 */
export function MenuEditor({
  menu,
  restaurantName,
  logoPath,
  planTier,
  publishAction,
  regenerateQrAction,
  activationChecklist,
  dismissActivationAction,
  dailyDishes,
  formulas,
}: Props) {
  const t = useTranslations("Dashboard");

  const reorderInitialState: ItemActionState = { error: null };
  const wrappedReorderCategories = useCallback(
    async (prev: ItemActionState, formData: FormData) => reorderCategoriesAction(prev, formData),
    [],
  );
  const [, reorderCategoriesFormAction] = useActionState(
    wrappedReorderCategories,
    reorderInitialState,
  );

  function handleMoveCategory(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menu.categories.length) return;

    const newIds = menu.categories.map((c) => c.id);
    [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];

    const formData = new FormData();
    formData.set("orderedIds", JSON.stringify(newIds));
    startTransition(() => reorderCategoriesFormAction(formData));
  }

  // `pb-24` : dégage la barre basse fixe (mobile) pour ne pas masquer le bouton « Ajouter une
  // catégorie ». Sur desktop la barre est collante dans le flux, plus besoin de réserve.
  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <MenuActionBar
        menu={menu}
        restaurantName={restaurantName}
        planTier={planTier}
        publishAction={publishAction}
        regenerateQrAction={regenerateQrAction}
        categories={menu.categories.map((c) => ({ id: c.id, name: c.name }))}
      />

      <StaggerReveal className="min-w-0 space-y-8">
        {activationChecklist && (
          <ActivationChecklistCard
            checklist={activationChecklist}
            dismissAction={dismissActivationAction}
          />
        )}

        <div className="flex items-center gap-3 border-b pb-6">
          {logoPath &&
            (() => {
              const url = restaurantLogoUrl(logoPath);
              return url ? (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={url}
                    alt={restaurantName}
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                </div>
              ) : null;
            })()}
          <div className="space-y-1">
            <EditableRestaurantName currentName={restaurantName} />
            <p className="text-caption text-muted-foreground">{t("title")}</p>
          </div>
        </div>

        <DailyDishesSection
          activeDishes={dailyDishes.active}
          expiredDishes={dailyDishes.expired}
          planTier={planTier}
        />

        <FormulasSection
          activeFormulas={formulas.active}
          expiredFormulas={formulas.expired}
          planTier={planTier}
        />

        {menu.categories.map((category, index) => (
          <CategorySection
            key={category.id}
            id={categoryAnchorId(category.id)}
            category={category}
            canDelete={menu.categories.length > 1}
            onMoveUp={index > 0 ? () => handleMoveCategory(index, "up") : undefined}
            onMoveDown={
              index < menu.categories.length - 1
                ? () => handleMoveCategory(index, "down")
                : undefined
            }
          />
        ))}

        <div className="flex justify-center pt-4">
          <AddCategoryButton categoriesCount={menu.categories.length} planTier={planTier} />
        </div>
      </StaggerReveal>
    </div>
  );
}
