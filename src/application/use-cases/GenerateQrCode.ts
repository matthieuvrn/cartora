import type { QrCodeGenerator } from "@/application/ports/QrCodeGenerator";
import type { StorageService } from "@/application/ports/StorageService";
import type { QrAssetRepository } from "@/application/ports/QrAssetRepository";

export type GenerateQrCodeInput = {
  restaurantId: string;
  slug: string;
  menuUrl: string;
};

export type GenerateQrCodeOutput = {
  publicUrl: string;
};

export class GenerateQrCode {
  constructor(
    private readonly qrCodeGenerator: QrCodeGenerator,
    private readonly storageService: StorageService,
    private readonly qrAssetRepo: QrAssetRepository,
  ) {}

  async execute(input: GenerateQrCodeInput): Promise<GenerateQrCodeOutput> {
    const existing = await this.qrAssetRepo.findByRestaurantId(input.restaurantId);

    if (existing) {
      return { publicUrl: this.storageService.getPublicUrl(existing.storagePath) };
    }

    const buffer = await this.qrCodeGenerator.generate(input.menuUrl);
    const storagePath = `qr-codes/${input.restaurantId}.png`;

    await this.storageService.upload(storagePath, buffer, "image/png");
    await this.qrAssetRepo.save(input.restaurantId, storagePath);

    return { publicUrl: this.storageService.getPublicUrl(storagePath) };
  }
}
