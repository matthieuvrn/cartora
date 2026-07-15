import { describe, it, expect } from "vitest";
import { UpdateQrStyle } from "./UpdateQrStyle";
import { createMockRestaurantRepo } from "./__fixtures__/restaurantRepoMock";

const validInput = {
  restaurantId: "resto-1",
  darkColor: "#0F2A44",
  lightColor: "#FDF6EF",
  dotsStyle: "rounded",
  cornersStyle: "square",
};

describe("UpdateQrStyle", () => {
  it("persists the normalized (lowercased) style", async () => {
    const restaurantRepo = createMockRestaurantRepo();
    const uc = new UpdateQrStyle(restaurantRepo);

    await uc.execute(validInput);

    expect(restaurantRepo.updateQrStyle).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      style: {
        darkColor: "#0f2a44",
        lightColor: "#fdf6ef",
        dotsStyle: "rounded",
        cornersStyle: "square",
      },
    });
  });

  it("never re-drafts the menu (QR style is not in the public snapshot)", async () => {
    // UpdateQrStyle ne reçoit AUCUN MenuRepository : l'absence de dépendance est
    // l'invariant. Ce test verrouille le fait que le constructeur ne prend qu'un repo resto.
    expect(UpdateQrStyle.length).toBe(1);
    const restaurantRepo = createMockRestaurantRepo();
    await new UpdateQrStyle(restaurantRepo).execute(validInput);
    expect(restaurantRepo.updateQrStyle).toHaveBeenCalledOnce();
  });

  it("throws restaurant_not_found when no restaurant exists", async () => {
    const restaurantRepo = createMockRestaurantRepo({ getRestaurantById: async () => null });
    const uc = new UpdateQrStyle(restaurantRepo);

    await expect(uc.execute(validInput)).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
    });
    expect(restaurantRepo.updateQrStyle).not.toHaveBeenCalled();
  });

  it("rejects a malformed hex color with invalid_brand_color", async () => {
    const restaurantRepo = createMockRestaurantRepo();
    const uc = new UpdateQrStyle(restaurantRepo);

    await expect(uc.execute({ ...validInput, darkColor: "nope" })).rejects.toMatchObject({
      name: "DomainError",
      code: "invalid_brand_color",
    });
    expect(restaurantRepo.updateQrStyle).not.toHaveBeenCalled();
  });

  it("rejects an out-of-enum dot style with invalid_qr_style", async () => {
    const restaurantRepo = createMockRestaurantRepo();
    const uc = new UpdateQrStyle(restaurantRepo);

    await expect(uc.execute({ ...validInput, dotsStyle: "sparkles" })).rejects.toMatchObject({
      name: "DomainError",
      code: "invalid_qr_style",
    });
    expect(restaurantRepo.updateQrStyle).not.toHaveBeenCalled();
  });

  it("rejects a low-contrast pair with qr_low_contrast (no force escape hatch)", async () => {
    const restaurantRepo = createMockRestaurantRepo();
    const uc = new UpdateQrStyle(restaurantRepo);

    await expect(
      uc.execute({ ...validInput, darkColor: "#b87333", lightColor: "#ffffff" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "qr_low_contrast" });
    expect(restaurantRepo.updateQrStyle).not.toHaveBeenCalled();
  });
});
