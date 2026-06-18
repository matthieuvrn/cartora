import { describe, it, expect } from "vitest";
import { ListActiveFormulas } from "./ListActiveFormulas";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import type { Clock } from "@/application/ports/Clock";
import type { FormulaData } from "@/domain/menu/MenuTypes";

const NOW = "2026-05-17T12:00:00.000Z";
const clock: Clock = { nowISO: () => NOW };

function formula(id: string, validUntilISO: string, order = 0): FormulaData {
  return {
    id,
    priceCents: 1600,
    validUntilISO,
    order,
    translations: { fr: { name: id, description: "" }, en: { name: "", description: "" } },
    texts: { name: { fr: id }, description: {} },
  };
}

describe("ListActiveFormulas", () => {
  it("partitions formulas into active and expired by clock", async () => {
    const repo = createMockMenuRepo({
      listFormulas: async () => [
        formula("active-1", "2026-05-17T20:00:00.000Z", 0),
        formula("expired-1", "2026-05-17T10:00:00.000Z", 1),
        formula("active-2", "2026-05-18T08:00:00.000Z", 2),
      ],
    });
    const uc = new ListActiveFormulas(repo, clock);

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result.active.map((f) => f.id)).toEqual(["active-1", "active-2"]);
    expect(result.expired.map((f) => f.id)).toEqual(["expired-1"]);
  });

  it("returns empty arrays when no formulas exist", async () => {
    const uc = new ListActiveFormulas(createMockMenuRepo(), clock);

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result.active).toEqual([]);
    expect(result.expired).toEqual([]);
  });

  it("classifies validUntil == now as expired (strict inequality)", async () => {
    const repo = createMockMenuRepo({
      listFormulas: async () => [formula("edge", NOW)],
    });
    const uc = new ListActiveFormulas(repo, clock);

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result.active).toEqual([]);
    expect(result.expired).toHaveLength(1);
  });
});
