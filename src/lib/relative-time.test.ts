import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

// Compare au même formateur Intl (options identiques) plutôt qu'à des chaînes localisées
// codées en dur — les libellés exacts (« il y a 2 h ») dépendent de la version d'ICU.
const rtf = (locale: string) =>
  new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });

const NOW = Date.parse("2026-07-14T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it('renvoie "" pour un ISO invalide', () => {
    expect(formatRelativeTime("pas-une-date", "fr", NOW)).toBe("");
  });

  it("borne le futur à « maintenant »", () => {
    const future = new Date(NOW + 2 * HOUR).toISOString();
    expect(formatRelativeTime(future, "fr", NOW)).toBe(rtf("fr").format(0, "second"));
  });

  it("affiche « maintenant » sous la minute", () => {
    expect(formatRelativeTime(ago(30 * SEC), "fr", NOW)).toBe(rtf("fr").format(0, "second"));
  });

  it("choisit les minutes", () => {
    expect(formatRelativeTime(ago(5 * MIN), "fr", NOW)).toBe(rtf("fr").format(-5, "minute"));
  });

  it("choisit les heures", () => {
    expect(formatRelativeTime(ago(2 * HOUR), "en", NOW)).toBe(rtf("en").format(-2, "hour"));
  });

  it("choisit les jours", () => {
    expect(formatRelativeTime(ago(3 * DAY), "en", NOW)).toBe(rtf("en").format(-3, "day"));
  });
});
