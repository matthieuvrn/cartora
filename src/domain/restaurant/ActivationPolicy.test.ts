import { describe, it, expect } from "vitest";
import { ActivationPolicy } from "./ActivationPolicy";

describe("ActivationPolicy", () => {
  it("returns 0/4 done for a brand-new account", () => {
    const result = ActivationPolicy.compute({
      restaurantName: "Mon Restaurant",
      totalItems: 0,
      menuStatus: "DRAFT",
    });

    expect(result.totalCount).toBe(4);
    expect(result.doneCount).toBe(0);
    expect(result.allDone).toBe(false);
    expect(result.steps.every((s) => s.done === false)).toBe(true);
  });

  it("marks `named` when the restaurant name has been changed", () => {
    const result = ActivationPolicy.compute({
      restaurantName: "Chez Mamie",
      totalItems: 0,
      menuStatus: "DRAFT",
    });

    expect(result.doneCount).toBe(1);
    expect(result.steps.find((s) => s.id === "named")?.done).toBe(true);
  });

  it("marks `firstItem` once at least one item exists", () => {
    const result = ActivationPolicy.compute({
      restaurantName: "Mon Restaurant",
      totalItems: 1,
      menuStatus: "DRAFT",
    });

    expect(result.steps.find((s) => s.id === "firstItem")?.done).toBe(true);
    expect(result.steps.find((s) => s.id === "threeItems")?.done).toBe(false);
  });

  it("marks `firstItem` and `threeItems` when there are 3 items", () => {
    const result = ActivationPolicy.compute({
      restaurantName: "Mon Restaurant",
      totalItems: 3,
      menuStatus: "DRAFT",
    });

    expect(result.steps.find((s) => s.id === "firstItem")?.done).toBe(true);
    expect(result.steps.find((s) => s.id === "threeItems")?.done).toBe(true);
    expect(result.steps.find((s) => s.id === "published")?.done).toBe(false);
  });

  it("returns 3/4 when there are 3 items and the menu is published, but name unchanged", () => {
    const result = ActivationPolicy.compute({
      restaurantName: "Mon Restaurant",
      totalItems: 3,
      menuStatus: "PUBLISHED",
    });

    expect(result.doneCount).toBe(3);
    expect(result.allDone).toBe(false);
    expect(result.steps.find((s) => s.id === "named")?.done).toBe(false);
  });

  it("returns 4/4 with allDone true when everything is set", () => {
    const result = ActivationPolicy.compute({
      restaurantName: "Chez Mamie",
      totalItems: 5,
      menuStatus: "PUBLISHED",
    });

    expect(result.doneCount).toBe(4);
    expect(result.allDone).toBe(true);
    expect(result.steps.every((s) => s.done)).toBe(true);
  });

  it("keeps `named` false when the name is exactly the default", () => {
    const result = ActivationPolicy.compute({
      restaurantName: "Mon Restaurant",
      totalItems: 10,
      menuStatus: "PUBLISHED",
    });

    expect(result.steps.find((s) => s.id === "named")?.done).toBe(false);
  });

  it("trims surrounding whitespace before comparing the name to the default", () => {
    const result = ActivationPolicy.compute({
      restaurantName: "  Mon Restaurant  ",
      totalItems: 0,
      menuStatus: "DRAFT",
    });

    expect(result.steps.find((s) => s.id === "named")?.done).toBe(false);
  });

  it("preserves the canonical step order regardless of which are done", () => {
    const result = ActivationPolicy.compute({
      restaurantName: "Chez Mamie",
      totalItems: 0,
      menuStatus: "PUBLISHED",
    });

    expect(result.steps.map((s) => s.id)).toEqual([
      "named",
      "firstItem",
      "threeItems",
      "published",
    ]);
  });
});
