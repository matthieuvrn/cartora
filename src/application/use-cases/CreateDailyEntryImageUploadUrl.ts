import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { SignedUploadUrl, StorageService } from "@/application/ports/StorageService";
import { ItemPhotoPolicy, type AllowedImageMime } from "@/domain/menu/ItemPhotoPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type CreateDailyEntryImageUploadUrlInput = {
  restaurantId: string;
  entryId: string;
  mime: string;
};

export type CreateDailyEntryImageUploadUrlOutput = SignedUploadUrl;

const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Signed PUT URL pour uploader une photo de daily entry. Réutilise le bucket
 * `item-images` (cf. supabase/sql/065_storage_item_images_bucket.sql) via le
 * sous-chemin `{restaurantId}/daily/{entryId}.{ext}` — la RLS du bucket impose
 * déjà le préfixe `restaurant_id/`. Pas de quota photo séparé pour les daily
 * entries : un plat du jour est éphémère, on ne le compte pas dans le quota
 * `maxPhotosFor` du catalogue.
 */
export class CreateDailyEntryImageUploadUrl {
  constructor(
    private readonly repo: MenuRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(
    input: CreateDailyEntryImageUploadUrlInput,
  ): Promise<CreateDailyEntryImageUploadUrlOutput> {
    if (!ItemPhotoPolicy.isAllowedMime(input.mime)) {
      throw new DomainError("unsupported_mime", { invalidValue: input.mime });
    }

    const entry = await this.repo.getDailyEntry({
      entryId: input.entryId,
      restaurantId: input.restaurantId,
    });
    if (!entry) throw new DomainError("item_not_found", { entityId: input.entryId });

    const ext = ItemPhotoPolicy.extensionForMime(input.mime as AllowedImageMime);
    const path = `${input.restaurantId}/daily/${input.entryId}.${ext}`;

    return this.storage.createSignedUploadUrl(path, SIGNED_URL_TTL_SECONDS);
  }
}
