import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { SignedUploadUrl, StorageService } from "@/application/ports/StorageService";
import { ItemPhotoPolicy, type AllowedImageMime } from "@/domain/menu/ItemPhotoPolicy";

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

    const ext = ItemPhotoPolicy.extensionForMime(input.mime as AllowedImageMime);
    const path = ItemPhotoPolicy.buildStoragePath(input.restaurantId, input.itemId, ext);

    return this.storage.createSignedUploadUrl(path, SIGNED_URL_TTL_SECONDS);
  }
}
