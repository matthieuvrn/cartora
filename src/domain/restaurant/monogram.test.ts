import { describe, expect, it } from "vitest";
import { restaurantMonogram } from "./monogram";

describe("restaurantMonogram", () => {
  it("prend les initiales des deux premiers mots", () => {
    expect(restaurantMonogram("Trattoria Roma")).toBe("TR");
    expect(restaurantMonogram("Mon Restaurant")).toBe("MR");
  });

  it("ne garde que deux initiales au maximum", () => {
    expect(restaurantMonogram("La Belle Époque du Coin")).toBe("LB");
  });

  it("retourne une seule initiale pour un mot unique", () => {
    expect(restaurantMonogram("Bistrot")).toBe("B");
  });

  it("préserve et met en majuscule les accents", () => {
    expect(restaurantMonogram("étoile filante")).toBe("ÉF");
    expect(restaurantMonogram("chez léa")).toBe("CL");
  });

  it("ignore la ponctuation et les emojis en tête de mot", () => {
    expect(restaurantMonogram("🍕 Pizzeria")).toBe("P");
    expect(restaurantMonogram("«Le» Gourmet")).toBe("LG");
  });

  it("gère les espaces multiples et le trim", () => {
    expect(restaurantMonogram("  Café   Central  ")).toBe("CC");
  });

  it("retourne une chaîne vide sans caractère alphanumérique", () => {
    expect(restaurantMonogram("")).toBe("");
    expect(restaurantMonogram("   ")).toBe("");
    expect(restaurantMonogram("🍕 ✨")).toBe("");
  });
});
