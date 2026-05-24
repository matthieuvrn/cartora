import { describe, it, expect } from "vitest";
import { CreateRestaurantLogoUploadUrl } from "./CreateRestaurantLogoUploadUrl";
import { createMockStorageService } from "./__fixtures__/storageServiceMock";

describe("CreateRestaurantLogoUploadUrl", () => {
  it("returns a signed URL for the path <restaurantId>/logo.<ext>", async () => {
    const storage = createMockStorageService();
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
    const storage = createMockStorageService();
    const uc = new CreateRestaurantLogoUploadUrl(storage);

    const out = await uc.execute({ restaurantId: "r", mime });

    expect(out.path).toBe(`r/logo.${ext}`);
  });

  it.each(["image/svg+xml", "image/gif", "application/pdf", ""])(
    "throws unsupported_mime on %s",
    async (mime) => {
      const storage = createMockStorageService();
      const uc = new CreateRestaurantLogoUploadUrl(storage);

      await expect(uc.execute({ restaurantId: "r", mime })).rejects.toMatchObject({
        name: "DomainError",
        code: "unsupported_mime",
      });
      expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
    },
  );
});
