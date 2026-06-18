import { describe, it, expect } from "vitest";
import { computeFieldStatus } from "./translationStatus";
import { hashSourceText } from "./textHash";

describe("computeFieldStatus", () => {
  const sourceText = "Salade niçoise";
  const freshHash = hashSourceText(sourceText);

  it("returns missing when there is no translation row", () => {
    expect(computeFieldStatus({ value: undefined, sourceTextHash: undefined, sourceText })).toBe(
      "missing",
    );
  });

  it("returns missing when the value is empty or whitespace-only", () => {
    expect(computeFieldStatus({ value: "", sourceTextHash: freshHash, sourceText })).toBe(
      "missing",
    );
    expect(computeFieldStatus({ value: "   ", sourceTextHash: freshHash, sourceText })).toBe(
      "missing",
    );
  });

  it("returns fresh when the stored hash matches the current source text", () => {
    expect(
      computeFieldStatus({ value: "Niçoise salad", sourceTextHash: freshHash, sourceText }),
    ).toBe("fresh");
  });

  it("returns stale when the source text changed since translation", () => {
    expect(
      computeFieldStatus({
        value: "Niçoise salad",
        sourceTextHash: hashSourceText("Ancienne salade"),
        sourceText,
      }),
    ).toBe("stale");
  });

  it("returns stale for legacy rows without a hash (conservative)", () => {
    expect(computeFieldStatus({ value: "Niçoise salad", sourceTextHash: null, sourceText })).toBe(
      "stale",
    );
  });

  it("stays fresh across whitespace-only source edits (hash trims)", () => {
    expect(
      computeFieldStatus({
        value: "Niçoise salad",
        sourceTextHash: freshHash,
        sourceText: `  ${sourceText}  `,
      }),
    ).toBe("fresh");
  });
});
