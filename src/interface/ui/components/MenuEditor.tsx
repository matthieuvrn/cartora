"use client";

import { startTransition, useActionState, useCallback, useSyncExternalStore } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivationChecklistCard } from "./ActivationChecklist";
import { AddCategoryButton } from "./AddCategoryButton";
import { CategorySection } from "./CategorySection";
import { DailyDishesSection } from "./DailyDishesSection";
import { FormulasSection } from "./FormulasSection";
import { EditableRestaurantName } from "./EditableRestaurantName";
import { MenuPreviewPane } from "./MenuPreviewPane";
import { PreviewDialog } from "./PreviewDialog";
import { PublishButton } from "./PublishButton";
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

// Préférence "panneau aperçu visible" (desktop), persistée en localStorage et lue via
// useSyncExternalStore — lecture SSR-safe d'un état client-only (serveur → `true`, réconcilié
// après hydratation sans mismatch). `storage` event = synchro inter-onglets gratuite.
const LIVE_PREVIEW_KEY = "cartora:editor:livePreview";
const LIVE_PREVIEW_EVENT = "cartora:livePreview";
function subscribeLivePreview(cb: () => void) {
  window.addEventListener(LIVE_PREVIEW_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LIVE_PREVIEW_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function getLivePreview() {
  return localStorage.getItem(LIVE_PREVIEW_KEY) !== "0";
}

/**
 * Canvas d'édition de la carte : en-tête (nom + statut + Aperçu/Publier), menu du jour, formules,
 * catégories. Les surfaces de consultation/admin (stats, QR, facturation) vivent dans leurs propres
 * sections du shell — voir /app/stats, /app/partage, /app/abonnement.
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

  const showPreview = useSyncExternalStore(subscribeLivePreview, getLivePreview, () => true);
  function togglePreview() {
    localStorage.setItem(LIVE_PREVIEW_KEY, showPreview ? "0" : "1");
    window.dispatchEvent(new Event(LIVE_PREVIEW_EVENT));
  }

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

  return (
    <div
      className={cn(
        "xl:grid xl:items-start xl:gap-8",
        showPreview ? "xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)]" : "xl:grid-cols-1",
      )}
    >
      <StaggerReveal className="min-w-0 space-y-8">
        {activationChecklist && (
          <ActivationChecklistCard
            checklist={activationChecklist}
            dismissAction={dismissActivationAction}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2">
            {!showPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={togglePreview}
                className="hidden xl:inline-flex"
              >
                <PanelRightOpen className="mr-2 size-4" />
                {t("showPreview")}
              </Button>
            )}
            <PreviewDialog menu={menu} restaurantName={restaurantName} planTier={planTier} />
            <PublishButton
              planTier={planTier}
              menuStatus={menu.status}
              publishAction={publishAction}
              regenerateQrAction={regenerateQrAction}
            />
            <Badge variant={menu.status === "PUBLISHED" ? "success" : "warning"}>
              {t(`status.${menu.status}`)}
            </Badge>
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

      {/* Aperçu live — panneau collant, large desktop uniquement (≥ xl, sinon la colonne d'édition
          serait trop comprimée) et repliable (préférence persistée). Sous xl, l'aperçu reste
          accessible via le bouton "Aperçu" (PreviewDialog). */}
      {showPreview && (
        <aside className="hidden xl:block">
          <div className="sticky top-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-caption font-medium text-muted-foreground">{t("livePreview")}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={togglePreview}
                aria-label={t("hidePreview")}
                title={t("hidePreview")}
              >
                <PanelRightClose className="size-4" />
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border shadow-lg">
              <MenuPreviewPane
                menu={menu}
                restaurantName={restaurantName}
                planTier={planTier}
                className="max-h-[calc(100svh-7rem)] overflow-y-auto"
              />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
