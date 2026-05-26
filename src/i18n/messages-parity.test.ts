import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => flattenKeys(v, `${prefix}[${i}]`));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    flattenKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("i18n messages parity", () => {
  it("FR and EN expose the same set of keys", () => {
    const frKeys = new Set(flattenKeys(fr));
    const enKeys = new Set(flattenKeys(en));
    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k)).sort();
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k)).sort();
    expect({ missingInEn, missingInFr }).toEqual({
      missingInEn: [],
      missingInFr: [],
    });
  });
});
