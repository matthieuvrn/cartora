import { describe, it, expect, vi } from "vitest";
import { GenerateQrCode } from "./GenerateQrCode";
import type { QrCodeGenerator } from "@/application/ports/QrCodeGenerator";
import type { StorageService } from "@/application/ports/StorageService";
import type { QrAssetRepository } from "@/application/ports/QrAssetRepository";

const INPUT_FIXTURE = {
  restaurantId: "resto-1",
  slug: "resto-abcd1234",
  menuUrl: "https://cartora.app/m/resto-abcd1234",
};

const FAKE_BUFFER = Buffer.from("fake-png");
const PUBLIC_URL = "https://storage.test/qr-codes/resto-1.png";

function createMockQrCodeGenerator(overrides: Partial<QrCodeGenerator> = {}): QrCodeGenerator {
  return {
    generate: vi.fn(async () => FAKE_BUFFER),
    ...overrides,
  };
}

function createMockStorageService(overrides: Partial<StorageService> = {}): StorageService {
  return {
    upload: vi.fn(async () => {}),
    getPublicUrl: vi.fn(() => PUBLIC_URL),
    delete: async () => {},
    ...overrides,
  };
}

function createMockQrAssetRepo(overrides: Partial<QrAssetRepository> = {}): QrAssetRepository {
  return {
    save: vi.fn(async () => {}),
    findByRestaurantId: async () => null,
    ...overrides,
  };
}

describe("GenerateQrCode", () => {
  it("generates and stores a QR when none exists", async () => {
    const generator = createMockQrCodeGenerator();
    const storage = createMockStorageService();
    const qrAssetRepo = createMockQrAssetRepo();
    const uc = new GenerateQrCode(generator, storage, qrAssetRepo);

    const result = await uc.execute(INPUT_FIXTURE);

    expect(result).toEqual({ publicUrl: PUBLIC_URL });
    expect(generator.generate).toHaveBeenCalledWith(INPUT_FIXTURE.menuUrl);
    expect(storage.upload).toHaveBeenCalledWith("qr-codes/resto-1.png", FAKE_BUFFER, "image/png");
    expect(qrAssetRepo.save).toHaveBeenCalledWith("resto-1", "qr-codes/resto-1.png");
    expect(storage.getPublicUrl).toHaveBeenCalledWith("qr-codes/resto-1.png");
  });

  it("returns existing URL without regenerating (idempotent)", async () => {
    const generator = createMockQrCodeGenerator();
    const storage = createMockStorageService();
    const qrAssetRepo = createMockQrAssetRepo({
      findByRestaurantId: async () => ({
        restaurantId: "resto-1",
        storagePath: "qr-codes/resto-1.png",
      }),
    });
    const uc = new GenerateQrCode(generator, storage, qrAssetRepo);

    const result = await uc.execute(INPUT_FIXTURE);

    expect(result).toEqual({ publicUrl: PUBLIC_URL });
    expect(generator.generate).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(qrAssetRepo.save).not.toHaveBeenCalled();
    expect(storage.getPublicUrl).toHaveBeenCalledWith("qr-codes/resto-1.png");
  });
});
