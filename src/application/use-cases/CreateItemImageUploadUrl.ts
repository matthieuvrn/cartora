import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { SignedUploadUrl, StorageService } from "@/application/ports/StorageService";
import { ItemPhotoPolicy, type AllowedImageMime } from "@/domain/menu/ItemPhotoPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";

export type CreateItemImageUploadUrlInput = {
  restaurantId: string;
  itemId: string;
  mime: string;
};

export type CreateItemImageUploadUrlOutput = SignedUploadUrl;

const SIGNED_URL_TTL_SECONDS = 60;

export class CreateItemImageUploadUrl {
  constructor(
    private readonly repo: MenuRepository,
    private readonly storage: StorageService,
    private readonly restaurantRepo: RestaurantRepository,
  ) {}

  async execute(input: CreateItemImageUploadUrlInput): Promise<CreateItemImageUploadUrlOutput> {
    if (!ItemPhotoPolicy.isAllowedMime(input.mime)) {
      throw new Error("Format non supporté (JPEG, PNG, WebP uniquement)");
    }

    const item = await this.repo.getItem({
      itemId: input.itemId,
      restaurantId: input.restaurantId,
    });
    if (!item) throw new Error("Item introuvable");

    // Quota photos par tier — uniquement appliqué quand on AJOUTE une photo (pas quand
    // on remplace une existante sur le même item, qui ne change pas le compteur).
    if (!item.imagePath) {
      const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
      if (!restaurant) throw new Error("Restaurant introuvable");
      const max = PlanPolicy.maxPhotosFor(restaurant.planTier);
      const currentCount = await this.repo.countItemsWithImage(input.restaurantId);
      if (currentCount >= max) {
        // L'action layer mappe ce code en "max_photos" → CTA upgrade côté UI.
        throw new Error(`max_photos_${Number.isFinite(max) ? max : "unlimited"}`);
      }
    }

    const ext = ItemPhotoPolicy.extensionForMime(input.mime as AllowedImageMime);
    const path = ItemPhotoPolicy.buildStoragePath(input.restaurantId, input.itemId, ext);

    return this.storage.createSignedUploadUrl(path, SIGNED_URL_TTL_SECONDS);
  }
}
