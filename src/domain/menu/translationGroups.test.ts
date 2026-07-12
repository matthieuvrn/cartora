import { describe, it, expect } from "vitest";
import { groupTranslationUnits } from "./translationGroups";
import type { TranslationUnit } from "./translationStatus";

function unit(partial: Partial<TranslationUnit> & Pick<TranslationUnit, "entityId" | "field">) {
  return {
    entityType: "ITEM",
    sourceText: partial.field === "name" ? "Nom" : "Description",
    group: "Entrées",
    ...partial,
  } satisfies TranslationUnit;
}

describe("groupTranslationUnits", () => {
  it("folds an item's name and description into a single entity with the name as title", () => {
    const sections = groupTranslationUnits([
      unit({ entityId: "i1", field: "name", sourceText: "Salade César" }),
      unit({ entityId: "i1", field: "description", sourceText: "Salade, poulet, parmesan" }),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ key: "Entrées", labelKey: null });
    expect(sections[0].entities).toHaveLength(1);
    expect(sections[0].entities[0]).toMatchObject({
      entityType: "ITEM",
      entityId: "i1",
      title: "Salade César",
    });
    expect(sections[0].entities[0].fields.map((f) => f.field)).toEqual(["name", "description"]);
  });

  it("orders fields name-before-description regardless of input order", () => {
    const sections = groupTranslationUnits([
      unit({ entityId: "i1", field: "description", sourceText: "desc" }),
      unit({ entityId: "i1", field: "name", sourceText: "Nom" }),
    ]);

    expect(sections[0].entities[0].fields.map((f) => f.field)).toEqual(["name", "description"]);
    expect(sections[0].entities[0].title).toBe("Nom");
  });

  it("handles an item that only has a name (no description source)", () => {
    const sections = groupTranslationUnits([
      unit({ entityId: "i1", field: "name", sourceText: "Café" }),
    ]);

    expect(sections[0].entities[0].fields).toHaveLength(1);
    expect(sections[0].entities[0].title).toBe("Café");
  });

  it("maps the fixed group keys to their label keys and leaves category names raw", () => {
    const sections = groupTranslationUnits([
      unit({ entityType: "CATEGORY", entityId: "c1", field: "name", group: "categories" }),
      unit({ entityType: "ITEM", entityId: "i1", field: "name", group: "Entrées" }),
      unit({ entityType: "DAILY_DISH", entityId: "d1", field: "name", group: "today" }),
      unit({ entityType: "FORMULA", entityId: "f1", field: "name", group: "formulas" }),
    ]);

    expect(sections.map((s) => [s.key, s.labelKey])).toEqual([
      ["categories", "categories"],
      ["Entrées", null],
      ["today", "today"],
      ["formulas", "formulas"],
    ]);
  });

  it("preserves first-appearance order for sections and entities", () => {
    const sections = groupTranslationUnits([
      unit({ entityId: "i2", field: "name", sourceText: "Deux", group: "Plats" }),
      unit({ entityId: "i1", field: "name", sourceText: "Un", group: "Entrées" }),
      unit({ entityId: "i1", field: "description", sourceText: "desc", group: "Entrées" }),
      unit({ entityId: "i3", field: "name", sourceText: "Trois", group: "Entrées" }),
    ]);

    expect(sections.map((s) => s.key)).toEqual(["Plats", "Entrées"]);
    expect(sections[1].entities.map((e) => e.entityId)).toEqual(["i1", "i3"]);
  });

  it("keeps two items of the same category separate (grouped by entity id)", () => {
    const sections = groupTranslationUnits([
      unit({ entityId: "i1", field: "name", sourceText: "Un" }),
      unit({ entityId: "i2", field: "name", sourceText: "Deux" }),
      unit({ entityId: "i1", field: "description", sourceText: "desc un" }),
    ]);

    expect(sections[0].entities.map((e) => e.entityId)).toEqual(["i1", "i2"]);
    expect(sections[0].entities[0].fields).toHaveLength(2);
    expect(sections[0].entities[1].fields).toHaveLength(1);
  });

  it("carries application-level enrichment through the generic parameter", () => {
    const enriched = {
      entityType: "ITEM" as const,
      entityId: "i1",
      field: "name" as const,
      sourceText: "Salade",
      group: "Entrées",
      perLocale: { en: { value: "Salad", status: "fresh" as const } },
    };
    const sections = groupTranslationUnits([enriched]);
    expect(sections[0].entities[0].fields[0].perLocale).toEqual({
      en: { value: "Salad", status: "fresh" },
    });
  });
});
