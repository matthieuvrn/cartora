import { describe, it, expect } from "vitest";
import { formatCentsToEurInput, parsePriceEurToCents } from "./price";

describe("parsePriceEurToCents", () => {
  it("parses the French comma format", () => {
    expect(parsePriceEurToCents("12,50")).toBe(1250);
    expect(parsePriceEurToCents("12,5")).toBe(1250);
  });

  it("parses the dot format", () => {
    expect(parsePriceEurToCents("12.50")).toBe(1250);
  });

  it("parses whole euros", () => {
    expect(parsePriceEurToCents("12")).toBe(1200);
    expect(parsePriceEurToCents("0")).toBe(0);
  });

  it("tolerates spaces (incl. non-breaking) and a trailing €", () => {
    expect(parsePriceEurToCents(" 12,50 € ")).toBe(1250);
    expect(parsePriceEurToCents("1 234,50")).toBe(123450);
  });

  it("rejects malformed input", () => {
    expect(parsePriceEurToCents("")).toBeNull();
    expect(parsePriceEurToCents("abc")).toBeNull();
    expect(parsePriceEurToCents("12,555")).toBeNull();
    expect(parsePriceEurToCents("12,")).toBeNull();
    expect(parsePriceEurToCents("-5")).toBeNull();
    expect(parsePriceEurToCents("1,2,3")).toBeNull();
  });
});

describe("formatCentsToEurInput", () => {
  it("formats cents with a French comma and two decimals", () => {
    expect(formatCentsToEurInput(1250)).toBe("12,50");
    expect(formatCentsToEurInput(900)).toBe("9,00");
    expect(formatCentsToEurInput(0)).toBe("0,00");
  });

  it("round-trips with parsePriceEurToCents", () => {
    expect(parsePriceEurToCents(formatCentsToEurInput(1250))).toBe(1250);
  });
});
