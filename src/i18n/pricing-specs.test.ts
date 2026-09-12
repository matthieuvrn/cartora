import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { MENU_TEMPLATE_VALUES } from "@/domain/menu/MenuTypes";
import { SUPPORTED_MENU_LOCALES } from "@/domain/menu/MenuLocale";

const tiers = ["free", "starter", "pro"] as const;
const policyTier = { free: "FREE", starter: "STARTER", pro: "PRO" } as const;
const fmt = (n: number) => (Number.isFinite(n) ? String(n) : "∞");

describe("Landing.pricing.specs — valeurs recopiées = PlanPolicy", () => {
  for (const [name, messages] of [
    ["fr", fr],
    ["en", en],
  ] as const) {
    for (const tier of tiers) {
      const specs = messages.Landing.pricing.specs[tier];
      const t = policyTier[tier];
      it(`${name} ${tier}: catégories / designs / langues`, () => {
        expect(specs.categories).toBe(fmt(PlanPolicy.maxCategoriesFor(t)));
        const designs = MENU_TEMPLATE_VALUES.filter((tpl) =>
          PlanPolicy.canUseTemplate(t, tpl),
        ).length;
        expect(specs.designs).toBe(String(designs));
        const extra = PlanPolicy.maxExtraMenuLocalesFor(t);
        const languages = Number.isFinite(extra) ? 1 + extra : SUPPORTED_MENU_LOCALES.length;
        expect(specs.languages).toBe(String(languages));
      });
    }
  }
  it("aucune clé Landing.pricing ne code un prix", () => {
    const flat = JSON.stringify([fr.Landing.pricing, en.Landing.pricing]);
    // Tout chiffre accolé à « € » (espace optionnelle, `\s` couvre U+00A0 / U+202F) :
    // attrape « 0 € », « 9,90 € », « €9.90 », « €0 » — pas seulement les montants à décimales.
    expect(flat).not.toMatch(/\d\s?€|€\s?\d/);
  });
  it("le préfixe sr-only « Non inclus » n'embarque pas d'espace de fin (l'espace vit dans le JSX)", () => {
    expect(fr.Landing.pricing.notIncluded).toBe("Non inclus :");
    expect(en.Landing.pricing.notIncluded).toBe("Not included:");
  });
});
