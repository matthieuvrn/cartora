import type { InitialCategory, RestaurantType } from "@/domain/restaurant/RestaurantInitPolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { MenuLocale } from "@/domain/menu/MenuLocale";

export interface RestaurantRepository {
  findByOwnerUserId(ownerUserId: string): Promise<{ id: string } | null>;

  createWithMenuAndCategories(params: {
    ownerUserId: string;
    displayName: string;
    slug: string;
    categories: InitialCategory[];
    restaurantType?: RestaurantType | null;
  }): Promise<{ id: string }>;

  getRestaurantById(id: string): Promise<{
    id: string;
    slug: string;
    displayName: string;
    planStatus: PlanStatus;
    planTier: PlanTier;
    activationDismissedAt: Date | null;
    logoPath: string | null;
    brandPrimary: string | null;
    brandAccent: string | null;
    brandBackground: string | null;
    /** Langue de saisie du restaurateur (S4). */
    sourceLocale: MenuLocale;
    /** Langues cibles activées (S4) — n'inclut jamais la langue source. */
    menuLocales: MenuLocale[];
  } | null>;

  updateDisplayName(params: { restaurantId: string; displayName: string }): Promise<void>;

  updateLogoPath(params: { restaurantId: string; logoPath: string | null }): Promise<void>;

  updateBrandColors(params: {
    restaurantId: string;
    primary: string | null;
    accent: string | null;
    background: string | null;
  }): Promise<void>;

  /** Remplace la liste des langues cibles activées (S4). */
  updateMenuLocales(params: { restaurantId: string; menuLocales: MenuLocale[] }): Promise<void>;

  markActivationDismissed(restaurantId: string): Promise<void>;

  delete(restaurantId: string): Promise<void>;
}
