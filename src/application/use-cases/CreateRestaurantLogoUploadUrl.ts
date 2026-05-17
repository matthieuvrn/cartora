import type { SignedUploadUrl, StorageService } from "@/application/ports/StorageService";
import { BrandingPolicy, type AllowedLogoMime } from "@/domain/restaurant/BrandingPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type CreateRestaurantLogoUploadUrlInput = {
  restaurantId: string;
  mime: string;
};

export type CreateRestaurantLogoUploadUrlOutput = SignedUploadUrl;

const SIGNED_URL_TTL_SECONDS = 60;

export class CreateRestaurantLogoUploadUrl {
  constructor(private readonly storage: StorageService) {}

  async execute(
    input: CreateRestaurantLogoUploadUrlInput,
  ): Promise<CreateRestaurantLogoUploadUrlOutput> {
    if (!BrandingPolicy.isAllowedMime(input.mime)) {
      throw new DomainError("unsupported_mime", { invalidValue: input.mime });
    }

    const ext = BrandingPolicy.extensionForMime(input.mime as AllowedLogoMime);
    const path = BrandingPolicy.buildLogoStoragePath(input.restaurantId, ext);

    return this.storage.createSignedUploadUrl(path, SIGNED_URL_TTL_SECONDS);
  }
}
