import type { QrAssetRepository, QrAsset } from "@/application/ports/QrAssetRepository";
import type { PrismaClient } from "@/generated/prisma/client";

export class PrismaQrAssetRepository implements QrAssetRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(restaurantId: string, storagePath: string): Promise<void> {
    await this.db.qrAsset.upsert({
      where: { restaurantId },
      update: { storagePath },
      create: { restaurantId, storagePath },
    });
  }

  async findByRestaurantId(restaurantId: string): Promise<QrAsset | null> {
    const row = await this.db.qrAsset.findUnique({
      where: { restaurantId },
      select: { restaurantId: true, storagePath: true },
    });
    return row;
  }
}
