import { describe, expect, it } from "vitest";
import { MENU_TEMPLATE_VALUES } from "./MenuTypes";
import { PREMIUM_MENU_TEMPLATES, TEMPLATE_META } from "./MenuTemplateMeta";

describe("PREMIUM_MENU_TEMPLATES", () => {
  it("liste les 7 templates premium dans l'ordre de MENU_TEMPLATE_VALUES", () => {
    expect(PREMIUM_MENU_TEMPLATES).toEqual([
      "BISTRO",
      "NOIR",
      "SOLAR",
      "ZEN",
      "NEON",
      "RIVAGE",
      "VELOURS",
    ]);
  });

  it("ne contient que des templates dont le forfait requis est PRO", () => {
    for (const template of PREMIUM_MENU_TEMPLATES) {
      expect(TEMPLATE_META[template].requiredTier).toBe("PRO");
    }
  });

  it("a pour complément exact les templates Base (aucun template oublié)", () => {
    // Tout template est soit Base soit premium : le complément dans MENU_TEMPLATE_VALUES
    // doit valoir exactement les deux templates accessibles à tous les forfaits.
    const base = MENU_TEMPLATE_VALUES.filter(
      (template) => !PREMIUM_MENU_TEMPLATES.includes(template),
    );
    expect(base).toEqual(["CLASSIC", "CARTORA"]);
  });
});
