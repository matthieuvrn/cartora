import { describe, expect, it } from "vitest";
import {
  DEFAULT_MONTHLY_CHAR_BUDGET,
  MAX_TRANSLATE_CALLS_PER_DAY,
  MAX_TRANSLATE_CHARS_PER_DAY,
  TranslationBudgetPolicy,
} from "./TranslationBudgetPolicy";

const emptyUsage = { dayCalls: 0, dayChars: 0, monthCharsGlobal: 0 };

describe("TranslationBudgetPolicy.charsOf", () => {
  it("sums the lengths of all texts", () => {
    expect(TranslationBudgetPolicy.charsOf(["abc", "de", ""])).toBe(5);
  });

  it("returns 0 for an empty list", () => {
    expect(TranslationBudgetPolicy.charsOf([])).toBe(0);
  });
});

describe("TranslationBudgetPolicy.check", () => {
  it("allows a request within all limits", () => {
    expect(TranslationBudgetPolicy.check({ usage: emptyUsage, requestChars: 5_000 })).toBeNull();
  });

  it("allows reaching the daily char cap exactly", () => {
    const usage = { ...emptyUsage, dayChars: MAX_TRANSLATE_CHARS_PER_DAY - 100 };
    expect(TranslationBudgetPolicy.check({ usage, requestChars: 100 })).toBeNull();
  });

  it("blocks the call that would exceed the daily call cap", () => {
    const usage = { ...emptyUsage, dayCalls: MAX_TRANSLATE_CALLS_PER_DAY };
    expect(TranslationBudgetPolicy.check({ usage, requestChars: 10 })).toEqual({
      code: "translation_daily_limit_reached",
      metadata: { limit: MAX_TRANSLATE_CALLS_PER_DAY },
    });
  });

  it("allows the last call under the daily call cap", () => {
    const usage = { ...emptyUsage, dayCalls: MAX_TRANSLATE_CALLS_PER_DAY - 1 };
    expect(TranslationBudgetPolicy.check({ usage, requestChars: 10 })).toBeNull();
  });

  it("blocks a request that would exceed the daily char cap", () => {
    const usage = { ...emptyUsage, dayChars: MAX_TRANSLATE_CHARS_PER_DAY - 100 };
    expect(TranslationBudgetPolicy.check({ usage, requestChars: 101 })).toEqual({
      code: "translation_daily_limit_reached",
      metadata: { limit: MAX_TRANSLATE_CHARS_PER_DAY },
    });
  });

  it("blocks a request that would exceed the default global monthly budget", () => {
    const usage = { ...emptyUsage, monthCharsGlobal: DEFAULT_MONTHLY_CHAR_BUDGET - 50 };
    expect(TranslationBudgetPolicy.check({ usage, requestChars: 51 })).toEqual({
      code: "translation_quota_exhausted",
      metadata: { limit: DEFAULT_MONTHLY_CHAR_BUDGET },
    });
  });

  it("honors a custom monthly budget (env override)", () => {
    const usage = { ...emptyUsage, monthCharsGlobal: 900 };
    expect(
      TranslationBudgetPolicy.check({ usage, requestChars: 101, monthlyCharBudget: 1_000 }),
    ).toEqual({ code: "translation_quota_exhausted", metadata: { limit: 1_000 } });
    expect(
      TranslationBudgetPolicy.check({ usage, requestChars: 100, monthlyCharBudget: 1_000 }),
    ).toBeNull();
  });

  it("reports the monthly budget violation over the daily ones when both apply", () => {
    const usage = {
      dayCalls: MAX_TRANSLATE_CALLS_PER_DAY,
      dayChars: MAX_TRANSLATE_CHARS_PER_DAY,
      monthCharsGlobal: DEFAULT_MONTHLY_CHAR_BUDGET,
    };
    expect(TranslationBudgetPolicy.check({ usage, requestChars: 1 })?.code).toBe(
      "translation_quota_exhausted",
    );
  });
});
