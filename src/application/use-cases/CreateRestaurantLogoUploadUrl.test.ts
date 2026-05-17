import { describe, it, expect, vi } from "vitest";
import { CreateRestaurantLogoUploadUrl } from "./CreateRestaurantLogoUploadUrl";
import type { StorageService } from "@/application/ports/StorageService";

function createMockStorage(overrides: Partial<StorageService> = {}): StorageService {
  return {
    upload: async () => {},
    getPublicUrl: () => "",
    delete: async () => {},
    createSignedUploadUrl: vi.fn(async (path: string) => ({
      uploadUrl: `https://upload.test/${path}`,
      token: "token-abc",
      path,
    })),
    deleteByPrefix: async () => {},
    ...overrides,
  };
}

describe("CreateRestaurantLogoUploadUrl", () => {
  it("returns a signed URL for the path <restaurantId>/logo.<ext>", async () => {
    const storage = createMockStorage();
    const uc = new CreateRestaurantLogoUploadUrl(storage);

    const out = await uc.execute({ restaurantId: "resto-1", mime: "image/webp" });

    expect(out.path).toBe("resto-1/logo.webp");
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith("resto-1/logo.webp", 60);
  });

  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("maps %s to .%s", async (mime, ext) => {
    const storage = createMockStorage();
    const uc = new CreateRestaurantLogoUploadUrl(storage);

    const out = await uc.execute({ restaurantId: "r", mime });

    expect(out.path).toBe(`r/logo.${ext}`);
  });

  it.each(["image/svg+xml", "image/gif", "application/pdf", ""])(
    "throws unsupported_mime on %s",
    async (mime) => {
      const storage = createMockStorage();
      const uc = new CreateRestaurantLogoUploadUrl(storage);

      await expect(uc.execute({ restaurantId: "r", mime })).rejects.toMatchObject({
        name: "DomainError",
        code: "unsupported_mime",
      });
      expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
    },
  );
});
