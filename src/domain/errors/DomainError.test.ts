import { describe, it, expect } from "vitest";
import { DomainError, isDomainError } from "./DomainError";

describe("DomainError", () => {
  it("stocke code + metadata", () => {
    const err = new DomainError("max_categories", { limit: 6, current: 6, tier: "FREE" });
    expect(err.code).toBe("max_categories");
    expect(err.metadata).toEqual({ limit: 6, current: 6, tier: "FREE" });
  });

  it("metadata par défaut = objet vide", () => {
    const err = new DomainError("plan_inactive");
    expect(err.metadata).toEqual({});
  });

  it("est instance d'Error (compat libs qui font instanceof Error)", () => {
    const err = new DomainError("no_items");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
  });

  it("name vaut 'DomainError'", () => {
    expect(new DomainError("plan_inactive").name).toBe("DomainError");
  });

  it("toJSON produit un POJO sérialisable", () => {
    const err = new DomainError("max_photos", { limit: 5, tier: "STARTER" });
    expect(err.toJSON()).toEqual({
      name: "DomainError",
      code: "max_photos",
      metadata: { limit: 5, tier: "STARTER" },
    });
    // Round-trip JSON : les instances doivent survivre comme objets plats.
    const round = JSON.parse(JSON.stringify(err));
    expect(round.name).toBe("DomainError");
    expect(round.code).toBe("max_photos");
  });
});

describe("isDomainError", () => {
  it("true sur instance DomainError", () => {
    expect(isDomainError(new DomainError("plan_inactive"))).toBe(true);
  });

  it("true sur POJO sérialisé (cas useActionState boundary)", () => {
    const pojo = { name: "DomainError", code: "no_items", metadata: {} };
    expect(isDomainError(pojo)).toBe(true);
  });

  it("false sur Error standard", () => {
    expect(isDomainError(new Error("Restaurant introuvable"))).toBe(false);
  });

  it("false sur objet ressemblant mais sans code", () => {
    expect(isDomainError({ name: "DomainError" })).toBe(false);
  });

  it("false sur null / undefined / primitives", () => {
    expect(isDomainError(null)).toBe(false);
    expect(isDomainError(undefined)).toBe(false);
    expect(isDomainError("DomainError")).toBe(false);
    expect(isDomainError(42)).toBe(false);
  });

  it("survit au passage par un autre realm — instanceof tombe en false, mais le check structurel rattrape", () => {
    // Simule le cas Next 16 / Turbopack où la classe est chargée deux fois sous deux identités.
    const err = new DomainError("restaurant_not_found", { entityId: "abc" });
    // On override le prototype pour casser `instanceof DomainError` côté receveur.
    Object.setPrototypeOf(err, Object.prototype);
    expect(err instanceof DomainError).toBe(false);
    expect(isDomainError(err)).toBe(true); // fallback structurel
  });
});
