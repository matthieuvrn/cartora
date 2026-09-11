import { describe, it, expect } from "vitest";
import { buildSparklinePaths } from "./sparkline";

const BOX = { width: 100, height: 28, inset: 2 };

describe("buildSparklinePaths", () => {
  it("returns null below two points", () => {
    expect(buildSparklinePaths([], BOX)).toBeNull();
    expect(buildSparklinePaths([5], BOX)).toBeNull();
  });

  it("lays an all-zero series on the baseline", () => {
    expect(buildSparklinePaths([0, 0, 0], BOX)).toEqual({
      line: "M0.00 26.00 L50.00 26.00 L100.00 26.00",
      area: "M0.00 26.00 L50.00 26.00 L100.00 26.00 L100.00 28.00 L0.00 28.00 Z",
    });
  });

  it("centres a constant non-zero series", () => {
    expect(buildSparklinePaths([3, 3], BOX)).toEqual({
      line: "M0.00 14.00 L100.00 14.00",
      area: "M0.00 14.00 L100.00 14.00 L100.00 28.00 L0.00 28.00 Z",
    });
  });

  it("scales a varying series between the insets", () => {
    expect(buildSparklinePaths([0, 10, 5], BOX)).toEqual({
      line: "M0.00 26.00 L50.00 2.00 L100.00 14.00",
      area: "M0.00 26.00 L50.00 2.00 L100.00 14.00 L100.00 28.00 L0.00 28.00 Z",
    });
  });

  it("scales from min to max, not from zero", () => {
    expect(buildSparklinePaths([2, 4], BOX)).toEqual({
      line: "M0.00 26.00 L100.00 2.00",
      area: "M0.00 26.00 L100.00 2.00 L100.00 28.00 L0.00 28.00 Z",
    });
  });
});
