export interface QrAsset {
  restaurantId: string;
  storagePath: string;
}

export interface QrAssetRepository {
  save(restaurantId: string, storagePath: string): Promise<void>;
  findByRestaurantId(restaurantId: string): Promise<QrAsset | null>;
}
